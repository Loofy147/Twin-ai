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
    if (!user) return;

    try {
      setLoading(true);
      const [analytics, detectedPatterns, userMetrics] = await Promise.all([
        databaseService.getAnalytics(user.id),
        databaseService.getPatterns(user.id),
        databaseService.getUserMetrics(user.id)
      ]);
      setAnalyticsData(analytics);
      setPatterns(detectedPatterns);
      setMetrics(userMetrics);
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
