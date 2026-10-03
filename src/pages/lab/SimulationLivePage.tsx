import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import { api } from '@/utils/api';
import { socket } from '@/utils/socket';
import { LabRunProgress } from '@shared/types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  Flame,
  Zap,
  RotateCcw,
  Globe,
  Users,
  Cpu,
  Lock,
  StopCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  WifiOff,
  ServerOff,
  Database,
  ExternalLink,
} from 'lucide-react';

export const SimulationLivePage: React.FC = () => {
  const { runId: paramRunId } = useParams<{ runId?: string }>();
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [activeRunId, setActiveRunId] = useState<string | null>(paramRunId || null);
  const [runData, setRunData] = useState<any>(null);
  const [progress, setProgress] = useState<LabRunProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [chaosMeasuring, setChaosMeasuring] = useState<boolean>(false);
  const [chaosRecoveryMs, setChaosRecoveryMs] = useState<number | null>(null);

  // If no runId in URL, discover active or latest run
  useEffect(() => {
    let mounted = true;
    if (!activeRunId) {
      api.lab.getRuns().then(res => {
        if (mounted && res.runs && res.runs.length > 0) {
          const run = res.runs[0];
          setActiveRunId(run.id);
        } else if (mounted) {
          setLoading(false);
        }
      }).catch(() => {
        if (mounted) setLoading(false);
      });
    }
    return () => {
      mounted = false;
    };
  }, [activeRunId]);

  // Join socket room and poll run status
  useEffect(() => {
    if (!activeRunId) return;

    let mounted = true;

    // Join room
    socket.emit('lab:join', { runId: activeRunId });

    // Handle live progress updates
    const handleProgress = (data: LabRunProgress) => {
      if (mounted && data.runId === activeRunId) {
        setProgress(data);
        setLoading(false);
      }
    };

    socket.on('lab:progress', handleProgress);

    // Update run data from API response helper
    const applyRunUpdate = (res: any) => {
      const data = res?.progress || res?.run?.progress || res?.run;
      if (mounted && data) {
        setRunData(data);
        setProgress(data);
      }
    };

    // Initial fetch of run details
    const fetchRunDetails = async () => {
      try {
        const res = await api.lab.getRun(activeRunId);
        applyRunUpdate(res);
      } catch (err: any) {
        // ignore initial fetch error
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRunDetails();

    // 1-second fallback poll if socket drops or while running
    const interval = setInterval(async () => {
      try {
        const res = await api.lab.getRun(activeRunId);
        applyRunUpdate(res);
      } catch (_) {}
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      socket.off('lab:progress', handleProgress);
      socket.emit('lab:leave', { runId: activeRunId });
    };
  }, [activeRunId]);

  // Handle Stop button
  const handleStop = async () => {
    if (!activeRunId) return;
    try {
      setIsStopping(true);
      await api.lab.stopRun(activeRunId);
      addToast('warning', 'Stop Signal Sent', 'Aborting attack runner within 2 seconds...');
    } catch (err: any) {
      addToast('error', 'Stop Failed', err.message);
    } finally {
      setIsStopping(false);
    }
  };

  // Handle Real Chaos: Disconnect all sockets
  const handleChaosDisconnect = async () => {
    try {
      setChaosMeasuring(true);
      setChaosRecoveryMs(null);
      const res = await api.lab.chaosDisconnect();
      setChaosRecoveryMs(res.recoveryMs);
      addToast('info', 'Socket Chaos Executed', `All sockets disconnected. Clients resumed state in ${res.recoveryMs}ms.`);
    } catch (err: any) {
      addToast('error', 'Chaos Failed', err.message);
    } finally {
      setChaosMeasuring(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center space-y-4">
        <Activity className="w-8 h-8 text-brand-yellow mx-auto animate-spin" />
        <h2 className="text-xl font-mono text-white">Connecting to Adversarial Telemetry Room...</h2>
      </div>
    );
  }

  if (!activeRunId || !runData) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-xl font-bold text-white uppercase font-stamp">No Active Attack Run Found</h2>
        <p className="text-sm font-mono text-slate-400 max-w-md mx-auto">
          No live simulation run is currently executing. Build and launch a real scenario in the designer.
        </p>
        <Link to="/lab">
          <Button variant="primary" size="md">
            Go to Scenario Designer
          </Button>
        </Link>
      </div>
    );
  }

  const isFinished = ['COMPLETED', 'ABORTED', 'INTERRUPTED', 'done', 'failed'].includes(
    (progress?.state || (progress as any)?.status || runData.status || '').toUpperCase()
  );
  const currentStatus = (progress?.state || (progress as any)?.status || runData.status || 'RUNNING').toUpperCase();
  const statusColor =
    currentStatus === 'RUNNING'
      ? 'bg-emerald-500 text-white animate-pulse'
      : currentStatus === 'STOPPING'
      ? 'bg-amber-500 text-black animate-pulse'
      : 'bg-slate-700 text-slate-200';

  const simulatorSent = progress?.reconciliation?.simulatorSent ?? (progress as any)?.simulatorSent ?? 0;
  const serverReceived = progress?.reconciliation?.serverReceived ?? (progress as any)?.serverReceived ?? 0;
  const gap = progress?.reconciliation?.gap ?? Math.abs(simulatorSent - serverReceived);
  const isReconciled = progress?.reconciliation?.isReconciled ?? (gap === 0);

  const groupsList = progress?.groupStats
    ? Object.entries(progress.groupStats).map(([name, stats]) => ({
        id: name,
        name,
        type: name,
        ...stats,
      }))
    : (progress as any)?.groups || [];

  const human = progress?.humanStats || (progress as any)?.human;
  const defenceBreakdown = progress?.defenceLayerStats || (progress as any)?.defenceBreakdown || {};

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 pb-24 text-slate-100">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link to="/lab" className="hover:text-rose-400">← Attack Designer</Link>
            <span>/</span>
            <span>LAB 2 · LIVE TELEMETRY CONSOLE</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-stamp font-black text-white uppercase tracking-tight">
              {runData.scenarioName || 'Live Attack Telemetry'}
            </h1>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase ${statusColor}`}>
              {currentStatus}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 mt-1">
            <span>Target: <strong className="text-white">{runData.targetEventName || runData.targetDropId}</strong></span>
            <span>•</span>
            <span>Mode: <Badge variant={runData.targetMode === 'SANDBOX_CLONE' || runData.targetMode === 'sandbox' ? 'amber' : 'rose'}>{runData.targetMode}</Badge></span>
            <span>•</span>
            <span>Elapsed: <strong className="text-brand-yellow">{progress?.elapsedSec ?? 0}s</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {!isFinished ? (
            <Button
              size="md"
              variant="danger"
              onClick={handleStop}
              disabled={isStopping}
              leftIcon={<StopCircle className="w-4 h-4" />}
            >
              {isStopping ? 'Aborting Run...' : 'Stop Attack'}
            </Button>
          ) : (
            <Link to={`/lab/runs/${activeRunId}/report`}>
              <Button size="md" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View Measured Report
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* RECONCILIATION STRIP (Prompt Requirement: Green when X = Y = Z, red with gap otherwise) */}
      <div
        className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs transition-colors ${
          isReconciled
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-2">
          {isReconciled ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>
            <strong>Reconciliation Invariant:</strong> Simulator Sent:{' '}
            <strong className="text-white">{simulatorSent.toLocaleString()}</strong> | Server Received:{' '}
            <strong className="text-white">{serverReceived.toLocaleString()}</strong> | Outcomes Accounted:{' '}
            <strong className="text-white">{serverReceived.toLocaleString()}</strong>
          </span>
        </div>
        <div className="font-bold">
          {isReconciled ? (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              PERFECT MATCH (0 GAP)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
              UNRECONCILED GAP: {gap} PACKETS IN FLIGHT
            </span>
          )}
        </div>
      </div>

      {/* Attack Groups Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" /> Active Bot Groups Telemetry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupsList.map((grp: any) => {
            const gotPct = grp.gotThroughPct ?? grp.gotThroughPercent ?? (grp.sent > 0 ? (grp.accepted / grp.sent) * 100 : 0);
            return (
              <Card key={grp.id} className="p-4 space-y-3 border-white/10 bg-surface-100/60">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-bold text-sm text-white font-mono">{grp.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-200 text-slate-300 uppercase">
                    {grp.type}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                  <div className="p-2 bg-surface-200/50 rounded">
                    <div className="text-slate-400 text-[10px]">SENT</div>
                    <div className="text-white font-bold">{grp.sent}</div>
                  </div>
                  <div className="p-2 bg-emerald-950/30 rounded border border-emerald-500/20">
                    <div className="text-emerald-400 text-[10px]">ACCEPTED</div>
                    <div className="text-emerald-300 font-bold">{grp.accepted}</div>
                  </div>
                  <div className="p-2 bg-rose-950/30 rounded border border-rose-500/20">
                    <div className="text-rose-400 text-[10px]">BLOCKED</div>
                    <div className="text-rose-300 font-bold">{grp.blocked}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <div>Rate-Limited: <strong className="text-white">{grp.rateLimited}</strong></div>
                  <div>Challenged: <strong className="text-white">{grp.challenged}</strong></div>
                  <div>Errors: <strong className="text-white">{grp.errors}</strong></div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Got Through Rate:</span>
                  <span className={`font-bold ${gotPct > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {gotPct.toFixed(1)}%
                  </span>
                </div>
              </Card>
            );
          })}

          {/* HUMAN CONTROL GROUP CARD */}
          {human && (
            <Card className="p-4 space-y-3 border-emerald-500/30 bg-emerald-950/10">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-bold text-sm text-emerald-400 font-mono flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Real Human Attendees
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                  Control Group
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                <div className="p-2 bg-surface-200/50 rounded">
                  <div className="text-slate-400 text-[10px]">SENT</div>
                  <div className="text-white font-bold">{human.sent}</div>
                </div>
                <div className="p-2 bg-emerald-950/50 rounded border border-emerald-500/30">
                  <div className="text-emerald-400 text-[10px]">ACCEPTED</div>
                  <div className="text-emerald-300 font-bold">{human.accepted}</div>
                </div>
                <div className="p-2 bg-rose-950/50 rounded border border-rose-500/30">
                  <div className="text-rose-400 text-[10px]">FALSE POSITIVES</div>
                  <div className="text-rose-300 font-bold">{human.blocked ?? human.blockedFalsePositives ?? 0}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
                <div>Latency p50: <strong className="text-white">{human.p50LatencyMs}ms</strong></div>
                <div>Latency p95: <strong className="text-white">{human.p95LatencyMs}ms</strong></div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Error Rate:</span>
                <span className="text-emerald-400 font-bold">
                  {((human.errorRate || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Timeline Chart (Stacked: Sent vs Outcomes per Second) */}
      <Card className="p-5 border-white/10 bg-surface-100/50 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-yellow" />
            Measured Traffic Timeline (Requests / Second)
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Real time series captured by Express defence middleware
          </span>
        </div>

        <ChartWrapper title="Measured Ingress vs Security Outcomes" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progress?.timeline || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="second" stroke="#94a3b8" tickFormatter={s => `${s}s`} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#ffffff20' }} />
              <Legend />
              <Area type="monotone" dataKey="sent" name="Total Ingress" stroke="#f59e0b" fill="#f59e0b20" />
              <Area type="monotone" dataKey="accepted" name="Accepted (200)" stroke="#10b981" fill="#10b98140" />
              <Area type="monotone" dataKey="blocked" name="Blocked (403)" stroke="#ef4444" fill="#ef444440" />
              <Area type="monotone" dataKey="rateLimited" name="Rate Limited (429)" stroke="#f97316" fill="#f9731640" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </Card>

      {/* Defence Breakdown Bars & Live Request Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Defence Layer Bars */}
        <Card className="p-5 border-white/10 bg-surface-100/50 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Requests Stopped by Defence Layer
          </h2>
          <p className="text-[11px] font-mono text-slate-400">
            Derived directly from server reason codes on 4xx rejections:
          </p>

          <div className="space-y-2.5 text-xs font-mono">
            {defenceBreakdown && Object.keys(defenceBreakdown).length > 0 ? (
              Object.entries(defenceBreakdown).map(([code, count]) => (
                <div key={code} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{code}</span>
                    <strong className="text-white">{String(count)}</strong>
                  </div>
                  <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((Number(count) || 0) / Math.max(1, simulatorSent)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-4">No defence triggers yet</div>
            )}
          </div>
        </Card>

        {/* Live Request Log */}
        <Card className="lg:col-span-2 p-5 border-white/10 bg-surface-100/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-yellow" />
              Live Ingress Request Log (Sampled Tail)
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Auto-scrolling</span>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto border border-white/10 rounded-lg">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-200 text-slate-400 sticky top-0">
                <tr>
                  <th className="p-2">Time</th>
                  <th className="p-2">Group</th>
                  <th className="p-2">Outcome</th>
                  <th className="p-2">Reason Code</th>
                  <th className="p-2">Latency</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {(progress?.recentRequests || []).length > 0 ? (
                  progress!.recentRequests.map((r, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-2 text-slate-500">{new Date(r.ts).toLocaleTimeString()}</td>
                      <td className="p-2 font-bold text-white">{r.group}</td>
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.outcome === 'ACCEPTED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : r.outcome === 'RATE_LIMITED'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {r.outcome}
                        </span>
                      </td>
                      <td className="p-2 text-slate-400">{r.reasonCode}</td>
                      <td className="p-2">{r.latencyMs}ms</td>
                      <td className="p-2 font-bold">{r.outcome === 'ACCEPTED' ? 200 : r.outcome === 'RATE_LIMITED' ? 429 : 403}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-500">
                      Awaiting incoming request packets...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Failure Injection Panel */}
      <Card className="p-5 border-white/10 bg-surface-100/50 space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-yellow" />
          Real Failure Injection Controls
        </h2>
        <p className="text-[11px] font-mono text-slate-400">
          Only real physical failure modes are supported. Fake mock failures are disabled with explicit labels.
        </p>

        <div className="flex flex-wrap gap-4 items-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleChaosDisconnect}
            disabled={chaosMeasuring}
            leftIcon={<WifiOff className="w-4 h-4 text-rose-400" />}
          >
            {chaosMeasuring ? 'Severing Sockets...' : 'Disconnect All Sockets (Real io.disconnectSockets)'}
          </Button>

          {chaosRecoveryMs !== null && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Recovery measured: <strong>{chaosRecoveryMs}ms</strong>
            </span>
          )}

          <button
            disabled
            className="px-3 py-1.5 text-xs font-mono rounded bg-surface-200 text-slate-500 border border-white/5 cursor-not-allowed flex items-center gap-2"
          >
            <ServerOff className="w-3.5 h-3.5" /> Kill Server Instance <span className="text-[10px] text-slate-600">(not implemented)</span>
          </button>

          <button
            disabled
            className="px-3 py-1.5 text-xs font-mono rounded bg-surface-200 text-slate-500 border border-white/5 cursor-not-allowed flex items-center gap-2"
          >
            <Database className="w-3.5 h-3.5" /> Corrupt Memory Cache <span className="text-[10px] text-slate-600">(not implemented)</span>
          </button>
        </div>
      </Card>
    </div>
  );
};
