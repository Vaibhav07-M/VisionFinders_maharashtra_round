import React, { useState } from 'react';
import { LiveBoardData, Drop } from '@shared/types';
import { LiveSeatBoard } from './LiveSeatBoard';
import { Button } from '@/components/ui/Button';
import { Clock, Users, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WaitlistCardProps {
  position: number | null;
  totalWaitlisted: number;
  liveBoard: LiveBoardData | null;
  drop: Drop;
  onLeaveWaitlist: () => Promise<void>;
}

export const WaitlistCard: React.FC<WaitlistCardProps> = ({
  position,
  totalWaitlisted,
  liveBoard,
  drop,
  onLeaveWaitlist,
}) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);

  const handleLeave = async () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    setIsLeaving(true);
    try {
      await onLeaveWaitlist();
      setHasLeft(true);
    } finally {
      setIsLeaving(false);
    }
  };

  const noSeatsRemaining = liveBoard && liveBoard.totalHeld === 0 && liveBoard.totalAvailable === 0;

  if (hasLeft) {
    return (
      <div className="p-8 rounded-2xl bg-surface-100 border border-white/10 text-center space-y-4">
        <h3 className="text-xl font-stamp font-bold text-white">You have left the waitlist</h3>
        <p className="text-xs text-slate-300">
          Your reservation request has been removed. You can enter subsequent rounds if opened.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      
      {/* Top Waitlist Position Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0f111d] to-[#0a0b12] border-2 border-cyan-500/40 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
              Waitlist Active
            </span>
            <h2 className="text-2xl sm:text-4xl font-stamp font-black text-white tracking-tight">
              You are #{position ?? '—'} on the waitlist
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 pt-1">
              If someone doesn't pay within 5 minutes, you may get their seat.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 rounded-xl bg-surface-100/60 border border-white/10 shrink-0 font-mono">
            <span className="text-[10px] uppercase text-slate-400">Total in Queue</span>
            <span className="text-xl sm:text-2xl font-bold text-white">
              {totalWaitlisted || liveBoard?.peopleWaiting || 0}
            </span>
          </div>
        </div>

        {/* Action Buttons: Stay (default) and Leave */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
          <Button
            size="md"
            variant="primary"
            className="flex-1 sm:flex-initial"
            disabled
          >
            ✓ Stay on waitlist
          </Button>

          {confirmLeave ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500 hover:text-white text-xs"
                onClick={handleLeave}
                isLoading={isLeaving}
              >
                Confirm leave
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmLeave(false)}
                disabled={isLeaving}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="md"
              variant="outline"
              onClick={handleLeave}
              className="text-slate-400 hover:text-rose-400 text-xs"
            >
              Leave waitlist
            </Button>
          )}
        </div>

        {/* Honest Wording Note */}
        <p className="text-[11px] text-slate-400 italic">
          * Offers are distributed strictly in draw-rank order as soon as a held seat expires or is released.
        </p>
      </div>

      {/* Round Finished Notice if no seats left */}
      {noSeatsRemaining && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-center">
          <AlertCircle className="w-6 h-6 text-amber-300 mx-auto" />
          <h3 className="text-lg font-stamp font-bold text-white">No seats left in this round</h3>
          <p className="text-xs text-slate-300">
            All seats in Round {drop.round || 1} have been claimed. Check back if the organizer opens the next round.
          </p>
        </div>
      )}

      {/* Embedded Live Seat Board */}
      <div className="space-y-3">
        <h3 className="text-sm font-mono uppercase text-slate-400 tracking-wider">
          Live Inventory Telemetry
        </h3>
        <LiveSeatBoard board={liveBoard} />
      </div>

    </div>
  );
};
