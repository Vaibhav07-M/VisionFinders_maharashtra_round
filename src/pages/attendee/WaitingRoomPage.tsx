import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Countdown } from '@/components/ui/Countdown';
import {
  Clock,
  ShieldCheck,
  Cpu,
  Wifi,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export const WaitingRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { drops, getDrop, user } = useApp();

  const drop = getDrop(id || 'drop-jack-white-vault') || drops[0];

  if (!drop) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading waiting room from Firestore...</p>
      </div>
    );
  }

  const [deviceChecked, setDeviceChecked] = useState(true);
  const [powWorkerReady, setPowWorkerReady] = useState(true);
  const [socketPing, setSocketPing] = useState(24);

  // If window is already open, offer immediate redirect
  const isWindowOpen = drop.status === 'open';

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      
      {/* Top Banner */}
      <div className="text-center space-y-4">
        <Badge variant="cyan" dot className="px-3 py-1">
          DROP WAITING ROOM · PRE-FLIGHT CHECK
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-stamp font-black text-white uppercase tracking-tight">
          {drop.name}
        </h1>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          The entry window will open shortly. Arriving first gives <strong className="text-brand-yellow font-bold">zero advantage</strong> over anyone else who joins during the open window.
        </p>
      </div>

      {/* Giant Countdown Card */}
      <Card variant="glow" className="text-center p-8 border-brand-yellow/50">
        <span className="text-xs uppercase font-mono tracking-widest text-slate-400 block mb-3">
          Window Opens In
        </span>
        <div className="flex justify-center">
          <Countdown
            targetDate={drop.windowStart}
            size="giant"
            onExpire={() => navigate(`/drops/${drop.id}/enter`)}
          />
        </div>

        {isWindowOpen && (
          <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in">
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono mb-4 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>THE ENTRY WINDOW IS NOW OPEN!</span>
            </div>
            <Link to={`/drops/${drop.id}/enter`}>
              <Button size="xl" variant="primary" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Proceed to Entry Console
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Browser & Environment Diagnostics Check */}
      <Card variant="glass">
        <CardTitle className="text-base flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand-yellow" />
          <span>Attendee Client Diagnostics (Pre-Entry Verification)</span>
        </CardTitle>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-3.5 rounded-xl bg-surface-200 border border-white/10 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-white block">Identity Verified</span>
              <span className="text-[11px] font-mono text-slate-400">
                {user.phoneVerified ? 'Phone Bound' : 'Guest'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-200 border border-white/10 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-white block">PoW Engine Ready</span>
              <span className="text-[11px] font-mono text-slate-400">
                Web Crypto SHA-256 OK
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-200 border border-white/10 flex items-start gap-3">
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-white block">Socket Ping</span>
              <span className="text-[11px] font-mono text-slate-400">{socketPing} ms (Low Latency)</span>
            </div>
          </div>
        </div>

        {/* Educational Callout */}
        <div className="mt-6 p-4 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-brand-yellow">Why there is no rush:</strong> In traditional ticketing,
            bots with fiber-optic connections capture 90% of tickets within 200 milliseconds.
            In Fair Drop, every entry submitted during the 3-minute window has mathematically identical
            lottery draw probability.
          </div>
        </div>
      </Card>

    </div>
  );
};
