import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/database.service';

export const useAnalytics = (profileId: number = 1) => {
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [analytics, detectedPatterns] = await Promise.all([
        databaseService.getAnalytics(profileId),
        databaseService.getPatterns(profileId)
      ]);
      setAnalyticsData(analytics);
      setPatterns(detectedPatterns);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { analyticsData, patterns, loading, error, reloadData: loadData };
};
