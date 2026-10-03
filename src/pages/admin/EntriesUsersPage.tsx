import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Search, ShieldAlert, CheckCircle2, UserX, Flag, Eye, Filter, Loader2, AlertCircle, Users } from 'lucide-react';
import { DropEntry } from '@shared/types';
import { api } from '@/utils/api';

export const EntriesUsersPage: React.FC = () => {
  const { drops, addToast } = useApp();
  const [selectedDropId, setSelectedDropId] = useState<string>('');
  const [entries, setEntries] = useState<DropEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<DropEntry | null>(null);

  useEffect(() => {
    if (drops.length > 0 && !selectedDropId) {
      setSelectedDropId(drops[0].id);
    }
  }, [drops, selectedDropId]);

  const fetchEntries = async (dropId: string) => {
    if (!dropId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.drops.getEntries(dropId);
      setEntries(res.entries || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load entries from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDropId) {
      fetchEntries(selectedDropId);
    }
  }, [selectedDropId]);

  const filteredEntries = entries.filter(e => {
    const matchesSearch =
      (e.receiptId || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.uid || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.identityKey || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAction = async (identityKey: string, newStatus: 'flagged' | 'blocked' | 'eligible') => {
    try {
      await api.drops.updateEntryStatus(selectedDropId, identityKey, newStatus);
      setEntries(prev =>
        prev.map(e => (e.identityKey === identityKey ? { ...e, status: newStatus } : e))
      );
      addToast(
        'info',
        'Moderation Action Recorded',
        `Entry ${identityKey.substring(0, 10)}... status updated to ${newStatus.toUpperCase()} in Firestore.`
      );
      if (selectedEntry && selectedEntry.identityKey === identityKey) {
        setSelectedEntry(prev => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      addToast('error', 'Action Failed', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Panel B · Organizer</span>
            <span>/</span>
            <span>B4. Attendee & Risk Register</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Entries Pool & Risk Register
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Drop Selector */}
          <select
            value={selectedDropId}
            onChange={e => setSelectedDropId(e.target.value)}
            className="bg-surface-100 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-yellow"
          >
            {drops.map(d => (
              <option key={d.id} value={d.id} className="bg-surface-200 text-white">
                {d.name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search receipt, UID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-surface-100 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface-100 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
          >
            <option value="all">All Statuses ({entries.length})</option>
            <option value="eligible">Eligible ({entries.filter(e => e.status === 'eligible').length})</option>
            <option value="flagged">Flagged ({entries.filter(e => e.status === 'flagged').length})</option>
            <option value="selected">Selected ({entries.filter(e => e.status === 'selected').length})</option>
            <option value="blocked">Blocked ({entries.filter(e => e.status === 'blocked').length})</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading entries from Firestore...</p>
        </div>
      ) : error ? (
        <Card variant="default" className="border-rose-500/30 p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-stamp uppercase text-white font-bold">Failed to load entries</h2>
          <p className="text-xs text-slate-400 font-mono">{error}</p>
          <Button onClick={() => fetchEntries(selectedDropId)} size="sm" variant="primary">
            Retry
          </Button>
        </Card>
      ) : filteredEntries.length === 0 ? (
        <Card variant="glass" className="p-8 text-center space-y-4">
          <Users className="w-10 h-10 text-brand-yellow mx-auto" />
          <h2 className="text-lg font-stamp uppercase text-white font-bold">No Entries Found</h2>
          <p className="text-xs text-slate-400">
            {search || statusFilter !== 'all'
              ? 'No entries match the active search query or filter.'
              : 'No entries registered yet for this drop event.'}
          </p>
        </Card>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Receipt ID</TableHeaderCell>
              <TableHeaderCell>User / Account UID</TableHeaderCell>
              <TableHeaderCell>Identity Hash</TableHeaderCell>
              <TableHeaderCell>Arrival Timestamp</TableHeaderCell>
              <TableHeaderCell>Risk Score</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filteredEntries.map(entry => (
              <TableRow key={entry.identityKey}>
                <TableCell className="font-mono text-brand-yellow font-bold">
                  {entry.receiptId}
                </TableCell>

                <TableCell className="font-mono text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    {entry.isBot ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                        BOT
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        HUMAN
                      </span>
                    )}
                    <span>{entry.uid}</span>
                  </div>
                </TableCell>

                <TableCell className="font-mono text-[11px] text-slate-400">
                  {entry.identityKey ? `${entry.identityKey.substring(0, 10)}...${entry.identityKey.slice(-6)}` : 'N/A'}
                </TableCell>

                <TableCell className="font-mono text-xs text-slate-400">
                  {new Date(entry.arrivedAt).toLocaleTimeString()}
                </TableCell>

                <TableCell className="font-mono text-xs font-bold">
                  <span
                    className={`px-2 py-0.5 rounded ${
                      entry.riskScore > 75
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : entry.riskScore > 50
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {entry.riskScore} / 100
                  </span>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={
                      entry.status === 'selected'
                        ? 'yellow'
                        : entry.status === 'eligible'
                        ? 'emerald'
                        : entry.status === 'flagged'
                        ? 'amber'
                        : 'rose'
                    }
                    size="sm"
                    dot
                  >
                    {entry.status.toUpperCase()}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className="p-1 rounded bg-surface-100 hover:bg-surface-200 text-slate-300 hover:text-white"
                      title="Inspect metadata"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {entry.status !== 'flagged' && (
                      <button
                        onClick={() => handleAction(entry.identityKey, 'flagged')}
                        className="p-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                        title="Flag for review"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {entry.status !== 'blocked' && (
                      <button
                        onClick={() => handleAction(entry.identityKey, 'blocked')}
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        title="Disqualify entry"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {entry.status !== 'eligible' && (
                      <button
                        onClick={() => handleAction(entry.identityKey, 'eligible')}
                        className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                        title="Mark eligible"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Inspector Modal */}
      {selectedEntry && (
        <Modal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title={`Entry Audit Inspector: ${selectedEntry.receiptId}`}
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-surface-100 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Account UID:</span>
                <span className="text-white font-bold">{selectedEntry.uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Idempotency Key:</span>
                <span className="text-brand-yellow">{selectedEntry.idempotencyKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Identity SHA-256:</span>
                <span className="text-slate-300 break-all">{selectedEntry.identityKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Server Timestamp:</span>
                <span className="text-white">{selectedEntry.serverTimestamp} ({new Date(selectedEntry.arrivedAt).toISOString()})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Assessment:</span>
                <span className="text-emerald-400 font-bold">{selectedEntry.riskScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="uppercase text-brand-yellow font-bold">{selectedEntry.status}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  handleAction(selectedEntry.identityKey, 'blocked');
                  setSelectedEntry(null);
                }}
              >
                Disqualify Entry
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
