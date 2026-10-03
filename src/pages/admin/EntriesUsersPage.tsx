import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Drawer } from '@/components/admin/Drawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState } from '@/components/admin/EmptyState';
import { ErrorState } from '@/components/admin/ErrorState';
import { SkeletonLoader } from '@/components/admin/SkeletonLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ShieldAlert,
  ShieldCheck,
  UserX,
  Flag,
  RotateCcw,
  CheckCircle2,
  Clock,
  Laptop,
  Fingerprint,
  Info,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getAdminHeaders } from '@/utils/api';

export const EntriesUsersPage: React.FC = () => {
  const { drops, addToast } = useApp();
  const [searchParams] = useSearchParams();

  // Drop selection
  const [selectedDropId, setSelectedDropId] = useState<string>(() => {
    return searchParams.get('dropId') || localStorage.getItem('fairdrop_selected_drop') || 'drop-jack-white-vault';
  });

  // Table state
  const [entries, setEntries] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskBand, setRiskBand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('serverTimestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Loading & Error
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail drawer
  const [detailEntry, setDetailEntry] = useState<any | null>(null);

  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    action: 'flag' | 'ban' | 'clear' | null;
    identityKey: string | null;
    isBulk: boolean;
  }>({
    isOpen: false,
    action: null,
    identityKey: null,
    isBulk: false,
  });

  // Fetch entries from server
  const fetchEntries = useCallback(async () => {
    if (!selectedDropId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        q: searchTerm,
        status: statusFilter,
        riskBand,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/admin/drops/${selectedDropId}/entries?${params.toString()}`, {
        headers: getAdminHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to load entries (${res.status})`);
      }

      const data = await res.json();
      setEntries(data.items || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  }, [selectedDropId, page, pageSize, searchTerm, statusFilter, riskBand, sortBy, sortOrder]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Execute single or bulk action
  const handleConfirmAction = async (reason: string) => {
    if (!actionDialog.action) return;

    try {
      if (actionDialog.isBulk) {
        const res = await fetch(`/api/admin/drops/${selectedDropId}/entries/bulk`, {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({
            identityKeys: selectedKeys,
            action: actionDialog.action,
            reason,
          }),
        });

        if (!res.ok) throw new Error('Bulk update failed');
        addToast('success', 'Bulk Action Completed', `Updated ${selectedKeys.length} entries. Audit log recorded.`);
        setSelectedKeys([]);
      } else if (actionDialog.identityKey) {
        const res = await fetch(`/api/admin/drops/${selectedDropId}/entries/${actionDialog.identityKey}/action`, {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({
            action: actionDialog.action,
            reason,
          }),
        });

        if (!res.ok) throw new Error('Entry update failed');
        addToast('success', 'Entry Moderated', `Entry ${actionDialog.identityKey.slice(0, 8)} updated to ${actionDialog.action}.`);
      }

      setActionDialog({ isOpen: false, action: null, identityKey: null, isBulk: false });
      if (detailEntry) setDetailEntry(null);
      fetchEntries();
    } catch (err: any) {
      addToast('error', 'Action Failed', err.message);
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (score >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  const columns: Column<any>[] = [
    {
      header: 'Identity / UID',
      accessorKey: 'identityKey',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs text-white block">{row.identityKey}</span>
          <span className="text-[11px] text-slate-500 font-mono">UID: {row.uid || 'anon'}</span>
        </div>
      ),
    },
    {
      header: 'Risk Score',
      accessorKey: 'riskScore',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getRiskScoreColor(row.riskScore || 0)}`}>
            {row.riskScore || 0}/100
          </span>
          {row.riskScore >= 80 ? (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row: any) => {
        let variant: 'emerald' | 'amber' | 'rose' | 'cyan' = 'cyan';
        if (row.status === 'eligible') variant = 'emerald';
        if (row.status === 'flagged') variant = 'amber';
        if (row.status === 'blocked') variant = 'rose';
        return <Badge variant={variant}>{row.status.toUpperCase()}</Badge>;
      },
    },
    {
      header: 'IP Hash',
      accessorKey: 'ipHash',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-400">
          {row.ipHash ? `${row.ipHash.slice(0, 10)}...` : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Timestamp',
      accessorKey: 'serverTimestamp',
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-slate-400">
          {row.serverTimestamp ? new Date(row.serverTimestamp).toLocaleTimeString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setDetailEntry(row)}
            className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-300 transition-colors"
            title="Inspect Risk Signals"
          >
            Inspect
          </button>
          {row.status !== 'flagged' && (
            <button
              onClick={() => setActionDialog({ isOpen: true, action: 'flag', identityKey: row.identityKey, isBulk: false })}
              className="p-1 hover:bg-amber-500/20 text-amber-400 rounded transition-colors"
              title="Flag Entry"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
          {row.status !== 'blocked' && (
            <button
              onClick={() => setActionDialog({ isOpen: true, action: 'ban', identityKey: row.identityKey, isBulk: false })}
              className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
              title="Ban & Block Entry"
            >
              <UserX className="w-3.5 h-3.5" />
            </button>
          )}
          {row.status !== 'eligible' && (
            <button
              onClick={() => setActionDialog({ isOpen: true, action: 'clear', identityKey: row.identityKey, isBulk: false })}
              className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
              title="Clear to Eligible"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entries Pool & Risk Register"
        subtitle="Server-paginated audit stream of all attendee join requests with real-time risk signal breakdown."
        badgeText={`${totalCount} Total Entries`}
        badgeVariant="primary"
        action={
          <div className="flex items-center gap-3">
            <select
              value={selectedDropId}
              onChange={(e) => setSelectedDropId(e.target.value)}
              className="bg-surface-200 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow"
            >
              {drops.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={fetchEntries} isLoading={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filters Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface-100 border border-white/5 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Filters:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-surface-200 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-yellow"
          >
            <option value="all">All Statuses</option>
            <option value="eligible">Eligible</option>
            <option value="flagged">Flagged</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={riskBand}
            onChange={(e) => {
              setRiskBand(e.target.value);
              setPage(1);
            }}
            className="bg-surface-200 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-yellow"
          >
            <option value="all">All Risk Bands</option>
            <option value="low">Low Risk (&lt; 50)</option>
            <option value="medium">Medium Risk (50 - 79)</option>
            <option value="high">High Risk (&gt;= 80)</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedKeys.length > 0 && (
          <div className="flex items-center gap-2 bg-brand-yellow/10 border border-brand-yellow/30 px-3 py-1.5 rounded-lg animate-fadeIn">
            <span className="text-xs font-mono text-brand-yellow font-bold">
              {selectedKeys.length} selected
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-7 py-0"
              onClick={() => setActionDialog({ isOpen: true, action: 'flag', identityKey: null, isBulk: true })}
            >
              Flag
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="text-xs h-7 py-0"
              onClick={() => setActionDialog({ isOpen: true, action: 'ban', identityKey: null, isBulk: true })}
            >
              Ban
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 py-0 text-emerald-400"
              onClick={() => setActionDialog({ isOpen: true, action: 'clear', identityKey: null, isBulk: true })}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Main Table */}
      {loading && entries.length === 0 ? (
        <SkeletonLoader count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEntries} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No Entries Found"
          description="There are currently no attendee entries matching the applied search or filter criteria."
          actionText="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setStatusFilter('all');
            setRiskBand('all');
            setPage(1);
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          keyField="identityKey"
          searchPlaceholder="Search by identityKey, IP hash, receipt..."
          serverSidePagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onSearch={(q: string) => {
            setSearchTerm(q);
            setPage(1);
          }}
          selectable
          selectedRowKeys={selectedKeys}
          onSelectRows={setSelectedKeys}
          onRowClick={(row) => setDetailEntry(row)}
        />
      )}

      {/* Row Detail Drawer (Signals, Timing, Device, Actions) */}
      <Drawer
        isOpen={Boolean(detailEntry)}
        onClose={() => setDetailEntry(null)}
        title="Entry Risk Analysis & Signals"
        subtitle={`Audit record for ${detailEntry?.identityKey || ''}`}
        footer={
          detailEntry && (
            <div className="flex items-center justify-between gap-3 w-full">
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setActionDialog({ isOpen: true, action: 'clear', identityKey: detailEntry.identityKey, isBulk: false })}
              >
                Clear to Eligible
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActionDialog({ isOpen: true, action: 'flag', identityKey: detailEntry.identityKey, isBulk: false })}
                >
                  Flag Entry
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setActionDialog({ isOpen: true, action: 'ban', identityKey: detailEntry.identityKey, isBulk: false })}
                >
                  Ban &amp; Block
                </Button>
              </div>
            </div>
          )
        }
      >
        {detailEntry && (
          <div className="space-y-6">
            {/* Risk Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${getRiskScoreColor(detailEntry.riskScore || 0)}`}>
              <div>
                <span className="text-xs uppercase tracking-wider font-mono block opacity-80">Composite Risk Score</span>
                <span className="text-3xl font-mono font-black">{detailEntry.riskScore || 0}/100</span>
              </div>
              <Badge variant={detailEntry.status === 'eligible' ? 'emerald' : detailEntry.status === 'blocked' ? 'rose' : 'amber'}>
                {detailEntry.status.toUpperCase()}
              </Badge>
            </div>

            {/* Contributing Risk Signals */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Contributing Signals</span>
              {detailEntry.riskSignals && detailEntry.riskSignals.length > 0 ? (
                <div className="space-y-1.5">
                  {detailEntry.riskSignals.map((sig: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs font-mono">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{sig}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white/5 rounded-lg text-slate-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No elevated anomaly signals triggered on this entry.</span>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5" /> Identity Hash
                </span>
                <span className="text-white break-all block">{detailEntry.identityKey}</span>
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Registered At
                </span>
                <span className="text-white block">
                  {detailEntry.serverTimestamp ? new Date(detailEntry.serverTimestamp).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5" /> IP Hash
                </span>
                <span className="text-white break-all block">{detailEntry.ipHash || 'N/A'}</span>
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Receipt ID
                </span>
                <span className="text-white break-all block">{detailEntry.receipt || detailEntry.receiptId || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirmation Dialog with Required Reason for Audit */}
      <ConfirmDialog
        isOpen={actionDialog.isOpen}
        onClose={() => setActionDialog({ isOpen: false, action: null, identityKey: null, isBulk: false })}
        onConfirm={handleConfirmAction}
        title={
          actionDialog.action === 'ban'
            ? 'Confirm Ban & Block'
            : actionDialog.action === 'flag'
            ? 'Confirm Flag Entry'
            : 'Confirm Clear Entry'
        }
        message={
          actionDialog.isBulk
            ? `You are applying [${actionDialog.action?.toUpperCase()}] to ${selectedKeys.length} selected entries. A clear audit reason is required.`
            : `You are modifying entry ${actionDialog.identityKey?.slice(0, 10)}... to ${actionDialog.action?.toUpperCase()}. This action will be recorded in the cryptographic audit ledger.`
        }
        confirmText={actionDialog.action === 'ban' ? 'Ban Entry' : 'Apply Action'}
        variant={actionDialog.action === 'ban' ? 'danger' : 'warning'}
        requireReason={true}
        reasonPlaceholder="e.g. Coordinated burst detected during window opening"
      />
    </div>
  );
};
