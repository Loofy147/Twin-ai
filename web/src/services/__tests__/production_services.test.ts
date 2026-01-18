// Mock environment before any imports
jest.mock('../../config/env.config', () => ({
  env: {
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-key',
    },
    logging: { level: 'debug' },
    features: { enableRLTraining: true },
    rateLimits: { questionsPerHour: 100, apiCallsPerMinute: 60 }
  },
  getEnv: jest.fn(),
  isFeatureEnabled: jest.fn(),
  getRateLimit: jest.fn()
}));

import { authService } from '../auth.service';
import { databaseService } from '../database.service';
import { supabase } from '../../lib/supabase';

// Mock Logger to avoid import.meta issues
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    startTimer: jest.fn(() => jest.fn()),
  }
}));

// Helper to create a chainable mock
const createChainableMock = () => {
  const mock: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
  };
  // Make the mock itself thenable if it's the end of the chain
  mock.then = (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled);
  return mock;
};

const chainableMock = createChainableMock();

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => chainableMock),
    rpc: jest.fn(),
  },
}));

describe('Production AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signUp should validate password strength', async () => {
    await expect(authService.signUp({ email: 'test@example.com', password: 'weak' }))
      .rejects.toThrow('Password must be at least 8 characters');
  });

  test('signIn should call supabase auth', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { id: 'uuid-1', email: 'test@example.com' } },
      error: null,
    });

    const user = await authService.signIn('test@example.com', 'Password123');
    expect(user.id).toBe('uuid-1');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
    });
  });
});

describe('Production DatabaseService', () => {
  test('getProfile should use profileId', async () => {
    const mockProfile = { id: 'uuid-1', total_responses: 10 };
    chainableMock.single.mockResolvedValue({ data: mockProfile, error: null });

    const profile = await databaseService.getProfile('uuid-1');
    expect(profile.id).toBe('uuid-1');
    expect(supabase.from).toHaveBeenCalledWith('profile');
    expect(chainableMock.eq).toHaveBeenCalledWith('id', 'uuid-1');
  });
});
