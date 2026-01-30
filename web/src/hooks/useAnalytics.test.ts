import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';
import { databaseService } from '../services/database.service';
import { useAuth } from '../contexts/AuthContext';

// Mock the dependencies
vi.mock('../services/database.service', () => ({
  databaseService: {
    getAnalytics: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useAnalytics', () => {
  const mockUser = { id: 'test-user-id' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  it('should consolidate state and finish loading on success', async () => {
    const mockResponse = {
      metrics: { total_questions: 10 },
      holistic_alignment: { score: 85 },
      patterns: [{ id: 1 }],
      weekly_activity: [{ day: 'Mon', responses: 5 }],
      dimension_breakdown: []
    };

    (databaseService.getAnalytics as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.metrics).toEqual(mockResponse.metrics);
    expect(result.current.patterns).toEqual(mockResponse.patterns);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors and finish loading', async () => {
    (databaseService.getAnalytics as any).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fetch failed');
    expect(result.current.metrics).toBeNull();
  });

  it('should finish loading even if analyticsResponse is null', async () => {
    (databaseService.getAnalytics as any).mockResolvedValue(null);

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.analyticsData).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
