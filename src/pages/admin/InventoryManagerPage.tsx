import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { Drawer } from '@/components/admin/Drawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ErrorState } from '@/components/admin/ErrorState';
import { Skeleton } from '@/components/admin/SkeletonLoader';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { getAdminHeaders } from '@/utils/api';
import { Seat } from '@shared/types';
import {
  Grid,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  Lock,
  RotateCcw,
  Layers,
} from 'lucide-react';

export const InventoryManagerPage: React.FC = () => {
  const { addToast } = useApp();
  const { selectedDropId } = useOutletContext<{ selectedDropId: string }>() || {};
  const activeDropId = selectedDropId || 'drop-jack-white-vault';

  const [seats, setSeats] = useState<Seat[]>([]);
  const [counts, setCounts] = useState({ total: 0, available: 0, held: 0, sold: 0, blocked: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected seat for detail drawer
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  // Manual hold / unhold dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'hold' | 'unhold' | null;
    seat: Seat | null;
  }>({
    isOpen: false,
    action: null,
    seat: null,
  });

  const fetchInventory = async () => {
    try {
      const res = await fetch(`/api/admin/drops/${activeDropId}/inventory`, {
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSeats(data.seats || []);
      setCounts(data.counts || { total: 0, available: 0, held: 0, sold: 0, blocked: 0 });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchInventory();
  }, [activeDropId]);

  const sections = Array.from(new Set(seats.map(s => s.section || 'General')));

  const filteredSeats = seats.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterSection !== 'all' && (s.section || 'General') !== filterSection) return false;
    return true;
  });

  const handleSeatAction = async (reason: string) => {
    if (!confirmDialog.seat || !confirmDialog.action) return;
    const seatId = confirmDialog.seat.id;

    try {
      const res = await fetch(`/api/admin/drops/${activeDropId}/seats/${seatId}/${confirmDialog.action}`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      addToast('success', 'Seat Updated', data.message);
      setConfirmDialog({ isOpen: false, action: null, seat: null });
      if (selectedSeat?.id === seatId) {
        setSelectedSeat(data.seat);
      }
      await fetchInventory();
    } catch (err: any) {
      addToast('error', 'Action Failed', err.message);
    }
  };

  if (error && seats.length === 0) {
    return <ErrorState title="Inventory Unavailable" message={error} onRetry={fetchInventory} />;
  }

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        category="PANEL B · REAL-TIME ALLOCATION INVENTORY"
        title="500-Seat Grid & Holds"
        description="Inspect atomic seat states, enforce administrative holds, and audit reservation allocations."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={fetchInventory}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh Grid
          </Button>
        }
      />

      {/* Stats & Legend Bar */}
      <div className="p-4 rounded-2xl bg-[#0b0d14] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500 shadow-sm" />
            <span className="text-slate-300">Available ({counts.available})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-400 shadow-sm animate-pulse" />
            <span className="text-slate-300">Held (5-min offer) ({counts.held})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-rose-500 shadow-sm" />
            <span className="text-slate-300">Sold / Paid ({counts.sold})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-700 shadow-sm" />
            <span className="text-slate-400">Blocked ({counts.blocked})</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-surface-100 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="all">All ({counts.total})</option>
              <option value="available">Available ({counts.available})</option>
              <option value="held">Held ({counts.held})</option>
              <option value="sold">Sold ({counts.sold})</option>
              <option value="blocked">Blocked ({counts.blocked})</option>
            </select>
          </div>

          {sections.length > 1 && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Section:</span>
              <select
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
                className="bg-surface-100 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="all">All Sections</option>
                {sections.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tier Grouping Placeholder required by Section 1 & Section 4 */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-brand-yellow" />
          <span>Tier grouping placeholder (VIP, Platinum, Gold, Silver, Bronze coming from attendee branch).</span>
        </div>
        <span className="text-brand-yellow/80">Pending Branch Merge</span>
      </div>

      {/* 500-Seat Interactive Grid */}
      <div className="p-6 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-white/5 pb-3">
          <span>Stage Front (Orchestra &rarr; Balcony)</span>
          <span>Showing {filteredSeats.length} of {seats.length} total seats</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 gap-1.5 py-8">
            {Array.from({ length: 100 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 gap-1.5 p-2 bg-[#08090f] rounded-xl border border-white/5 max-h-[520px] overflow-y-auto">
            {filteredSeats.map(seat => {
              const statusColor =
                seat.status === 'available' ? 'bg-emerald-500 hover:bg-emerald-400' :
                seat.status === 'held' ? 'bg-amber-400 hover:bg-amber-300 animate-pulse' :
                seat.status === 'sold' ? 'bg-rose-500/80 hover:bg-rose-400' :
                'bg-slate-700 hover:bg-slate-600';

              return (
                <button
                  key={seat.id}
                  onClick={() => setSelectedSeat(seat)}
                  className={`h-7 rounded flex items-center justify-center text-[10px] font-mono font-bold text-black transition-all ${statusColor} ${
                    selectedSeat?.id === seat.id ? 'ring-2 ring-white scale-110 z-10' : ''
                  }`}
                  title={`${seat.label} - ${seat.status.toUpperCase()}`}
                >
                  {seat.number || seat.id.replace('seat-', '')}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Seat Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedSeat)}
        onClose={() => setSelectedSeat(null)}
        title={selectedSeat ? selectedSeat.label : 'Seat Details'}
        subtitle={`Drop ID: ${activeDropId}`}
      >
        {selectedSeat && (
          <div className="space-y-6 text-xs font-sans">
            {/* Status Card */}
            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-2">
              <span className="text-slate-400 font-mono uppercase block text-[10px]">Current Status</span>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg font-mono font-bold uppercase text-xs border ${
                  selectedSeat.status === 'available' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                  selectedSeat.status === 'held' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                  selectedSeat.status === 'sold' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                  'bg-white/5 text-slate-300 border-white/10'
                }`}>
                  ● {selectedSeat.status}
                </span>
                <span className="text-slate-400 font-mono">Rs {selectedSeat.price || 85}</span>
              </div>
            </div>

            {/* Details Table */}
            <div className="space-y-3 font-mono">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Seat ID:</span>
                <span className="text-white font-bold">{selectedSeat.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Section:</span>
                <span className="text-white">{selectedSeat.section || 'Orchestra Center'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Row / Number:</span>
                <span className="text-white">Row {selectedSeat.row || 'A'} • Seat {selectedSeat.number || 1}</span>
              </div>
              {selectedSeat.holderUid && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Current Holder:</span>
                  <span className="text-brand-yellow font-bold truncate max-w-[180px]">{selectedSeat.holderUid}</span>
                </div>
              )}
              {selectedSeat.holdExpiresAt && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Hold Expiry:</span>
                  <span className="text-amber-300">{new Date(selectedSeat.holdExpiresAt).toLocaleTimeString()}</span>
                </div>
              )}
              {selectedSeat.currentOfferId && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Offer ID:</span>
                  <span className="text-slate-300 font-mono text-[10px]">{selectedSeat.currentOfferId}</span>
                </div>
              )}
            </div>

            {/* Manual Admin Actions */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <span className="font-mono uppercase text-slate-400 block text-[10px]">Administrative Interventions</span>

              {selectedSeat.status === 'held' ? (
                <Button
                  size="md"
                  variant="outline"
                  onClick={() => setConfirmDialog({ isOpen: true, action: 'unhold', seat: selectedSeat })}
                  className="w-full justify-center text-xs"
                >
                  Release Manual Hold
                </Button>
              ) : selectedSeat.status === 'available' ? (
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => setConfirmDialog({ isOpen: true, action: 'hold', seat: selectedSeat })}
                  className="w-full justify-center text-xs text-amber-300 border-amber-500/30"
                >
                  Apply Manual Hold
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.action === 'hold' ? 'Hold Seat Administratively' : 'Release Seat Hold'}
        message={`Are you sure you want to ${confirmDialog.action} seat ${confirmDialog.seat?.label}? Reason is audit logged.`}
        variant={confirmDialog.action === 'hold' ? 'warning' : 'primary'}
        onConfirm={handleSeatAction}
        onCancel={() => setConfirmDialog({ isOpen: false, action: null, seat: null })}
      />
    </div>
  );
};
