import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/database.service';
import { useAuth } from '../contexts/AuthContext';

export const useAnalytics = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // BOLT OPTIMIZATION: Reduced API calls to a single unified RPC for all dashboard data.
      // This includes metrics, dimension breakdown, weekly activity, and detected patterns.
      const analyticsResponse = await databaseService.getAnalytics(user.id);

      if (analyticsResponse) {
        setAnalyticsData(analyticsResponse.dimension_breakdown || []);
        setMetrics(analyticsResponse.metrics);
        setPatterns(analyticsResponse.patterns || []);
        setWeeklyActivity(analyticsResponse.weekly_activity || []);
      }

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

  return { analyticsData, weeklyActivity, patterns, metrics, loading, error, reloadData: loadData };
};
