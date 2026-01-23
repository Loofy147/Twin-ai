// web/src/utils/validation.ts

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
};

export const validateRequired = (value: any): boolean => {
  if (value === undefined || value === null) return false;
  return value.toString().trim().length > 0;
};

export const validateMinLength = (value: any, min: number): boolean => {
  if (value === undefined || value === null) return false;
  return value.toString().length >= min;
};

export const validateMaxLength = (value: any, max: number): boolean => {
  if (value === undefined || value === null) return false;
  return value.toString().length <= max;
};

export const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const sanitizeString = (str: string): string => {
  return str.replace(/[<>\"\'&]/g, (match) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
      '\'': '&#39;',
      '&': '&amp;'
    };
    return entities[match];
  }).trim();
};

/**
 * Enhanced Password Validation
 * Aligned with production security policy:
 * - Minimum 10 characters
 * - Uppercase, lowercase, number, and special character required
 * - Prevents simple sequential characters
 */
export const validatePassword = (password: string): boolean => {
  if (!password || password.length < 10) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  // Prevent common sequential patterns
  const isSequential = /(123|abc|qwerty)/i.test(password);
  const isRepetitive = /(.)\1{2,}/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecial && !isSequential && !isRepetitive;
};

/**
 * Detailed password strength result
 */
export const getPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  if (!password) return { score: 0, feedback: ['Password is required'], isStrong: false };

  if (password.length >= 10) score += 25;
  else feedback.push('Minimum 10 characters required');

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('At least one uppercase letter');

  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('At least one lowercase letter');

  if (/[0-9]/.test(password)) score += 15;
  else feedback.push('At least one number');

  if (/[@$!%*?&]/.test(password)) score += 15;
  else feedback.push('At least one special character');

  if (!/(123|abc|qwerty)/i.test(password)) score += 15;
  else feedback.push('Avoid sequential patterns (123, abc)');

  return {
    score: Math.min(100, score),
    feedback,
    isStrong: score >= 85
  };
};
