import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DropMode, TicketTier } from '@shared/types';
import { DEFAULT_DEFENCE_CONFIG, DEFAULT_TIERS } from '@shared/constants';
import {
  Calendar,
  Layers,
  ShieldCheck,
  Cpu,
  Clock,
  ArrowLeft,
  DollarSign,
  Sparkles,
  Ticket,
  CheckCircle2,
  Sliders,
  Users,
  Building,
  Image,
} from 'lucide-react';

interface TierPreset {
  name: string;
  description: string;
  currency: string;
  basePrice: number;
  tiers: { id: string; price: number; seatCount: number }[];
}

const TIER_PRESETS: TierPreset[] = [
  {
    name: 'Arena / Concert',
    description: 'Premier stadium concert with wide tier spread (₹800 - ₹5,000)',
    currency: 'Rs',
    basePrice: 2500,
    tiers: [
      { id: 'vip', price: 5000, seatCount: 20 },
      { id: 'platinum', price: 3500, seatCount: 60 },
      { id: 'gold', price: 2500, seatCount: 100 },
      { id: 'silver', price: 1500, seatCount: 150 },
      { id: 'bronze', price: 800, seatCount: 170 },
    ],
  },
  {
    name: 'Intimate Club',
    description: 'Mid-scale club session (₹500 - ₹2,500)',
    currency: 'Rs',
    basePrice: 1200,
    tiers: [
      { id: 'vip', price: 2500, seatCount: 20 },
      { id: 'platinum', price: 1800, seatCount: 60 },
      { id: 'gold', price: 1200, seatCount: 100 },
      { id: 'silver', price: 800, seatCount: 150 },
      { id: 'bronze', price: 500, seatCount: 170 },
    ],
  },
  {
    name: 'Festival Pass',
    description: 'Multi-day headline festival passes (₹1,500 - ₹8,000)',
    currency: 'Rs',
    basePrice: 4000,
    tiers: [
      { id: 'vip', price: 8000, seatCount: 20 },
      { id: 'platinum', price: 5500, seatCount: 60 },
      { id: 'gold', price: 4000, seatCount: 100 },
      { id: 'silver', price: 2500, seatCount: 150 },
      { id: 'bronze', price: 1500, seatCount: 170 },
    ],
  },
  {
    name: 'USD Scale ($80 - $500)',
    description: 'Standard North American tour pricing ($80 - $500 USD)',
    currency: 'USD',
    basePrice: 150,
    tiers: [
      { id: 'vip', price: 500, seatCount: 20 },
      { id: 'platinum', price: 350, seatCount: 60 },
      { id: 'gold', price: 250, seatCount: 100 },
      { id: 'silver', price: 150, seatCount: 150 },
      { id: 'bronze', price: 80, seatCount: 170 },
    ],
  },
];

export const CreateDropPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { drops, createDrop, updateDrop, addToast } = useApp();

  const isEdit = Boolean(id);
  const existingDrop = isEdit ? drops.find(d => d.id === id) : null;

  // Form state
  const [name, setName] = useState('Radiohead: In Rainbows 20th Anniversary Live');
  const [artistOrHost, setArtistOrHost] = useState('Radiohead Live Productions');
  const [venue, setVenue] = useState('The Roundhouse');
  const [city, setCity] = useState('London, UK');
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80');
  const [currency, setCurrency] = useState<'Rs' | 'USD'>('Rs');
  const [price, setPrice] = useState(2500);
  const [mode, setMode] = useState<DropMode>('FAIR_DROP');
  const [holdDurationSec, setHoldDurationSec] = useState(300);
  const [windowStart, setWindowStart] = useState(() => new Date().toISOString().substring(0, 16));
  const [windowEnd, setWindowEnd] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString().substring(0, 16));

  // Ticket Tiers State (5 standard tiers: VIP, Platinum, Gold, Silver, Bronze)
  const [tiers, setTiers] = useState<TicketTier[]>(() => {
    return DEFAULT_TIERS.map(t => ({ ...t }));
  });

  // Defense rules
  const [powDifficulty, setPowDifficulty] = useState(3);
  const [turnstileEnabled, setTurnstileEnabled] = useState(true);
  const [powEnabled, setPowEnabled] = useState(true);
  const [honeypotEnabled, setHoneypotEnabled] = useState(true);
  const [rateLimitPerIp, setRateLimitPerIp] = useState(20);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // If editing, load existing drop values
  useEffect(() => {
    if (existingDrop) {
      setName(existingDrop.name);
      setArtistOrHost(existingDrop.artistOrHost);
      setVenue(existingDrop.venue);
      setCity(existingDrop.city);
      setHeroImage(existingDrop.heroImage || heroImage);
      setCurrency((existingDrop.currency as any) || 'Rs');
      setPrice(existingDrop.price || 2500);
      setMode(existingDrop.mode);
      setHoldDurationSec(existingDrop.holdDurationSec || 300);
      if (existingDrop.tiers && existingDrop.tiers.length > 0) {
        setTiers(existingDrop.tiers.map(t => ({ ...t })));
      }
      if (existingDrop.windowStart) {
        setWindowStart(new Date(existingDrop.windowStart).toISOString().substring(0, 16));
      }
      if (existingDrop.windowEnd) {
        setWindowEnd(new Date(existingDrop.windowEnd).toISOString().substring(0, 16));
      }
      if (existingDrop.defenceConfig) {
        setPowDifficulty(existingDrop.defenceConfig.powDifficulty ?? 3);
        setTurnstileEnabled(existingDrop.defenceConfig.turnstileEnabled ?? true);
        setPowEnabled(existingDrop.defenceConfig.powEnabled ?? true);
        setHoneypotEnabled(existingDrop.defenceConfig.honeypotEnabled ?? true);
        setRateLimitPerIp(existingDrop.defenceConfig.rateLimitPerIp ?? 20);
      }
    }
  }, [existingDrop]);

  // Handle tier field updates
  const handleTierUpdate = (tierId: string, field: 'price' | 'seatCount', value: number) => {
    setTiers(prev =>
      prev.map(t => {
        if (t.id === tierId) {
          const updated = { ...t, [field]: Math.max(0, value) };
          return updated;
        }
        return t;
      })
    );
  };

  // Apply a pricing preset
  const applyPreset = (preset: TierPreset) => {
    setCurrency(preset.currency as any);
    setPrice(preset.basePrice);
    setTiers(prev =>
      prev.map(t => {
        const found = preset.tiers.find(pt => pt.id === t.id);
        if (found) {
          return { ...t, price: found.price, seatCount: found.seatCount };
        }
        return t;
      })
    );
    addToast('info', 'Preset Applied', `Configured "${preset.name}" pricing tiers.`);
  };

  // Calculations
  const totalSeats = tiers.reduce((acc, t) => acc + (Number(t.seatCount) || 0), 0);
  const minTierPrice = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : price;
  const maxTierPrice = tiers.length > 0 ? Math.max(...tiers.map(t => t.price)) : price;
  const grossPotential = tiers.reduce((acc, t) => acc + (Number(t.price) || 0) * (Number(t.seatCount) || 0), 0);
  const currencySymbol = currency === 'Rs' ? '₹' : '$';

  const handleSubmit = async (publishImmediately: boolean) => {
    if (!name.trim()) {
      addToast('error', 'Validation Error', 'Event title is required.');
      return;
    }
    const startMs = new Date(windowStart).getTime();
    const endMs = new Date(windowEnd).getTime();
    if (endMs <= startMs) {
      addToast('error', 'Validation Error', 'Window end time must be after start time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dropPayload: Partial<any> = {
        name,
        artistOrHost: artistOrHost || 'Featured Host',
        venue: venue || 'The Grand Hall',
        city: city || 'Nashville, TN',
        heroImage,
        seatCount: totalSeats || 500,
        price: Number(price) || minTierPrice || 85,
        currency,
        mode,
        status: publishImmediately ? 'open' : 'draft',
        holdDurationSec: Number(holdDurationSec) || 300,
        windowStart: new Date(windowStart).toISOString(),
        windowEnd: new Date(windowEnd).toISOString(),
        drawTime: new Date(endMs + 1000 * 60 * 5).toISOString(),
        tiers,
        defenceConfig: {
          ...DEFAULT_DEFENCE_CONFIG,
          turnstileEnabled,
          powEnabled,
          powDifficulty,
          honeypotEnabled,
          rateLimitPerIp,
        },
      };

      if (isEdit && id) {
        await updateDrop(id, dropPayload);
        addToast('success', 'Drop Updated', `"${name}" configuration saved.`);
      } else {
        await createDrop(dropPayload);
        addToast('success', 'Drop Created', `Event "${name}" published with ${totalSeats} seats across 5 tiers.`);
      }

      navigate('/admin/drops');
    } catch (err: any) {
      addToast('error', 'Submission Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    vip: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
    platinum: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    gold: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    silver: { bg: 'bg-slate-400/15', text: 'text-slate-300', border: 'border-slate-400/30' },
    bronze: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  };

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <Link to="/admin/drops" className="hover:text-brand-yellow flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Drops
            </Link>
            <span>/</span>
            <span className="text-white">{isEdit ? 'Edit Drop' : 'Create Drop'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-stamp font-black text-white uppercase tracking-tight">
            {isEdit ? `Edit Event: ${name}` : 'Create Allocation Drop'}
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Configure event details, ticket tier pricing, allocation lottery mechanism, and anti-bot rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={mode === 'FAIR_DROP' ? 'yellow' : 'cyan'} size="md">
            {mode === 'FAIR_DROP' ? 'FAIR DROP · UNIFORM RANDOM' : 'FCFS BASELINE CONTROL'}
          </Badge>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* ==================================================================== */}
        {/* SECTION 1: TICKET PRICING & TIER CONFIGURATION (PRIMARY USER FOCUS) */}
        {/* ==================================================================== */}
        <section className="p-6 rounded-2xl bg-[#0f111a] border border-brand-yellow/30 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-yellow/15 border border-brand-yellow/30 text-brand-yellow">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  Ticket Pricing & Tier Inventory
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live System
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  Set prices and seat capacities for all 5 tiers. The reservation system offers seats to attendees based on their ranked preferences.
                </p>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-2 bg-surface-100 p-1.5 rounded-xl border border-white/10">
              <span className="text-xs font-mono text-slate-400 px-2 uppercase">Currency:</span>
              <button
                type="button"
                onClick={() => setCurrency('Rs')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  currency === 'Rs'
                    ? 'bg-brand-yellow text-black shadow-glow-yellow/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  currency === 'USD'
                    ? 'bg-brand-yellow text-black shadow-glow-yellow/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>

          {/* Pricing Presets Quick-Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
                Quick Pricing Presets:
              </span>
              <span className="text-[11px] text-slate-500 font-sans">Click to instantly populate all tier prices</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TIER_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="p-3 rounded-xl bg-surface-100 hover:bg-surface-200 border border-white/10 hover:border-brand-yellow/50 text-left transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-brand-yellow mb-1">
                    <span>{preset.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{preset.currency === 'Rs' ? '₹' : '$'}{preset.basePrice} base</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Base / General Admission Price Field */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-100 border border-white/10">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-bold uppercase block">
                Base Event Price ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-sm">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  required
                  value={price}
                  onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="2500"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#090b12] border border-white/15 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-brand-yellow"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Default baseline ticket price displayed on cards and entry receipts.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-bold uppercase block">
                Total Seat Inventory
              </label>
              <div className="relative">
                <input
                  type="number"
                  readOnly
                  value={totalSeats}
                  className="w-full px-4 py-2.5 text-sm bg-[#090b12]/60 border border-white/10 rounded-xl text-emerald-400 font-mono font-bold cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Automatically calculated as the sum of all 5 tier capacities below ({totalSeats} seats total).
              </p>
            </div>
          </div>

          {/* 5-Tier Interactive Ticket Price Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center justify-between">
              <span>Configure 5 Ticket Tiers</span>
              <span className="text-slate-500 font-normal">Ranked Best to Cheapest</span>
            </h3>

            <div className="space-y-3">
              {tiers.map((tier, idx) => {
                const colors = tierColors[tier.id] || tierColors.bronze;
                const tierSubtotal = (Number(tier.price) || 0) * (Number(tier.seatCount) || 0);

                return (
                  <div
                    key={tier.id}
                    className="p-4 rounded-xl bg-surface-100 border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Tier Identity */}
                    <div className="flex items-center gap-3.5 min-w-[200px]">
                      <span className="font-mono text-xs text-slate-500 font-bold">#{idx + 1}</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {tier.name}
                      </span>
                      <div className="text-[11px] text-slate-400 hidden sm:block">
                        Prefix: <span className="font-mono text-slate-300">{tier.id.toUpperCase()}-1</span>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 flex-1 justify-end">
                      {/* Seat Count Input */}
                      <div className="space-y-1 w-32">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block">
                          Seats Count
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="2000"
                          value={tier.seatCount}
                          onChange={e => handleTierUpdate(tier.id, 'seatCount', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 text-xs bg-[#090b12] border border-white/15 rounded-lg text-white font-mono focus:outline-none focus:border-brand-yellow"
                        />
                      </div>

                      {/* Ticket Price Input */}
                      <div className="space-y-1 w-36">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block font-bold text-brand-yellow">
                          Ticket Price ({currencySymbol}) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={tier.price}
                            onChange={e => handleTierUpdate(tier.id, 'price', parseInt(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1.5 text-xs bg-[#090b12] border border-brand-yellow/40 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-brand-yellow"
                          />
                        </div>
                      </div>

                      {/* Subtotal Potential */}
                      <div className="space-y-1 w-32 text-right hidden lg:block">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block">
                          Gross Capacity
                        </label>
                        <span className="font-mono text-xs text-slate-300 font-bold block pt-1">
                          {currencySymbol}{tierSubtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue & Capacity Summary Bar */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-brand-yellow/10 via-surface-100 to-emerald-500/10 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Capacity</span>
                <span className="text-base font-mono font-bold text-white">{totalSeats} Seats</span>
              </div>
              <div className="h-7 w-px bg-white/10" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Tier Price Range</span>
                <span className="text-base font-mono font-bold text-brand-yellow">
                  {currencySymbol}{minTierPrice.toLocaleString()} – {currencySymbol}{maxTierPrice.toLocaleString()}
                </span>
              </div>
              <div className="h-7 w-px bg-white/10 hidden sm:block" />
              <div className="hidden sm:block">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Max Gross Revenue</span>
                <span className="text-base font-mono font-bold text-emerald-400">
                  {currencySymbol}{grossPotential.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              5/5 Tiers Configured ✓
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SECTION 2: EVENT & VENUE METADATA */}
        {/* ==================================================================== */}
        <section className="p-6 rounded-2xl bg-[#0f111a] border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider">
                Event & Venue Information
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Basic event metadata visible to attendees on landing and detail pages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-mono text-slate-300 uppercase block font-semibold">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Jack White: The Twilight Echoes Vault Edition"
                className="w-full px-4 py-2.5 text-sm bg-surface-100 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase block font-semibold">
                Artist / Host *
              </label>
              <input
                type="text"
                required
                value={artistOrHost}
                onChange={e => setArtistOrHost(e.target.value)}
                placeholder="e.g. Third Man Records"
                className="w-full px-4 py-2.5 text-sm bg-surface-100 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase block font-semibold">
                Venue
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Blue Room Theatre"
                className="w-full px-4 py-2.5 text-sm bg-surface-100 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase block font-semibold">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Nashville, TN"
                className="w-full px-4 py-2.5 text-sm bg-surface-100 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase block font-semibold">
                Hero Image URL
              </label>
              <input
                type="url"
                value={heroImage}
                onChange={e => setHeroImage(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-surface-100 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SECTION 3: ALLOCATION MECHANISM (FAIR DROP VS FCFS) */}
        {/* ==================================================================== */}
        <section className="p-6 rounded-2xl bg-[#0f111a] border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Allocation Mode
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Uniform Lottery vs Control</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <button
              type="button"
              onClick={() => setMode('FAIR_DROP')}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === 'FAIR_DROP'
                  ? 'bg-brand-yellow/15 border-brand-yellow shadow-glow-yellow/20'
                  : 'bg-surface-100 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-white text-sm">FAIR DROP (Lottery Product)</span>
                <Badge variant="yellow" size="sm">Uniform Random</Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Registration window + verifiable Fisher-Yates draw with committed SHA-256 seed. Bot speed and request volume yield zero advantage.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('FCFS')}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === 'FCFS'
                  ? 'bg-cyan-500/15 border-cyan-400 shadow-glow-cyan/20'
                  : 'bg-surface-100 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-white text-sm">FCFS CONTROL BENCHMARK</span>
                <Badge variant="cyan" size="sm">First-Come Order</Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Orders participants strictly by arrival timestamp. Used in the Adversarial Lab to measure bot speed sniper dominance against human queues.
              </p>
            </button>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SECTION 4: WINDOW TIMING & HOLD DURATION */}
        {/* ==================================================================== */}
        <section className="p-6 rounded-2xl bg-[#0f111a] border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider">
                Registration Window & Offer Policy
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Synchronized countdown window and seat payment offer hold time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase block font-semibold">
                Window Opens (Local)
              </label>
              <input
                type="datetime-local"
                required
                value={windowStart}
                onChange={e => setWindowStart(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-surface-100 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase block font-semibold">
                Window Closes / Draw Time
              </label>
              <input
                type="datetime-local"
                required
                value={windowEnd}
                onChange={e => setWindowEnd(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-surface-100 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase block font-semibold">
                Seat Offer Hold Duration (Seconds)
              </label>
              <input
                type="number"
                min="30"
                max="1800"
                value={holdDurationSec}
                onChange={e => setHoldDurationSec(parseInt(e.target.value) || 300)}
                className="w-full px-4 py-2.5 text-xs bg-surface-100 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
              <span className="text-[10px] text-slate-400 block">Default 300s (5-minute checkout countdown)</span>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SECTION 5: ABUSE DEFENSE & RATE LIMITING */}
        {/* ==================================================================== */}
        <section className="p-6 rounded-2xl bg-[#0f111a] border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider">
                Abuse Defence & Anti-Bot Guards
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Multi-layer verification applied during registration and join requests.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Client PoW</span>
                <input
                  type="checkbox"
                  checked={powEnabled}
                  onChange={e => setPowEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-yellow"
                />
              </div>
              <p className="text-[11px] text-slate-400">Calculates SHA-256 leading zeros in browser thread.</p>
              {powEnabled && (
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Difficulty:</span>
                    <span className="text-brand-yellow font-bold">{powDifficulty} leading zeros</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={6}
                    value={powDifficulty}
                    onChange={e => setPowDifficulty(parseInt(e.target.value))}
                    className="w-full accent-brand-yellow"
                  />
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Cloudflare Turnstile</span>
                <input
                  type="checkbox"
                  checked={turnstileEnabled}
                  onChange={e => setTurnstileEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-yellow"
                />
              </div>
              <p className="text-[11px] text-slate-400">Frictionless CAPTCHA alternative verifying human browser interaction.</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Honeypot Traps</span>
                <input
                  type="checkbox"
                  checked={honeypotEnabled}
                  onChange={e => setHoneypotEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-yellow"
                />
              </div>
              <p className="text-[11px] text-slate-400">Hidden DOM fields that auto-flag headless scraping scripts.</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Rate Limit per IP</span>
                <span className="font-mono text-xs text-brand-yellow font-bold">{rateLimitPerIp} req/s</span>
              </div>
              <p className="text-[11px] text-slate-400">Sliding window request throttling enforced in memory.</p>
              <input
                type="range"
                min={5}
                max={50}
                value={rateLimitPerIp}
                onChange={e => setRateLimitPerIp(parseInt(e.target.value))}
                className="w-full accent-brand-yellow pt-1"
              />
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
          <Button
            type="button"
            size="md"
            variant="outline"
            onClick={() => navigate('/admin/drops')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="md"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            Save as Draft
          </Button>

          <Button
            type="button"
            size="md"
            variant="primary"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Publishing Event...' : isEdit ? 'Save Changes' : 'Publish Drop (Open)'}
          </Button>
        </div>
      </div>
    </div>
  );
};
