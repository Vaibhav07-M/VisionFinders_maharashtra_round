import React, { useState } from 'react';
import { LiveBoardData, LiveTierStat } from '@shared/types';
import { Countdown } from '@/components/ui/Countdown';
import { Users, Clock, Ticket, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SelectedSeatInfo {
  id: string;
  label: string;
  tierId: string;
  tierName?: string;
  price: number;
}

interface LiveSeatBoardProps {
  board: LiveBoardData | null;
  selectedTierId?: string | null;
  onSelectTier?: (tierId: string | null) => void;
  compact?: boolean;
  selectable?: boolean;
  selectedSeatId?: string | null;
  onSelectSeat?: (seat: SelectedSeatInfo) => void;
}

export const LiveSeatBoard: React.FC<LiveSeatBoardProps> = ({
  board,
  selectedTierId: externalTierId,
  onSelectTier: externalSelectTier,
  compact = false,
  selectable = true,
  selectedSeatId,
  onSelectSeat,
}) => {
  const [internalTierFilter, setInternalTierFilter] = useState<string | null>(null);

  const activeTierFilter = externalTierId !== undefined ? externalTierId : internalTierFilter;
  const setTierFilter = externalSelectTier || setInternalTierFilter;

  if (!board) {
    return (
      <div className="p-8 text-center bg-surface-100/50 rounded-2xl border border-white/5 font-mono text-xs text-slate-400">
        Loading live seat board...
      </div>
    );
  }

  const filteredSeats = activeTierFilter
    ? board.seats.filter(s => s.tierId === activeTierFilter)
    : board.seats;

  return (
    <div className="space-y-6">
      {/* Telemetry Numbers Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-100/80 border border-white/10">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Available</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {board.totalAvailable}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Ready to claim</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/80 border border-white/10">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Held (5-min offers)</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
            {board.totalHeld}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Awaiting checkout</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/80 border border-white/10">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Sold</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-slate-300">
            {board.totalSold}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Tickets issued</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/80 border border-white/10">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">People Waiting</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400">
            {board.peopleWaiting}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">In waitlist queue</span>
        </div>
      </div>

      {/* Soonest Expiry Alert if holds exist */}
      {board.totalHeld > 0 && board.soonestExpiryMs && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <Clock className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Next possible seat release in:</span>
          </div>
          <div className="font-mono font-bold text-amber-300 text-sm">
            <Countdown deadline={board.soonestExpiryMs} size="sm" />
          </div>
        </div>
      )}

      {/* Tier Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {board.tiers.map((tier: LiveTierStat) => {
          const isSelected = activeTierFilter === tier.tierId;
          return (
            <button
              key={tier.tierId}
              type="button"
              onClick={() => setTierFilter(isSelected ? null : tier.tierId)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-brand-yellow/15 border-brand-yellow shadow-glow-yellow/20'
                  : 'bg-surface-100/60 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white font-display">{tier.name}</span>
                <span className="text-[10px] font-mono text-brand-yellow">Rs {tier.price.toLocaleString()}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-400">{tier.available} avail</span>
                <span className="text-amber-300">{tier.held} held</span>
                <span className="text-slate-500">{tier.sold} sold</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>Filter:</span>
          <button
            type="button"
            onClick={() => setTierFilter(null)}
            className={`px-2 py-0.5 rounded text-[11px] ${
              activeTierFilter === null ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Tiers ({board.seats.length})
          </button>
          {board.tiers.map(t => (
            <button
              key={t.tierId}
              type="button"
              onClick={() => setTierFilter(t.tierId)}
              className={`px-2 py-0.5 rounded text-[11px] ${
                activeTierFilter === t.tierId ? 'bg-brand-yellow text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px]">
          {selectable && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-brand-yellow border border-brand-yellow ring-1 ring-brand-yellow" />
              <span className="text-brand-yellow font-bold">Selected</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/60" />
            <span className="text-emerald-300">Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/60 animate-pulse" />
            <span className="text-amber-300">Held (5-min)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-white/5 border border-white/10" />
            <span className="text-slate-500">Sold</span>
          </span>
        </div>
      </div>

      {/* Interactive Helper Text */}
      {selectable && onSelectSeat && (
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-surface-100/60 p-2.5 rounded-xl border border-white/10">
          <span className="text-brand-yellow font-bold">👉 Interactive Seat Selector:</span>
          <span>Click any green seat below to select which seat you want.</span>
        </div>
      )}

      {/* Seat Grid */}
      <div className="bg-[#090a10] p-4 rounded-2xl border border-white/10 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-1.5 text-[9px] font-mono">
          {filteredSeats.map(seat => {
            const isAvailable = seat.status === 'available';
            const isHeld = seat.status === 'held';
            const isSold = seat.status === 'sold';
            const isSelected = selectedSeatId === seat.id;
            const tierInfo = board.tiers.find(t => t.tierId === seat.tierId);
            const displayLabel = seat.label
              .replace(/^Orchestra\s+[A-Za-z0-9]+\s+[·•\-]\s+Row\s+/i, '')
              .replace(/^Orchestra\s+[A-Za-z0-9]+\s+[·•\-]\s+/i, '')
              .replace(/^Row\s+/i, '')
              .replace('PLAT-', 'P-')
              .replace('GOLD-', 'G-')
              .replace('SILV-', 'S-')
              .replace('BRNZ-', 'B-');
            const cleanTooltipLabel = seat.label
              .replace(/^Orchestra\s+[A-Za-z0-9]+\s+[·•\-]\s+Row\s+/i, 'Row ')
              .replace(/^Orchestra\s+[A-Za-z0-9]+\s+[·•\-]\s+/i, '');

            if (isAvailable && selectable && onSelectSeat) {
              return (
                <button
                  key={seat.id}
                  type="button"
                  onClick={() =>
                    onSelectSeat({
                      id: seat.id,
                      label: cleanTooltipLabel,
                      tierId: seat.tierId,
                      tierName: tierInfo?.name || seat.tierId,
                      price: seat.price,
                    })
                  }
                  title={`Click to Select: ${cleanTooltipLabel} (${tierInfo?.name || seat.tierId} - Rs ${seat.price})`}
                  className={`h-7 rounded flex items-center justify-center font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-yellow text-black border-brand-yellow font-black scale-110 shadow-lg shadow-yellow-500/40 ring-2 ring-brand-yellow ring-offset-1 ring-offset-black z-10'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:scale-110 hover:border-brand-yellow hover:bg-emerald-500/30'
                  }`}
                >
                  {displayLabel}
                </button>
              );
            }

            return (
              <div
                key={seat.id}
                title={`${cleanTooltipLabel} - ${seat.status.toUpperCase()} (Rs ${seat.price})`}
                className={`h-7 rounded flex items-center justify-center font-bold border transition-all ${
                  isHeld
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 animate-pulse shadow-sm shadow-amber-500/20'
                    : isAvailable
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed opacity-50'
                }`}
              >
                {displayLabel}
              </div>
            );
          })}
        </div>
        {filteredSeats.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No seats found for selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
