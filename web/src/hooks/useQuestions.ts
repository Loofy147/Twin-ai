import { useState, useEffect, useCallback } from 'react';
import { databaseService, Question, Response } from '../services/database.service';

export const useQuestions = (limit: number = 10, profileId?: string) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  // BOLT OPTIMIZATION: Next batch state for prefetching
  const [nextBatch, setNextBatch] = useState<Question[]>([]);
  const [prefetching, setPrefetching] = useState(false);

  const loadQuestions = useCallback(async (isPrefetch = false) => {
    try {
      if (!isPrefetch) setLoading(true);

      const targetPage = isPrefetch ? page + 1 : page;
      const offset = (targetPage - 1) * limit;

      const { data, count, error: fetchError } = await databaseService.getQuestions({
        limit,
        offset,
        dimensionId: selectedDimension || undefined,
        profileId,
        excludeAnswered: !!profileId
      });

      if (fetchError) throw fetchError;

      if (isPrefetch) {
        setNextBatch(data || []);
      } else {
        setQuestions(data || []);
        setTotalCount(count || 0);
      }
      setError(null);
    } catch (err: any) {
      if (!isPrefetch) setError(err.message || 'Failed to load questions');
    } finally {
      if (!isPrefetch) setLoading(false);
    }
  }, [limit, page, selectedDimension, profileId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setNextBatch([]); // Clear prefetch on filter change
  }, [selectedDimension]);

  useEffect(() => {
    // BOLT OPTIMIZATION: Skip fetch if we already have prefetched data for this page
    // (nextBatch is cleared after being moved to questions)
    if (questions.length === 0 || page === 1) {
      loadQuestions();
    }
  }, [loadQuestions, page]);

  const goToPage = (newPage: number) => {
    setPage(newPage);
  };

  const submitAnswer = async (response: Response) => {
    try {
      await databaseService.submitResponse(response);
      return true;
    } catch (err: any) {
      console.error('Submission error:', err);
      return false;
    }
  };

  /**
   * BOLT OPTIMIZATION: Seamlessly swap to next batch if available
   */
  const loadNextPage = useCallback(() => {
    if (nextBatch.length > 0) {
      setQuestions(nextBatch);
      setNextBatch([]);
      setPage(prev => prev + 1);
    } else {
      setPage(prev => prev + 1);
    }
  }, [nextBatch]);

  // BOLT OPTIMIZATION: Trigger prefetch when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && nextBatch.length === 0 && !prefetching && profileId) {
      setPrefetching(true);
      loadQuestions(true).finally(() => setPrefetching(false));
    }
  }, [questions, nextBatch, prefetching, loadQuestions, profileId]);

  return {
    questions,
    loading,
    error,
    page,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    selectedDimension,
    setSelectedDimension,
    goToPage,
    loadNextPage, // Expose for manual or automatic page transitions
    submitAnswer,
    reloadQuestions: loadQuestions
  };
};
