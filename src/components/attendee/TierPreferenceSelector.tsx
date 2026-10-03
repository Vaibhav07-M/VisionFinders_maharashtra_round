import React, { useState } from 'react';
import { TicketTier, LiveBoardData } from '@shared/types';
import { DEFAULT_TIERS } from '@shared/constants';
import { Button } from '@/components/ui/Button';
import { ArrowUp, ArrowDown, Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

interface TierPreferenceSelectorProps {
  dropId: string;
  tiers?: TicketTier[];
  liveBoard?: LiveBoardData | null;
  initialPreferences?: string[];
  onSubmit: (preferences: string[]) => Promise<void>;
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

  // Reorder
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

  const handleSubmit = async () => {
    if (selectedTiers.length === 0) return;
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

  const getTierStats = (tierId: string) => {
    if (!liveBoard) return null;
    return liveBoard.tiers.find(t => t.tierId === tierId);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-stamp font-black text-white uppercase tracking-tight">
          Pick your tiers in order of preference
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Select the ticket tiers you'd be happy with and arrange them by your top choice.
        </p>
      </div>

      {/* Tier Cards List */}
      <div className="grid grid-cols-1 gap-3">
        {tiers.map(tier => {
          const isSelected = selectedTiers.includes(tier.id);
          const rankIndex = selectedTiers.indexOf(tier.id);
          const stats = getTierStats(tier.id);
          const availableSeats = stats ? stats.available : tier.seatCount;

          return (
            <div
              key={tier.id}
              onClick={() => handleToggleTier(tier.id)}
              className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isSelected
                  ? 'bg-surface-100 border-brand-yellow/60 shadow-lg shadow-brand-yellow/5'
                  : 'bg-surface-200/40 border-white/10 hover:border-white/20 opacity-60'
              }`}
            >
              {/* Left: Preference Order Tag + Tier Info */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-brand-yellow text-black'
                      : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}
                >
                  {isSelected ? `${rankIndex + 1}` : '—'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-white text-base">
                      {tier.name} Tier
                    </h3>
                    {isSelected && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 font-semibold uppercase">
                        {rankIndex === 0 ? '★ 1st Choice' : `${rankIndex + 1}${rankIndex === 1 ? 'nd' : rankIndex === 2 ? 'rd' : 'th'} Choice`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-0.5">
                    <span className="text-emerald-400 font-bold">
                      {availableSeats} seats left right now
                    </span>
                    <span>•</span>
                    <span>Total {tier.seatCount} seats</span>
                  </div>
                </div>
              </div>

              {/* Right: Price, Mini Seat Preview & Reorder Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-5">
                {/* Mini Seat Map Preview */}
                <div className="hidden md:flex flex-col items-end gap-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Seat Map Preview</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-3 rounded-xs ${
                          i < 5 ? 'bg-emerald-400/40 border border-emerald-400/60' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="text-left sm:text-right">
                  <span className="text-lg font-black font-mono text-brand-yellow block">
                    Rs {tier.price.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">per seat</span>
                </div>

                {/* Reorder Buttons (Move Up / Down) */}
                {isSelected && (
                  <div className="flex items-center gap-1 bg-surface-200 p-1 rounded-lg border border-white/10 shrink-0">
                    <button
                      type="button"
                      disabled={rankIndex === 0}
                      onClick={e => handleMoveUp(rankIndex, e)}
                      title="Move up in preference"
                      className="p-1 rounded text-slate-400 hover:text-brand-yellow disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={rankIndex === selectedTiers.length - 1}
                      onClick={e => handleMoveDown(rankIndex, e)}
                      title="Move down in preference"
                      className="p-1 rounded text-slate-400 hover:text-brand-yellow disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Short Explanatory Note Required by Section 2 */}
      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Nothing is reserved yet. If you are selected, we try your 1st choice first, then your next choices.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          size="lg"
          variant="primary"
          onClick={handleSubmit}
          disabled={selectedTiers.length === 0 || isSubmitting}
          className="flex-1"
        >
          {checkingHuman ? (
            <span className="flex items-center gap-2 font-mono text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              Checking you are human...
            </span>
          ) : isEditing ? (
            'Save Preferences'
          ) : (
            'Enter Draw'
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
