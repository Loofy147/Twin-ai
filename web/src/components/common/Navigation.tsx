import React, { useState, useEffect } from 'react';
import {
  Brain, Sparkles, MessageSquare, Lightbulb, BarChart3, Link2, Command, Bell, Settings, User, X, Menu
} from 'lucide-react';
import { CommandPalette } from './CommandPalette';

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setCurrentView }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [notifications] = useState(3);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Sparkles },
    { id: 'questions', label: 'Questions', icon: MessageSquare },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'integrations', label: 'Integrations', icon: Link2 }
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        isScrolled
          ? 'bg-slate-950/80 backdrop-blur-2xl shadow-2xl border-b border-purple-500/10'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setCurrentView('home')}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-950 animate-pulse shadow-lg shadow-green-400/50"></div>
              </div>
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text">
                  Twin-AI
                </div>
                <div className="text-xs text-slate-400">Your Digital Twin</div>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                    currentView === item.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center space-x-3">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all"
              >
                <Command className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">⌘K</span>
              </button>

              <button className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <Bell className="w-5 h-5" />
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>

              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <Settings className="w-5 h-5" />
              </button>

              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-950"></div>
              </div>
            </div>

            <button
              className="md:hidden text-white p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-950/98 backdrop-blur-2xl border-t border-purple-500/10">
            <div className="px-4 py-6 space-y-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    currentView === item.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300'
                      : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} setCurrentView={setCurrentView} />
    </>
  );
};
