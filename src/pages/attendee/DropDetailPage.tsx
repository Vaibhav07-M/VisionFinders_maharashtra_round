import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { DEFAULT_TIERS } from '@shared/constants';
import { TicketTier, Ticket } from '@shared/types';
import { Countdown } from '@/components/ui/Countdown';
import { Button } from '@/components/ui/Button';
import { LiveSeatBoard } from '@/components/attendee/LiveSeatBoard';
import { TierPreferenceSelector } from '@/components/attendee/TierPreferenceSelector';
import { OfferCard } from '@/components/attendee/OfferCard';
import { WaitlistCard } from '@/components/attendee/WaitlistCard';
import { TicketCard } from '@/components/attendee/TicketCard';
import {
  MapPin,
  Users,
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

export const DropDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    drops,
    getDrop,
    user,
    liveBoard,
    userDropState,
    activeOffer,
    fetchLiveBoard,
    fetchUserDropState,
    submitJoin,
    updatePreferences,
    payOffer,
    releaseOffer,
    leaveWaitlist,
    triggerDraw,
    addToast,
  } = useApp();

  const dropId = id || 'drop-jack-white-vault';
  const drop = getDrop(dropId) || drops[0];

  const [isLoading, setIsLoading] = useState(true);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // Fetch initial board and user state from server
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.all([
      fetchLiveBoard(dropId).catch(() => null),
      fetchUserDropState(dropId).catch(() => null),
    ]).finally(() => {
      if (mounted) setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [dropId, user.uid]);

  if (!drop || isLoading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-3 font-mono">
        <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
        <p className="text-xs text-slate-400">Loading reservation status from server...</p>
      </div>
    );
  }

  const tiers: TicketTier[] = drop.tiers && drop.tiers.length > 0 ? drop.tiers : DEFAULT_TIERS;

  // Determine current State in the 8-state Attendee State Machine
  // 1. PAID
  const isPaid =
    Boolean(userDropState?.ticket) ||
    userDropState?.offer?.status === 'paid' ||
    userDropState?.entry?.status === 'paid';

  // 2. OFFERED (active 5-minute exclusive hold)
  const isOffered =
    Boolean(activeOffer && activeOffer.status === 'offered') ||
    Boolean(userDropState?.offer && userDropState.offer.status === 'offered');
  const currentOffer = activeOffer || userDropState?.offer;

  // 3. EXPIRED or RELEASED
  const isExpiredOrReleased =
    userDropState?.entry?.status === 'released' ||
    userDropState?.entry?.status === 'expired' ||
    userDropState?.offer?.status === 'expired' ||
    userDropState?.offer?.status === 'released';

  // 4. WAITLISTED
  const isWaitlisted =
    userDropState?.entry?.status === 'waitlisted' ||
    (userDropState?.waitlistPosition !== null && userDropState?.waitlistPosition !== undefined);

  // 5. BLOCKED
  const isBlocked =
    Boolean(userDropState?.entry && userDropState.entry.status === 'blocked');

  // 6. ENTERED (Active in draw pool: 'entered', 'eligible', or 'flagged')
  const isEntered =
    Boolean(
      userDropState?.entry &&
      ['entered', 'eligible', 'flagged'].includes(userDropState.entry.status)
    );

  // 7. WINDOW OPEN, not entered
  const isWindowOpen = drop.status === 'open';

  // 8. UPCOMING
  const isUpcoming = drop.status === 'scheduled';

  // Format draw time HH:MM
  const drawDate = new Date(drop.drawTime || drop.windowEnd);
  const formattedDrawTime = drawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Handlers
  const handleJoin = async (preferences: string[], websiteTrap?: string) => {
    await submitJoin(drop.id, preferences, websiteTrap);
    await fetchUserDropState(drop.id);
  };

  const handleUpdatePreferences = async (preferences: string[]) => {
    await updatePreferences(drop.id, preferences);
    setIsEditingPreferences(false);
  };

  const handlePay = async (): Promise<Ticket> => {
    if (!currentOffer) throw new Error('No active offer to pay');
    return await payOffer(currentOffer.id);
  };

  const handleRelease = async () => {
    if (!currentOffer) return;
    await releaseOffer(currentOffer.id);
  };

  const handleLeaveWaitlist = async () => {
    await leaveWaitlist(drop.id);
  };

  const handleRemindMe = () => {
    setReminderSet(true);
    addToast('success', 'Reminder Set', `We will notify you before the draw for ${drop.name}.`);
  };

  const handleRunDraw = async () => {
    try {
      setIsDrawing(true);
      await triggerDraw(drop.id);
      await Promise.all([
        fetchUserDropState(drop.id),
        fetchLiveBoard(drop.id),
      ]);
    } catch (err: any) {
      addToast('error', 'Draw Failed', err.message);
    } finally {
      setIsDrawing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-10 font-sans pb-24">
      
      {/* Event Header (Simplified, clean) */}
      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-yellow px-2.5 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20">
            {drop.artistOrHost}
          </span>
          <span className="text-xs font-mono text-slate-400">
            Round {drop.round || 1} • {drop.seatCount} Total Seats
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-stamp font-black text-white uppercase tracking-tight">
          {drop.name}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-yellow" />
            {drop.venue}, {drop.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            1 seat limit per attendee
          </span>
        </div>
      </div>

      {/* ================= STATE MACHINE RENDERER ================= */}

      {/* STATE 1: PAID -> Show Ticket with QR */}
      {isPaid && userDropState?.ticket && (
        <div className="space-y-6">
          <TicketCard
            ticket={userDropState.ticket}
            venue={`${drop.venue}, ${drop.city}`}
            artistOrHost={drop.artistOrHost}
            eventName={drop.name}
          />
        </div>
      )}

      {/* STATE 2: OFFERED -> 5-Minute Offer Card with Countdown, Pay, Release */}
      {!isPaid && isOffered && currentOffer && (
        <OfferCard
          offer={currentOffer}
          onPay={handlePay}
          onRelease={handleRelease}
          onExpire={() => {
            fetchUserDropState(drop.id);
            fetchLiveBoard(drop.id);
          }}
        />
      )}

      {/* STATE 3: WAITLISTED -> Live Seat Board + Waitlist Position */}
      {!isPaid && !isOffered && isWaitlisted && (
        <WaitlistCard
          position={userDropState?.waitlistPosition ?? null}
          totalWaitlisted={userDropState?.totalWaitlisted ?? 0}
          liveBoard={liveBoard}
          drop={drop}
          onLeaveWaitlist={handleLeaveWaitlist}
        />
      )}

      {/* STATE 3B: BLOCKED / SUSPENDED -> Show review notice + link to appeals */}
      {!isPaid && !isOffered && !isWaitlisted && isBlocked && (
        <div className="p-8 sm:p-10 rounded-3xl bg-rose-950/20 border-2 border-rose-500/40 text-center space-y-6 shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 block">
              Registration Suspended
            </span>
            <h2 className="text-2xl sm:text-3xl font-stamp font-black text-white uppercase tracking-tight">
              Entry Under Security Review
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your entry was flagged by automated security signals or moderator policy checks. If you believe this is an error, you can submit an appeal for human review.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Link to="/appeals">
              <Button size="md" variant="primary" className="bg-rose-500 hover:bg-rose-600 text-white font-semibold">
                Submit an Appeal
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* STATE 4: ENTERED -> "You're in. Draw at HH:MM." + [ Edit preferences ] */}
      {!isPaid && !isOffered && !isWaitlisted && !isBlocked && isEntered && (
        <div className="space-y-6">
          {isEditingPreferences ? (
            <div className="p-6 rounded-3xl bg-surface-100 border border-white/15">
              <TierPreferenceSelector
                dropId={drop.id}
                tiers={tiers}
                liveBoard={liveBoard}
                initialPreferences={userDropState?.entry?.preferences}
                onSubmit={handleUpdatePreferences}
                isEditing
                onCancel={() => setIsEditingPreferences(false)}
              />
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#0c0e18] to-[#07080f] border-2 border-emerald-500/40 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border inline-block ${
                    userDropState?.entry?.status === 'eligible'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : userDropState?.entry?.status === 'flagged'
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                      : 'text-brand-yellow bg-brand-yellow/10 border-brand-yellow/30'
                  }`}>
                    {userDropState?.entry?.status === 'eligible'
                      ? 'Verified & Eligible'
                      : userDropState?.entry?.status === 'flagged'
                      ? 'Entry Under Review'
                      : 'Entry Confirmed'}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-stamp font-black text-white uppercase tracking-tight">
                  You're in. Draw at {formattedDrawTime}.
                </h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  When the entry window closes, seats are allocated via verifiable uniform random draw. If chosen, you will receive an exclusive 5-minute seat offer.
                </p>
              </div>

              {/* Preferences Summary */}
              {userDropState?.entry?.preferences && userDropState.entry.preferences.length > 0 && (
                <div className="p-4 rounded-xl bg-surface-100/60 border border-white/10 max-w-md mx-auto text-left space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Your Tier Preferences (Priority Order):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {userDropState.entry.preferences.map((tierId, idx) => {
                      const t = tiers.find(item => item.id === tierId);
                      return (
                        <span
                          key={tierId}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/5 border border-white/10 text-white flex items-center gap-1.5"
                        >
                          <span className="text-brand-yellow font-bold">#{idx + 1}</span>
                          <span>{t?.name || tierId}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action: Run Draw Now (Judge Demo) & Edit Preferences */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="md"
                  variant="primary"
                  onClick={handleRunDraw}
                  disabled={isDrawing}
                  className="font-bold text-xs bg-brand-yellow text-black hover:bg-brand-yellow/90 shadow-glow-yellow/20 flex items-center gap-2"
                >
                  {isDrawing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Running Draw...</span>
                    </>
                  ) : (
                    <span>⚡ Run Draw Now (Judge Demo)</span>
                  )}
                </Button>

                <Button
                  size="md"
                  variant="outline"
                  onClick={() => setIsEditingPreferences(true)}
                  disabled={isDrawing}
                  className="font-semibold text-xs"
                >
                  Edit preferences
                </Button>
              </div>
            </div>
          )}

          {/* Read-Only Live Board under entered state */}
          <div className="pt-6">
            <h3 className="text-sm font-mono uppercase text-slate-400 tracking-wider mb-4">
              Current Live Availability
            </h3>
            <LiveSeatBoard board={liveBoard} />
          </div>
        </div>
      )}

      {/* STATE 5: EXPIRED / RELEASED -> Short message + Next Step */}
      {!isPaid && !isOffered && !isWaitlisted && !isEntered && isExpiredOrReleased && (
        <div className="p-8 rounded-3xl bg-surface-100 border border-white/15 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-stamp font-black text-white uppercase tracking-tight">
              Offer Ended
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your reservation ended and the seat was returned to the pool. You may join the next round if one opens.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link to="/">
              <Button size="md" variant="primary">
                Return to Home
              </Button>
            </Link>
          </div>

          <div className="pt-6 text-left">
            <LiveSeatBoard board={liveBoard} />
          </div>
        </div>
      )}

      {/* STATE 6: WINDOW OPEN, NOT ENTERED -> "Pick your tiers" then [ Enter draw ] */}
      {!isPaid && !isOffered && !isWaitlisted && !isBlocked && !isEntered && !isExpiredOrReleased && isWindowOpen && (
        <div className="space-y-8">
          {/* Window countdown */}
          <div className="p-4 rounded-2xl bg-surface-100 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Registration Window Open
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <span>Closes in:</span>
              <div className="font-bold text-brand-yellow">
                <Countdown deadline={drop.windowEnd} size="sm" />
              </div>
            </div>
          </div>

          {/* Single Step Tier Preference Selector */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0e17] border border-white/15 shadow-2xl">
            <TierPreferenceSelector
              dropId={drop.id}
              tiers={tiers}
              liveBoard={liveBoard}
              onSubmit={handleJoin}
            />
          </div>

          {/* Seat Board Preview */}
          <div className="pt-6">
            <h3 className="text-sm font-mono uppercase text-slate-400 tracking-wider mb-4">
              Real-Time Seat Board
            </h3>
            <LiveSeatBoard board={liveBoard} />
          </div>
        </div>
      )}

      {/* STATE 7: UPCOMING -> Countdown + "Remind me" */}
      {!isPaid && !isOffered && !isWaitlisted && !isBlocked && !isEntered && isUpcoming && (
        <div className="p-8 sm:p-12 rounded-3xl bg-[#0d0e17] border border-white/15 text-center space-y-6 shadow-2xl">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
            Upcoming Drop Event
          </span>
          <h2 className="text-3xl sm:text-5xl font-stamp font-black text-white uppercase tracking-tight">
            Entry Window Opens Soon
          </h2>

          <div className="flex justify-center py-4">
            <Countdown deadline={drop.windowStart} size="lg" />
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            When the window opens, you'll pick your seat tier preferences. Arriving first gives zero speed advantage — the draw is completely uniform and fair.
          </p>

          <div className="pt-2 flex justify-center">
            <Button
              size="lg"
              variant="outline"
              onClick={handleRemindMe}
              disabled={reminderSet}
              leftIcon={<Bell className="w-4 h-4 text-brand-yellow" />}
            >
              {reminderSet ? 'Reminder Set' : 'Remind me'}
            </Button>
          </div>
        </div>
      )}

      {/* STATE 8: NOT ENTERED AFTER CLOSE -> Live seat board (read-only) + next-round link */}
      {!isPaid && !isOffered && !isWaitlisted && !isBlocked && !isEntered && !isWindowOpen && !isUpcoming && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface-100 border border-white/10 text-center space-y-2">
            <h2 className="text-xl font-stamp font-bold text-white uppercase">
              Entry Window Closed
            </h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Registration for this round has closed. You can watch the live seat allocations below or check for open rounds.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-mono uppercase text-slate-400 tracking-wider mb-4">
              Live Seat Board (Read-Only)
            </h3>
            <LiveSeatBoard board={liveBoard} />
          </div>
        </div>
      )}

    </div>
  );
};
