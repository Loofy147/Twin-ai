import React, { useState, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navigation } from './components/common/Navigation';
import { SubscribeForm } from './components/common/SubscribeForm';

// Lazy-loaded Views
const HomeView = lazy(() => import('./components/views/HomeView').then(m => ({ default: m.HomeView })));
const QuestionsView = lazy(() => import('./components/views/QuestionsView').then(m => ({ default: m.QuestionsView })));
const InsightsView = lazy(() => import('./components/views/InsightsView').then(m => ({ default: m.InsightsView })));
const AnalyticsView = lazy(() => import('./components/views/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const IntegrationsView = lazy(() => import('./components/views/IntegrationsView').then(m => ({ default: m.IntegrationsView })));
const DigitalTwinSimulator = lazy(() => import('./components/DigitalTwinDemo'));
const AuthView = lazy(() => import('./components/views/AuthView').then(m => ({ default: m.AuthView })));

const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('home');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Initializing Digital Twin...</div>
      </div>
    );
  }

  if (!user && import.meta.env.VITE_MOCK_DATA_MODE !== 'true') {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
      }>
        <AuthView />
      </Suspense>
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
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-slate-400">Loading view...</p>
          </div>
        }>
          {renderView()}
        </Suspense>
      </main>

      <footer className="bg-slate-900 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-xl font-bold mb-2">Stay Updated</h3>
              <p className="text-slate-400">Get the latest insights from your Digital Twin development.</p>
            </div>
            <SubscribeForm />
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
