import { describe, it, expect } from 'vitest';
import { validateEmail, validateRequired, validatePassword } from './validation';

describe('Validation Utilities', () => {
  it('validates email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('validates required fields', () => {
    expect(validateRequired('content')).toBe(true);
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
  });

  it('validates passwords', () => {
    expect(validatePassword('Password123!')).toBe(true);
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('no-special-char123')).toBe(false);
  });
});
