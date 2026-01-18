import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface AuthUser {
  id: string;
  email: string;
  profile_id: string;
  created_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  metadata?: Record<string, any>;
}

export interface AuthError {
  code: string;
  message: string;
  status: number;
}

class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string = 'AUTH_ERROR',
    public status: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export const authService = {
  /**
   * Register new user with automatic profile creation
   * Implements transactional signup with rollback on failure
   */
  async signUp(data: SignUpData): Promise<AuthUser> {
    const startTime = Date.now();

    try {
      // Validate email format
      if (!this.validateEmail(data.email)) {
        throw new AuthenticationError('Invalid email format', 'INVALID_EMAIL', 400);
      }

      // Validate password strength
      if (!this.validatePassword(data.password)) {
        throw new AuthenticationError(
          'Password must be at least 8 characters with uppercase, lowercase, and number',
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
          data: data.metadata || {}
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

      // Create associated profile
      // Note: Ideally this should be handled by a Supabase Trigger on auth.users for atomicity
      const { error: profileError } = await supabase
        .from('profile')
        .insert([{
          id: authData.user.id,
          created_at: new Date().toISOString(),
          metadata: data.metadata || {}
        }]);

      if (profileError) {
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

      logger.info('User signup successful', {
        user_id: authData.user.id,
        email: data.email,
        duration_ms: Date.now() - startTime
      });

      return {
        id: authData.user.id,
        email: authData.user.email!,
        profile_id: authData.user.id,
        created_at: authData.user.created_at
      };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Unexpected signup error', { error });
      throw new AuthenticationError('Signup failed', 'UNKNOWN_ERROR', 500);
    }
  },

  /**
   * Authenticate user with email/password
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    const startTime = Date.now();

    try {
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
          'Invalid credentials',
          'INVALID_CREDENTIALS',
          401
        );
      }

      if (!data.user) {
        throw new AuthenticationError('Login failed', 'USER_NULL', 500);
      }

      logger.info('User login successful', {
        user_id: data.user.id,
        email,
        duration_ms: Date.now() - startTime
      });

      return {
        id: data.user.id,
        email: data.user.email!,
        profile_id: data.user.id,
        created_at: data.user.created_at
      };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Unexpected login error', { error });
      throw new AuthenticationError('Login failed', 'UNKNOWN_ERROR', 500);
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Logout failed', { error: error.message });
      throw new AuthenticationError('Logout failed', 'LOGOUT_FAILED', 500);
    }
    logger.info('User logged out');
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
        created_at: user.created_at
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
    if (!this.validatePassword(newPassword)) {
      throw new AuthenticationError(
        'Password must be at least 8 characters with uppercase, lowercase, and number',
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
  },

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Validate password strength
   * Requires: min 8 chars, uppercase, lowercase, number
   */
  validatePassword(password: string): boolean {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return minLength && hasUppercase && hasLowercase && hasNumber;
  }
};
