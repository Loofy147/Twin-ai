import React, { useState, memo } from 'react';
import { validateEmail, validateRequired } from '../../utils/validation';

// BOLT: Localized state for subscription form to prevent application-wide re-renders
// Expected: -100% re-renders of parent views (Home, Analytics, etc.) when typing in footer
export const SubscribeForm: React.FC = memo(() => {
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
  );
});

SubscribeForm.displayName = 'SubscribeForm';
