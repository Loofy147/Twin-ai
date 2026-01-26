import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/database.service';
import { useAuth } from '../contexts/AuthContext';

export const useAnalytics = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [holisticAlignment, setHolisticAlignment] = useState<any>({
    score: 0.75,
    interpretation: 'Evolving',
    breakdown: { stabilityScore: 0.8, privacyShieldScore: 0.9, coherenceStrategic: 0.7 }
  });
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
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
      // BOLT OPTIMIZATION: Reduced API calls to a single unified RPC for all dashboard data.
      // This includes metrics, dimension breakdown, weekly activity, and detected patterns.
      const analyticsResponse = await databaseService.getAnalytics(user.id);

      if (analyticsResponse) {
        // BOLT: Store the whole response to allow access to knowledge_graph and dimension_breakdown
        setAnalyticsData(analyticsResponse);
        setMetrics(analyticsResponse.metrics);
        setHolisticAlignment(analyticsResponse.holistic_alignment);
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

  return { analyticsData, weeklyActivity, patterns, metrics, holisticAlignment, loading, error, reloadData: loadData };
};
