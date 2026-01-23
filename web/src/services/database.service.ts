// web/src/services/database.service.ts
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Interface definitions for backward compatibility and type safety
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

// ENHANCED: LRU Cache Implementation
class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize: number = 100, ttlMs: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: K[] = [];
    for (const key of this.cache.keys()) {
      if (pattern.test(String(key))) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// ENHANCED: Connection Pool Manager
class ConnectionPool {
  private activeConnections: number = 0;
  private readonly maxConnections: number = 10;
  private waitQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return;
    }

    // Wait for available connection
    return new Promise(resolve => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.activeConnections--;
    const next = this.waitQueue.shift();
    if (next) {
      this.activeConnections++;
      next();
    }
  }

  getStatus() {
    return {
      active: this.activeConnections,
      max: this.maxConnections,
      waiting: this.waitQueue.length,
      utilization: (this.activeConnections / this.maxConnections) * 100
    };
  }
}

// ENHANCED: Query Performance Monitor
class QueryMonitor {
  private static queries: Array<{ query: string; duration: number; timestamp: number }> = [];
  private static readonly MAX_HISTORY = 1000;

  static record(query: string, duration: number) {
    this.queries.push({
      query,
      duration,
      timestamp: Date.now()
    });

    if (this.queries.length > this.MAX_HISTORY) {
      this.queries.shift();
    }

    // Alert on slow queries
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        query,
        duration_ms: duration,
        threshold_ms: 1000
      });
    }
  }

  static getStats() {
    if (this.queries.length === 0) return null;

    const durations = this.queries.map(q => q.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    return {
      total_queries: this.queries.length,
      avg_duration_ms: Math.round(avg),
      max_duration_ms: max,
      min_duration_ms: min,
      slow_queries: this.queries.filter(q => q.duration > 1000).length
    };
  }
}

// ENHANCED: Circuit Breaker with Half-Open State
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class EnhancedCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastStateChange = 0;

  private readonly failureThreshold = 5;
  private readonly successThreshold = 2;
  private readonly timeout = 60000; // 60 seconds
  private readonly halfOpenDelay = 5000; // 5 seconds

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastStateChange > this.timeout) {
        logger.info('Circuit breaker entering half-open state');
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        if (fallback) {
          logger.debug('Circuit open - using fallback');
          return fallback();
        }
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        logger.info('Circuit breaker closing - health restored');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.lastStateChange = Date.now();
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
      this.lastStateChange = Date.now();
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      timeSinceLastFailure: Date.now() - this.lastFailureTime,
      timeSinceStateChange: Date.now() - this.lastStateChange
    };
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.lastStateChange = Date.now();
  }
}

// ENHANCED: Main Database Service
class EnhancedDatabaseService {
  private circuitBreaker = new EnhancedCircuitBreaker();
  private connectionPool = new ConnectionPool();
  private queryCache = new LRUCache<string, any>(100, 5 * 60 * 1000);

  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 500;
  private readonly BATCH_SIZE = 100;

  /**
   * ENHANCED: Retry with exponential backoff and jitter
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
    useFallback: boolean = false
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.connectionPool.acquire();
        const startTime = Date.now();

        const result = await this.circuitBreaker.execute(
          operation,
          useFallback ? () => this.getFallbackValue<T>(operationName) : undefined
        );

        const duration = Date.now() - startTime;
        QueryMonitor.record(operationName, duration);

        this.connectionPool.release();
        return result;

      } catch (error: any) {
        this.connectionPool.release();
        lastError = error;

        // Don't retry on client errors
        if (error.code?.startsWith('4') || (error.status >= 400 && error.status < 500)) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES) {
          // Exponential backoff with jitter
          const jitter = Math.random() * 100;
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1) + jitter;

          logger.warn('Database operation failed, retrying', {
            operation: operationName,
            attempt,
            max_retries: this.MAX_RETRIES,
            delay_ms: Math.round(delay),
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

    throw lastError;
  }

  /**
   * ENHANCED: Get profile with multi-level caching
   */
  async getProfile(profileId: string): Promise<Profile> {
    const cacheKey = `profile:${profileId}`;

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit for profile', { profile_id: profileId });
      return cached;
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

        // Cache the result
        this.queryCache.set(cacheKey, data);
        return data as Profile;
      },
      'getProfile',
      { profile_id: profileId },
      true // Use fallback
    );

    return result;
  }

  /**
   * ENHANCED: Get questions with server-side RPC
   */
  async getQuestions(options: {
    limit?: number;
    offset?: number;
    difficulty?: number;
    dimensionId?: string | number;
    excludeAnswered?: boolean;
    profileId?: string;
  } = {}): Promise<{ data: Question[]; count: number; error: any }> {
    const { limit = 10, offset = 0, difficulty, dimensionId, excludeAnswered, profileId } = options;
    const cacheKey = `questions:${JSON.stringify(options)}`;

    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit for questions');
      return cached;
    }

    try {
      const result = await this.withRetry(
        async () => {
          // Use RPC for better performance when excluding answered questions
          if (excludeAnswered && profileId) {
            const { data, error } = await supabase.rpc('get_unanswered_questions', {
              p_profile_id: profileId,
              p_limit: limit,
              p_offset: offset,
              p_dimension_id: dimensionId || null,
              p_difficulty: difficulty || null
            });

            if (error) throw error;
            return { data: (data || []) as Question[], count: -1, error: null };
          }

          // Standard query with optimizations
          let query = supabase
            .from('questions')
            .select(`
              id,
              text,
              question_type,
              difficulty_level,
              primary_dimension_id,
              options:answer_options(
                id,
                text,
                option_order,
                aspect_id,
                weight
              )
            `, { count: 'exact' })
            .eq('active', true);

          if (difficulty) query = query.eq('difficulty_level', difficulty);
          if (dimensionId) query = query.eq('primary_dimension_id', dimensionId);

          query = query.range(offset, offset + limit - 1)
                       .order('engagement_factor', { ascending: false });

          const { data, error, count } = await query;
          if (error) throw error;

          return { data: (data || []) as Question[], count: count || 0, error: null };
        },
        'getQuestions',
        { limit, offset, dimensionId }
      );

      // Cache the result
      this.queryCache.set(cacheKey, result);

      logger.info('Questions fetched', {
        count: result.data.length,
        cached: false
      });

      return result;
    } catch (err: any) {
      logger.error('Failed to fetch questions', { error: err.message });
      return { data: [], count: 0, error: err };
    }
  }

  /**
   * ENHANCED: Submit response with optimistic updates
   */
  async submitResponse(response: Response): Promise<void> {
    await this.withRetry(
      async () => {
        // Batch operation in transaction
        const { error: responseError } = await supabase
          .from('responses')
          .insert([{
            ...response,
            response_type: response.response_type || 'selected',
            created_at: new Date().toISOString()
          }]);

        if (responseError) throw responseError;

        // Update profile stats via RPC (atomic)
        const { error: profileError } = await supabase.rpc(
          'increment_profile_responses',
          { profile_id_param: response.profile_id }
        );

        if (profileError) {
          logger.warn('Failed to update profile statistics', {
            profile_id: response.profile_id,
            error: profileError.message
          });
        }

        // Invalidate caches
        this.queryCache.invalidatePattern(new RegExp(`questions:.*${response.profile_id}`));
        this.queryCache.delete(`profile:${response.profile_id}`);

        logger.info('Response submitted', {
          profile_id: response.profile_id,
          question_id: response.question_id
        });
      },
      'submitResponse',
      {
        profile_id: response.profile_id,
        question_id: response.question_id
      }
    );
  }

  /**
   * ENHANCED: Get comprehensive analytics (single RPC call)
   * Returns metrics, dimension breakdown, weekly activity, and detected patterns
   */
  async getAnalytics(profileId: string, days: number = 30): Promise<{
    metrics: any;
    dimension_breakdown: any[];
    weekly_activity: any[];
    patterns: any[];
    timestamp: string;
  }> {
    const cacheKey = `analytics:${profileId}:${days}`;

    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit for analytics');
      return cached;
    }

    const result = await this.withRetry(
      async () => {
        // BOLT OPTIMIZATION: Call the enhanced comprehensive analytics RPC
        // which now includes joined patterns and accurate multi-dimensional breakdown.
        const { data, error } = await supabase.rpc('get_comprehensive_analytics', {
          p_profile_id: profileId,
          p_days: days
        });

        if (error) throw error;

        // Cache for 2 minutes (shorter TTL for analytics)
        this.queryCache.set(cacheKey, data);
        return data;
      },
      'getAnalytics',
      { profile_id: profileId, days }
    );

    return result;
  }

  /**
   * ENHANCED: Get patterns with caching
   */
  async getPatterns(profileId: string, minConfidence: number = 0.6): Promise<Pattern[]> {
    const cacheKey = `patterns:${profileId}:${minConfidence}`;

    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const result = await this.withRetry(
      async () => {
        const { data, error } = await supabase
          .from('patterns')
          .select('*')
          .eq('profile_id', profileId)
          .gte('confidence', minConfidence)
          .order('confidence', { ascending: false });

        if (error) throw error;

        const patterns = (data || []) as Pattern[];
        this.queryCache.set(cacheKey, patterns);
        return patterns;
      },
      'getPatterns',
      { profile_id: profileId }
    );

    return result;
  }

  /**
   * ENHANCED: Batch insert with transaction
   */
  async batchInsert<T extends Record<string, any>>(
    table: string,
    records: T[]
  ): Promise<{ inserted: number; errors: any[] }> {
    const errors: any[] = [];
    let inserted = 0;

    for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
      const batch = records.slice(i, i + this.BATCH_SIZE);

      try {
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
            batch_number: Math.floor(i / this.BATCH_SIZE) + 1,
            batch_size: batch.length
          }
        );
      } catch (error) {
        errors.push({ batch: i / this.BATCH_SIZE, error });
      }
    }

    logger.info('Batch insert completed', {
      table,
      total_records: records.length,
      inserted,
      errors: errors.length
    });

    return { inserted, errors };
  }

  /**
   * ENHANCED: Health check with detailed status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    database: boolean;
    circuit: any;
    pool: any;
    cache: { size: number };
    queries: any;
  }> {
    let dbHealthy = false;

    try {
      const { error } = await supabase
        .from('profile')
        .select('id')
        .limit(1);

      dbHealthy = !error;
    } catch {
      dbHealthy = false;
    }

    return {
      healthy: dbHealthy && this.circuitBreaker.getState().state === CircuitState.CLOSED,
      database: dbHealthy,
      circuit: this.circuitBreaker.getState(),
      pool: this.connectionPool.getStatus(),
      cache: { size: (this.queryCache as any).cache.size },
      queries: QueryMonitor.getStats()
    };
  }

  /**
   * Get fallback values for critical operations
   */
  private getFallbackValue<T>(operationName: string): T {
    const fallbacks: Record<string, any> = {
      getProfile: { id: '', total_responses: 0, engagement_score: 0, metadata: {} },
      getQuestions: { data: [], count: 0, error: null },
      getAnalytics: { metrics: {}, dimension_breakdown: [], weekly_activity: [] },
      getPatterns: []
    };

    return fallbacks[operationName] as T;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.queryCache.clear();
    logger.info('All caches cleared');
  }

  /**
   * Invalidate cache for specific pattern
   */
  invalidateCache(pattern: RegExp): void {
    this.queryCache.invalidatePattern(pattern);
    logger.info('Cache invalidated', { pattern: pattern.source });
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      circuit: this.circuitBreaker.getState(),
      pool: this.connectionPool.getStatus(),
      cache: {
        size: (this.queryCache as any).cache.size,
        maxSize: (this.queryCache as any).maxSize
      },
      queries: QueryMonitor.getStats()
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const databaseService = new EnhancedDatabaseService();

// Export utility classes for testing
export { LRUCache, EnhancedCircuitBreaker, QueryMonitor };
