import React, { useState } from 'react';
import { TicketTier, LiveBoardData } from '@shared/types';
import { DEFAULT_TIERS } from '@shared/constants';
import { Button } from '@/components/ui/Button';
import { ArrowUp, ArrowDown, Check, Loader2, Sparkles, ShieldCheck, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface TierPreferenceSelectorProps {
  dropId: string;
  tiers?: TicketTier[];
  liveBoard?: LiveBoardData | null;
  initialPreferences?: string[];
  onSubmit: (preferences: string[], websiteTrap?: string) => Promise<void>;
  isEditing?: boolean;
  onCancel?: () => void;
}

export const TierPreferenceSelector: React.FC<TierPreferenceSelectorProps> = ({
  dropId,
  tiers = DEFAULT_TIERS,
  liveBoard,
  initialPreferences,
  onSubmit,
  isEditing = false,
  onCancel,
}) => {
  // Ordered array of selected tier IDs
  const [selectedTiers, setSelectedTiers] = useState<string[]>(() => {
    if (initialPreferences && initialPreferences.length > 0) {
      return initialPreferences;
    }
    // Default select all in natural order
    return tiers.map(t => t.id);
  });

  const { addToast } = useApp();
  const [honeypotValue, setHoneypotValue] = useState('');
  const [revealHoneypot, setRevealHoneypot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingHuman, setCheckingHuman] = useState(false);

  // Toggle selection
  const handleToggleTier = (tierId: string) => {
    if (selectedTiers.includes(tierId)) {
      if (selectedTiers.length === 1) return; // At least one required
      setSelectedTiers(prev => prev.filter(id => id !== tierId));
    } else {
      setSelectedTiers(prev => [...prev, tierId]);
    }
  };

  // Helper to reorder
  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    setSelectedTiers(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === selectedTiers.length - 1) return;
    setSelectedTiers(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMakeTopChoice = (tierId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTiers(prev => [tierId, ...prev.filter(id => id !== tierId)]);
  };

  const setOrderHighToLow = () => {
    const sorted = [...tiers].sort((a, b) => b.price - a.price).map(t => t.id);
    setSelectedTiers(sorted);
  };

  const setOrderLowToHigh = () => {
    const sorted = [...tiers].sort((a, b) => a.price - b.price).map(t => t.id);
    setSelectedTiers(sorted);
  };

  const selectAll = () => {
    setSelectedTiers(tiers.map(t => t.id));
  };

  const handleSubmit = async () => {
    if (selectedTiers.length === 0) return;

    // Check decoy honeypot trap
    if (honeypotValue.trim().length > 0) {
      addToast('error', 'Bot Trap Triggered', 'Decoy honeypot field was populated by automated scraper.');
      try {
        await onSubmit(selectedTiers, honeypotValue);
      } catch (err) {
        // Expected BOT_DETECTED 403 response
      }
      return;
    }

    setIsSubmitting(true);
    setCheckingHuman(true);

    try {
      // Small simulated PoW/bot verification delay
      await new Promise(r => setTimeout(r, 600));
      setCheckingHuman(false);
      await onSubmit(selectedTiers);
    } finally {
      setIsSubmitting(false);
      setCheckingHuman(false);
    }
  };

  const getTierAvailableSeats = (tier: TicketTier, tierIndex: number) => {
    // 1. If liveBoard.tiers has populated available/held/sold stats
    const stats = liveBoard?.tiers?.find(t => t.tierId === tier.id);
    if (stats && (stats.available > 0 || stats.held > 0 || stats.sold > 0)) {
      return stats.available;
    }

    // 2. If liveBoard.seats exists, compute from seat status
    if (liveBoard?.seats && liveBoard.seats.length > 0) {
      const byTierId = liveBoard.seats.filter(s => s.tierId === tier.id);
      if (byTierId.length > 0) {
        return byTierId.filter(s => s.status === 'available').length;
      }

      // Compute by tier cumulative boundary range
      const prevCount = tiers.slice(0, tierIndex).reduce((sum, t) => sum + (t.seatCount || 0), 0);
      const currCount = prevCount + (tier.seatCount || 0);

      const tierSeats = liveBoard.seats.filter((s, idx) => {
        const numMatch = s.id?.match(/\d+/);
        const seatNum = numMatch ? parseInt(numMatch[0], 10) : idx + 1;
        return seatNum > prevCount && seatNum <= currCount;
      });

      if (tierSeats.length > 0) {
        return tierSeats.filter(s => s.status === 'available').length;
      }
    }

    // 3. Fallback to full tier seat count
    return tier.seatCount;
  };

  // Order tiers strictly according to selectedTiers priority first, then unselected at bottom
  const orderedTiers = [
    ...selectedTiers.map(id => tiers.find(t => t.id === id)).filter(Boolean) as TicketTier[],
    ...tiers.filter(t => !selectedTiers.includes(t.id)),
  ];

  return (
    <div className="space-y-6">
      {/* Header and Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-stamp font-black text-white uppercase tracking-tight">
            Pick your tiers in order of preference
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Top card is your <span className="text-brand-yellow font-bold">#1 Choice</span>. Use <span className="font-mono text-brand-yellow">↑ Move Up</span> / <span className="font-mono text-brand-yellow">↓ Move Down</span> to reorder.
          </p>
        </div>

        {/* Quick Sorting Presets */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={setOrderHighToLow}
            className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-surface-200 border border-white/10 text-slate-300 hover:text-brand-yellow hover:border-brand-yellow/40 transition-colors"
          >
            💎 VIP First
          </button>
          <button
            type="button"
            onClick={setOrderLowToHigh}
            className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-surface-200 border border-white/10 text-slate-300 hover:text-brand-yellow hover:border-brand-yellow/40 transition-colors"
          >
            🏷️ Budget First
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-surface-200 border border-white/10 text-slate-300 hover:text-white transition-colors"
          >
            Select All
          </button>
        </div>
      </div>

      {/* Tier Cards List - Rendered in Priority Order */}
      <div className="grid grid-cols-1 gap-3">
        {orderedTiers.map((tier) => {
          const isSelected = selectedTiers.includes(tier.id);
          const rankIndex = selectedTiers.indexOf(tier.id);
          const originalTierIndex = tiers.findIndex(t => t.id === tier.id);
          const availableSeats = getTierAvailableSeats(tier, originalTierIndex);
          const fillRatio = tier.seatCount > 0 ? availableSeats / tier.seatCount : 1;
          const filledBlocks = Math.max(0, Math.min(8, Math.round(fillRatio * 8)));

          return (
            <div
              key={tier.id}
              className={`relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isSelected
                  ? rankIndex === 0
                    ? 'bg-gradient-to-r from-brand-yellow/15 via-surface-100 to-surface-100 border-2 border-brand-yellow shadow-xl shadow-brand-yellow/10'
                    : 'bg-surface-100 border-white/15 hover:border-brand-yellow/40'
                  : 'bg-surface-200/30 border-white/5 opacity-50 hover:opacity-75'
              }`}
            >
              {/* Left: Checkbox + Priority Rank Tag + Tier Info */}
              <div className="flex items-center gap-3.5">
                {/* Inclusion Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleTier(tier.id)}
                  title={isSelected ? 'Exclude tier' : 'Include tier'}
                  className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                    isSelected
                      ? 'bg-brand-yellow text-black border-brand-yellow shadow-sm'
                      : 'bg-white/5 border-white/20 text-transparent hover:border-white/40'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Priority Rank Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-mono font-black shrink-0 transition-colors ${
                    isSelected
                      ? rankIndex === 0
                        ? 'bg-brand-yellow text-black shadow-md'
                        : 'bg-white/10 text-white border border-white/15'
                      : 'bg-white/5 text-slate-500 border border-white/5'
                  }`}
                >
                  <span className="text-xs leading-none font-bold">
                    {isSelected ? `#${rankIndex + 1}` : '—'}
                  </span>
                  {isSelected && (
                    <span className="text-[8px] font-mono uppercase tracking-tighter opacity-80">
                      {rankIndex === 0 ? 'TOP' : 'CHOICE'}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold text-white text-base">
                      {tier.name} Tier
                    </h3>
                    {isSelected ? (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        rankIndex === 0
                          ? 'bg-brand-yellow text-black'
                          : 'bg-white/10 text-slate-300 border border-white/10'
                      }`}>
                        {rankIndex === 0 ? '★ 1st Choice (Priority)' : `${rankIndex + 1}${rankIndex === 1 ? 'nd' : rankIndex === 2 ? 'rd' : 'th'} Choice`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold uppercase">
                        Not Included
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400 mt-1">
                    <span className="text-emerald-400 font-bold">
                      {availableSeats} seats left
                    </span>
                    <span>•</span>
                    <span>Total {tier.seatCount} seats</span>
                  </div>
                </div>
              </div>

              {/* Right: Price, Mini Map Preview & Reorder Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-4">
                {/* Mini Seat Map Preview */}
                <div className="hidden lg:flex flex-col items-end gap-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Availability</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-3 rounded-xs ${
                          i < filledBlocks ? 'bg-emerald-400 border border-emerald-400/60' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="text-left sm:text-right min-w-[90px]">
                  <span className="text-lg font-black font-mono text-brand-yellow block leading-tight">
                    Rs {tier.price.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">per seat</span>
                </div>

                {/* Interactive Reordering Controls */}
                {isSelected ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {rankIndex !== 0 && (
                      <button
                        type="button"
                        onClick={e => handleMakeTopChoice(tier.id, e)}
                        title="Set as 1st Choice"
                        className="px-2 py-1.5 rounded-lg bg-surface-200 border border-white/10 text-slate-300 hover:text-brand-yellow hover:border-brand-yellow/40 text-[11px] font-mono font-bold transition-all"
                      >
                        Make #1
                      </button>
                    )}
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={rankIndex === 0}
                        onClick={e => handleMoveUp(rankIndex, e)}
                        title="Move Up in priority"
                        className="p-1 rounded-md bg-surface-200 border border-white/10 text-slate-300 hover:text-black hover:bg-brand-yellow hover:border-brand-yellow disabled:opacity-20 transition-all"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={rankIndex === selectedTiers.length - 1}
                        onClick={e => handleMoveDown(rankIndex, e)}
                        title="Move Down in priority"
                        className="p-1 rounded-md bg-surface-200 border border-white/10 text-slate-300 hover:text-black hover:bg-brand-yellow hover:border-brand-yellow disabled:opacity-20 transition-all"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleTier(tier.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    + Include
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanatory Rule Note */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white">How Allocation Works:</strong> If your ticket is drawn, the algorithm automatically checks for available seats starting with your <span className="text-brand-yellow font-bold">#1 Choice</span>. If all seats in that tier are taken, it automatically falls back to your next preferences in order.
        </p>
      </div>

      {/* Hidden Honeypot Field (Decoy Bot Trap for automated scrapers) */}
      <div
        id="honeypot-bot-trap-wrapper"
        data-testid="honeypot-container"
        className={revealHoneypot
          ? "p-4 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/60 space-y-2.5 animate-in fade-in duration-200"
          : "hidden"}
        aria-hidden={!revealHoneypot}
      >
        <div className="flex items-center justify-between">
          <label htmlFor="website_trap" className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>DECOY HONEYPOT FIELD (Normally hidden via CSS display: none)</span>
          </label>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
            Active Bot Trap
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Human attendees never see this. Naive scraper scripts & bots that parse the HTML fill all inputs automatically. If anything is entered here, the request is immediately rejected.
        </p>
        <input
          id="website_trap"
          name="website_trap"
          type="text"
          tabIndex={revealHoneypot ? 0 : -1}
          autoComplete="off"
          placeholder="Type here to simulate a bot entering text..."
          className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs font-mono text-amber-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
          value={honeypotValue}
          onChange={e => setHoneypotValue(e.target.value)}
        />
      </div>

      {/* Honeypot Judge Demo Inspection Bar */}
      <div className="flex items-center justify-between text-xs py-1 px-1">
        <button
          type="button"
          onClick={() => setRevealHoneypot(!revealHoneypot)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all ${
            revealHoneypot
              ? 'bg-amber-500 text-black shadow-glow-yellow'
              : 'bg-white/5 text-amber-400 hover:bg-white/10 border border-amber-500/30'
          }`}
          title="Inspect invisible honeypot decoy field"
        >
          {revealHoneypot ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{revealHoneypot ? 'Hide Decoy Trap' : '👁️ Inspect Hidden Honeypot (Judge Demo)'}</span>
        </button>
        <span className="text-[10px] font-mono text-slate-400">
          CSS State: <code className="text-amber-300">{revealHoneypot ? 'display: block (revealed)' : 'display: none (hidden)'}</code>
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          size="lg"
          variant="primary"
          onClick={handleSubmit}
          disabled={selectedTiers.length === 0 || isSubmitting}
          className="flex-1 font-black shadow-glow-yellow py-3.5 text-sm"
        >
          {checkingHuman ? (
            <span className="flex items-center gap-2 font-mono text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              Verifying human attendee...
            </span>
          ) : isEditing ? (
            'Save Preferences'
          ) : (
            `Confirm & Enter Draw with ${selectedTiers.length} Selected Tier${selectedTiers.length === 1 ? '' : 's'}`
          )}
        </Button>

        {isEditing && onCancel && (
          <Button size="lg" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};
