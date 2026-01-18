import React, { useState } from 'react';
import DigitalTwinSimulator from './components/DigitalTwinDemo';
import IntegrationManager from './components/IntegrationManager';
import QuestionAnswering from './components/QuestionAnswering';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'demo' | 'integrations' | 'questions'>('demo');

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <nav className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Twin-AI
          </div>
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('demo')}
              className={`pb-1 border-b-2 transition-all ${activeTab === 'demo' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'}`}
            >
              RL Demo
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`pb-1 border-b-2 transition-all ${activeTab === 'integrations' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'}`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`pb-1 border-b-2 transition-all ${activeTab === 'questions' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'}`}
            >
              Questions
            </button>
          </div>
        </div>
      </nav>

      <main className="p-4">
        {activeTab === 'demo' && <DigitalTwinSimulator />}
        {activeTab === 'integrations' && (
          <div className="max-w-4xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-6">Manage Integrations</h2>
            <IntegrationManager />
          </div>
        )}
        {activeTab === 'questions' && (
          <div className="max-w-2xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-6">Answer Questions</h2>
            <QuestionAnswering />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
