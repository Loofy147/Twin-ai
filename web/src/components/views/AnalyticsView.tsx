import React, { useState, useMemo } from 'react';
import {
  Hash, Percent, Target, Flame, Trophy, Loader2
} from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';

const MetricCard = ({ icon: Icon, label, value, trend, color }: any) => {
  const colorMap: any = {
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
    cyan: 'from-cyan-500 to-blue-500',
    orange: 'from-orange-500 to-red-500',
    yellow: 'from-yellow-500 to-orange-500'
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-xl p-6 hover:scale-105 transition-all">
      <div className={`w-10 h-10 bg-gradient-to-br ${colorMap[color]} rounded-lg flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-green-400">{trend}</div>
    </div>
  );
};

const BarChart = ({ data }: any) => {
  const maxValue = Math.max(...data.map((d: any) => d.responses));

  return (
    <div className="flex items-end justify-between h-full space-x-2">
      {data.map((item: any, idx: number) => (
        <div key={idx} className="flex-1 flex flex-col items-center">
          <div className="w-full flex items-end justify-center mb-2" style={{ height: '200px' }}>
            <div
              className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg transition-all duration-500 hover:from-purple-400 hover:to-pink-400 cursor-pointer relative group"
              style={{ height: `${(item.responses / maxValue) * 100}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                {item.responses} responses
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-medium">{item.day}</div>
        </div>
      ))}
    </div>
  );
};

const LineChart = ({ data }: any) => {
  const maxValue = Math.max(...data.map((d: any) => d.confidence));
  const minValue = Math.min(...data.map((d: any) => d.confidence));
  const range = maxValue - minValue;

  const points = data.map((item: any, idx: number) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 100 - ((item.confidence - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative h-full">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((item: any, idx: number) => {
          const x = (idx / (data.length - 1)) * 100;
          const y = 100 - ((item.confidence - minValue) / range) * 100;
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="2"
              fill="#06b6d4"
              className="hover:r-3 transition-all cursor-pointer"
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
        {data.map((item: any, idx: number) => (
          <div key={idx} className="text-xs text-slate-400">{item.day}</div>
        ))}
      </div>
    </div>
  );
};

const DonutChart = ({ data }: any) => {
  const total = data.reduce((sum: number, d: any) => sum + d.percentage, 0);
  let currentAngle = -90;

  const colorMap: any = {
    purple: '#a855f7',
    pink: '#ec4899',
    cyan: '#06b6d4',
    green: '#10b981',
    blue: '#3b82f6'
  };

  return (
    <div className="relative">
      <svg width="250" height="250" viewBox="0 0 250 250">
        {data.map((item: any, idx: number) => {
          const angle = (item.percentage / 100) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = 125 + 100 * Math.cos(startRad);
          const y1 = 125 + 100 * Math.sin(startRad);
          const x2 = 125 + 100 * Math.cos(endRad);
          const y2 = 125 + 100 * Math.sin(endRad);

          const largeArc = angle > 180 ? 1 : 0;

          const pathData = [
            `M 125 125`,
            `L ${x1} ${y1}`,
            `A 100 100 0 ${largeArc} 1 ${x2} ${y2}`,
            `Z`
          ].join(' ');

          return (
            <path
              key={idx}
              d={pathData}
              fill={colorMap[item.color]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          );
        })}
        <circle cx="125" cy="125" r="60" fill="#0f172a" />
        <text x="125" y="120" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
          {total}%
        </text>
        <text x="125" y="140" textAnchor="middle" fill="#94a3b8" fontSize="12">
          Coverage
        </text>
      </svg>
    </div>
  );
};

const DimensionBreakdownItem = ({ dimension }: any) => {
  const colorMap: any = {
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
    cyan: 'from-cyan-500 to-blue-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500'
  };

  return (
    <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-all">
      <div className={`w-12 h-12 bg-gradient-to-br ${colorMap[dimension.color]} rounded-lg flex items-center justify-center font-bold text-white`}>
        {dimension.percentage}%
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-white">{dimension.name}</span>
          <span className="text-sm text-slate-400">{dimension.count} responses</span>
        </div>
        <div className="w-full bg-slate-700/30 rounded-full h-2">
          <div
            className={`bg-gradient-to-r ${colorMap[dimension.color]} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${dimension.percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsView: React.FC = () => {
  // BOLT OPTIMIZATION: Now using real-time aggregated data from the comprehensive analytics RPC
  const { analyticsData, metrics, loading } = useAnalytics();
  const [timeframe, setTimeframe] = useState('week');

  const dimensionBreakdown = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return [];

    const colors = ['purple', 'pink', 'cyan', 'green', 'blue'];
    return analyticsData.map((d: any, i: number) => ({
      ...d,
      color: colors[i % colors.length]
    }));
  }, [analyticsData]);

  // Fallback data for empty states or loading
  const weeklyData = useMemo(() => [
    { day: 'Mon', responses: 0, confidence: 0 },
    { day: 'Tue', responses: 0, confidence: 0 },
    { day: 'Wed', responses: 0, confidence: 0 },
    { day: 'Thu', responses: 0, confidence: 0 },
    { day: 'Fri', responses: 0, confidence: 0 },
    { day: 'Sat', responses: 0, confidence: 0 },
    { day: 'Sun', responses: 0, confidence: 0 }
  ], []);

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
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-black text-white mb-3">Analytics Dashboard</h2>
            <p className="text-slate-400 text-lg">Deep dive into your learning patterns</p>
          </div>

          <div className="flex items-center space-x-3">
            {['day', 'week', 'month', 'all'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                aria-label={`View analytics by ${tf}`}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricCard
            icon={Hash}
            label="Total Questions"
            value={metrics?.total_questions || '0'}
            trend="+12%"
            color="purple"
          />
          <MetricCard
            icon={Percent}
            label="Completion Rate"
            value={`${metrics?.completion_rate || 0}%`}
            trend="+3%"
            color="pink"
          />
          <MetricCard
            icon={Target}
            label="Avg Confidence"
            value={`${metrics?.avg_confidence || 0}%`}
            trend="+5%"
            color="cyan"
          />
          <MetricCard
            icon={Flame}
            label="Current Streak"
            value={`${metrics?.streak || 0} days`}
            trend="🔥"
            color="orange"
          />
          <MetricCard
            icon={Trophy}
            label="XP Earned"
            value={metrics?.xp?.toLocaleString() || '0'}
            trend="+150"
            color="yellow"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Response Activity Chart */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Response Activity</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-slate-400">Responses</span>
              </div>
            </div>

            <div className="h-64">
              <BarChart data={weeklyData} />
            </div>
          </div>

          {/* Confidence Trend */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Confidence Trend</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span className="text-sm text-slate-400">Avg Confidence</span>
              </div>
            </div>

            <div className="h-64">
              <LineChart data={weeklyData} />
            </div>
          </div>
        </div>

        {/* Dimension Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Dimension Distribution</h3>
            <div className="flex items-center justify-center h-80">
              <DonutChart data={dimensionBreakdown} />
            </div>
          </div>

          {/* Breakdown List */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Detailed Breakdown</h3>
            <div className="space-y-4">
              {dimensionBreakdown.map((dim: any, idx: number) => (
                <DimensionBreakdownItem key={idx} dimension={dim} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
