import { useState, useEffect, useCallback, useMemo } from 'react';
import { databaseService, Question, Response } from '../services/database.service';

export const useQuestions = (limit: number = 10, profileId?: string) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      const { data, count, error: fetchError } = await databaseService.getQuestions({
        limit,
        offset,
        dimensionId: selectedDimension || undefined,
        profileId,
        excludeAnswered: !!profileId
      });

      if (fetchError) throw fetchError;

      setQuestions(data || []);
      setTotalCount(count || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [limit, page, selectedDimension, profileId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedDimension]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

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

  // BOLT OPTIMIZATION: Memoized totalPages to avoid redundant division and rounding on every render
  const totalPages = useMemo(() => Math.ceil(totalCount / limit), [totalCount, limit]);

  return {
    questions,
    loading,
    error,
    page,
    totalCount,
    totalPages,
    selectedDimension,
    setSelectedDimension,
    goToPage,
    submitAnswer,
    reloadQuestions: loadQuestions
  };
};
