import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../lib/logger';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * Global error boundary with recovery mechanisms
 * Captures React rendering errors and provides graceful degradation
 */
export class ErrorBoundary extends Component<Props, State> {
  private errorTimeouts: number[] = [];
  private readonly maxErrorsBeforeCrash = 5;
  private readonly errorResetTimeout = 5000; // 5 seconds

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorCount } = this.state;
    const newErrorCount = errorCount + 1;

    // Log error with full stack trace
    logger.error('React Error Boundary caught error', {
      error_message: error.message,
      error_stack: error.stack,
      component_stack: errorInfo.componentStack,
      error_count: newErrorCount,
      error_name: error.name
    });

    // Update state with error details
    this.setState({
      errorInfo,
      errorCount: newErrorCount
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Reset error count after timeout
    const timeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        errorCount: Math.max(0, prevState.errorCount - 1)
      }));
    }, this.errorResetTimeout);

    this.errorTimeouts.push(timeoutId);

    // Send to external error tracking
    this.sendToErrorTracking(error, errorInfo);
  }

  componentWillUnmount() {
    // Clear all pending timeouts
    this.errorTimeouts.forEach(clearTimeout);
  }

  private sendToErrorTracking(error: Error, errorInfo: ErrorInfo) {
    // Integration with Sentry or similar
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          error_boundary: 'true'
        }
      });
    }
  }

  private handleReset = () => {
    logger.info('Error boundary reset triggered', {
      previous_error: this.state.error?.message
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    });
  };

  private handleReload = () => {
    logger.info('Full page reload triggered from error boundary');
    window.location.reload();
  };

  private handleGoHome = () => {
    logger.info('Navigation to home triggered from error boundary');
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Too many errors - show critical failure
    if (errorCount >= this.maxErrorsBeforeCrash) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-gradient-to-br from-red-900/20 to-rose-900/20 border-2 border-red-500/50 rounded-2xl p-8 backdrop-blur-xl">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Critical Error</h1>
                  <p className="text-red-300">Multiple errors detected</p>
                </div>
              </div>

              <div className="bg-red-950/30 rounded-xl p-4 mb-6 font-mono text-sm text-red-200">
                <p className="mb-2">Error: {error?.message}</p>
                <p className="text-red-300/70">Error count: {errorCount}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Reload Application</span>
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <Home className="w-5 h-5" />
                  <span>Go to Home</span>
                </button>
              </div>

              <div className="mt-6 text-center text-sm text-slate-400">
                If this persists, please contact support with the error details above.
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default error UI
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                <p className="text-slate-400">We encountered an unexpected error</p>
              </div>
            </div>

            {/* Error Details (Development Only) */}
            {import.meta.env.MODE === 'development' && error && (
              <div className="bg-slate-950/50 rounded-xl p-4 mb-6 overflow-auto max-h-64">
                <p className="text-red-400 font-mono text-sm mb-2">{error.message}</p>
                {error.stack && (
                  <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
                {errorInfo?.componentStack && (
                  <details className="mt-4">
                    <summary className="text-slate-400 text-sm cursor-pointer hover:text-slate-300">
                      Component Stack
                    </summary>
                    <pre className="text-slate-500 font-mono text-xs mt-2 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Production Error Message */}
            {import.meta.env.MODE === 'production' && (
              <div className="bg-slate-950/50 rounded-xl p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  An error occurred while rendering this page. This issue has been logged
                  and our team has been notified.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Try Again</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <Home className="w-5 h-5" />
                <span>Go Home</span>
              </button>
            </div>

            {/* Support Information */}
            <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-slate-400 text-sm">
                Need help? Contact{' '}
                <a
                  href="mailto:support@twin-ai.app"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  support@twin-ai.app
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Hook for programmatic error handling within components
 */
export const useErrorHandler = () => {
  const [, setError] = React.useState<Error>();

  return React.useCallback((error: Error) => {
    logger.error('Manual error boundary trigger', {
      error_message: error.message,
      error_stack: error.stack
    });
    setError(() => {
      throw error;
    });
  }, []);
};
