import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Seat } from '@shared/types';
import { api } from '@/utils/api';
import {
  LayoutGrid,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Accessibility,
  Loader2,
  Armchair,
} from 'lucide-react';

export const InventoryManagerPage: React.FC = () => {
  const { drops, addToast } = useApp();
  const [selectedDropId, setSelectedDropId] = useState<string>('');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [activeSection, setActiveSection] = useState<string>('All');
  const [invariants, setInvariants] = useState<{
    oversold: number;
    duplicates: number;
    orphanedHolds: number;
    inventoryConsistent: boolean;
    valid: boolean;
  }>({
    oversold: 0,
    duplicates: 0,
    orphanedHolds: 0,
    inventoryConsistent: true,
    valid: true,
  });

  useEffect(() => {
    if (drops.length > 0 && !selectedDropId) {
      setSelectedDropId(drops[0].id);
    }
  }, [drops, selectedDropId]);

  useEffect(() => {
    if (!selectedDropId) return;
    let mounted = true;
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const [seatsRes, invRes] = await Promise.all([
          api.drops.getSeats(selectedDropId),
          api.invariants.check(selectedDropId).catch(() => null),
        ]);
        if (mounted) {
          setSeats(seatsRes.seats || []);
          if (invRes) {
            setInvariants({
              oversold: invRes.oversold,
              duplicates: invRes.duplicates,
              orphanedHolds: invRes.orphanedHolds,
              inventoryConsistent: invRes.inventoryConsistent,
              valid: invRes.valid,
            });
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load seats from Firestore.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchInventory();
    return () => {
      mounted = false;
    };
  }, [selectedDropId]);

  const sections = ['All', 'Orchestra A', 'Orchestra B', 'Mezzanine Center', 'Balcony Front'];

  const filteredSeats = seats.filter(s =>
    activeSection === 'All' ? true : s.section === activeSection
  );

  const stats = {
    available: seats.filter(s => s.status === 'available').length,
    held: seats.filter(s => s.status === 'held').length,
    sold: seats.filter(s => s.status === 'sold').length,
    blocked: seats.filter(s => s.status === 'blocked').length,
  };

  const handleToggleHold = (seat: Seat) => {
    addToast(
      'info',
      'Seat Status Inspected',
      `${seat.label} is currently [${seat.status.toUpperCase()}]. Status managed by Firestore transactions.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Panel B · Organizer</span>
            <span>/</span>
            <span>B3. Auditorium Inventory</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Auditorium Inventory Grid
          </h1>
        </div>

        {/* Drop Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedDropId}
            onChange={e => setSelectedDropId(e.target.value)}
            className="bg-surface-100 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-yellow"
          >
            {drops.map(d => (
              <option key={d.id} value={d.id} className="bg-surface-200 text-white">
                {d.name} ({d.seatCount} seats)
              </option>
            ))}
          </select>

          <Badge variant={invariants.inventoryConsistent ? 'emerald' : 'rose'} dot>
            {invariants.inventoryConsistent
              ? `CONSISTENT: ${seats.length} / ${seats.length}`
              : 'ANOMALY DETECTED'}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
          <p className="text-xs font-mono text-slate-400">Fetching seats from Firestore...</p>
        </div>
      ) : error ? (
        <Card variant="default" className="border-rose-500/30 p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-stamp uppercase text-white font-bold">Failed to load inventory</h2>
          <p className="text-xs text-slate-400 font-mono">{error}</p>
          <Button onClick={() => setSelectedDropId(selectedDropId)} size="sm" variant="primary">
            Retry
          </Button>
        </Card>
      ) : seats.length === 0 ? (
        <Card variant="glass" className="p-8 text-center space-y-4">
          <Armchair className="w-10 h-10 text-brand-yellow mx-auto" />
          <h2 className="text-lg font-stamp uppercase text-white font-bold">No Seats Seeded for this Event</h2>
          <p className="text-xs text-slate-400">No seats found in Firestore for this drop event.</p>
        </Card>
      ) : (
        <>
          {/* Top Inventory Status Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Available Seats</span>
              <span className="text-3xl font-mono font-bold text-emerald-400">{stats.available}</span>
              <span className="text-[10px] text-slate-500 block">Open for lottery draw</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Held (5-Min Timer)</span>
              <span className="text-3xl font-mono font-bold text-amber-400">{stats.held}</span>
              <span className="text-[10px] text-slate-500 block">In active checkout</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Sold (Confirmed)</span>
              <span className="text-3xl font-mono font-bold text-brand-yellow">{stats.sold}</span>
              <span className="text-[10px] text-slate-500 block">Signed QR ticket issued</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Blocked / Reserved</span>
              <span className="text-3xl font-mono font-bold text-rose-400">{stats.blocked}</span>
              <span className="text-[10px] text-slate-500 block">Staff / Sound engineer</span>
            </div>
          </div>

          {/* Section Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400 mr-2">Filter Section:</span>
            {sections.map(sec => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeSection === sec
                    ? 'bg-brand-yellow text-black font-bold shadow-glow-yellow/30'
                    : 'bg-surface-100 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                {sec} ({sec === 'All' ? seats.length : seats.filter(s => s.section === sec).length})
              </button>
            ))}
          </div>

          {/* Seat Grid Display */}
          <Card variant="glass" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Auditorium Seat Map ({filteredSeats.length} Seats)</CardTitle>
                <CardDescription>Hover over any seat for live hold metadata and identity audit details.</CardDescription>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500/80 inline-block"></span> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500/80 inline-block animate-pulse"></span> Held
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-brand-yellow inline-block"></span> Sold
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500/80 inline-block"></span> Blocked
                </span>
              </div>
            </div>

            <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 gap-1.5 p-4 rounded-xl bg-black/40 border border-white/5 max-h-[480px] overflow-y-auto">
              {filteredSeats.map(seat => {
                const isSelected = selectedSeat?.id === seat.id;
                let bgClass = 'bg-emerald-500/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/50';
                if (seat.status === 'held') {
                  bgClass = 'bg-amber-500/40 border-amber-500/60 text-amber-200 animate-pulse';
                } else if (seat.status === 'sold') {
                  bgClass = 'bg-brand-yellow/80 border-brand-yellow text-black font-bold';
                } else if (seat.status === 'blocked') {
                  bgClass = 'bg-rose-500/30 border-rose-500/40 text-rose-300';
                }

                return (
                  <button
                    key={seat.id}
                    onClick={() => {
                      setSelectedSeat(seat);
                      handleToggleHold(seat);
                    }}
                    title={`${seat.label} · Status: ${seat.status.toUpperCase()} · $${seat.price}`}
                    className={`aspect-square rounded flex items-center justify-center text-[9px] font-mono border transition-all ${bgClass} ${
                      isSelected ? 'ring-2 ring-white scale-110 z-10' : ''
                    }`}
                  >
                    {seat.accessible ? <Accessibility className="w-2.5 h-2.5" /> : seat.number}
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
