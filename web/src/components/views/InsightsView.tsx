import React, { useMemo } from 'react';
import {
  MessageSquare, Lightbulb, BarChart3, Target, Filter, TrendingUp, TrendingDown, Activity, CheckCircle, Loader2
} from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';

const StatsCard = ({ icon: Icon, label, value, change, color }: any) => {
  const colorMap: any = {
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
    cyan: 'from-cyan-500 to-blue-500',
    green: 'from-green-500 to-emerald-500'
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-all">
      <div className={`w-12 h-12 bg-gradient-to-br ${colorMap[color]} rounded-lg flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-slate-400 text-sm mb-1">{label}</div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-green-400">{change}</div>
    </div>
  );
};

const PatternCard = ({ pattern }: any) => {
  const trendIcons: any = { up: TrendingUp, down: TrendingDown, stable: Activity };
  const TrendIcon = trendIcons[pattern.trend];

  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 hover:border-purple-500/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm text-purple-400 font-semibold mb-1">{pattern.dimension}</div>
          <div className="text-xl font-bold text-white">{pattern.aspect}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-400">{Math.round(pattern.confidence * 100)}%</div>
          <div className="text-xs text-slate-400 flex items-center justify-end mt-1">
            <TrendIcon className="w-3 h-3 mr-1" />
            Trending
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">Strength</div>
          <div className="w-full bg-slate-700/30 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full"
              style={{ width: `${pattern.strength * 100}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Evidence</div>
          <div className="text-sm font-semibold text-white">{pattern.evidence} responses</div>
        </div>
      </div>

      <div className="flex items-center text-xs text-green-400">
        <CheckCircle className="w-3 h-3 mr-1" />
        High confidence pattern
      </div>
    </div>
  );
};

const DimensionProgress = ({ dimension }: any) => {
  const colorMap: any = {
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
    cyan: 'from-cyan-500 to-blue-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-semibold">{dimension.name}</span>
        <span className="text-slate-400 text-sm">{dimension.responses} responses</span>
      </div>
      <div className="w-full bg-slate-700/30 rounded-full h-3">
        <div
          className={`bg-gradient-to-r ${colorMap[dimension.color]} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${dimension.coverage}%` }}
        ></div>
      </div>
      <div className={`text-right text-xs text-${dimension.color}-400 mt-1`}>{dimension.coverage}% complete</div>
    </div>
  );
};

export const InsightsView: React.FC = () => {
  const { patterns: dbPatterns, loading } = useAnalytics();

  const patterns = useMemo(() => {
    if (dbPatterns && dbPatterns.length > 0) {
      return dbPatterns.map(p => ({
        dimension: p.dimension_id, // Simplified for now
        aspect: p.pattern_type || p.aspect_id,
        confidence: p.confidence || 0.5,
        strength: p.strength || 0.5,
        evidence: p.evidence_count || 0,
        trend: 'up'
      }));
    }
    return [
    { dimension: 'Values', aspect: 'Freedom', confidence: 0.92, strength: 0.88, evidence: 47, trend: 'up' },
    { dimension: 'Work Style', aspect: 'Deep Work', confidence: 0.85, strength: 0.91, evidence: 38, trend: 'up' },
    { dimension: 'Relationships', aspect: 'Trust', confidence: 0.78, strength: 0.84, evidence: 52, trend: 'stable' },
      { dimension: 'Decision Making', aspect: 'Data Driven', confidence: 0.81, strength: 0.76, evidence: 29, trend: 'up' }
    ];
  }, [dbPatterns]);

  const dimensions = [
    { name: 'Values', coverage: 85, responses: 127, color: 'purple' },
    { name: 'Work Style', coverage: 72, responses: 98, color: 'pink' },
    { name: 'Relationships', coverage: 91, responses: 156, color: 'cyan' },
    { name: 'Learning', coverage: 64, responses: 82, color: 'green' },
    { name: 'Decision Making', coverage: 78, responses: 94, color: 'blue' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl font-black text-white mb-3">Your Insights</h2>
          <p className="text-slate-400 text-lg">Patterns detected from your responses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatsCard icon={MessageSquare} label="Total Responses" value="487" change="+23 today" color="purple" />
          <StatsCard icon={Lightbulb} label="Patterns Detected" value="34" change="High confidence" color="pink" />
          <StatsCard icon={BarChart3} label="Avg Confidence" value="84%" change="+5% this week" color="cyan" />
          <StatsCard icon={Target} label="Twin Accuracy" value="91%" change="Excellent" color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Detected Patterns</h3>
                <button className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-all">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filter
                </button>
              </div>

              <div className="space-y-4">
                {patterns.map((pattern, idx) => (
                  <PatternCard key={idx} pattern={pattern} />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Dimension Coverage</h3>
            <div className="space-y-6">
              {dimensions.map((dim, idx) => (
                <DimensionProgress key={idx} dimension={dim} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
