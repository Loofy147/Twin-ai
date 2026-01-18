export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRequired = (value: any): boolean => {
  return value !== undefined && value !== null && value.toString().trim().length > 0;
};

export const validateMinLength = (value: any, min: number): boolean => {
  return value !== undefined && value !== null && value.toString().length >= min;
};

export const validateMaxLength = (value: any, max: number): boolean => {
  return value !== undefined && value !== null && value.toString().length <= max;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeString = (str: string): string => {
  return str.replace(/[<>]/g, '').trim();
};

export const validatePassword = (password: string): boolean => {
  // Min 8 chars, at least one uppercase, one lowercase, one number, and one special char
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return re.test(password);
};
