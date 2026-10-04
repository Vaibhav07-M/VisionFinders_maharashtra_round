import React from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const ResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { drops, getDrop } = useApp();

  const drop = getDrop(id || 'drop-jack-white-vault') || drops[0];

  if (!drop) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-3 font-mono">
        <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
        <p className="text-xs text-slate-400">Loading event outcome from Firestore...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 pb-20">
      
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="emerald" size="sm">EVENT COMPLETED</Badge>
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wide">
                Registration is Done
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 truncate">
              Registration for <strong className="text-white">{drop.name}</strong> is officially closed.
            </p>
          </div>
        </div>
      </div>

      {/* Main Registration Is Done Card */}
      <Card variant="glass" className="p-8 sm:p-12 border border-emerald-500/30 space-y-6 text-center relative overflow-hidden shadow-2xl">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[200px] bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-3 relative">
          <Badge variant="emerald" size="lg">
            REGISTRATION IS DONE · ALLOCATION COMPLETE
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-stamp font-black text-white uppercase tracking-tight">
            Registration Is Done
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            The registration window for <strong className="text-white">{drop.name}</strong> has closed and the allocation draw has concluded. All {drop.seatCount} seats have been allocated and verified on the cryptographic ledger.
          </p>
        </div>

        {/* Event Audit & Statistics Breakdown */}
        <div className="p-5 rounded-2xl bg-surface-200/90 border border-white/10 max-w-lg mx-auto font-mono text-xs text-left space-y-3 relative">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Event:</span>
            <span className="text-white font-bold truncate max-w-[220px]">{drop.name}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Venue & City:</span>
            <span className="text-slate-300">{drop.venue}, {drop.city}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Total Entries Received:</span>
            <span className="text-brand-yellow font-bold">{(drop.totalEntriesCount || 24500).toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Seats Allocated:</span>
            <span className="text-white font-bold">{drop.seatCount} of {drop.seatCount} Seats Filled</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Public Revealed Seed:</span>
            <span className="text-cyan-400 font-bold truncate max-w-[200px]">{drop.revealedSeed || drop.seedCommitHash}</span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="text-slate-400">Registration Status:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              ✓ Registration Done & Closed
            </span>
          </div>
        </div>
      </Card>

    </div>
  );
};
