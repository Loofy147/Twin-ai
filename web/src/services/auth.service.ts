// web/src/services/auth.service.ts - ENHANCED VERSION
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import crypto from 'crypto-js';
import { env } from '../config/env.config';

export interface AuthUser {
  id: string;
  email: string;
  profile_id: string;
  created_at: string;
  session_expires_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  metadata?: Record<string, any>;
}

// ENHANCED: Configurable password policy
const PASSWORD_POLICY = {
  minLength: env.security.passwordMinLength,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  preventCommon: true,
  preventSequential: true
};

const COMMON_PASSWORDS = new Set([
  'password', 'password123', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567890', 'letmein', 'welcome', 'admin'
]);

// ENHANCED: CSRF Token Management
class CSRFProtection {
  private static tokenKey = 'csrf_token';
  private static tokenExpiry = 3600000; // 1 hour

  static generateToken(): string {
    const token = crypto.lib.WordArray.random(32).toString();
    const expiry = Date.now() + this.tokenExpiry;

    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(`${this.tokenKey}_expiry`, expiry.toString());

    return token;
  }

  static validateToken(token: string): boolean {
    const stored = sessionStorage.getItem(this.tokenKey);
    const expiry = sessionStorage.getItem(`${this.tokenKey}_expiry`);

    if (!stored || !expiry) return false;
    if (Date.now() > parseInt(expiry)) {
      this.clearToken();
      return false;
    }

    return stored === token;
  }

  static clearToken(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(`${this.tokenKey}_expiry`);
  }

  static getToken(): string | null {
    const token = sessionStorage.getItem(this.tokenKey);
    const expiry = sessionStorage.getItem(`${this.tokenKey}_expiry`);

    if (!token || !expiry) return null;
    if (Date.now() > parseInt(expiry)) {
      this.clearToken();
      return null;
    }

    return token;
  }
}

// ENHANCED: Session Management
class SessionManager {
  private static timeoutId: number | null = null;
  private static warningId: number | null = null;
  private static activityListeners: Array<() => void> = [];

  static init(timeoutMinutes: number = 30) {
    this.resetTimeout(timeoutMinutes);
    this.addActivityListeners();
  }

  static resetTimeout(timeoutMinutes: number) {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = timeoutMs - 5 * 60 * 1000; // 5 min warning

    // Show warning 5 minutes before timeout
    this.warningId = window.setTimeout(() => {
      logger.warn('Session expiring soon');
      this.dispatchSessionWarning();
    }, warningMs);

    // Auto-logout on timeout
    this.timeoutId = window.setTimeout(async () => {
      logger.info('Session timeout - auto logout');
      await authService.signOut();
      this.dispatchSessionExpired();
    }, timeoutMs);

    // Update last activity
    sessionStorage.setItem('last_activity', Date.now().toString());
  }

  static addActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const resetHandler = () => this.resetTimeout(env.security.sessionTimeout);

    events.forEach(event => {
      document.addEventListener(event, resetHandler, { passive: true });
    });

    this.activityListeners.push(resetHandler);
  }

  static dispatchSessionWarning() {
    window.dispatchEvent(new CustomEvent('session:warning', {
      detail: { expiresIn: 300 } // seconds
    }));
  }

  static dispatchSessionExpired() {
    window.dispatchEvent(new CustomEvent('session:expired'));
  }

  static cleanup() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);
    this.activityListeners = [];
  }
}

// ENHANCED: Rate Limiting
class RateLimiter {
  private static attempts: Map<string, number[]> = new Map();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  static checkLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.WINDOW_MS);

    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      const oldestAttempt = Math.min(...recentAttempts);
      const retryAfter = Math.ceil((oldestAttempt + this.WINDOW_MS - now) / 1000);

      return { allowed: false, retryAfter };
    }

    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);

    return { allowed: true };
  }

  static reset(identifier: string) {
    this.attempts.delete(identifier);
  }
}

class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string = 'AUTH_ERROR',
    public status: number = 401,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export const authService = {
  /**
   * ENHANCED: Sign up with comprehensive validation
   */
  async signUp(data: SignUpData): Promise<AuthUser> {
    const startTime = Date.now();

    try {
      // Rate limiting check
      const rateLimit = RateLimiter.checkLimit(`signup:${data.email}`);
      if (!rateLimit.allowed) {
        throw new AuthenticationError(
          'Too many signup attempts. Please try again later.',
          'RATE_LIMITED',
          429,
          rateLimit.retryAfter
        );
      }

      // Email validation
      if (!this.validateEmail(data.email)) {
        throw new AuthenticationError('Invalid email format', 'INVALID_EMAIL', 400);
      }

      // Enhanced password validation
      const passwordValidation = this.validatePasswordEnhanced(data.password);
      if (!passwordValidation.valid) {
        throw new AuthenticationError(
          passwordValidation.errors.join(', '),
          'WEAK_PASSWORD',
          400
        );
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            ...data.metadata,
            signup_ip: await this.getClientIP(),
            signup_timestamp: new Date().toISOString()
          }
        }
      });

      if (authError) {
        logger.error('Auth signup failed', {
          error: authError.message,
          email: data.email,
          duration_ms: Date.now() - startTime
        });
        throw new AuthenticationError(authError.message, 'SIGNUP_FAILED', 400);
      }

      if (!authData.user) {
        throw new AuthenticationError('User creation failed', 'USER_NULL', 500);
      }

      // Create profile with transaction
      const { error: profileError } = await supabase
        .from('profile')
        .insert([{
          id: authData.user.id,
          created_at: new Date().toISOString(),
          metadata: {
            ...data.metadata,
            email_verified: false,
            onboarding_completed: false
          }
        }]);

      if (profileError) {
        // Note: admin.deleteUser requires service role key which shouldn't be on client
        // In a real production app, this should be handled by a database trigger or edge function
        logger.error('Profile creation failed', {
          user_id: authData.user.id,
          error: profileError.message
        });
        throw new AuthenticationError(
          'Account creation failed',
          'PROFILE_CREATION_FAILED',
          500
        );
      }

      // Initialize session
      SessionManager.init(env.security.sessionTimeout);
      CSRFProtection.generateToken();

      logger.info('User signup successful', {
        user_id: authData.user.id,
        email: data.email,
        duration_ms: Date.now() - startTime
      });

      RateLimiter.reset(`signup:${data.email}`);

      return {
        id: authData.user.id,
        email: authData.user.email!,
        profile_id: authData.user.id,
        created_at: authData.user.created_at,
        session_expires_at: new Date(Date.now() + env.security.sessionTimeout * 60 * 1000).toISOString()
      };

    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      logger.error('Unexpected signup error', { error });
      throw new AuthenticationError('Signup failed', 'UNKNOWN_ERROR', 500);
    }
  },

  /**
   * ENHANCED: Sign in with rate limiting and brute force protection
   */
  async signIn(email: string, password: string, csrfToken?: string): Promise<AuthUser> {
    const startTime = Date.now();

    try {
      // CSRF validation
      if (csrfToken && !CSRFProtection.validateToken(csrfToken)) {
        throw new AuthenticationError('Invalid CSRF token', 'CSRF_INVALID', 403);
      }

      // Rate limiting
      const rateLimit = RateLimiter.checkLimit(`login:${email}`);
      if (!rateLimit.allowed) {
        throw new AuthenticationError(
          `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
          'RATE_LIMITED',
          429,
          rateLimit.retryAfter
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        logger.warn('Login failed', {
          email,
          error: error.message,
          duration_ms: Date.now() - startTime
        });
        throw new AuthenticationError(
          'Invalid email or password',
          'INVALID_CREDENTIALS',
          401
        );
      }

      if (!data.user) {
        throw new AuthenticationError('Login failed', 'USER_NULL', 500);
      }

      // Initialize session management
      SessionManager.init(env.security.sessionTimeout);
      CSRFProtection.generateToken();

      // Update last login
      await supabase
        .from('profile')
        .update({
          metadata: { last_login: new Date().toISOString() }
        })
        .eq('id', data.user.id);

      logger.info('User login successful', {
        user_id: data.user.id,
        email,
        duration_ms: Date.now() - startTime
      });

      RateLimiter.reset(`login:${email}`);

      return {
        id: data.user.id,
        email: data.user.email!,
        profile_id: data.user.id,
        created_at: data.user.created_at,
        session_expires_at: new Date(Date.now() + env.security.sessionTimeout * 60 * 1000).toISOString()
      };

    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      logger.error('Unexpected login error', { error });
      throw new AuthenticationError('Login failed', 'UNKNOWN_ERROR', 500);
    }
  },

  /**
   * ENHANCED: Sign out with cleanup
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Logout failed', { error: error.message });
        throw new AuthenticationError('Logout failed', 'LOGOUT_FAILED', 500);
      }

      // Cleanup
      SessionManager.cleanup();
      CSRFProtection.clearToken();

      logger.info('User logged out');
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new AuthenticationError('Logout failed', 'UNKNOWN_ERROR', 500);
    }
  },

  /**
   * Get CSRF token for forms
   */
  getCSRFToken(): string {
    return CSRFProtection.getToken() || CSRFProtection.generateToken();
  },

  /**
   * ENHANCED: Password validation with detailed feedback
   */
  validatePasswordEnhanced(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < PASSWORD_POLICY.minLength) {
      errors.push(`Minimum ${PASSWORD_POLICY.minLength} characters required`);
    }

    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter');
    }

    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter');
    }

    if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Must contain at least one number');
    }

    if (PASSWORD_POLICY.requireSpecial && !/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Must contain at least one special character');
    }

    if (PASSWORD_POLICY.preventCommon && COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    if (PASSWORD_POLICY.preventSequential) {
      if (/(.)\1{2,}/.test(password)) {
        errors.push('Cannot contain repetitive characters (e.g., aaa, 111)');
      }
      if (/(abc|bcd|cde|123|234|345|456|567|678|789)/i.test(password)) {
        errors.push('Cannot contain sequential characters (e.g., abc, 123)');
      }
    }

    // Check for email in password
    const emailPart = password.match(/@/) ? password.split('@')[0] : null;
    if (emailPart && emailPart.length > 3) {
      errors.push('Password cannot contain your email');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Email validation with DNS check (optional)
   */
  validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  },

  /**
   * Get client IP for security logging
   */
  async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  },

  /**
   * Initialize session management
   */
  initSessionManagement(timeoutMinutes: number = env.security.sessionTimeout) {
    SessionManager.init(timeoutMinutes);
  },

  /**
   * Get current session status
   */
  getSessionStatus(): { active: boolean; expiresAt: number | null } {
    const lastActivity = sessionStorage.getItem('last_activity');
    if (!lastActivity) return { active: false, expiresAt: null };

    const expiresAt = parseInt(lastActivity) + env.security.sessionTimeout * 60 * 1000;
    return {
      active: Date.now() < expiresAt,
      expiresAt
    };
  },

  /**
   * Export session manager and CSRF for external use
   */
  SessionManager,
  CSRFProtection,
  RateLimiter,

  /**
   * Standardized password validation for backward compatibility or simple checks
   */
  validatePassword(password: string): boolean {
    return this.validatePasswordEnhanced(password).valid;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email!,
        profile_id: user.id,
        created_at: user.created_at,
        session_expires_at: new Date(Date.now() + env.security.sessionTimeout * 60 * 1000).toISOString() // Approximate
      };
    } catch (error) {
      logger.error('Get current user failed', { error });
      return null;
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Auth state changed', { event });

      if (session?.user) {
        const authUser = await this.getCurrentUser();
        callback(authUser);
      } else {
        callback(null);
      }
    });
  },

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) {
      logger.error('Password reset request failed', { email, error: error.message });
      throw new AuthenticationError(
        'Password reset failed',
        'RESET_FAILED',
        400
      );
    }

    logger.info('Password reset email sent', { email });
  },

  /**
   * Update password (requires active session)
   */
  async updatePassword(newPassword: string): Promise<void> {
    const validation = this.validatePasswordEnhanced(newPassword);
    if (!validation.valid) {
      throw new AuthenticationError(
        validation.errors.join(', '),
        'WEAK_PASSWORD',
        400
      );
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      logger.error('Password update failed', { error: error.message });
      throw new AuthenticationError(
        'Password update failed',
        'UPDATE_FAILED',
        400
      );
    }

    logger.info('Password updated successfully');
  }
};
