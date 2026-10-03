import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Seat } from '@shared/types';
import {
  LayoutGrid,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Accessibility,
} from 'lucide-react';

export const InventoryManagerPage: React.FC = () => {
  const { seats, drops, runInvariantCheck, addToast } = useApp();
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [activeSection, setActiveSection] = useState<string>('All');

  const activeDrop = drops[0];
  const invariants = runInvariantCheck(activeDrop.id);

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
    // Demo manual toggle
    addToast(
      'info',
      'Seat Status Modified',
      `${seat.label} marked as ${seat.status === 'available' ? 'BLOCKED' : 'AVAILABLE'}.`
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
            500-Seat Auditorium Inventory Grid
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" dot>
            INVENTORY CONSISTENT: 500 / 500
          </Badge>
        </div>
      </div>

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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeSection === sec
                ? 'bg-brand-yellow text-black font-bold'
                : 'bg-surface-100 text-slate-300 hover:bg-surface-50'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Interactive Seat Grid & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Seat Grid Map */}
        <div className="lg:col-span-8">
          <Card variant="glass" className="space-y-4">
            
            {/* Stage indicator */}
            <div className="w-2/3 mx-auto py-2 bg-gradient-to-b from-brand-yellow/30 to-brand-yellow/5 border-t-2 border-brand-yellow rounded-t-xl text-center">
              <span className="font-stamp text-xs uppercase tracking-widest text-brand-yellow font-black">
                STAGE · PERFORMANCE AREA
              </span>
            </div>

            {/* Seat Matrix */}
            <div className="p-4 rounded-xl bg-black/50 border border-white/10 overflow-x-auto">
              <div className="grid grid-cols-25 gap-1.5 min-w-[650px]">
                {filteredSeats.slice(0, 250).map(seat => {
                  const color =
                    seat.status === 'sold'
                      ? 'bg-brand-yellow text-black border-brand-yellow/80 font-bold'
                      : seat.status === 'held'
                      ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                      : seat.status === 'blocked'
                      ? 'bg-rose-900 text-rose-300 border-rose-700'
                      : 'bg-surface-100 text-slate-400 border-white/10 hover:border-brand-yellow hover:text-white';

                  const isSelected = selectedSeat?.id === seat.id;

                  return (
                    <button
                      key={seat.id}
                      onClick={() => setSelectedSeat(seat)}
                      className={`h-6 rounded text-[9px] font-mono flex items-center justify-center border transition-all ${color} ${
                        isSelected ? 'ring-2 ring-white scale-110 z-10' : ''
                      }`}
                      title={`${seat.label} (${seat.status})`}
                    >
                      {seat.accessible ? (
                        <Accessibility className="w-3 h-3" />
                      ) : (
                        seat.number
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-surface-100 border border-white/20" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span>Held (5 Min)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-brand-yellow" />
                <span>Sold (Confirmed)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-900" />
                <span>Blocked</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Seat Inspector */}
        <div className="lg:col-span-4 space-y-6">
          <Card variant="default" className="border-brand-yellow/30 space-y-4">
            <CardTitle className="text-base">Seat Inspector</CardTitle>

            {selectedSeat ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-200 border border-white/10 text-center space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Selected Seat</span>
                  <div className="text-2xl font-stamp font-black text-brand-yellow">
                    {selectedSeat.label}
                  </div>
                  <Badge
                    variant={
                      selectedSeat.status === 'sold'
                        ? 'yellow'
                        : selectedSeat.status === 'held'
                        ? 'amber'
                        : 'emerald'
                    }
                  >
                    {selectedSeat.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="divide-y divide-white/10 text-xs font-mono">
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Section:</span>
                    <span className="text-white">{selectedSeat.section}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Row & Number:</span>
                    <span className="text-white">Row {selectedSeat.row}, #{selectedSeat.number}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Accessible ADA:</span>
                    <span className="text-white">{selectedSeat.accessible ? 'Yes' : 'Standard'}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Base Price:</span>
                    <span className="text-brand-yellow font-bold">${selectedSeat.price} USD</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="md"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleToggleHold(selectedSeat)}
                  >
                    Toggle Hold / Block Status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                <LayoutGrid className="w-8 h-8 mx-auto text-slate-500" />
                <p>Click any seat in the 500-seat auditorium grid to inspect allocation state.</p>
              </div>
            )}
          </Card>
        </div>

      </div>

    </div>
  );
};
