/**
 * Environment configuration with strict validation
 * Fails fast on missing required variables
 * Implements typed, validated environment access
 */

interface EnvironmentConfig {
  // Core application
  mode: 'development' | 'staging' | 'production';
  apiUrl: string;
  version: string;

  // Supabase
  supabase: {
    url: string;
    anonKey: string;
  };

  // Observability
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    endpoint?: string;
    apiKey?: string;
  };

  // Error tracking
  sentry?: {
    dsn: string;
    environment: string;
    sampleRate: number;
  };

  // Analytics
  analytics?: {
    posthogKey?: string;
    mixpanelToken?: string;
  };

  // Feature flags
  features: {
    enableRLTraining: boolean;
    enableGoogleIntegrations: boolean;
    enablePatternDetection: boolean;
    maxQuestionsPerDay: number;
  };

  // Security
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    csrfSecret?: string;
  };

  // Rate limiting
  rateLimits: {
    questionsPerHour: number;
    apiCallsPerMinute: number;
  };
}

/**
 * Required environment variables
 * Application will not start if these are missing
 */
const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
  VITE_APP_VERSION: '0.1.0',
  VITE_LOG_LEVEL: 'info',
  VITE_SENTRY_SAMPLE_RATE: '1.0',
  VITE_MAX_QUESTIONS_PER_DAY: '20',
  VITE_RATE_LIMIT_QUESTIONS: '100',
  VITE_RATE_LIMIT_API: '60',
  VITE_SESSION_TIMEOUT: '30',
  VITE_PASSWORD_MIN_LENGTH: '10'
} as const;

class EnvironmentValidator {
  private validated = false;
  private config: EnvironmentConfig | null = null;

  /**
   * Validate environment variables and build config
   * Throws on validation failure
   */
  validate(): EnvironmentConfig {
    if (this.validated && this.config) {
      return this.config;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    for (const varName of REQUIRED_VARS) {
      const value = import.meta.env[varName];
      if (!value || value.trim() === '') {
        errors.push(`Required environment variable ${varName} is missing`);
      }
    }

    // Validate Supabase URL format
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !this.isValidUrl(supabaseUrl)) {
      errors.push('VITE_SUPABASE_URL must be a valid URL');
    }

    // Validate log level
    const logLevel = import.meta.env.VITE_LOG_LEVEL || OPTIONAL_VARS.VITE_LOG_LEVEL;
    if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
      warnings.push(`Invalid log level "${logLevel}", defaulting to "info"`);
    }

    // Validate Sentry DSN if provided
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    if (sentryDsn && !this.isValidUrl(sentryDsn)) {
      warnings.push('VITE_SENTRY_DSN is invalid, error tracking disabled');
    }

    // Production-specific validations
    if (import.meta.env.MODE === 'production') {
      if (!sentryDsn) {
        warnings.push('Sentry DSN not configured for production');
      }
      if (!import.meta.env.VITE_LOGGING_ENDPOINT) {
        warnings.push('Logging endpoint not configured for production');
      }
      if (import.meta.env.VITE_SUPABASE_URL?.includes('localhost')) {
        errors.push('Cannot use localhost Supabase URL in production');
      }
    }

    // Throw if any errors
    if (errors.length > 0) {
      const errorMessage = [
        '❌ Environment Validation Failed',
        '',
        'Errors:',
        ...errors.map(e => `  - ${e}`),
        '',
        'Required variables:',
        ...REQUIRED_VARS.map(v => `  - ${v}`),
        '',
        'See .env.example for reference'
      ].join('\n');

      console.error(errorMessage);
      throw new Error('Environment validation failed');
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('⚠️ Environment Warnings:');
      warnings.forEach(w => console.warn(`  - ${w}`));
    }

    // Build config
    this.config = this.buildConfig();
    this.validated = true;

    // Log success
    console.log(`✅ Environment validated (${this.config.mode})`);

    return this.config;
  }

  /**
   * Build typed configuration object
   */
  private buildConfig(): EnvironmentConfig {
    const mode = (import.meta.env.MODE || 'development') as EnvironmentConfig['mode'];

    return {
      mode,
      apiUrl: import.meta.env.VITE_API_URL || window.location.origin,
      version: import.meta.env.VITE_APP_VERSION || OPTIONAL_VARS.VITE_APP_VERSION,

      supabase: {
        url: import.meta.env.VITE_SUPABASE_URL!,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!
      },

      logging: {
        level: (import.meta.env.VITE_LOG_LEVEL || OPTIONAL_VARS.VITE_LOG_LEVEL) as any,
        endpoint: import.meta.env.VITE_LOGGING_ENDPOINT,
        apiKey: import.meta.env.VITE_LOGGING_API_KEY
      },

      sentry: import.meta.env.VITE_SENTRY_DSN ? {
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: mode,
        sampleRate: parseFloat(import.meta.env.VITE_SENTRY_SAMPLE_RATE || OPTIONAL_VARS.VITE_SENTRY_SAMPLE_RATE)
      } : undefined,

      analytics: {
        posthogKey: import.meta.env.VITE_POSTHOG_KEY,
        mixpanelToken: import.meta.env.VITE_MIXPANEL_TOKEN
      },

      features: {
        enableRLTraining: import.meta.env.VITE_ENABLE_RL_TRAINING === 'true',
        enableGoogleIntegrations: import.meta.env.VITE_ENABLE_GOOGLE_INTEGRATIONS === 'true',
        enablePatternDetection: import.meta.env.VITE_ENABLE_PATTERN_DETECTION !== 'false', // Default true
        maxQuestionsPerDay: parseInt(import.meta.env.VITE_MAX_QUESTIONS_PER_DAY || OPTIONAL_VARS.VITE_MAX_QUESTIONS_PER_DAY)
      },

      security: {
        sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || OPTIONAL_VARS.VITE_SESSION_TIMEOUT),
        passwordMinLength: parseInt(import.meta.env.VITE_PASSWORD_MIN_LENGTH || OPTIONAL_VARS.VITE_PASSWORD_MIN_LENGTH),
        csrfSecret: import.meta.env.VITE_CSRF_SECRET
      },

      rateLimits: {
        questionsPerHour: parseInt(import.meta.env.VITE_RATE_LIMIT_QUESTIONS || OPTIONAL_VARS.VITE_RATE_LIMIT_QUESTIONS),
        apiCallsPerMinute: parseInt(import.meta.env.VITE_RATE_LIMIT_API || OPTIONAL_VARS.VITE_RATE_LIMIT_API)
      }
    };
  }

  /**
   * URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current config (throws if not validated)
   */
  getConfig(): EnvironmentConfig {
    if (!this.validated || !this.config) {
      throw new Error('Environment not validated. Call validate() first.');
    }
    return this.config;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.getConfig().mode === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.getConfig().mode === 'development';
  }
}

// Singleton instance
const validator = new EnvironmentValidator();

// Validate on module load
const env = validator.validate();

// Export validated config and helpers
export { env, validator };
export type { EnvironmentConfig };

/**
 * Type-safe environment variable access
 * Use this instead of direct import.meta.env access
 */
export const getEnv = <K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] => {
  return env[key];
};

/**
 * Check if feature is enabled
 */
export const isFeatureEnabled = (feature: keyof EnvironmentConfig['features']): boolean => {
  return env.features[feature];
};

/**
 * Get rate limit for specific resource
 */
export const getRateLimit = (resource: keyof EnvironmentConfig['rateLimits']): number => {
  return env.rateLimits[resource];
};

// Development helpers
if (env.mode === 'development') {
  // Expose config in console for debugging
  (window as any).__ENV__ = env;
  console.log('🔧 Development mode: window.__ENV__ available');
}
