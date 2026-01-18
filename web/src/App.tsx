import React, { useState } from 'react';
import { Navigation } from './components/common/Navigation';
import { HomeView } from './components/views/HomeView';
import { validateEmail, validateRequired } from './utils/validation';
import { QuestionsView } from './components/views/QuestionsView';
import { InsightsView } from './components/views/InsightsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { IntegrationsView } from './components/views/IntegrationsView';
import DigitalTwinSimulator from './components/DigitalTwinDemo';

const App: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-sans">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
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
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`flex-1 bg-slate-800 border ${emailError ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 outline-none focus:border-purple-500 transition-colors`}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {subscribed ? 'Subscribed!' : 'Subscribe'}
                </button>
              </div>
              {emailError && <p className="absolute -bottom-6 left-0 text-xs text-red-500">{emailError}</p>}
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

export default App;
