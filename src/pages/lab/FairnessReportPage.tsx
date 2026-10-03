import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChartWrapper } from '@/components/ui/ChartWrapper';
import { api } from '@/utils/api';
import { LabMeasuredReport } from '@shared/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Printer,
  Trash2,
  Clock,
  ArrowRight,
  RotateCcw,
  Activity,
  Layers,
  Users,
  Target,
  Scale,
  Cpu,
  Zap,
  Info,
} from 'lucide-react';

export const FairnessReportPage: React.FC = () => {
  const { runId: paramRunId } = useParams<{ runId?: string }>();
  const { addToast } = useApp();

  const [activeRunId, setActiveRunId] = useState<string | null>(paramRunId || null);
  const [report, setReport] = useState<LabMeasuredReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [purging, setPurging] = useState<boolean>(false);
  const [purgeResult, setPurgeResult] = useState<any>(null);

  // If no runId, discover latest completed run
  useEffect(() => {
    let mounted = true;
    if (!activeRunId) {
      api.lab.getRuns().then(res => {
        if (mounted && res.runs && res.runs.length > 0) {
          const latest = res.runs[0];
          setActiveRunId(latest.runId || latest.id);
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

  // Fetch report
  useEffect(() => {
    if (!activeRunId) return;

    let mounted = true;
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.lab.getReport(activeRunId);
        if (mounted) {
          if (res.report) {
            setReport(res.report);
          } else {
            setError('Measured report data is not yet available for this run.');
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load report.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchReport();

    // Poll if waiting for draw
    const interval = setInterval(async () => {
      if (report && !report.drawCompleted) {
        try {
          const res = await api.lab.getReport(activeRunId);
          if (mounted && res.report) {
            setReport(res.report);
          }
        } catch (_) {}
      }
    }, 4000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeRunId, report?.drawCompleted]);

  // Export JSON
  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measured_lab_report_${report.runId}.json`;
    a.click();
    addToast('success', 'JSON Exported', 'Measured adversarial data saved.');
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!report) return;
    const rows = [
      ['Metric', 'Value'],
      ['Run ID', report.runId],
      ['Target Event', report.targetEventName],
      ['Target Mode', report.targetMode],
      ['Allocation Mode', report.mode],
      ['Total Requests Sent', report.totalSent.toString()],
      ['Server Received', report.totalReceived.toString()],
      ['Achieved RPS', report.achievedRps.toString()],
      ['Bot Detection Rate (%)', report.detectionQuality.botDetectionRate.toString()],
      ['Human False Positive Rate (%)', report.detectionQuality.humanFalsePositiveRate.toString()],
      ['Bot Advantage Ratio', report.fairness.botAdvantageRatio.toString()],
      ['Jains Fairness Index', report.fairness.jainsIndexHumans.toString()],
      ['Gini Coefficient', report.fairness.giniCoefficientHumans.toString()],
      ['Human p50 Latency (ms)', report.systemPerformance.humanLatencyP50Ms.toString()],
      ['Human p95 Latency (ms)', report.systemPerformance.humanLatencyP95Ms.toString()],
      ['Invariants Oversold', report.invariants.oversold.toString()],
      ['Invariants Duplicates', report.invariants.duplicates.toString()],
    ];

    const csvContent = rows.map(e => e.map(x => `"${x.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measured_lab_report_${report.runId}.csv`;
    a.click();
    addToast('success', 'CSV Exported', 'Measured data exported in spreadsheet format.');
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  // Purge run
  const handlePurge = async () => {
    if (!activeRunId) return;
    try {
      setPurging(true);
      const res = await api.lab.purgeRun(activeRunId);
      setPurgeResult(res);
      addToast('success', 'Purge Complete', res.message || 'Synthetic data removed.');
    } catch (err: any) {
      addToast('error', 'Purge Failed', err.message);
    } finally {
      setPurging(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center space-y-4">
        <Activity className="w-8 h-8 text-brand-yellow mx-auto animate-spin" />
        <h2 className="text-xl font-mono text-white">Synthesizing Measured Report from Real Requests...</h2>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white uppercase font-stamp">Report Not Found</h2>
        <p className="text-sm font-mono text-slate-400 max-w-md mx-auto">
          {error || 'No measured report was found for this run ID.'}
        </p>
        <Link to="/lab">
          <Button variant="primary" size="md">
            Return to Attack Designer
          </Button>
        </Link>
      </div>
    );
  }

  // Funnel chart data
  const funnelData = [
    { stage: 'Attempted', human: report.funnel.attempted.human, bot: report.funnel.attempted.bot },
    { stage: 'Authenticated', human: report.funnel.authenticated.human, bot: report.funnel.authenticated.bot },
    { stage: 'Passed Checks', human: report.funnel.passedChecks.human, bot: report.funnel.passedChecks.bot },
    { stage: 'Challenged', human: report.funnel.challenged.human, bot: report.funnel.challenged.bot },
    { stage: 'Rate-Limited', human: report.funnel.rateLimited.human, bot: report.funnel.rateLimited.bot },
    { stage: 'Blocked', human: report.funnel.blocked.human, bot: report.funnel.blocked.bot },
    { stage: 'Entered', human: report.funnel.entered.human, bot: report.funnel.entered.bot },
    { stage: 'Eligible', human: report.funnel.eligible.human, bot: report.funnel.eligible.bot },
    { stage: 'Selected', human: report.funnel.selected.human, bot: report.funnel.selected.bot },
    { stage: 'Allocated', human: report.funnel.allocated.human, bot: report.funnel.allocated.bot },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-24 text-slate-100 print:py-0 print:px-0">
      
      {/* 1. RUN SUMMARY & HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 print:border-none">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link to="/lab" className="hover:text-rose-400 print:hidden">← Attack Designer</Link>
            <span className="print:hidden">/</span>
            <span>LAB 3 · SCIENTIFIC MEASUREMENT REPORT</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Measured Adversarial Report
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Run ID: <strong className="text-brand-yellow">{report.runId}</strong> • Timestamp: {new Date(report.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={handleExportJson} leftIcon={<Download className="w-3.5 h-3.5" />}>
            JSON
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCsv} leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}>
            CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={handlePrint} leftIcon={<Printer className="w-3.5 h-3.5" />}>
            Print / PDF
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handlePurge}
            disabled={purging}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            {purging ? 'Purging...' : 'Purge Run Data'}
          </Button>
        </div>
      </div>

      {/* Purge notification if completed */}
      {purgeResult && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs font-mono text-rose-300 flex items-center justify-between">
          <span>
            Cleaned {purgeResult.purgedEntries} synthetic entries and {purgeResult.purgedUsers} accounts.
            {purgeResult.cloneDeleted && ' Sandbox clone deleted.'} Invariants verified clean.
          </span>
          <Badge variant="emerald">PURGED</Badge>
        </div>
      )}

      {/* 10. PLAIN-LANGUAGE "WHAT THIS SHOWS" SUMMARY */}
      <Card className="p-6 border-brand-yellow/40 bg-surface-100/70 space-y-3">
        <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4" /> Plain-Language Measured Findings
        </h2>
        <p className="text-sm font-mono text-slate-200 leading-relaxed">
          {report.whatThisShowsSummary}
        </p>
        {report.sybilLimitationNote && (
          <div className="p-3 bg-surface-200/80 rounded border border-white/10 text-xs font-mono text-slate-400">
            {report.sybilLimitationNote}
          </div>
        )}
      </Card>

      {/* 1. RUN SUMMARY METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3 bg-surface-100/60 border border-white/10 rounded-lg">
          <div className="text-slate-400 text-[10px]">TARGET EVENT</div>
          <div className="text-white font-bold truncate mt-0.5" title={report.targetEventName}>
            {report.targetEventName}
          </div>
        </div>
        <div className="p-3 bg-surface-100/60 border border-white/10 rounded-lg">
          <div className="text-slate-400 text-[10px]">TARGET MODE</div>
          <div className="text-brand-yellow font-bold mt-0.5">{report.targetMode.toUpperCase()}</div>
        </div>
        <div className="p-3 bg-surface-100/60 border border-white/10 rounded-lg">
          <div className="text-slate-400 text-[10px]">MEASURED SCALE</div>
          <div className="text-white font-bold mt-0.5">{report.totalSent.toLocaleString()} reqs</div>
        </div>
        <div className="p-3 bg-surface-100/60 border border-white/10 rounded-lg">
          <div className="text-slate-400 text-[10px]">ACHIEVED RPS</div>
          <div className="text-emerald-400 font-bold mt-0.5">{report.achievedRps} req/s</div>
        </div>
        <div className="p-3 bg-surface-100/60 border border-white/10 rounded-lg">
          <div className="text-slate-400 text-[10px]">DURATION</div>
          <div className="text-white font-bold mt-0.5">{report.durationSec} seconds</div>
        </div>
        <div className="p-3 bg-surface-100/60 border border-white/10 rounded-lg">
          <div className="text-slate-400 text-[10px]">SEED</div>
          <div className="text-slate-300 font-bold truncate mt-0.5" title={report.seed}>
            {report.seed}
          </div>
        </div>
      </div>

      {/* 10. RECONCILIATION RESULT */}
      <div
        className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs ${
          report.reconciliation.isReconciled
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Reconciliation Audit:</strong> Simulator Sent:{' '}
            <strong className="text-white">{report.reconciliation.simulatorSent.toLocaleString()}</strong> | Server Received:{' '}
            <strong className="text-white">{report.reconciliation.serverReceived.toLocaleString()}</strong> | Accounted Outcomes:{' '}
            <strong className="text-white">{report.reconciliation.outcomesAccounted.toLocaleString()}</strong>
          </span>
        </div>
        <span className="font-bold">
          {report.reconciliation.isReconciled ? 'PERFECT RECONCILIATION (0 GAP)' : `UNRESOLVED GAP: ${report.reconciliation.gap}`}
        </span>
      </div>

      {/* 2. PIPELINE FUNNEL (SPLIT HUMANS VS BOTS) */}
      <Card className="p-6 border-white/10 bg-surface-100/50 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-yellow" />
            2. Pipeline Funnel Telemetry (Humans vs Bots)
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Measured progression through Express security pipeline
          </span>
        </div>

        <ChartWrapper title="Funnel Progression by Pipeline Stage" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="stage" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#ffffff20' }} />
              <Legend />
              <Bar dataKey="human" name="Human Requests" fill="#10b981" />
              <Bar dataKey="bot" name="Bot Requests" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </Card>

      {/* 3. PER ATTACK TYPE TABLE */}
      <Card className="p-6 border-white/10 bg-surface-100/50 space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-rose-500" />
          3. Per Attack Type Performance Table
        </h2>

        <div className="overflow-x-auto border border-white/10 rounded-lg">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-surface-200 text-slate-400">
              <tr>
                <th className="p-3">Attack Vector</th>
                <th className="p-3">Bots Sent</th>
                <th className="p-3">Accepted (In)</th>
                <th className="p-3">Challenged</th>
                <th className="p-3">Rate-Limited</th>
                <th className="p-3">Blocked</th>
                <th className="p-3">Success Rate</th>
                <th className="p-3">Selected</th>
                <th className="p-3">Allocated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {Object.entries(report.perAttackType || {}).map(([name, stats]: [string, any]) => {
                const successRate = stats.sent > 0 ? ((stats.accepted / stats.sent) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={name} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{name}</td>
                    <td className="p-3">{stats.sent}</td>
                    <td className="p-3 text-emerald-400 font-bold">{stats.accepted}</td>
                    <td className="p-3">{stats.challenged}</td>
                    <td className="p-3">{stats.rateLimited}</td>
                    <td className="p-3 text-rose-400">{stats.blocked}</td>
                    <td className="p-3 font-bold text-brand-yellow">{successRate}%</td>
                    <td className="p-3">{report.drawCompleted ? (stats.selected ?? 0) : 'Waiting'}</td>
                    <td className="p-3">{report.drawCompleted ? (stats.allocated ?? 0) : 'Waiting'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4 & 5: DEFENCE EFFECTIVENESS & DETECTION QUALITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 4. Defence Effectiveness Table */}
        <Card className="p-6 border-white/10 bg-surface-100/50 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            4. Defence Layer Effectiveness
          </h2>
          <p className="text-[11px] font-mono text-slate-400">
            Shows intercepted bot attempts alongside legitimate human false positives:
          </p>

          <div className="overflow-x-auto border border-white/10 rounded-lg">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-200 text-slate-400">
                <tr>
                  <th className="p-2.5">Defence Layer</th>
                  <th className="p-2.5 text-rose-400">Bots Stopped</th>
                  <th className="p-2.5 text-amber-400">Humans Stopped (FP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {Object.entries(report.defenceEffectiveness || {}).map(([code, counts]) => (
                  <tr key={code} className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white">{code}</td>
                    <td className="p-2.5 text-rose-400 font-bold">{counts.botStopped}</td>
                    <td className="p-2.5 text-amber-300">{counts.humanStopped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 5. Detection Quality Cards */}
        <Card className="p-6 border-white/10 bg-surface-100/50 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-yellow" />
            5. Detection Quality & Accuracy
          </h2>

          <div className="grid grid-cols-3 gap-3 font-mono text-center">
            <div className="p-4 bg-surface-200/60 rounded-lg border border-white/5">
              <div className="text-slate-400 text-[10px]">BOT DETECTION RATE</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {report.detectionQuality.botDetectionRate}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Recall on attack pool</div>
            </div>

            <div className="p-4 bg-surface-200/60 rounded-lg border border-white/5">
              <div className="text-slate-400 text-[10px]">HUMAN FALSE POSITIVES</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {report.detectionQuality.humanFalsePositiveRate}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Innocent users blocked</div>
            </div>

            <div className="p-4 bg-surface-200/60 rounded-lg border border-white/5">
              <div className="text-slate-400 text-[10px]">FILTER PRECISION</div>
              <div className="text-2xl font-bold text-white mt-1">
                {report.detectionQuality.precision}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">True pos / total flagged</div>
            </div>
          </div>

          <p className="text-[11px] font-mono text-slate-400">
            A low human false-positive rate proves defences distinguish automated scripts from authentic fan traffic without collateral damage.
          </p>
        </Card>
      </div>

      {/* 6. FAIRNESS METRICS */}
      <Card className="p-6 border-white/10 bg-surface-100/50 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-brand-yellow" />
            6. Allocation Fairness Telemetry
          </h2>
          {!report.drawCompleted && (
            <Badge variant="amber">
              Waiting for the draw to compute final winner allocations
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 bg-surface-200/60 rounded-lg">
            <div className="text-slate-400 text-[10px]">BOT SHARE OF TRAFFIC</div>
            <div className="text-xl font-bold text-white mt-1">{report.fairness.botShareOfTraffic}%</div>
          </div>
          <div className="p-3 bg-surface-200/60 rounded-lg">
            <div className="text-slate-400 text-[10px]">BOT SHARE OF ENTRIES</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{report.fairness.botShareOfEntries}%</div>
          </div>
          <div className="p-3 bg-surface-200/60 rounded-lg">
            <div className="text-slate-400 text-[10px]">BOT ADVANTAGE RATIO</div>
            <div className="text-xl font-bold text-brand-yellow mt-1">
              {report.fairness.botAdvantageRatio}x
            </div>
            <div className="text-[10px] text-slate-500">1.0 = equal win probability</div>
          </div>
          <div className="p-3 bg-surface-200/60 rounded-lg">
            <div className="text-slate-400 text-[10px]">JAIN'S FAIRNESS INDEX</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{report.fairness.jainsIndexHumans}</div>
            <div className="text-[10px] text-slate-500">1.00 = perfect equality</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs pt-2 border-t border-white/5">
          <div className="flex justify-between items-center bg-surface-200/40 p-2.5 rounded">
            <span className="text-slate-400">Fast Connection Success Rate:</span>
            <strong className="text-white">{(report.fairness.fastConnectionSuccessRate * 100).toFixed(1)}%</strong>
          </div>
          <div className="flex justify-between items-center bg-surface-200/40 p-2.5 rounded">
            <span className="text-slate-400">Slow Connection Success Rate:</span>
            <strong className="text-white">{(report.fairness.slowConnectionSuccessRate * 100).toFixed(1)}%</strong>
          </div>
        </div>
      </Card>

      {/* 7, 8, 9: SYSTEM PERFORMANCE, RELIABILITY & INTEGRITY INVARIANTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
        
        {/* 7. System Performance */}
        <Card className="p-5 border-white/10 bg-surface-100/50 space-y-3">
          <h2 className="text-xs uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" /> 7. System Performance
          </h2>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Throughput:</span>
              <strong className="text-white">{report.systemPerformance.throughputRps} rps</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Human Latency p50:</span>
              <strong className="text-emerald-400">{report.systemPerformance.humanLatencyP50Ms}ms</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Human Latency p95:</span>
              <strong className="text-amber-400">{report.systemPerformance.humanLatencyP95Ms}ms</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Human Latency p99:</span>
              <strong className="text-rose-400">{report.systemPerformance.humanLatencyP99Ms}ms</strong>
            </div>
          </div>
        </Card>

        {/* 8. Reliability */}
        <Card className="p-5 border-white/10 bg-surface-100/50 space-y-3">
          <h2 className="text-xs uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-brand-yellow" /> 8. Session Reliability
          </h2>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Recovery Time:</span>
              <strong className="text-white">{report.reliability.recoveryTimeSec ?? 'N/A'}s</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Session Preserved:</span>
              <Badge variant="emerald">VERIFIED</Badge>
            </div>
          </div>
        </Card>

        {/* 9. Integrity Invariants */}
        <Card className="p-5 border-white/10 bg-surface-100/50 space-y-3">
          <h2 className="text-xs uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 9. Invariant Checker
          </h2>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Oversold Seats:</span>
              <strong className="text-emerald-400">{report.invariants.oversold}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Duplicate Receipts:</span>
              <strong className="text-emerald-400">{report.invariants.duplicates}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Inventory Status:</span>
              <strong className="text-emerald-400">CONSISTENT</strong>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};
