import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/database.service';
import { useAuth } from '../contexts/AuthContext';

export const useAnalytics = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // BOLT OPTIMIZATION: Reduced 3 API calls to 2 by using the comprehensive analytics RPC
      const [analyticsResponse, detectedPatterns] = await Promise.all([
        databaseService.getAnalytics(user.id),
        databaseService.getPatterns(user.id)
      ]);

      if (analyticsResponse) {
        setAnalyticsData(analyticsResponse.dimension_breakdown || []);
        setMetrics(analyticsResponse.metrics);
      }

      setPatterns(detectedPatterns);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { analyticsData, patterns, metrics, loading, error, reloadData: loadData };
};
