import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface Profile {
  id: string;
  total_responses: number;
  engagement_score: number;
  metadata: any;
}

export interface Question {
  id: number;
  text: string;
  question_type: string;
  difficulty_level: number;
  primary_dimension_id: number;
  options?: any[];
}

export interface Response {
  profile_id: string;
  question_id: number;
  answer_option_id: number;
  response_time_ms: number;
  confidence_level: number;
  response_type?: string;
}

export interface Pattern {
  id: number;
  profile_id: string;
  pattern_type: string;
  confidence: number;
  strength: number;
  metadata: any;
}

class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public context?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  private readonly failureThreshold = 5;
  private readonly successThreshold = 2;
  private readonly timeout = 60000; // 60 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        logger.info('Circuit breaker entering half-open state');
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new DatabaseError(
          'Circuit breaker is open',
          'CIRCUIT_OPEN',
          'circuit_breaker'
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        logger.info('Circuit breaker closing');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      logger.error('Circuit breaker opening', {
        failure_count: this.failureCount,
        threshold: this.failureThreshold
      });
      this.state = CircuitState.OPEN;
    }
  }
}

class DatabaseService {
  private circuitBreaker = new CircuitBreaker();
  private readonly MAX_RETRIES = 3;

  // BOLT OPTIMIZATION: In-memory caches to reduce redundant DB fetches
  private profileCache: Map<string, Profile> = new Map();
  private answeredQuestionsCache: Map<string, Set<number>> = new Map();
  private readonly RETRY_DELAY_MS = 500;

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.circuitBreaker.execute(operation);
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (400-499)
        if (error.code?.startsWith('4')) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn('Database operation failed, retrying', {
            operation: operationName,
            attempt,
            max_retries: this.MAX_RETRIES,
            delay_ms: delay,
            error: error.message,
            ...context
          });
          await this.delay(delay);
        }
      }
    }

    logger.error('Database operation failed after all retries', {
      operation: operationName,
      attempts: this.MAX_RETRIES,
      error: lastError.message,
      ...context
    });

    throw new DatabaseError(
      `${operationName} failed after ${this.MAX_RETRIES} attempts`,
      lastError.code || 'UNKNOWN_ERROR',
      operationName,
      context
    );
  }

  /**
   * Get user profile with caching
   */
  async getProfile(profileId: string): Promise<Profile> {
    const timer = logger.startTimer('db_get_profile');

    // BOLT OPTIMIZATION: Return from cache if available
    if (this.profileCache.has(profileId)) {
      timer();
      return this.profileCache.get(profileId)!;
    }

    const result = await this.withRetry(
      async () => {
        const { data, error } = await supabase
          .from('profile')
          .select('*')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Profile not found');

        const profile = data as Profile;
        this.profileCache.set(profileId, profile);
        return profile;
      },
      'getProfile',
      { profile_id: profileId }
    );

    timer();
    return result;
  }

  /**
   * Get questions with pagination and filtering
   * BOLT OPTIMIZATION: Uses a server-side RPC to handle "not answered" logic,
   * avoiding huge payload of IDs in the client-side query.
   */
  async getQuestions(options: {
    limit?: number;
    offset?: number;
    difficulty?: number;
    dimensionId?: string | number;
    excludeAnswered?: boolean;
    profileId?: string;
  } = {}): Promise<{ data: Question[]; count: number; error: any }> {
    const timer = logger.startTimer('db_get_questions');
    const { limit = 10, offset = 0, difficulty, dimensionId, excludeAnswered, profileId } = options;

    try {
      const result = await this.withRetry(
        async () => {
          // Use RPC if we need to exclude answered questions
          if (excludeAnswered && profileId) {
            const { data, error } = await supabase.rpc('get_unanswered_questions', {
              p_profile_id: profileId,
              p_limit: limit,
              p_offset: offset,
              p_dimension_id: dimensionId,
              p_difficulty: difficulty
            });

            if (error) throw error;
            return { data: (data || []) as Question[], count: -1 }; // count is hard to get with LIMIT in RPC
          }

          // Fallback to standard query
          let query = supabase
            .from('questions')
            .select(`
              *,
              options:answer_options(*)
            `, { count: 'exact' })
            .eq('active', true);

          if (difficulty) query = query.eq('difficulty_level', difficulty);
          if (dimensionId) query = query.eq('primary_dimension_id', dimensionId);

          query = query.range(offset, offset + limit - 1);

          const { data, error, count } = await query;
          if (error) throw error;
          return { data: (data || []) as Question[], count: count || 0 };
        },
        'getQuestions',
        { limit, offset, dimensionId }
      );

      logger.info('Questions fetched', {
        count: result.data.length,
        duration_ms: timer()
      });

      return { data: result.data, count: result.count, error: null };
    } catch (err: any) {
      return { data: [], count: 0, error: err };
    }
  }

  /**
   * Submit user response with transaction safety
   */
  async submitResponse(response: Response): Promise<void> {
    const timer = logger.startTimer('db_submit_response');

    await this.withRetry(
      async () => {
        // Begin transaction (Supabase doesn't support explicit transactions in client)
        // Use RPC function for atomic operations if needed

        // 1. Insert response
        const { error: responseError } = await supabase
          .from('responses')
          .insert([{
            ...response,
            response_type: response.response_type || 'selected',
            created_at: new Date().toISOString()
          }]);

        if (responseError) throw responseError;

        // 2. Update profile statistics
        const { error: profileError } = await supabase.rpc(
          'increment_profile_responses',
          { profile_id_param: response.profile_id }
        );

        if (profileError) {
          logger.warn('Failed to update profile statistics', {
            profile_id: response.profile_id,
            error: profileError.message
          });
          // Don't throw - response was saved successfully
        }

        // BOLT OPTIMIZATION: Update in-memory caches
        const answeredSet = this.answeredQuestionsCache.get(response.profile_id);
        if (answeredSet) {
          answeredSet.add(response.question_id);
        }

        const cachedProfile = this.profileCache.get(response.profile_id);
        if (cachedProfile) {
          cachedProfile.total_responses++;
        }

        logger.info('Response submitted', {
          profile_id: response.profile_id,
          question_id: response.question_id,
          response_time_ms: response.response_time_ms
        });
      },
      'submitResponse',
      {
        profile_id: response.profile_id,
        question_id: response.question_id
      }
    );

    timer();
  }

  /**
   * Get dynamic metrics for a user
   */
  async getUserMetrics(profileId: string): Promise<any> {
    const timer = logger.startTimer('db_get_metrics');

    const result = await this.withRetry(
      async () => {
        const { data, error } = await supabase.rpc('get_user_metrics', {
          profile_id_param: profileId
        });

        if (error) throw error;
        return data;
      },
      'getUserMetrics',
      { profile_id: profileId }
    );

    timer();
    return result;
  }

  /**
   * Get analytics data with aggregations
   * BOLT OPTIMIZATION: Uses a bundled RPC to get all metrics in one call
   */
  async getAnalytics(profileId: string, days: number = 30): Promise<any> {
    const timer = logger.startTimer('db_get_analytics');

    const result = await this.withRetry(
      async () => {
        const { data, error } = await supabase.rpc('get_comprehensive_analytics', {
          p_profile_id: profileId,
          p_days: days
        });

        if (error) throw error;
        return data;
      },
      'getAnalytics',
      { profile_id: profileId, days }
    );

    timer();
    return result;
  }

  /**
   * Get detected patterns
   */
  async getPatterns(profileId: string, minConfidence: number = 0.6): Promise<Pattern[]> {
    const timer = logger.startTimer('db_get_patterns');

    const result = await this.withRetry(
      async () => {
        const { data, error } = await supabase
          .from('patterns')
          .select('*')
          .eq('profile_id', profileId)
          .gte('confidence', minConfidence)
          .order('confidence', { ascending: false });

        if (error) throw error;
        return (data || []) as Pattern[];
      },
      'getPatterns',
      { profile_id: profileId, min_confidence: minConfidence }
    );

    timer();
    return result;
  }

  /**
   * Batch insert for bulk operations
   */
  async batchInsert<T>(
    table: string,
    records: T[],
    batchSize: number = 100
  ): Promise<void> {
    const timer = logger.startTimer('db_batch_insert');
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      await this.withRetry(
        async () => {
          const { error } = await supabase
            .from(table)
            .insert(batch);

          if (error) throw error;
          inserted += batch.length;
        },
        'batchInsert',
        {
          table,
          batch_number: Math.floor(i / batchSize) + 1,
          batch_size: batch.length
        }
      );
    }

    logger.info('Batch insert completed', {
      table,
      total_records: records.length,
      inserted,
      duration_ms: timer()
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profile')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export { DatabaseError };
