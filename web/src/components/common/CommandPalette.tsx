import React, { useState, useEffect, useRef } from 'react';
import {
  Search, MessageSquare, Lightbulb, BarChart3, Link2, Brain, Settings, Download
} from 'lucide-react';
import { sanitizeString } from '../../utils/validation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setCurrentView: (view: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, setCurrentView }) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { id: 'questions', label: 'Answer Questions', icon: MessageSquare, shortcut: 'Q', view: 'questions' },
    { id: 'insights', label: 'View Insights', icon: Lightbulb, shortcut: 'I', view: 'insights' },
    { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3, shortcut: 'A', view: 'analytics' },
    { id: 'integrations', label: 'Manage Integrations', icon: Link2, shortcut: 'M', view: 'integrations' },
    { id: 'twin', label: 'Digital Twin', icon: Brain, shortcut: 'T', view: 'twin' },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'S', view: 'settings' },
    { id: 'export', label: 'Export Data', icon: Download, shortcut: 'E', action: 'export' }
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleCommand = (cmd: any) => {
    if (cmd.view) {
      setCurrentView(cmd.view);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl mx-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center space-x-3 px-6 py-4 border-b border-slate-700/50">
          <Search className="w-5 h-5 text-slate-400" aria-hidden="true" />
          {/* PALETTE: Screen readers associate label with input - WCAG 1.3.1 (A) */}
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(sanitizeString(e.target.value))}
            placeholder="Type a command or search..."
            aria-label="Search commands"
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none"
          />
          <kbd className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => handleCommand(cmd)}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <cmd.icon className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                <span className="text-white">{cmd.label}</span>
              </div>
              <kbd className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">{cmd.shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
