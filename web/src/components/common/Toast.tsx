import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

// BOLT OPTIMIZATION: Hoisted configurations to avoid object creation on every render.
const ICONS: Record<string, any> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle
};

const COLORS: Record<string, string> = {
  success: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300',
  error: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300',
  info: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300',
  warning: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-300'
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = ICONS[type] || Info;

  return (
    // PALETTE: Screen reader accessibility - WCAG 4.1.3 (AA)
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-6 py-4 bg-gradient-to-r ${COLORS[type]} border rounded-xl shadow-2xl backdrop-blur-xl animate-slide-up`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span className="font-medium">{message}</span>
      {/* PALETTE: Screen reader users can identify action - WCAG 4.1.2 (A) */}
      <button
        onClick={onClose}
        aria-label="Close notification"
        className="ml-2 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded-lg"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
