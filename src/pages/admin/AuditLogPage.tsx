import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SkeletonLoader } from '@/components/admin/SkeletonLoader';
import { ErrorState } from '@/components/admin/ErrorState';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Lock,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Calendar,
  Layers,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getAdminHeaders } from '@/utils/api';

export const AuditLogPage: React.FC = () => {
  const { drops, addToast } = useApp();
  const selectedDrop = drops.find(d => d.id === 'drop-jack-white-vault') || drops[0];

  // Records state
  const [records, setRecords] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Verification & Invariants states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    brokenIndex?: number;
    count: number;
    verifiedAt?: string;
    message?: string;
  } | null>(null);

  const [isRunningInvariants, setIsRunningInvariants] = useState<boolean>(false);
  const [invariantResult, setInvariantResult] = useState<{
    oversold: number;
    duplicates: number;
    orphanedHolds: number;
    inventoryConsistent: boolean;
    valid: boolean;
    totalSeats: number;
    checkedAt?: string;
  } | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        action: actionFilter,
        actor: actorFilter,
        dateFrom,
        dateTo,
      });

      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: getAdminHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load audit ledger records');
      const data = await res.json();
      setRecords(data.items || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Error communicating with audit ledger.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter, actorFilter, dateFrom, dateTo]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await fetchAuditLogs();
    })();
    return () => {
      mounted = false;
    };
  }, [fetchAuditLogs]);

  // Run real hash chain verification
  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/admin/audit/verify', {
        method: 'POST',
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error('Verification failed');
      const data = await res.json();
      setVerificationResult(data);
      if (data.isValid) {
        addToast('success', 'Cryptographic Chain Verified', `All ${data.count} audit blocks cryptographically linked.`);
      } else {
        addToast('error', 'Tampering Detected', data.message || `Hash mismatch at index ${data.brokenIndex}`);
      }
    } catch (err: any) {
      addToast('error', 'Verification Failed', err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Run real invariant check
  const handleRunInvariants = async () => {
    if (!selectedDrop) return;
    setIsRunningInvariants(true);
    try {
      const res = await fetch(`/api/admin/audit/invariants/${selectedDrop.id}`, {
        method: 'POST',
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error('Invariant execution failed');
      const data = await res.json();
      setInvariantResult(data);
      if (data.valid) {
        addToast('success', 'Invariants Passed', 'Zero overselling, zero duplicate seat claims, inventory consistent.');
      } else {
        addToast('error', 'Invariant Failure Detected', 'System invariant violation found!');
      }
    } catch (err: any) {
      addToast('error', 'Invariant Check Failed', err.message);
    } finally {
      setIsRunningInvariants(false);
    }
  };

  // CSV Export of current filtered records
  const handleExportCsv = () => {
    if (records.length === 0) {
      addToast('warning', 'No Records', 'There are no records to export.');
      return;
    }

    const headers = ['ID', 'Index', 'Timestamp', 'Action', 'Actor UID', 'Prev Hash', 'Hash', 'Details JSON'];
    const rows = records.map(r => [
      r.id,
      r.index,
      `"${r.timestamp}"`,
      `"${r.action}"`,
      `"${r.actorUid}"`,
      `"${r.prevHash}"`,
      `"${r.hash}"`,
      `"${JSON.stringify(r.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fairdrop_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('success', 'CSV Exported', `Exported ${records.length} filtered audit records.`);
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Ledger & Cryptographic Integrity"
        subtitle="Append-only hash chain of all admin and participant actions, with SHA-256 tamper verification."
        badgeText={`${totalCount} Total Blocks`}
        badgeVariant="primary"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExportCsv}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button
              variant="primary"
              onClick={handleVerifyChain}
              isLoading={isVerifying}
              className="gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Verify Hash Chain
            </Button>
          </div>
        }
      />

      {/* Verification & Invariant Results Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Verification Card */}
        <div className="p-5 bg-surface-100 border border-white/5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-yellow" />
              <h3 className="text-sm font-bold text-white">SHA-256 Hash Chain Integrity</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={handleVerifyChain} isLoading={isVerifying} className="text-xs h-7">
              Verify Now
            </Button>
          </div>

          {verificationResult ? (
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              verificationResult.isValid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {verificationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              )}
              <div className="space-y-1 text-xs">
                <span className="font-bold block">
                  {verificationResult.isValid ? 'Chain Valid & Cryptographically Intact' : 'Tamper Detected in Hash Ledger'}
                </span>
                <span className="opacity-80 block font-mono">
                  {verificationResult.message || `Verified ${verificationResult.count} linked blocks.`}
                </span>
                <span className="text-[10px] opacity-60 font-mono block">
                  Last verified: {verificationResult.verifiedAt ? new Date(verificationResult.verifiedAt).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-white/5 rounded-xl text-xs text-slate-400 flex items-center justify-between">
              <span>Status: Chain verification ready. Click &quot;Verify Now&quot; to audit all blocks.</span>
            </div>
          )}
        </div>

        {/* Invariant Checker Card */}
        <div className="p-5 bg-surface-100 border border-white/5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">System Invariant Checker</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={handleRunInvariants} isLoading={isRunningInvariants} className="text-xs h-7 text-cyan-400">
              Run Invariants
            </Button>
          </div>

          {invariantResult ? (
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              invariantResult.valid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {invariantResult.valid ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              )}
              <div className="space-y-1 text-xs">
                <span className="font-bold block">
                  {invariantResult.valid ? 'All Invariants Satisfied' : 'Invariant Violation'}
                </span>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <span>Oversold: {invariantResult.oversold}</span>
                  <span>Duplicates: {invariantResult.duplicates}</span>
                  <span>Holds: {invariantResult.orphanedHolds}</span>
                </div>
                <span className="text-[10px] opacity-60 font-mono block">
                  Audited: {invariantResult.totalSeats} seats at {invariantResult.checkedAt ? new Date(invariantResult.checkedAt).toLocaleTimeString() : 'recent'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-white/5 rounded-xl text-xs text-slate-400 flex items-center justify-between">
              <span>Status: Invariants ready. Checks oversold, duplicate claims &amp; orphaned holds.</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-surface-100 border border-white/5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface-200 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <input
            type="text"
            placeholder="Filter by actor..."
            value={actorFilter}
            onChange={(e) => {
              setActorFilter(e.target.value);
              setPage(1);
            }}
            className="bg-surface-200 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow"
          />

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="bg-surface-200 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            title="Date From"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="bg-surface-200 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            title="Date To"
          />
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setActionFilter('');
            setActorFilter('');
            setDateFrom('');
            setDateTo('');
            setPage(1);
          }}
          className="text-xs text-slate-400"
        >
          Reset Filters
        </Button>
      </div>

      {/* Main Table */}
      {loading && records.length === 0 ? (
        <SkeletonLoader count={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAuditLogs} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No Audit Records Found"
          description="No ledger blocks match your search or filter criteria."
          actionText="Clear Filters"
          onAction={() => {
            setActionFilter('');
            setActorFilter('');
            setDateFrom('');
            setDateTo('');
            setPage(1);
          }}
        />
      ) : (
        <div className="bg-surface-100 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Index / Block ID</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {records.map((r) => {
                  const isExpanded = expandedRows.has(r.id);
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => toggleRow(r.id)}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 text-slate-500">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-brand-yellow" />
                          ) : (
                            <ChevronRight className="w-4 h-4 group-hover:text-white" />
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          #{r.index} <span className="text-[11px] text-slate-500 font-normal">({r.id})</span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-white/5 text-amber-300 font-semibold">
                            {r.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {r.actorUid}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {new Date(r.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-400/80">
                          {r.hash ? `${r.hash.slice(0, 16)}...` : 'N/A'}
                        </td>
                      </tr>

                      {/* Expandable JSON Detail */}
                      {isExpanded && (
                        <tr className="bg-surface-200/50">
                          <td colSpan={6} className="p-4 pl-12 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                                <span className="text-slate-500 block">Previous Block Hash:</span>
                                <span className="text-slate-300 break-all">{r.prevHash}</span>
                              </div>
                              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                                <span className="text-slate-500 block">Current Block Hash:</span>
                                <span className="text-cyan-400 break-all">{r.hash}</span>
                              </div>
                            </div>

                            <div className="p-3 bg-black/60 rounded-xl border border-white/5 space-y-1">
                              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider block">
                                Block Payload &amp; Event Details
                              </span>
                              <pre className="text-xs text-emerald-400 font-mono overflow-x-auto p-2 bg-black/40 rounded-lg">
                                {JSON.stringify(r.details || {}, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between p-4 border-t border-white/5 text-xs text-slate-400">
            <span>
              Showing page {page} of {totalPages} ({totalCount} records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
