import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, AuthUser } from '../services/auth.service';
import { logger } from '../lib/logger';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          logger.info('Auth state initialized', { user_id: currentUser.id });
        }
      } catch (err: any) {
        logger.error('Auth initialization failed', { error: err.message });
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);

      if (authUser) {
        logger.info('Auth state changed: user logged in', { user_id: authUser.id });
      } else {
        logger.info('Auth state changed: user logged out');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const newUser = await authService.signUp({ email, password });
      setUser(newUser);
      logger.info('User signed up successfully', { user_id: newUser.id });
    } catch (err: any) {
      const errorMessage = err.message || 'Signup failed';
      setError(errorMessage);
      logger.error('Signup failed in context', { error: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const authUser = await authService.signIn(email, password);
      setUser(authUser);
      logger.info('User signed in successfully', { user_id: authUser.id });
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      logger.error('Login failed in context', { error: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await authService.signOut();
      setUser(null);
      logger.info('User signed out successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Logout failed';
      setError(errorMessage);
      logger.error('Logout failed in context', { error: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      await authService.resetPassword(email);
      logger.info('Password reset requested', { email });
    } catch (err: any) {
      const errorMessage = err.message || 'Password reset failed';
      setError(errorMessage);
      logger.error('Password reset failed in context', { error: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        resetPassword,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context
 * Throws error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

/**
 * Higher-order component to protect routes
 * Redirects to login if user is not authenticated
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { user, loading } = useAuth();
    const navigate = (path: string) => {
      window.location.href = path;
    };

    useEffect(() => {
      if (!loading && !user) {
        logger.warn('Unauthorized access attempt', {
          path: window.location.pathname
        });
        navigate('/login');
      }
    }, [user, loading]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-white text-lg">Loading...</div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
};
