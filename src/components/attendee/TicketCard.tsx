import React from 'react';
import { Ticket } from '@shared/types';
import { CheckCircle2, MapPin, Calendar, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TicketCardProps {
  ticket: Ticket;
  venue?: string;
  artistOrHost?: string;
  eventName?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  venue = 'The Royal Opera House, Mumbai',
  artistOrHost = 'Jack White & The Third Man Band',
  eventName = 'The Acoustic Vault Sessions',
}) => {
  return (
    <div className="max-w-xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-b from-[#141622] to-[#0c0d14] border-2 border-emerald-500/50 shadow-2xl space-y-6 p-6 sm:p-8 font-sans">
      
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Ticket Confirmed & Paid
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase font-semibold">
          Authentic Pass
        </span>
      </div>

      {/* Event & Seat Details */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-mono text-brand-yellow font-bold uppercase tracking-wider block">
            {artistOrHost}
          </span>
          <h2 className="text-2xl sm:text-3xl font-stamp font-black text-white uppercase tracking-tight">
            {eventName}
          </h2>
        </div>

        {/* Big Seat Tag */}
        <div className="p-4 rounded-2xl bg-surface-100/90 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Assigned Seat</span>
            <span className="text-3xl font-black font-mono text-white tracking-wider">
              {ticket.seatLabel}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Tier & Price</span>
            <span className="text-base font-bold text-brand-yellow font-mono">
              {ticket.tierName || 'Tier Pass'} • Rs {(ticket.pricePaid ?? ticket.price)?.toLocaleString() || '—'}
            </span>
          </div>
        </div>

        {/* Venue & Attendee Info */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-300">
          <div className="p-3 rounded-xl bg-surface-100/50 border border-white/5">
            <span className="text-[10px] uppercase text-slate-400 block">Attendee</span>
            <span className="text-white font-semibold truncate block mt-0.5">{ticket.attendeeName || ticket.holderName || 'Attendee'}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-100/50 border border-white/5">
            <span className="text-[10px] uppercase text-slate-400 block">Venue</span>
            <span className="text-white font-semibold truncate block mt-0.5">{venue}</span>
          </div>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="p-6 rounded-2xl bg-white flex flex-col items-center justify-center space-y-3 shadow-inner">
        {ticket.qrPayload ? (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticket.qrPayload)}`}
            alt="Ticket QR Code"
            className="w-44 h-44 object-contain rounded"
          />
        ) : (
          <div className="w-44 h-44 bg-slate-900 rounded flex items-center justify-center font-mono text-[10px] text-white p-2 text-center">
            {(ticket.qrCodeHmac || ticket.signature || ticket.id).substring(0, 32)}...
          </div>
        )}
        <span className="text-[10px] font-mono text-slate-600 font-bold uppercase tracking-wider text-center block">
          Scan at turnstile for venue entry
        </span>
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>Order #{ticket.orderId.substring(0, 10)}</span>
        <span>Ticket ID: {ticket.id}</span>
      </div>

    </div>
  );
};
