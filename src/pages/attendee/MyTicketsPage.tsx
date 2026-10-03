import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import QRCode from 'qrcode';
import {
  Ticket as TicketIcon,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Download,
  ExternalLink,
  Lock,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

export const MyTicketsPage: React.FC = () => {
  const { user, tickets, entries, drops } = useApp();
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    // Generate QR codes for tickets
    tickets.forEach(ticket => {
      QRCode.toDataURL(ticket.qrPayload, {
        width: 240,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then(url => {
        setQrCodeUrls(prev => ({ ...prev, [ticket.id]: url }));
      });
    });
  }, [tickets]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-12 pb-20">
      
      {/* Header Profile Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#12141c] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-yellow font-stamp font-black text-black text-2xl flex items-center justify-center shadow-glow-yellow">
            {user.displayName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display text-white">{user.displayName}</h1>
              <Badge variant="emerald" size="sm" dot>VERIFIED FAN</Badge>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{user.email} · {user.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/verify">
            <Button size="sm" variant="outline">
              Manage Identity
            </Button>
          </Link>
          <Link to="/">
            <Button size="sm" variant="primary">
              Browse Live Drops
            </Button>
          </Link>
        </div>
      </div>

      {/* Confirmed Tickets Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-brand-yellow" />
            <h2 className="text-2xl font-stamp font-extrabold text-white tracking-tight uppercase">
              My Cryptographically Signed Tickets ({tickets.length})
            </h2>
          </div>
        </div>

        {tickets.length === 0 ? (
          <Card variant="glass" className="text-center py-12 space-y-3">
            <TicketIcon className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white font-display">No Confirmed Tickets Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Enter open drops and get selected in the verifiable Fisher-Yates draw to purchase admission tickets.
            </p>
            <div className="pt-2">
              <Link to="/">
                <Button size="md" variant="primary">
                  Enter Jack White Vault Drop
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map(ticket => (
              <Card
                key={ticket.id}
                variant="ticket"
                className="p-6 border-brand-yellow/40 space-y-6 relative overflow-hidden shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-brand-yellow uppercase tracking-widest block mb-0.5">
                      OFFICIAL ADMISSION PASS
                    </span>
                    <h3 className="text-xl font-bold font-display text-white">{ticket.dropName}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-brand-yellow" /> {ticket.venue}
                    </p>
                  </div>
                  <Badge variant="emerald" dot>CONFIRMED</Badge>
                </div>

                {/* Perforated Divider */}
                <div className="border-t border-dashed border-white/20 pt-4 flex flex-col sm:flex-row items-center gap-6">
                  {/* QR Code Container */}
                  <div className="bg-white p-3 rounded-xl shadow-lg shrink-0">
                    {qrCodeUrls[ticket.id] ? (
                      <img src={qrCodeUrls[ticket.id]} alt="Ticket QR" className="w-28 h-28" />
                    ) : (
                      <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-black text-xs font-mono">
                        Generating...
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Assigned Seat</span>
                      <span className="text-brand-yellow font-bold text-sm">{ticket.seatLabel}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Order ID</span>
                      <span className="text-white">{ticket.orderId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">HMAC Signature</span>
                      <span className="text-slate-400 text-[10px] truncate block">{ticket.signature.substring(0, 20)}...</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Issued: {new Date(ticket.issuedAt).toLocaleDateString()}</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Authenticity Verified
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Entry History Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-stamp font-extrabold text-white tracking-tight uppercase">
          My Entry Receipts History ({entries.length})
        </h2>

        {entries.length === 0 ? (
          <p className="text-xs text-slate-400">No entries recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => {
              const drop = drops.find(d => d.id === entry.dropId);
              return (
                <div
                  key={entry.receiptId}
                  className="p-4 rounded-xl bg-surface-100 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono"
                >
                  <div>
                    <span className="text-white font-bold block">{drop?.name || entry.dropId}</span>
                    <span className="text-slate-400">Receipt: <span className="text-brand-yellow">{entry.receiptId}</span></span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">{new Date(entry.arrivedAt).toLocaleTimeString()}</span>
                    <Badge variant={entry.status === 'selected' ? 'emerald' : 'yellow'}>
                      {entry.status.toUpperCase()}
                    </Badge>
                    <Link to={`/proof/${entry.dropId}`} className="text-brand-yellow hover:underline">
                      Verify Position
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
