import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Countdown } from '@/components/ui/Countdown';
import {
  Calendar,
  Clock,
  MapPin,
  Lock,
  ShieldCheck,
  Bell,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Users,
  Info,
  ExternalLink,
} from 'lucide-react';

export const DropDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { drops, getDrop, user, getUserEntry, addToast } = useApp();

  const drop = getDrop(id || 'drop-jack-white-vault') || drops[0];
  const userEntry = getUserEntry(drop.id);
  const [reminderSet, setReminderSet] = useState(false);

  const isWindowOpen = drop.status === 'open';
  const isVerified = user.phoneVerified;

  const handleSetReminder = () => {
    setReminderSet(true);
    addToast(
      'success',
      'Reminder Scheduled',
      `We will notify ${user.email} 15 minutes before the draw occurs.`
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      
      {/* Top Banner Breadcrumb */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <Link to="/" className="hover:text-brand-yellow">Drops</Link>
          <span>/</span>
          <span className="text-white">{drop.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-100 border border-white/10 text-slate-300">
            ID: {drop.id}
          </span>
          <Badge variant={drop.mode === 'FAIR_DROP' ? 'yellow' : 'cyan'}>
            {drop.mode === 'FAIR_DROP' ? 'Verifiable Fair Drop' : 'FCFS Control'}
          </Badge>
        </div>
      </div>

      {/* Hero Showcase Header */}
      <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-surface-200">
        <div className="h-72 sm:h-96 w-full relative">
          <img
            src={drop.heroImage}
            alt={drop.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/60 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-yellow px-2.5 py-1 rounded bg-black/60 border border-brand-yellow/30 inline-block">
                {drop.artistOrHost}
              </span>
              <h1 className="text-3xl sm:text-5xl font-stamp font-black text-white uppercase tracking-tight">
                {drop.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-yellow" />
                  {drop.venue}, {drop.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  {drop.seatCount} Seats Available
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Limit: {drop.perPersonLimit} seat per verified phone
                </span>
              </div>
            </div>

            {/* Price Box */}
            <div className="sm:text-right bg-black/70 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0">
              <span className="text-xs uppercase font-mono text-slate-400 block">Seat Price</span>
              <span className="text-3xl font-black font-mono text-brand-yellow">
                ${drop.price} <span className="text-sm text-white font-sans">{drop.currency}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Event Timing & Action Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Details & Rules */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Overview */}
          <Card variant="glass">
            <CardTitle className="text-xl">About This Allocation Event</CardTitle>
            <p className="text-slate-300 text-sm mt-3 leading-relaxed">
              {drop.description}
            </p>

            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 rounded-lg bg-surface-100">
                <span className="text-slate-400 block text-[10px] uppercase">Allocation Mode</span>
                <span className="text-white font-bold">{drop.mode === 'FAIR_DROP' ? 'Uniform Random' : 'FCFS Speed Order'}</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-100">
                <span className="text-slate-400 block text-[10px] uppercase">Hold Timer</span>
                <span className="text-white font-bold">{drop.holdDurationSec / 60} Minutes</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-100">
                <span className="text-slate-400 block text-[10px] uppercase">Per Person Limit</span>
                <span className="text-white font-bold">{drop.perPersonLimit} Verified Seat</span>
              </div>
            </div>
          </Card>

          {/* Cryptographic Seed Commitment Info */}
          <Card variant="default" className="border-brand-yellow/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-brand-yellow/10 text-brand-yellow shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-white text-base">
                  Commit-Reveal Randomness
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Before this window opened, the organizer published the cryptographic hash of the secret draw seed.
                  After the window closes, the seed is revealed and a deterministic Fisher-Yates shuffle is executed.
                  No operator or attendee can tamper with the draw result.
                </p>
                <div className="mt-3 p-2.5 rounded bg-black/60 border border-white/10 font-mono text-[11px] text-slate-300 truncate">
                  <span className="text-slate-500 mr-2">SHA-256 Commit:</span>
                  <span className="text-brand-yellow">{drop.seedCommitHash}</span>
                </div>
                <div className="mt-3">
                  <Link
                    to={`/proof/${drop.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-brand-yellow hover:underline font-mono"
                  >
                    <span>Inspect Seed Proof & Invariant Counters</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* Registration Rules */}
          <Card variant="glass">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Drop Entry Rules & Fair Play Policy</span>
            </CardTitle>
            <ul className="mt-3 space-y-2 text-xs text-slate-300 list-disc list-inside">
              <li>Arriving early inside the open window confers <strong className="text-white">zero statistical advantage</strong>.</li>
              <li>Only one entry receipt is issued per verified phone identity. Repeated requests return the identical receipt.</li>
              <li>When the window closes, the entries pool is frozen immediately.</li>
              <li>Selected attendees receive an exclusive 5-minute seat hold to complete simulated checkout.</li>
              <li>Expired holds are automatically released to the next person on the waitlist.</li>
            </ul>
          </Card>

        </div>

        {/* Right Column: Live Status & Action Card */}
        <div className="lg:col-span-5 space-y-6">
          
          <Card variant="glow" className="space-y-6 border-brand-yellow/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-slate-400">
                  {drop.status === 'open' ? 'Entry Window Closes In' : 'Entry Window Opens In'}
                </span>
                <Badge variant={drop.status === 'open' ? 'yellow' : 'cyan'} dot={drop.status === 'open'}>
                  {drop.status.toUpperCase()}
                </Badge>
              </div>
              <Countdown targetDate={drop.status === 'open' ? drop.windowEnd : drop.windowStart} size="lg" />
            </div>

            {/* Identity Status Pill */}
            <div className="p-3.5 rounded-xl bg-surface-100 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Your Identity Status:</span>
                {isVerified ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Fan
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-bold font-mono">
                    <AlertCircle className="w-3.5 h-3.5" /> Phone Unverified
                  </span>
                )}
              </div>

              {!isVerified && (
                <div className="text-[11px] text-slate-300">
                  Please verify your simulated phone OTP to unlock entry registration.
                  <Link to="/verify" className="text-brand-yellow ml-1 font-semibold underline">
                    Verify now
                  </Link>
                </div>
              )}
            </div>

            {/* Existing Entry Receipt Card if already entered */}
            {userEntry ? (
              <div className="p-4 rounded-xl bg-brand-yellow/10 border border-brand-yellow/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-brand-yellow flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Entry Registered
                  </span>
                  <Badge variant="yellow">{userEntry.status.toUpperCase()}</Badge>
                </div>
                <div className="font-mono text-xs text-slate-300">
                  <span className="text-slate-400">Receipt ID: </span>
                  <span className="text-white font-bold">{userEntry.receiptId}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Idempotent receipt recorded at {new Date(userEntry.arrivedAt).toLocaleTimeString()}.
                </p>
                <div className="pt-2">
                  <Link to={`/drops/${drop.id}/live`}>
                    <Button size="md" variant="primary" className="w-full">
                      View Live Telemetry
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Action Buttons */
              <div className="space-y-3">
                {isWindowOpen ? (
                  isVerified ? (
                    <Link to={`/drops/${drop.id}/enter`} className="block">
                      <Button size="lg" variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        Join Drop Registration
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/verify" className="block">
                      <Button size="lg" variant="primary" className="w-full">
                        Verify Identity to Join
                      </Button>
                    </Link>
                  )
                ) : drop.status === 'scheduled' ? (
                  <Link to={`/drops/${drop.id}/wait`} className="block">
                    <Button size="lg" variant="secondary" className="w-full">
                      Enter Waiting Room
                    </Button>
                  </Link>
                ) : (
                  <Link to={`/drops/${drop.id}/result`} className="block">
                    <Button size="lg" variant="outline" className="w-full">
                      View Draw Results
                    </Button>
                  </Link>
                )}

                <Button
                  size="md"
                  variant="outline"
                  className="w-full"
                  onClick={handleSetReminder}
                  disabled={reminderSet}
                  leftIcon={<Bell className="w-4 h-4" />}
                >
                  {reminderSet ? 'Reminder Set for Draw' : 'Set Notification Reminder'}
                </Button>
              </div>
            )}

            {/* Quick Live Stats */}
            <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Registrations: {drop.totalEntriesCount?.toLocaleString() || '4,218'}</span>
              <span>Available Seats: {drop.seatCount}</span>
            </div>

          </Card>

        </div>

      </div>

    </div>
  );
};
