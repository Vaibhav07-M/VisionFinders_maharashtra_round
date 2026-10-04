import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from '@shared/types';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  X,
  Ticket as TicketIcon,
  Download,
  ShieldCheck,
  Calendar,
  MapPin,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TicketConfirmedModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  venue?: string;
  artistOrHost?: string;
  eventName?: string;
}

export const TicketConfirmedModal: React.FC<TicketConfirmedModalProps> = ({
  isOpen,
  onClose,
  ticket,
  venue = 'The Royal Opera House, Mumbai',
  artistOrHost = 'Artist / Host',
  eventName = 'Event Pass',
}) => {
  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.45 },
          colors: ['#10b981', '#eab308', '#38bdf8', '#ffffff'],
        });
      } catch {
        // Confetti fallback
      }

      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pricePaid = ticket.pricePaid ?? ticket.price;
  const attendeeName = ticket.attendeeName || ticket.holderName || 'Alex Chen';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1019] border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(16,185,129,0.25)] space-y-3 sm:space-y-3.5 text-center my-auto max-h-[96vh] flex flex-col justify-between">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Celebratory Icon */}
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 mx-auto shrink-0">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-0.5 sm:space-y-1">
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase block">
            Booking Confirmed & Guaranteed
          </span>
          <h2 className="text-xl sm:text-2xl font-stamp font-black text-white uppercase tracking-tight">
            Your Ticket Is Confirmed!
          </h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Congratulations! Your seat has been permanently locked, verified, and saved to your account.
          </p>
        </div>

        {/* Highlighted Ticket Summary Card */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-100/90 border border-white/15 text-left space-y-2.5 shadow-inner">
          <div className="border-b border-white/10 pb-2 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase text-brand-yellow font-bold tracking-wider block">
                {artistOrHost}
              </span>
              <h3 className="font-display font-bold text-white text-sm sm:text-base leading-snug">
                {eventName}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              Paid & Verified
            </span>
          </div>

          {/* Seat Tag in Big Gold */}
          <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-black/40 border border-brand-yellow/30">
            <div>
              <span className="text-[9px] font-mono uppercase text-slate-400 block">
                Assigned Seat
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-brand-yellow leading-tight">
                {ticket.seatLabel}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono uppercase text-slate-400 block">
                Tier & Total Paid
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-white">
                {ticket.tierName || 'Tier Pass'} • Rs {pricePaid?.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[9px] uppercase text-slate-400 block">Attendee</span>
              <span className="text-white font-semibold truncate block mt-0.5 text-xs">{attendeeName}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[9px] uppercase text-slate-400 block">Order Reference</span>
              <span className="text-slate-300 font-mono truncate block mt-0.5 text-xs">#{ticket.orderId.substring(0, 10)}</span>
            </div>
          </div>
        </div>

        {/* Reassurance Notice */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-left flex items-center gap-2 text-[11px] sm:text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="leading-snug">
            Your digital pass is complete with an authentic entry QR code. Access it anytime via <strong className="text-white">"My Tickets"</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-0.5">
          <Button
            size="md"
            variant="primary"
            onClick={onClose}
            leftIcon={<TicketIcon className="w-4 h-4 shrink-0" />}
            className="w-full font-black text-xs sm:text-sm bg-brand-yellow text-black hover:bg-brand-yellow/90 shadow-glow-yellow/20 py-2.5 flex items-center justify-center gap-2"
          >
            View Entry QR Pass
          </Button>

          <div className="flex items-center gap-2">
            <Link to="/my-tickets" className="flex-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-mono font-bold border-white/20 hover:border-white/40 py-1.5"
              >
                Go to My Tickets →
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="text-xs font-mono text-slate-300 hover:text-white border-white/10 flex items-center gap-1.5 py-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
