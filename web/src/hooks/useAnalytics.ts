import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/database.service';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsState {
  analyticsData: any;
  metrics: any;
  holisticAlignment: any;
  weeklyActivity: any[];
  patterns: any[];
  loading: boolean;
  error: string | null;
}

export const useAnalytics = () => {
  const { user } = useAuth();

  // BOLT OPTIMIZATION: Consolidated multiple state variables into a single object.
  // This reduces re-renders from 5-6 down to 1 when fetching finishes.
  const [state, setState] = useState<AnalyticsState>({
    analyticsData: null,
    metrics: null,
    holisticAlignment: null,
    weeklyActivity: [],
    patterns: [],
    loading: true,
    error: null
  });

  const loadData = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // BOLT OPTIMIZATION: Reduced API calls to a single unified RPC for all dashboard data.
      const analyticsResponse = await databaseService.getAnalytics(user.id);

      // BOLT: Atomic state update for all related analytics data.
      // Ensure loading is set to false even if response is falsy to avoid hanging UI.
      setState({
        analyticsData: analyticsResponse,
        metrics: analyticsResponse?.metrics || null,
        holisticAlignment: analyticsResponse?.holistic_alignment || null,
        patterns: analyticsResponse?.patterns || [],
        weeklyActivity: analyticsResponse?.weekly_activity || [],
        loading: false,
        error: null
      });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to load analytics',
        loading: false
      }));
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { ...state, reloadData: loadData };
};
