import React, { useState, useEffect } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getAdminHeaders } from '@/utils/api';
import { LabThreatSummary } from '@shared/types';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Flame,
  Globe,
  Radio,
  RotateCcw,
} from 'lucide-react';

interface ThreatMonitorProps {
  dropId?: string;
  className?: string;
}

export const ThreatMonitor: React.FC<ThreatMonitorProps> = ({ dropId = 'drop-jack-white-vault', className = '' }) => {
  const [data, setData] = useState<LabThreatSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchThreats = async () => {
      try {
        const res = await fetch(`/api/admin/threats?dropId=${encodeURIComponent(dropId)}`, {
          headers: getAdminHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setData(json);
        }
      } catch (_) {}
    };

    fetchThreats();
    const interval = setInterval(fetchThreats, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dropId]);

  const lastMinute = data?.lastMinute || { accepted: 0, blocked: 0, rateLimited: 0, challenged: 0, total: 0 };
  const total = data?.total || { accepted: 0, blocked: 0, rateLimited: 0, challenged: 0, total: 0 };
  const rps = data?.requestsPerSec || 0;
  const isAttackActive = Boolean(data?.activeLabRun);

  return (
    <Card variant="glass" className={`space-y-4 border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2 font-stamp tracking-tight">
                <ShieldAlert className="w-4 h-4 text-brand-yellow" />
                Live Threat Monitor & Traffic Radar
              </CardTitle>
              {isAttackActive && (
                <Badge variant="rose" className="animate-pulse">
                  <Flame className="w-3 h-3 mr-1 inline fill-current" />
                  Simulated Attack In Progress: {data?.activeLabRun?.scenarioName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Event: <span className="font-mono text-slate-200">{dropId}</span> · Server-verified telemetry stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Current Velocity:</span>
          <span className={`font-bold px-2 py-0.5 rounded ${rps > 10 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {rps} req/sec
          </span>
        </div>
      </div>

      {/* 4 Stat Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="p-3 bg-surface-200/80 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase block">Accepted (Legit)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-400">{lastMinute.accepted.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500">/min</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Total: {total.accepted.toLocaleString()}</span>
        </div>

        <div className="p-3 bg-surface-200/80 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase block">Blocked (Defences)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-rose-400">{lastMinute.blocked.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500">/min</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Total: {total.blocked.toLocaleString()}</span>
        </div>

        <div className="p-3 bg-surface-200/80 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase block">Rate-Limited (429)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-amber-400">{lastMinute.rateLimited.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500">/min</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Total: {total.rateLimited.toLocaleString()}</span>
        </div>

        <div className="p-3 bg-surface-200/80 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase block">Challenged (PoW/Risk)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-cyan-400">{lastMinute.challenged.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500">/min</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Total: {total.challenged.toLocaleString()}</span>
        </div>
      </div>

      {/* Reasons & Top Offending IPs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs font-mono">
        {/* Reasons breakdown */}
        <div className="p-3 bg-surface-200/50 rounded-xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Defence Interceptions by Reason Code
          </span>
          {Object.keys(data?.blockedByReason || {}).length === 0 ? (
            <p className="text-slate-500 text-[11px] italic">No active blocks or rate-limits recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data?.blockedByReason || {}).map(([reason, count]) => (
                <span
                  key={reason}
                  className="px-2 py-0.5 rounded bg-surface-100 border border-white/10 text-slate-300 flex items-center gap-1.5"
                >
                  <span className="text-amber-400 font-bold">{reason}</span>
                  <span className="bg-white/10 px-1 rounded text-white text-[10px]">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top offending IPs */}
        <div className="p-3 bg-surface-200/50 rounded-xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Top Offending IP Hash Clusters
          </span>
          {(data?.topOffendingIps || []).length === 0 ? (
            <p className="text-slate-500 text-[11px] italic">No repeated adversarial IP clusters detected.</p>
          ) : (
            <div className="space-y-1">
              {(data?.topOffendingIps || []).map((item, idx) => (
                <div
                  key={item.ipPrefix}
                  className="flex items-center justify-between py-0.5 px-2 rounded bg-surface-100/60 border border-white/5 text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-200 font-mono">{item.ipPrefix}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold">{item.count} reqs</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300">{item.lastReason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
