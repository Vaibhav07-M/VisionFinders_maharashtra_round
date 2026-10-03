import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  AlertOctagon,
  PauseCircle,
  PlayCircle,
  Clock,
  Zap,
  TrendingUp,
  Cpu,
} from 'lucide-react';

export const LiveOperationsPage: React.FC = () => {
  const { drops, updateDrop, addToast } = useApp();
  const activeDrop = drops[0];

  const [isPaused, setIsPaused] = useState(activeDrop.status === 'paused');
  const [chartData, setChartData] = useState(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      time: `${i * 2}s`,
      rps: Math.floor(1200 + Math.random() * 400),
      rateLimited429: Math.floor(80 + Math.random() * 40),
      latencyP95: Math.floor(28 + Math.random() * 15),
    }));
  });

  // Ticker for live chart
  useEffect(() => {
    const timer = setInterval(() => {
      setChartData(prev => {
        const nextTime = `${(prev.length + 1) * 2}s`;
        const newPoint = {
          time: nextTime,
          rps: isPaused ? 0 : Math.floor(1400 + Math.random() * 500),
          rateLimited429: isPaused ? 0 : Math.floor(120 + Math.random() * 60),
          latencyP95: isPaused ? 2 : Math.floor(32 + Math.random() * 18),
        };
        return [...prev.slice(1), newPoint];
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const togglePause = () => {
    const newStatus = isPaused ? 'open' : 'paused';
    setIsPaused(!isPaused);
    updateDrop(activeDrop.id, { status: newStatus });
    addToast(
      isPaused ? 'success' : 'warning',
      isPaused ? 'Drop Resumed' : 'Drop Paused',
      `Drop status changed to ${newStatus.toUpperCase()}.`
    );
  };

  const handleExtendWindow = () => {
    const newEnd = new Date(new Date(activeDrop.windowEnd).getTime() + 1000 * 60 * 5).toISOString();
    updateDrop(activeDrop.id, { windowEnd: newEnd });
    addToast('info', 'Window Extended', 'Added +5 minutes to active registration window.');
  };

  const handleEmergencyStop = () => {
    setIsPaused(true);
    updateDrop(activeDrop.id, { status: 'paused' });
    addToast('error', 'EMERGENCY STOP EXECUTED', 'All inbound submissions suspended immediately.');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Panel B · Organizer</span>
            <span>/</span>
            <span>B6. Live Operations & Telemetry</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Realtime High-Demand Radar
          </h1>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="md"
            variant={isPaused ? 'primary' : 'secondary'}
            onClick={togglePause}
            leftIcon={isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4 text-amber-400" />}
          >
            {isPaused ? 'Resume Window' : 'Pause Drop'}
          </Button>

          <Button
            size="md"
            variant="outline"
            onClick={handleExtendWindow}
            leftIcon={<Clock className="w-4 h-4 text-brand-yellow" />}
          >
            Extend Window (+5m)
          </Button>

          <Button
            size="md"
            variant="danger"
            onClick={handleEmergencyStop}
            leftIcon={<AlertOctagon className="w-4 h-4" />}
          >
            Emergency Stop
          </Button>
        </div>
      </div>

      {/* Top Telemetry Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Throughput (Inbound RPS)</span>
          <span className="text-3xl font-mono font-bold text-brand-yellow">
            {chartData[chartData.length - 1]?.rps || 0}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Requests / Second</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">HTTP 429 Rate Limited</span>
          <span className="text-3xl font-mono font-bold text-amber-400">
            {chartData[chartData.length - 1]?.rateLimited429 || 0}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Abuse Shedding Active</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">P95 Server Latency</span>
          <span className="text-3xl font-mono font-bold text-cyan-400">
            {chartData[chartData.length - 1]?.latencyP95 || 0} ms
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Sub-50ms SLA Target</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Drop Status</span>
          <span className={`text-2xl font-stamp font-black ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isPaused ? 'PAUSED' : 'WINDOW OPEN'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Realtime Socket Active</span>
        </div>
      </div>

      {/* Live Chart: Throughput & Latency */}
      <ChartWrapper
        title="Inbound Request Velocity & HTTP 429 Shedding"
        subtitle="Real-time sliding window showing requests per second and rate-limiting enforcement"
        height={320}
        badge="LIVE TELEMETRY"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffde00" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ffde00" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="rateLimitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12141c',
                borderColor: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
            <Area
              type="monotone"
              dataKey="rps"
              name="Inbound RPS"
              stroke="#ffde00"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#rpsGrad)"
            />
            <Area
              type="monotone"
              dataKey="rateLimited429"
              name="429 Rate Limited"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#rateLimitGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>

    </div>
  );
};
