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

    const result = await this.withRetry(
      async () => {
        const { data, error } = await supabase
          .from('profile')
          .select('*')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Profile not found');

        return data as Profile;
      },
      'getProfile',
      { profile_id: profileId }
    );

    timer();
    return result;
  }

  /**
   * Fetch questions with pagination and filtering
   */
  async fetchQuestions(
    limit: number = 10,
    offset: number = 0,
    filters?: {
      difficulty?: number;
      dimension?: number;
      excludeAnswered?: boolean;
      profileId?: string;
    }
  ): Promise<Question[]> {
    const timer = logger.startTimer('db_fetch_questions');

    const result = await this.withRetry(
      async () => {
        let query = supabase
          .from('questions')
          .select(`
            *,
            options:answer_options(*)
          `)
          .eq('active', true);

        // Apply filters
        if (filters?.difficulty) {
          query = query.eq('difficulty_level', filters.difficulty);
        }
        if (filters?.dimension) {
          query = query.eq('primary_dimension_id', filters.dimension);
        }

        // Exclude answered questions
        if (filters?.excludeAnswered && filters?.profileId) {
          const { data: answered } = await supabase
            .from('responses')
            .select('question_id')
            .eq('profile_id', filters.profileId);

          if (answered && answered.length > 0) {
            const answeredIds = answered.map(r => r.question_id);
            query = query.not('id', 'in', `(${answeredIds.join(',')})`);
          }
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) throw error;
        return (data || []) as Question[];
      },
      'fetchQuestions',
      { limit, offset, filters }
    );

    logger.info('Questions fetched', {
      count: result.length,
      limit,
      offset,
      duration_ms: timer()
    });

    return result;
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
   * Get analytics data with aggregations
   */
  async getAnalytics(profileId: string, days: number = 30): Promise<any[]> {
    const timer = logger.startTimer('db_get_analytics');

    const result = await this.withRetry(
      async () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { data, error } = await supabase
          .from('responses')
          .select(`
            *,
            question:questions(primary_dimension_id, difficulty_level),
            answer:answer_options(aspect_id, weight)
          `)
          .eq('profile_id', profileId)
          .gte('created_at', cutoffDate.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
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
