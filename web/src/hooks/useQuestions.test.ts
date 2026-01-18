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
});
