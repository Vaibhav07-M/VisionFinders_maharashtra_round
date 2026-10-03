import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Countdown } from '@/components/ui/Countdown';
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
  const { drops } = useApp();
  const [filter, setFilter] = useState<'all' | 'open' | 'scheduled' | 'completed'>('all');
  const [search, setSearch] = useState('');

  if (drops.length === 0) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading active drop catalog from Firestore...</p>
      </div>
    );
  }

  const filteredDrops = drops.filter(drop => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'open'
        ? drop.status === 'open'
        : filter === 'scheduled'
        ? drop.status === 'scheduled'
        : drop.status === 'completed' || drop.status === 'drawn';
    const matchesSearch =
      drop.name.toLowerCase().includes(search.toLowerCase()) ||
      drop.venue.toLowerCase().includes(search.toLowerCase()) ||
      drop.artistOrHost.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const featuredDrop = drops.find(d => d.id === 'drop-jack-white-vault') || drops[0];

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
                Join Live Drop Now
              </Button>
            </Link>
            <Link to="/proof/drop-jack-white-vault">
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
          <Badge variant="yellow" dot>
            {featuredDrop.status.toUpperCase()}
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

              {/* Countdown & Action Bar */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase font-mono text-slate-400 block mb-1">
                    Entry Window Closes In
                  </span>
                  <Countdown targetDate={featuredDrop.windowEnd} size="md" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Seat Price</span>
                    <span className="text-xl font-bold font-mono text-white">${featuredDrop.price}</span>
                  </div>
                  <Link to={`/drops/${featuredDrop.id}`}>
                    <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Enter Drop
                    </Button>
                  </Link>
                </div>
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
            {/* Filter pills */}
            <div className="flex bg-surface-100 p-1 rounded-lg border border-white/10 text-xs">
              {(['all', 'open', 'scheduled', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                    filter === f ? 'bg-brand-yellow text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All Events' : f}
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

        {/* Drops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrops.map(drop => (
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
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge
                      variant={
                        drop.status === 'open'
                          ? 'yellow'
                          : drop.status === 'scheduled'
                          ? 'cyan'
                          : 'slate'
                      }
                      dot={drop.status === 'open'}
                    >
                      {drop.status.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-white border border-white/20">
                      {drop.mode === 'FAIR_DROP' ? 'Fair Drop' : 'FCFS Baseline'}
                    </span>
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

              <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Seats: {drop.seatCount}
                  </span>
                  <span className="text-base font-bold font-mono text-white">
                    ${drop.price} {drop.currency}
                  </span>
                </div>

                <Link to={`/drops/${drop.id}`}>
                  <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View Drop
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
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
