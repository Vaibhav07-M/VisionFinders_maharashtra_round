import React, { useState } from 'react';
import { Offer, Ticket } from '@shared/types';
import { Countdown } from '@/components/ui/Countdown';
import { Button } from '@/components/ui/Button';
import { Ticket as TicketIcon, Clock, Check, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface OfferCardProps {
  offer: Offer;
  onPay: () => Promise<Ticket>;
  onRelease: () => Promise<void>;
  onExpire?: () => void;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onPay,
  onRelease,
  onExpire,
}) => {
  const [isPaying, setIsPaying] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      await onPay();
    } finally {
      setIsPaying(false);
    }
  };

  const handleRelease = async () => {
    if (!confirmRelease) {
      setConfirmRelease(true);
      return;
    }
    setIsReleasing(true);
    try {
      await onRelease();
    } finally {
      setIsReleasing(false);
    }
  };

  const handleExpire = () => {
    setIsExpired(true);
    if (onExpire) onExpire();
  };

  if (isExpired || offer.status === 'expired') {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-[#0e0f17] border border-rose-500/30 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
          <Clock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-stamp font-black text-white uppercase tracking-tight">
          Offer Expired
        </h2>
        <p className="text-sm text-slate-300">
          Your time ran out and the seat was passed on to the next person waiting.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8 rounded-3xl bg-[#0e0f17] border-2 border-brand-yellow/60 shadow-2xl shadow-brand-yellow/10 space-y-8 font-sans">
      
      {/* Header Tag */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Seat Reserved For You
          </span>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/30 font-semibold uppercase">
          5-Minute Exclusive Hold
        </span>
      </div>

      {/* Seat Details */}
      <div className="text-center space-y-2 py-4 border-y border-white/10">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
          {offer.tierName} Tier
        </span>
        <h1 className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
          {offer.seatLabel}
        </h1>
        <div className="pt-2">
          <span className="text-3xl font-black font-mono text-brand-yellow">
            Rs {offer.price.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Synchronized Server Countdown */}
      <div className="text-center space-y-2">
        <span className="text-xs font-mono uppercase text-slate-400 block tracking-wider">
          Time Remaining To Claim
        </span>
        <div className="flex justify-center">
          <Countdown deadline={offer.expiresAt} size="lg" onExpire={handleExpire} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        {/* Payment Button */}
        <div className="space-y-1">
          <Button
            size="lg"
            variant="primary"
            onClick={handlePay}
            isLoading={isPaying}
            className="w-full text-base font-bold shadow-glow-yellow py-4"
          >
            Pay Rs {offer.price.toLocaleString()}
          </Button>
          <span className="text-[10px] font-mono text-slate-500 text-center block">
            Demo payment • 1-click confirmation
          </span>
        </div>

        {/* Release Button with Confirmation */}
        {confirmRelease ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
            <p className="text-xs text-rose-300 font-semibold">
              Are you sure? This seat will immediately pass to the next waitlisted person.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                size="sm"
                variant="outline"
                className="bg-rose-500/20 text-rose-200 border-rose-500/40 hover:bg-rose-500 hover:text-white"
                onClick={handleRelease}
                isLoading={isReleasing}
              >
                Yes, release seat
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmRelease(false)}
                disabled={isReleasing}
              >
                Keep my seat
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="md"
            variant="ghost"
            onClick={handleRelease}
            className="w-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs"
          >
            Release seat
          </Button>
        )}
      </div>

    </div>
  );
};
