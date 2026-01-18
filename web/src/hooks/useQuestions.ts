import { useState, useEffect, useCallback } from 'react';
import { databaseService, Question, Response } from '../services/database.service';

export const useQuestions = (limit: number = 10) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await databaseService.fetchQuestions(limit);
      setQuestions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const submitAnswer = async (response: Response) => {
    try {
      await databaseService.submitResponse(response);
      return true;
    } catch (err: any) {
      console.error('Submission error:', err);
      return false;
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  return { questions, loading, error, reloadQuestions: loadQuestions, submitAnswer };
};
