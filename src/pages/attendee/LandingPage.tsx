import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Countdown } from '@/components/ui/Countdown';
import { Drop, DropStatus } from '@shared/types';
import {
  Flame,
  Search,
  ArrowRight,
  Ticket,
  Calendar,
  MapPin,
  Lock,
  Users,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { drops, entries, user, tickets, userDropState } = useApp();
  const [filter, setFilter] = useState<'all' | 'open' | 'upcoming' | 'completed'>('all');
  const [search, setSearch] = useState('');

  if (drops.length === 0) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading active drop catalog from Firestore...</p>
      </div>
    );
  }

  // Helper to extract creation timestamp accurately
  const getDropTime = (d: Drop): number => {
    if (d.createdAt) {
      const t = new Date(d.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    const match = d.id.match(/^drop-([a-z0-9_]+)/i);
    if (match) {
      const num = Number(match[1]);
      if (!isNaN(num) && num > 1000000000000) return num;
      const b36 = parseInt(match[1], 36);
      if (!isNaN(b36) && b36 > 1000000000000) return b36;
    }
    const ws = new Date(d.windowStart).getTime();
    if (!isNaN(ws)) return ws;
    return 0;
  };

  // 1. Featured Allocation: ALWAYS an OPEN event only (newest open drop)
  const openDrops = drops.filter(d => d.status === 'open');
  const sortedOpenByNewest = [...openDrops].sort((a, b) => getDropTime(b) - getDropTime(a));
  const featuredDrop = sortedOpenByNewest[0] || drops.find(d => d.status === 'open') || drops[0];

  // Check current user's registration and purchase status for any drop
  const getUserDropStatus = (dropId: string) => {
    // 1. Bought ticket
    const ticket = tickets.find(t => t.dropId === dropId) || (userDropState?.dropId === dropId ? userDropState.ticket : null);
    if (ticket || (userDropState?.dropId === dropId && (userDropState.offer?.status === 'paid' || userDropState.entry?.status === 'paid'))) {
      return {
        type: 'paid' as const,
        ticket: ticket || userDropState?.ticket,
        label: 'Ticket Confirmed',
        seatLabel: ticket?.seatLabel || userDropState?.ticket?.seatLabel || 'Assigned',
        tierName: ticket?.tierName || userDropState?.ticket?.tierName || 'Pass',
      };
    }

    // 2. Active seat offer
    const offer = (userDropState?.dropId === dropId ? userDropState.offer : null);
    if (offer && offer.status === 'offered' && offer.expiresAt > Date.now()) {
      return {
        type: 'offered' as const,
        offer,
        label: 'Seat Offered!',
      };
    }

    // 3. Waitlisted
    if (userDropState?.dropId === dropId && userDropState.waitlistPosition) {
      return {
        type: 'waitlisted' as const,
        position: userDropState.waitlistPosition,
        label: `Waitlist #${userDropState.waitlistPosition}`,
      };
    }

    // 4. Entered preferences in draw pool
    const entry = entries.find(e => e.dropId === dropId && (e.uid === user.uid || (user.email && e.identityKey?.length > 0)))
      || (userDropState?.dropId === dropId ? userDropState.entry : null);
    if (entry && (entry.status === 'entered' || entry.status === 'flagged' || entry.status === 'selected')) {
      return {
        type: 'entered' as const,
        entry,
        label: 'Preferences Saved',
      };
    }

    return {
      type: 'none' as const,
      label: null,
    };
  };

  const isDropBooked = (dropId: string): boolean => {
    const status = getUserDropStatus(dropId);
    return status.type !== 'none';
  };

  // 2. Arrange sequence: open, upcoming (scheduled), completed (includes drawn)
  const getStatusPriority = (status: DropStatus): number => {
    if (status === 'open') return 1;
    if (status === 'scheduled') return 2;
    if (status === 'completed' || status === 'drawn') return 3;
    return 4;
  };

  const filteredDrops = drops.filter(drop => {
    // Exclude closed or draft events from attendee catalog
    if (drop.status === 'closed' || drop.status === 'draft') return false;

    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'open'
        ? drop.status === 'open'
        : filter === 'upcoming'
        ? drop.status === 'scheduled'
        : drop.status === 'completed' || drop.status === 'drawn';
    const matchesSearch =
      drop.name.toLowerCase().includes(search.toLowerCase()) ||
      drop.venue.toLowerCase().includes(search.toLowerCase()) ||
      drop.artistOrHost.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Sort by status priority (open -> upcoming -> completed), then newest timestamp
  const rawSorted = [...filteredDrops].sort((a, b) => {
    const priorityA = getStatusPriority(a.status);
    const priorityB = getStatusPriority(b.status);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return getDropTime(b) - getDropTime(a);
  });

  // Strict deduplication: guarantee no two events share the same name in the catalog
  // (prioritizes active/open events and newest runs)
  const seenEventNames = new Set<string>();
  const sortedDrops = rawSorted.filter(d => {
    const norm = d.name.trim().toLowerCase();
    if (seenEventNames.has(norm)) return false;
    seenEventNames.add(norm);
    return true;
  });

  return (
    <div className="space-y-16 pb-20">
      
      {/* Hero Section: Minimal, Clean, Centered with Generous Whitespace */}
      <section className="relative py-20 sm:py-28 lg:py-32 flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-brand-yellow/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto space-y-8 px-4 flex flex-col items-center">
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-stamp font-black text-white tracking-tight uppercase leading-[1.08]">
            No bots. No speed war.<br />
            <span className="text-brand-yellow">Uniform random draw.</span>
          </h1>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-slate-300 font-sans leading-relaxed">
            Fair, verifiable ticket allocation with zero speed bias and cryptographically proven random draws.
          </p>

          {/* 2 Clean CTA Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to={`/drops/${featuredDrop.id}`}>
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                {isDropBooked(featuredDrop.id) ? 'View Drop' : 'Enter Drop'}
              </Button>
            </Link>
            <Link to={`/proof/${featuredDrop.id}`}>
              <Button size="lg" variant="outline" leftIcon={<Lock className="w-4 h-4 text-brand-yellow" />}>
                Verify Proof
              </Button>
            </Link>
          </div>

          {/* Thin, single-line row of 3 short labels */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6 text-xs font-mono text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />
              <span>Zero Speed Bias</span>
            </span>
            <span className="text-white/20 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>1 Identity = 1 Entry</span>
            </span>
            <span className="text-white/20 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Commit-Reveal Shuffle</span>
            </span>
          </div>

        </div>
      </section>

      {/* Featured Live Event Ticket Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-brand-yellow animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-stamp font-extrabold text-white tracking-tight uppercase">
              Featured Live Allocation Drop
            </h2>
          </div>
          <Badge
            variant={
              featuredDrop.status === 'open'
                ? 'yellow'
                : featuredDrop.status === 'drawn' || featuredDrop.status === 'completed'
                ? 'emerald'
                : 'slate'
            }
            dot={featuredDrop.status === 'open'}
          >
            {featuredDrop.status === 'drawn' ? 'COMPLETED' : featuredDrop.status.toUpperCase()}
          </Badge>
        </div>

        <Card variant="ticket" className="p-0 overflow-hidden border border-white/20 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Image & Badge */}
            <div className="lg:col-span-5 relative h-64 lg:h-auto min-h-[280px]">
              <img
                src={featuredDrop.heroImage}
                alt={featuredDrop.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12141c] via-black/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#12141c]" />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="font-stamp text-xs px-3 py-1 bg-brand-yellow text-black font-black uppercase tracking-wider rounded">
                  {featuredDrop.mode === 'FAIR_DROP' ? 'FAIR DROP · VERIFIABLE' : 'FCFS BASELINE'}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 bg-black/80 backdrop-blur text-white border border-white/20 rounded">
                  CAPACITY: {featuredDrop.seatCount} SEATS
                </span>
                {getUserDropStatus(featuredDrop.id).type === 'paid' && (
                  <span className="font-mono text-[10px] px-2.5 py-1 bg-emerald-500 text-black font-extrabold uppercase tracking-wider rounded flex items-center gap-1 shadow-glow-emerald">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    TICKET CONFIRMED
                  </span>
                )}
                {getUserDropStatus(featuredDrop.id).type === 'entered' && (
                  <span className="font-mono text-[10px] px-2.5 py-1 bg-cyan-400 text-black font-extrabold uppercase tracking-wider rounded flex items-center gap-1 shadow-glow-cyan">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    REGISTERED IN DRAW
                  </span>
                )}
                {getUserDropStatus(featuredDrop.id).type === 'offered' && (
                  <span className="font-mono text-[10px] px-2.5 py-1 bg-brand-yellow text-black font-extrabold uppercase tracking-wider rounded flex items-center gap-1 animate-pulse shadow-glow-yellow">
                    ⚡ SEAT OFFERED (5M HOLD)
                  </span>
                )}
              </div>
            </div>

            {/* Right Details & Live Countdown */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                  <span>{featuredDrop.artistOrHost}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3 h-3 text-brand-yellow" />
                    {featuredDrop.venue}, {featuredDrop.city}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                  {featuredDrop.name}
                </h3>

                <p className="text-sm text-slate-300 mt-2 leading-relaxed line-clamp-2">
                  {featuredDrop.description}
                </p>

                {/* Seed Commitment Hash Display */}
                <div className="mt-4 p-3 rounded-lg bg-surface-200 border border-white/10 font-mono text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
                    <span className="text-slate-400 shrink-0">Committed Seed SHA-256:</span>
                    <span className="text-brand-yellow truncate">{featuredDrop.seedCommitHash}</span>
                  </div>
                  <Link
                    to={`/proof/${featuredDrop.id}`}
                    className="text-slate-400 hover:text-white shrink-0 underline text-[11px]"
                  >
                    View
                  </Link>
                </div>
              </div>

              {/* Dynamic Action Bar based on user registration/purchase status */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                {(() => {
                  const status = getUserDropStatus(featuredDrop.id);
                  if (status.type === 'paid') {
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold shrink-0 shadow-md">
                            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block truncate">
                              Booking Confirmed & Guaranteed
                            </span>
                            <span className="text-sm sm:text-base font-bold text-white font-mono truncate block">
                              Seat {status.seatLabel} • {status.tierName}
                            </span>
                          </div>
                        </div>

                        <Link to={`/drops/${featuredDrop.id}`} className="shrink-0">
                          <Button size="lg" variant="primary" className="font-bold text-sm bg-brand-yellow text-black hover:bg-brand-yellow/90 shadow-glow-yellow/20 flex items-center gap-2 whitespace-nowrap shrink-0">
                            <Ticket className="w-4 h-4" />
                            View Ticket & QR Pass →
                          </Button>
                        </Link>
                      </div>
                    );
                  }

                  if (status.type === 'entered') {
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-cyan-500/15 border-2 border-cyan-500/40 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-cyan-400 text-black flex items-center justify-center font-bold shrink-0 shadow-md">
                            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold block truncate">
                              Preferences Recorded · Entered in Draw
                            </span>
                            <span className="text-xs sm:text-sm text-slate-200 font-mono truncate block">
                              {status.entry?.preferences?.length ? `${status.entry.preferences.length} Tier Preferences Active` : 'Preferences Active'} • In Uniform Random Draw
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right hidden sm:block shrink-0">
                            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                              Draw Starts In
                            </span>
                            <Countdown targetDate={featuredDrop.drawTime || featuredDrop.windowEnd} size="sm" />
                          </div>
                          <Link to={`/drops/${featuredDrop.id}`} className="shrink-0">
                            <Button size="lg" variant="outline" className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap shrink-0">
                              View Entry / Edit →
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  if (status.type === 'offered') {
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-brand-yellow/15 border-2 border-brand-yellow/50 min-w-0 flex-1">
                          <span className="w-3 h-3 rounded-full bg-brand-yellow animate-ping shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-brand-yellow font-bold block truncate">
                              Seat Hold Active!
                            </span>
                            <span className="text-xs sm:text-sm text-white font-mono truncate block">
                              You have been allocated a seat. Complete payment before hold expires.
                            </span>
                          </div>
                        </div>
                        <Link to={`/drops/${featuredDrop.id}`} className="shrink-0">
                          <Button size="lg" variant="primary" className="bg-brand-yellow text-black font-bold animate-pulse whitespace-nowrap shrink-0">
                            Claim & Pay Now →
                          </Button>
                        </Link>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div>
                        <span className="text-xs uppercase font-mono text-slate-400 block mb-1">
                          Entry Window Closes In
                        </span>
                        <Countdown targetDate={featuredDrop.windowEnd} size="md" />
                      </div>

                      <div className="flex items-center gap-3">
                        <Link to={`/drops/${featuredDrop.id}`}>
                          <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                            Enter Drop
                          </Button>
                        </Link>
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>

          </div>
        </Card>
      </section>

      {/* Drops Catalog with Search & Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-stamp font-extrabold text-white tracking-tight uppercase">
              Browse Drops & Allocation Events
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Live drops, scheduled windows, and experimental controls
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter pills: all, open, upcoming, completed */}
            <div className="flex bg-surface-100 p-1 rounded-lg border border-white/10 text-xs">
              {(['all', 'open', 'upcoming', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                    filter === f ? 'bg-brand-yellow text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All Events' : f === 'upcoming' ? 'Upcoming' : f}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events, venues..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-surface-100 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Drops Grid arranged in sequence: open, drawn, completed, closed */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDrops.map(drop => {
            const cardStatus = getUserDropStatus(drop.id);
            return (
              <Card
                key={drop.id}
                variant="glass"
                className="flex flex-col justify-between hover:border-brand-yellow/40 transition-all group"
              >
                <div>
                  <div className="relative h-48 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-4 overflow-hidden">
                    <img
                      src={drop.heroImage}
                      alt={drop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          drop.status === 'open'
                            ? 'yellow'
                            : drop.status === 'drawn' || drop.status === 'completed'
                            ? 'emerald'
                            : drop.status === 'scheduled'
                            ? 'cyan'
                            : 'slate'
                        }
                        dot={drop.status === 'open'}
                        className="shadow-lg font-mono text-[10px] font-bold"
                      >
                        {drop.status === 'drawn' ? 'COMPLETED' : drop.status.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-black/90 backdrop-blur-md text-white border border-white/20 shadow-md">
                        {drop.mode === 'FAIR_DROP' ? 'Fair Drop' : 'FCFS Baseline'}
                      </span>
                      {cardStatus.type === 'paid' && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500 text-black font-extrabold uppercase tracking-wider shadow-md">
                          ✓ Ticket Confirmed
                        </span>
                      )}
                      {cardStatus.type === 'entered' && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-400 text-black font-extrabold uppercase tracking-wider shadow-md">
                          ✓ Registered
                        </span>
                      )}
                      {cardStatus.type === 'offered' && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-brand-yellow text-black font-extrabold uppercase tracking-wider shadow-md animate-pulse">
                          ⚡ Hold Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-yellow" />
                    <span>{new Date(drop.windowStart).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{drop.venue}</span>
                  </div>

                  <CardTitle className="text-lg leading-snug group-hover:text-brand-yellow transition-colors">
                    {drop.name}
                  </CardTitle>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {drop.description}
                  </p>
                </div>

                {/* Card Footer: Price Removed, Dynamic Button */}
                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-mono">
                      Seats: {drop.seatCount}
                    </span>
                    {cardStatus.type === 'paid' ? (
                      <span className="text-[11px] font-mono text-emerald-400 font-bold block mt-0.5">
                        ✓ Seat: {cardStatus.seatLabel}
                      </span>
                    ) : cardStatus.type === 'entered' ? (
                      <span className="text-[11px] font-mono text-cyan-300 font-semibold block mt-0.5">
                        ✓ In Draw Pool
                      </span>
                    ) : cardStatus.type === 'offered' ? (
                      <span className="text-[11px] font-mono text-brand-yellow font-bold block mt-0.5">
                        ⚡ Offer Ready to Pay
                      </span>
                    ) : (drop.status === 'completed' || drop.status === 'drawn') ? (
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold block mt-0.5">
                        ✓ Registration Done
                      </span>
                    ) : null}
                  </div>

                  <Link to={drop.status === 'drawn' || drop.status === 'completed' ? `/drops/${drop.id}/result` : `/drops/${drop.id}`}>
                    <Button
                      size="sm"
                      variant={
                        cardStatus.type === 'paid' || cardStatus.type === 'offered'
                          ? 'primary'
                          : cardStatus.type === 'entered'
                          ? 'outline'
                          : drop.status === 'open'
                          ? 'primary'
                          : 'outline'
                      }
                      className={cardStatus.type === 'entered' ? 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10' : ''}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      {cardStatus.type === 'paid'
                        ? 'View Ticket'
                        : cardStatus.type === 'offered'
                        ? 'Claim Seat'
                        : cardStatus.type === 'entered'
                        ? 'View Entry'
                        : drop.status === 'open'
                        ? 'Enter Drop'
                        : drop.status === 'drawn' || drop.status === 'completed'
                        ? 'View Results'
                        : 'View Drop'}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

    </div>
  );
};

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
