import React from 'react';
import { Sparkles, ArrowRight, BarChart3, Brain, Zap } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { AnimatedCounter } from '../common/AnimatedCounter';

interface HomeViewProps {
  setCurrentView: (view: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setCurrentView }) => {
  const [ref, isVisible] = useIntersectionObserver();

  return (
    <div className="min-h-screen">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full filter blur-3xl animate-blob"></div>
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} ref={ref}>
            <div className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-500/20 rounded-full mb-8 hover:border-purple-500/40 transition-all">
              <Sparkles className="w-4 h-4 text-purple-400 mr-2 animate-pulse" />
              <span className="text-sm text-purple-300 font-semibold">AI That Learns YOU, Not About You</span>
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white mb-8 leading-[1.1]">
              Your Personal
              <span className="block mt-3 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text">
                Digital Twin
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Unlike AI assistants that ask you to explain yourself, Twin-AI learns through your
              <span className="text-purple-400 font-semibold"> actual behavior</span>, building a true digital replica.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
              <button
                onClick={() => setCurrentView('questions')}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold overflow-hidden hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-500 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10 flex items-center justify-center">
                  Start Learning Journey
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
              </button>

              <button
                onClick={() => setCurrentView('analytics')}
                className="group px-8 py-4 bg-white/5 backdrop-blur-xl text-white rounded-2xl font-bold border-2 border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-500 hover:scale-105"
              >
                <span className="flex items-center justify-center">
                  <BarChart3 className="mr-2 w-5 h-5" />
                  View Analytics
                </span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { value: 5000, suffix: '+', label: 'Questions Bank', color: 'text-purple-400' },
                { value: 15, suffix: '', label: 'Life Dimensions', color: 'text-pink-400' },
                { value: 100, suffix: '%', label: 'Privacy First', color: 'text-cyan-400' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
                  <div className={`text-4xl font-black ${stat.color} mb-2`}>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900/50 to-purple-900/20 rounded-[3rem] p-12 border border-white/5 relative overflow-hidden group">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
                  <Brain className="w-4 h-4 text-purple-400 mr-2" aria-hidden="true" />
                  <span className="text-sm text-purple-300 font-bold uppercase tracking-wider">Reinforcement Learning</span>
                </div>
                <h2 className="text-4xl font-black text-white mb-6">Autonomous <span className="text-purple-400">Decision Engine</span></h2>
                <p className="text-slate-400 text-lg mb-8">Our RL agent learns your values through thousands of iterations in a simulated environment grounded in your life patterns.</p>
                <button onClick={() => setCurrentView('twin')} className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold hover:bg-purple-50 transition-all flex items-center group/btn focus-visible:ring-4 focus-visible:ring-purple-500/50 outline-none">
                  Launch Simulator <Zap className="ml-2 w-5 h-5 text-purple-600 group-hover/btn:scale-110 transition-transform" aria-hidden="true" />
                </button>
              </div>
              <div className="relative h-64 bg-slate-950/50 rounded-2xl border border-white/5 flex items-center justify-center">
                <Brain className="w-24 h-24 text-purple-500 animate-pulse" aria-hidden="true" />
                <div className="absolute top-1/4 right-1/4 w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center animate-bounce">
                  <Zap className="w-6 h-6 text-pink-400" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
