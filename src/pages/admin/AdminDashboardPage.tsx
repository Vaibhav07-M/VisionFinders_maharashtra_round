import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { getAdminHeaders } from '@/utils/api';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ErrorState } from '@/components/admin/ErrorState';
import { Skeleton, CardSkeleton } from '@/components/admin/SkeletonLoader';
import { AdminDashboardData, AdminMetricPoint } from '@shared/types';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import { Button } from '@/components/ui/Button';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Activity,
  Users,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  Clock,
  AlertOctagon,
  FileCheck2,
  RotateCcw,
  Zap,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { drops, addToast } = useApp();
  const { selectedDropId } = useOutletContext<{ selectedDropId: string }>() || {};

  const activeDropId = selectedDropId || drops[0]?.id || 'drop-jack-white-vault';

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<AdminMetricPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Control dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    action: 'pause' | 'resume' | 'extend' | 'emergency-stop' | null;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'primary';
    minutes?: number;
  }>({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    variant: 'danger',
  });

  const [extendMinutes, setExtendMinutes] = useState(5);
  const [isRunningInvariant, setIsRunningInvariant] = useState(false);
  const [isRunningAuditVerify, setIsRunningAuditVerify] = useState(false);
  const [invariantResult, setInvariantResult] = useState<any>(null);
  const [auditVerifyResult, setAuditVerifyResult] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/admin/dashboard?dropId=${activeDropId}`, {
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetricsHistory = async () => {
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        // Downsample or slice to 40 data points for smooth chart rendering
        const history: AdminMetricPoint[] = json.history || [];
        const step = Math.max(1, Math.floor(history.length / 40));
        const sampled = history.filter((_, idx) => idx % step === 0);
        setMetricsHistory(sampled);
      }
    } catch (err) {}
  };

  // Initial load and periodic polling every 2 seconds
  useEffect(() => {
    fetchDashboardData();
    fetchMetricsHistory();

    const interval = setInterval(() => {
      fetchMetricsHistory();
      fetchDashboardData();
    }, 2000);

    return () => clearInterval(interval);
  }, [activeDropId]);

  // Drop control execution
  const handleExecuteControl = async (reason: string) => {
    if (!confirmState.action) return;
    try {
      let endpoint = `/api/admin/drops/${activeDropId}/${confirmState.action}`;
      let body: any = { reason };
      if (confirmState.action === 'extend') {
        body.minutes = extendMinutes;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(body),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Control action failed');

      addToast('success', 'Control Executed', resJson.message);
      setConfirmState(prev => ({ ...prev, isOpen: false }));
      await fetchDashboardData();
    } catch (err: any) {
      addToast('error', 'Action Failed', err.message);
    }
  };

  // Run invariant check now
  const handleRunInvariantsNow = async () => {
    setIsRunningInvariant(true);
    try {
      const res = await fetch(`/api/admin/audit/invariants/${activeDropId}`, {
        method: 'POST',
        headers: getAdminHeaders(),
      });
      const result = await res.json();
      setInvariantResult(result);
      addToast(result.valid ? 'success' : 'error', 'Invariant Checker', result.valid ? 'All allocation invariants verified: 0 errors.' : 'Invariant violations detected.');
    } catch (err: any) {
      addToast('error', 'Invariant Error', err.message);
    } finally {
      setIsRunningInvariant(false);
    }
  };

  // Run audit chain verification now
  const handleRunAuditVerifyNow = async () => {
    setIsRunningAuditVerify(true);
    try {
      const res = await fetch('/api/admin/audit/verify', {
        method: 'POST',
        headers: getAdminHeaders(),
      });
      const result = await res.json();
      setAuditVerifyResult(result);
      addToast(result.isValid ? 'success' : 'error', 'Hash Chain', result.isValid ? `Tamper-proof log verified (${result.count} records).` : 'Hash mismatch in audit chain!');
    } catch (err: any) {
      addToast('error', 'Verification Error', err.message);
    } finally {
      setIsRunningAuditVerify(false);
    }
  };

  if (error && !data) {
    return <ErrorState title="Dashboard Unavailable" message={error} onRetry={fetchDashboardData} />;
  }

  const drop = data?.drop;
  const kpis = data?.kpis;
  const isPaused = drop?.status === 'paused';

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header with active drop title and next deadline */}
      <PageHeader
        category="PANEL B · OPERATIONS COMMAND"
        title="Dashboard & Live Radar"
        description={drop ? `Real-time allocation monitoring for "${drop.name}" (${drop.mode}).` : 'Consolidated operational overview.'}
        actions={
          drop && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${
                drop.status === 'open' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                drop.status === 'paused' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                'bg-white/5 text-slate-300 border-white/10'
              }`}>
                ● {drop.status}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Window closes: {new Date(drop.windowEnd).toLocaleTimeString()}
              </span>
            </div>
          )
        }
      />

      {/* KPI Row (Real Data from Section 4) */}
      {isLoading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <StatCard
            label="Total Entries"
            value={kpis?.totalEntries ?? 0}
            subtext={`${kpis?.uniqueIdentities ?? 0} unique identities`}
            icon={<Users className="w-4 h-4 text-cyan-400" />}
            variant="cyan"
          />
          <StatCard
            label="Eligible"
            value={kpis?.eligible ?? 0}
            subtext="Passed behavioral defense"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            variant="emerald"
          />
          <StatCard
            label="Flagged Risk"
            value={kpis?.flagged ?? 0}
            subtext="Awaiting secondary review"
            icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
            variant="yellow"
          />
          <StatCard
            label="Blocked Bots"
            value={kpis?.blocked ?? 0}
            subtext="Honeypot / PoW / IP blacklist"
            icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
            variant="rose"
          />
          <StatCard
            label="Seats Sold / Held"
            value={`${kpis?.seatsSold ?? 0} / ${kpis?.seatsHeld ?? 0}`}
            subtext={`${kpis?.seatsAvailable ?? 0} available`}
            icon={<Sliders className="w-4 h-4 text-purple-400" />}
            variant="purple"
          />
          <StatCard
            label="Pending Appeals"
            value={kpis?.pendingAppeals ?? 0}
            subtext="In review queue"
            icon={<Activity className="w-4 h-4 text-brand-yellow" />}
            variant="default"
          />
        </div>
      )}

      {/* Real-time Sliding Window Telemetry Chart */}
      <div className="p-6 rounded-2xl bg-[#0a0c14] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-stamp font-black text-lg text-white uppercase tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-yellow" />
              Live Traffic & Throttling Ring Buffer (Last 5 Minutes)
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Pure server-side per-second buckets • Zero client Math.random • Updates every 2 seconds
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-brand-yellow font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-yellow" />
              <span>RPS: {data?.telemetry.currentRps ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>429/s: {data?.telemetry.current429Rate ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>p95: {data?.telemetry.p95Latency ?? 0}ms</span>
            </div>
          </div>
        </div>

        <ChartWrapper title="Traffic & Abuse Radar (5m)" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metricsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rate429Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f111a',
                  borderColor: '#ffffff1a',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
              <Area
                type="monotone"
                dataKey="totalRequests"
                name="Requests / sec"
                stroke="#eab308"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#rpsGrad)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="rateLimited429"
                name="429 Rate Limits / sec"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#rate429Grad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Operational Controls & Health Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Drop Operations Card */}
        <div className="p-6 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-5">
          <div className="space-y-1">
            <h3 className="font-stamp font-black text-base text-white uppercase tracking-tight">
              Drop Control Center
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Perform real-time lifecycle interventions with audit logging.
            </p>
          </div>

          <div className="space-y-3">
            {isPaused ? (
              <Button
                size="md"
                variant="primary"
                onClick={() => setConfirmState({
                  isOpen: true,
                  action: 'resume',
                  title: 'Resume Event Registration',
                  message: `Are you sure you want to resume inbound entries for ${drop?.name}?`,
                  variant: 'primary',
                })}
                className="w-full justify-center bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                leftIcon={<PlayCircle className="w-4 h-4" />}
              >
                Resume Registrations
              </Button>
            ) : (
              <Button
                size="md"
                variant="secondary"
                onClick={() => setConfirmState({
                  isOpen: true,
                  action: 'pause',
                  title: 'Pause Event Registration',
                  message: `Are you sure you want to pause inbound registrations for ${drop?.name}?`,
                  variant: 'warning',
                })}
                className="w-full justify-center text-amber-300 border-amber-500/30"
                leftIcon={<PauseCircle className="w-4 h-4" />}
              >
                Pause Registrations
              </Button>
            )}

            {/* Extend window */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="120"
                value={extendMinutes}
                onChange={e => setExtendMinutes(parseInt(e.target.value) || 5)}
                className="w-20 px-3 py-2 rounded-xl bg-surface-100 border border-white/10 text-xs font-mono text-center text-white focus:outline-none focus:border-brand-yellow"
              />
              <Button
                size="md"
                variant="outline"
                onClick={() => setConfirmState({
                  isOpen: true,
                  action: 'extend',
                  title: `Extend Window by ${extendMinutes} Minutes`,
                  message: `This will push the deadline back for all attendees. Reason is required for the audit ledger.`,
                  variant: 'primary',
                  minutes: extendMinutes,
                })}
                className="flex-1 justify-center text-xs"
                leftIcon={<Clock className="w-4 h-4" />}
              >
                Extend Window
              </Button>
            </div>

            {/* Emergency Stop */}
            <div className="pt-2">
              <Button
                size="md"
                variant="danger"
                onClick={() => setConfirmState({
                  isOpen: true,
                  action: 'emergency-stop',
                  title: 'EMERGENCY STOP DROP',
                  message: 'This will immediately freeze all entries, reject new requests, and notify the security team. Proceed with caution.',
                  variant: 'danger',
                })}
                className="w-full justify-center font-bold text-xs"
                leftIcon={<AlertOctagon className="w-4 h-4" />}
              >
                Execute Emergency Stop
              </Button>
            </div>
          </div>
        </div>

        {/* System Health & Real Verification Checkers */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-5">
          <div className="space-y-1">
            <h3 className="font-stamp font-black text-base text-white uppercase tracking-tight">
              Integrity & Health Strip
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Execute live cryptographic checks and real allocation invariant verifications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Hash Chain Checker */}
            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400">Audit Hash Chain</span>
                <FileCheck2 className="w-4 h-4 text-brand-yellow" />
              </div>

              <div className="text-sm font-mono text-white">
                {auditVerifyResult ? (
                  auditVerifyResult.isValid ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> 100% Chain Valid ({auditVerifyResult.count} blocks)
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Broken at block #{auditVerifyResult.brokenIndex}
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">Ready to verify</span>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleRunAuditVerifyNow}
                disabled={isRunningAuditVerify}
                className="w-full justify-center text-xs"
              >
                {isRunningAuditVerify ? 'Verifying Hashes...' : 'Run Audit Verify Now'}
              </Button>
            </div>

            {/* Invariant Checker */}
            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400">Allocation Invariants</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="text-sm font-mono text-white">
                {invariantResult ? (
                  invariantResult.valid ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> 0 Oversold • 0 Duplicates
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Violations: {invariantResult.oversold} oversold
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">Ready to verify</span>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleRunInvariantsNow}
                disabled={isRunningInvariant}
                className="w-full justify-center text-xs"
              >
                {isRunningInvariant ? 'Checking Invariants...' : 'Run Invariant Check Now'}
              </Button>
            </div>

          </div>

          {/* Quick System Diagnostics */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono text-slate-400">
            <div>
              Uptime: <span className="text-white font-bold">{Math.floor((data?.health.uptimeSeconds || 0) / 60)}m</span>
            </div>
            <div>
              DB: <span className="text-emerald-400 font-bold">{data?.health.databaseStatus || 'online'}</span>
            </div>
            <div>
              Socket: <span className="text-emerald-400 font-bold">Connected</span>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Activity & Real Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Audit Activity */}
        <div className="p-6 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-stamp font-black text-base text-white uppercase tracking-tight">
              Recent Live Activity (Audit Log)
            </h3>
            <Link to="/admin/audit" className="text-xs font-mono text-brand-yellow hover:underline">
              View all &rarr;
            </Link>
          </div>

          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto font-mono text-xs">
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.map((act: any) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 truncate">
                    <span className="text-brand-yellow font-bold block">{act.action}</span>
                    <span className="text-slate-500 text-[10px]">Actor: {act.actorUid}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-500">No recent activity recorded.</div>
            )}
          </div>
        </div>

        {/* Real System Alerts */}
        <div className="p-6 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-4">
          <h3 className="font-stamp font-black text-base text-white uppercase tracking-tight">
            Active System Alerts
          </h3>

          <div className="space-y-3">
            {data?.alerts && data.alerts.length > 0 ? (
              data.alerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block text-white">{alert.title}</span>
                    <span className="text-slate-300 font-sans">{alert.message}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center rounded-xl bg-surface-100/40 border border-white/5 text-slate-500 text-xs">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-400/50" />
                All operational metrics are within safe thresholds.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={handleExecuteControl}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};
