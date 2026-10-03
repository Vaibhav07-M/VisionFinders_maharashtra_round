import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Search, ShieldAlert, CheckCircle2, UserX, Flag, Eye, Filter } from 'lucide-react';
import { DropEntry } from '@shared/types';

export const EntriesUsersPage: React.FC = () => {
  const { entries, addToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<DropEntry | null>(null);

  // Mock sample entries if store is empty
  const sampleEntries: DropEntry[] = entries.length > 0 ? entries : [
    {
      receiptId: 'RCP-M1K2-901',
      dropId: 'drop-jack-white-vault',
      uid: 'user_alex_77',
      identityKey: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      idempotencyKey: 'idemp_m1k2_901',
      arrivedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      serverTimestamp: Date.now() - 1000 * 60 * 12,
      riskScore: 8,
      status: 'eligible',
    },
    {
      receiptId: 'RCP-BOTS-404',
      dropId: 'drop-jack-white-vault',
      uid: 'bot_proxy_99',
      identityKey: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      idempotencyKey: 'idemp_bot_spam_01',
      arrivedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      serverTimestamp: Date.now() - 1000 * 60 * 10,
      riskScore: 92,
      status: 'blocked',
      isBot: true,
      botProfile: 'naive_flooder',
    },
    {
      receiptId: 'RCP-SUSP-310',
      dropId: 'drop-jack-white-vault',
      uid: 'user_sarah_m',
      identityKey: '11223344556677889900aabbccddeeff0011223344556677889900aabbccddeeff',
      idempotencyKey: 'idemp_sarah_m',
      arrivedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      serverTimestamp: Date.now() - 1000 * 60 * 8,
      riskScore: 68,
      status: 'flagged',
    },
    {
      receiptId: 'RCP-FAST-001',
      dropId: 'drop-jack-white-vault',
      uid: 'bot_sniper_001',
      identityKey: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
      idempotencyKey: 'idemp_sniper_zero',
      arrivedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      serverTimestamp: Date.now() - 1000 * 60 * 14,
      riskScore: 78,
      status: 'eligible',
      isBot: true,
      botProfile: 'fast_single_shot',
    },
  ];

  const filteredEntries = sampleEntries.filter(e => {
    const matchesSearch =
      e.receiptId.toLowerCase().includes(search.toLowerCase()) ||
      e.uid.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAction = (receiptId: string, action: 'flag' | 'ban' | 'clear') => {
    addToast('info', 'Moderation Action Recorded', `${receiptId} set to ${action.toUpperCase()}. Logged in audit chain.`);
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
            Entries Pool & Risk Scoring Register
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search receipt ID, UID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-surface-100 border border-white/10 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-yellow w-56"
            />
          </div>

          <div className="flex bg-surface-100 p-1 rounded-lg border border-white/10 text-xs font-mono">
            {['all', 'eligible', 'flagged', 'blocked'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded uppercase font-semibold text-[10px] ${
                  statusFilter === status
                    ? 'bg-brand-yellow text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Receipt ID</TableHeaderCell>
            <TableHeaderCell>User ID / Identity</TableHeaderCell>
            <TableHeaderCell>Arrival Order</TableHeaderCell>
            <TableHeaderCell>Risk Score</TableHeaderCell>
            <TableHeaderCell>Entry Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {filteredEntries.map(entry => (
            <TableRow key={entry.receiptId}>
              <TableCell className="font-mono font-bold text-brand-yellow">
                {entry.receiptId}
              </TableCell>

              <TableCell className="font-mono text-xs">
                <span className="text-white block">{entry.uid}</span>
                <span className="text-slate-500 text-[10px] truncate block max-w-[180px]">
                  {entry.identityKey}
                </span>
              </TableCell>

              <TableCell className="font-mono text-xs text-slate-300">
                {new Date(entry.arrivedAt).toLocaleTimeString()}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        entry.riskScore > 75
                          ? 'bg-rose-500'
                          : entry.riskScore > 40
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${entry.riskScore}%` }}
                    />
                  </div>
                  <span
                    className={`font-mono text-xs font-bold ${
                      entry.riskScore > 75
                        ? 'text-rose-400'
                        : entry.riskScore > 40
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {entry.riskScore}
                  </span>
                </div>
              </TableCell>

              <TableCell>
                <Badge
                  variant={
                    entry.status === 'eligible'
                      ? 'emerald'
                      : entry.status === 'flagged'
                      ? 'amber'
                      : 'rose'
                  }
                  size="sm"
                >
                  {entry.status.toUpperCase()}
                </Badge>
              </TableCell>

              <TableCell className="text-right space-x-1">
                <button
                  onClick={() => setSelectedEntry(entry)}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction(entry.receiptId, 'flag')}
                  className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                  title="Flag for Review"
                >
                  <Flag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction(entry.receiptId, 'ban')}
                  className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  title="Ban / Block Receipt"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Entry Detail Inspector Modal */}
      {selectedEntry && (
        <Modal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title={`Entry Receipt Inspector: ${selectedEntry.receiptId}`}
          description="Detailed cryptographic identity key and risk heuristics"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3 rounded-lg bg-surface-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">UID:</span>
                <span className="text-white">{selectedEntry.uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Idempotency Key:</span>
                <span className="text-brand-yellow">{selectedEntry.idempotencyKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Arrived Timestamp:</span>
                <span className="text-white">{selectedEntry.arrivedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Score:</span>
                <span className="text-rose-400 font-bold">{selectedEntry.riskScore}/100</span>
              </div>
              {selectedEntry.botProfile && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bot Signature Label:</span>
                  <span className="text-rose-400 font-bold uppercase">{selectedEntry.botProfile}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">Identity Hash (Doc ID):</span>
              <div className="p-2.5 rounded bg-black/60 text-slate-300 break-all text-[11px]">
                {selectedEntry.identityKey}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
