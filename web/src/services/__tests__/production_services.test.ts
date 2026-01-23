import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock environment before any imports
vi.mock('../../config/env.config', () => ({
  env: {
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-key',
    },
    logging: { level: 'debug' },
    features: { enableRLTraining: true },
    security: {
        sessionTimeout: 30,
        passwordMinLength: 10
    },
    rateLimits: { questionsPerHour: 100, apiCallsPerMinute: 60 }
  },
  getEnv: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getRateLimit: vi.fn(),
  validator: {
    validate: vi.fn(() => ({})),
    getConfig: vi.fn(() => ({ security: { sessionTimeout: 30, passwordMinLength: 10 } })),
    isProduction: vi.fn(() => false),
    isDevelopment: vi.fn(() => true)
  }
}));

// Mock Logger to avoid import.meta issues
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    startTimer: vi.fn(() => vi.fn()),
  }
}));

import { authService } from '../auth.service';
import { databaseService } from '../database.service';
import { supabase } from '../../lib/supabase';

// Helper to create a chainable mock
const createChainableMock = () => {
  const mock: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
  };
  // Make the mock itself thenable if it's the end of the chain
  mock.then = (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled);
  return mock;
};

const chainableMock = createChainableMock();

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => chainableMock),
    rpc: vi.fn(),
  },
}));

describe('Production AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signUp should validate password strength', async () => {
    await expect(authService.signUp({ email: 'test@example.com', password: 'weak' }))
      .rejects.toThrow('Minimum 10 characters required');
  });

  it('signIn should call supabase auth', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: 'uuid-1', email: 'test@example.com', created_at: new Date().toISOString() } },
      error: null,
    });

    // Mock profile update
    (supabase.from as any).mockReturnValue(chainableMock);
    chainableMock.update.mockReturnThis();
    chainableMock.eq.mockReturnThis();
    chainableMock.then = (onfulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onfulfilled);

    const user = await authService.signIn('test@example.com', 'SafePass99!@#');
    expect(user.id).toBe('uuid-1');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'SafePass99!@#',
    });
  });
});

describe('Production DatabaseService', () => {
  it('getProfile should use profileId', async () => {
    const mockProfile = { id: 'uuid-1', total_responses: 10 };
    chainableMock.single.mockResolvedValue({ data: mockProfile, error: null });

    const profile = await databaseService.getProfile('uuid-1');
    expect(profile.id).toBe('uuid-1');
    expect(supabase.from).toHaveBeenCalledWith('profile');
    expect(chainableMock.eq).toHaveBeenCalledWith('id', 'uuid-1');
  });
});
