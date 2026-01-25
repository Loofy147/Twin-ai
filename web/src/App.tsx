import React, { useState } from 'react';
import { Github } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navigation } from './components/common/Navigation';
import { HomeView } from './components/views/HomeView';
import { validateEmail, validateRequired } from './utils/validation';
import { QuestionsView } from './components/views/QuestionsView';
import { InsightsView } from './components/views/InsightsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { IntegrationsView } from './components/views/IntegrationsView';
import DigitalTwinSimulator from './components/DigitalTwinDemo';

const AppContent: React.FC = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('home');
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

  const renderView = () => {
    switch(currentView) {
      case 'home': return <HomeView setCurrentView={setCurrentView} />;
      case 'questions': return <QuestionsView />;
      case 'insights': return <InsightsView />;
      case 'analytics': return <AnalyticsView />;
      case 'integrations': return <IntegrationsView />;
      case 'twin': return <DigitalTwinSimulator />;
      default: return <HomeView setCurrentView={setCurrentView} />;
    }
  };

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRequired(email)) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }
    setEmailError('');
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 3000);
    setEmail('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Initializing Digital Twin...</div>
      </div>
    );
  }

  if (!user && import.meta.env.VITE_MOCK_DATA_MODE !== 'true') {
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
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-sans">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => signOut()}
          className="bg-slate-800/50 hover:bg-slate-800 border border-white/10 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-all"
        >
          Sign Out
        </button>
      </div>
      <main>
        {renderView()}
      </main>

      <footer className="bg-slate-900 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-xl font-bold mb-2">Stay Updated</h3>
              <p className="text-slate-400">Get the latest insights from your Digital Twin development.</p>
            </div>
            <form onSubmit={handleSubscribe} className="relative">
              <div className="flex gap-2">
                {/* PALETTE: Screen reader label for input - WCAG: 3.3.2 (A) */}
                <label htmlFor="footer-subscribe" className="sr-only">Email address</label>
                <input
                  id="footer-subscribe"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`flex-1 bg-slate-800 border ${emailError ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 outline-none focus:border-purple-500 transition-colors`}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "subscribe-error" : undefined}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {subscribed ? 'Subscribed!' : 'Subscribe'}
                </button>
              </div>
              {emailError && (
                /* PALETTE: Immediate feedback for validation errors - WCAG: 4.1.3 (AA) */
                <p id="subscribe-error" className="absolute -bottom-6 left-0 text-xs text-red-500" role="alert">
                  {emailError}
                </p>
              )}
            </form>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-slate-500 text-sm">
            © 2024 Twin-AI. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
