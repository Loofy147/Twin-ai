import React, { useState, memo } from 'react';
import { Github } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * BOLT OPTIMIZATION: AuthView extracted to localize state.
 * Prevents application-wide re-renders of AppContent on every keystroke in the login form.
 * Expected: -100% re-renders of Navigation and main views during authentication typing.
 */
export const AuthView: React.FC = memo(() => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signIn(authEmail, authPassword);
      } else {
        await signUp(authEmail, authPassword);
      }
    } catch (err) {
      // Error handled by context
    }
  };

  const handleGitHubSignIn = async () => {
    try {
      // In a real app, this would use supabase.auth.signInWithOAuth
      // but we'll use a placeholder for now to match the project style
      console.log('GitHub Sign In initiated');
    } catch (err) {
      console.error('GitHub Sign In failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Digital Twin AI
          </h1>
          <p className="text-slate-400 mt-2">Sign in to your personal intelligence</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            {/* PALETTE: Explicit label association - WCAG: 1.3.1 (A) */}
            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input
              id="auth-email"
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500 transition-colors"
              required
              aria-required="true"
            />
          </div>
          <div>
            {/* PALETTE: Explicit label association - WCAG: 1.3.1 (A) */}
            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input
              id="auth-password"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500 transition-colors"
              required
              aria-required="true"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGitHubSignIn}
            className="w-full bg-slate-800 border border-white/10 hover:bg-slate-700 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
          >
            <Github className="w-5 h-5" />
            <span>GitHub</span>
          </button>
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
});

AuthView.displayName = 'AuthView';
