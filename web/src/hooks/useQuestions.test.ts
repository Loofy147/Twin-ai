import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuestions } from './useQuestions';
import { databaseService } from '../services/database.service';

vi.mock('../services/database.service', () => ({
  databaseService: {
    getQuestions: vi.fn(),
  },
}));

describe('useQuestions Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets page when filters change', async () => {
    const mockQuestions = [{ id: '1', text: 'Q1' }];
    (databaseService.getQuestions as any).mockResolvedValue({ data: mockQuestions, count: 1 });

    const { result } = renderHook(() => useQuestions());

    // Wait for initial load
    await act(async () => {});

    // Set page to 2
    await act(async () => {
      result.current.goToPage(2);
    });
    expect(result.current.page).toBe(2);

    // Change dimension
    await act(async () => {
      result.current.setSelectedDimension('Values');
    });

    // Should reset to page 1
    expect(result.current.page).toBe(1);
    expect(databaseService.getQuestions).toHaveBeenCalledWith(expect.objectContaining({
      offset: 0,
      dimensionId: 'Values'
    }));
  });

  it('prefetches the next batch of questions', async () => {
    const mockBatch1 = [{ id: '1', text: 'Q1' }];
    const mockBatch2 = [{ id: '2', text: 'Q2' }];

    (databaseService.getQuestions as any)
      .mockResolvedValueOnce({ data: mockBatch1, count: 2 }) // Initial load
      .mockResolvedValueOnce({ data: mockBatch2, count: 2 }); // Prefetch load

    const { result } = renderHook(() => useQuestions(1, 'profile1'));

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check initial questions
    expect(result.current.questions).toEqual(mockBatch1);

    // Wait for prefetch to be triggered and completed
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow prefetch effect to run
    });

    // databaseService.getQuestions should have been called twice (load + prefetch)
    expect(databaseService.getQuestions).toHaveBeenCalledTimes(2);
    expect(databaseService.getQuestions).toHaveBeenLastCalledWith(expect.objectContaining({
      offset: 1 // Next page
    }));

    // Swap to next page
    await act(async () => {
      result.current.loadNextPage();
    });

    // We might need another tick for state updates to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.questions).toEqual(mockBatch2);
    expect(result.current.page).toBe(2);
  });
});
