import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DropMode } from '@shared/types';
import { DEFAULT_DEFENCE_CONFIG } from '@shared/constants';
import {
  Calendar,
  Sliders,
  ShieldCheck,
  Cpu,
  Clock,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';

export const CreateDropPage: React.FC = () => {
  const navigate = useNavigate();
  const { createDrop, addToast } = useApp();

  const [name, setName] = useState('Radiohead: In Rainbows 20th Anniversary Live');
  const [artistOrHost] = useState('Radiohead Live Productions');
  const [venue, setVenue] = useState('The Roundhouse, London');
  const [seatCount, setSeatCount] = useState(500);
  const [price, setPrice] = useState(95);
  const [mode, setMode] = useState<DropMode>('FAIR_DROP');
  const [holdDurationSec, setHoldDurationSec] = useState(300);
  const [powDifficulty, setPowDifficulty] = useState(4);
  const [turnstileEnabled, setTurnstileEnabled] = useState(true);
  const [powEnabled, setPowEnabled] = useState(true);
  const [rateLimitPerIp, setRateLimitPerIp] = useState(15);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);

    try {
      const newDrop = await createDrop({
        name,
        artistOrHost,
        venue,
        seatCount,
        price,
        mode,
        holdDurationSec,
        windowStart: new Date().toISOString(),
        windowEnd: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
        drawTime: new Date(Date.now() + 1000 * 60 * 17).toISOString(),
        defenceConfig: {
          ...DEFAULT_DEFENCE_CONFIG,
          powDifficulty,
          turnstileEnabled,
          powEnabled,
          rateLimitPerIp,
        },
      });

      setIsPublishing(false);
      navigate(`/drops/${newDrop.id}`);
    } catch (err: any) {
      setIsPublishing(false);
      addToast('error', 'Drop Creation Failed', err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 pb-20">
      
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link to="/admin" className="hover:text-brand-yellow">← Admin Operations</Link>
            <span>/</span>
            <span>B2. Event Configuration</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Create Allocation Drop
          </h1>
        </div>

        <Badge variant={mode === 'FAIR_DROP' ? 'yellow' : 'cyan'}>
          {mode === 'FAIR_DROP' ? 'FAIR DROP · UNIFORM' : 'FCFS BASELINE CONTROL'}
        </Badge>
      </div>

      <form onSubmit={handlePublish} className="space-y-8">
        
        {/* Core Drop Details */}
        <Card variant="glass" className="space-y-6">
          <CardTitle className="text-lg">Event & Inventory Information</CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono text-slate-300 block">Event Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-sans focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300 block">Venue & City</label>
              <input
                type="text"
                required
                value={venue}
                onChange={e => setVenue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-sans focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300 block">Seat Count (Default 500)</label>
              <input
                type="number"
                required
                value={seatCount}
                onChange={e => setSeatCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300 block">Seat Price ($ USD)</label>
              <input
                type="number"
                required
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300 block">Hold Duration (Seconds)</label>
              <input
                type="number"
                required
                value={holdDurationSec}
                onChange={e => setHoldDurationSec(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>
        </Card>

        {/* Allocation Mode Selector: Critical Section 1 requirement */}
        <Card variant="default" className="border-brand-yellow/30 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Allocation Mode Selection</CardTitle>
            <span className="text-[11px] font-mono text-slate-400">Section 1 Constraint</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>FCFS exists ONLY as the experimental control group</strong> to demonstrate adversarial speed dominance.
            Fair Drop is the core product that uses commit-reveal uniform randomness.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setMode('FAIR_DROP')}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === 'FAIR_DROP'
                  ? 'bg-brand-yellow/15 border-brand-yellow shadow-glow-yellow/20'
                  : 'bg-surface-200 border-white/10 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-white text-base">FAIR DROP (Product)</span>
                <Badge variant="yellow" size="sm">Uniform Random</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Entry window + deterministic Fisher-Yates draw. Eliminates arrival speed and request volume advantage.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('FCFS')}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === 'FCFS'
                  ? 'bg-cyan-500/15 border-cyan-400 shadow-glow-cyan/20'
                  : 'bg-surface-200 border-white/10 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-white text-base">FCFS BASELINE (Control)</span>
                <Badge variant="cyan" size="sm">First-Come Order</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Orders strictly by arrival timestamp. Used to measure bot speed sniper dominance in the lab.
              </p>
            </button>
          </div>
        </Card>

        {/* Abuse Defence Controls */}
        <Card variant="glass" className="space-y-6">
          <CardTitle className="text-lg">Abuse Defence & Rate Limiting Controls</CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-surface-200 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Client Proof-of-Work (PoW)</span>
                <input
                  type="checkbox"
                  checked={powEnabled}
                  onChange={e => setPowEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-yellow"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Requires client browsers to calculate SHA-256 leading zeros.
              </p>
              {powEnabled && (
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Difficulty:</span>
                    <span className="text-brand-yellow font-bold">{powDifficulty} leading zeros</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={6}
                    value={powDifficulty}
                    onChange={e => setPowDifficulty(Number(e.target.value))}
                    className="w-full accent-brand-yellow"
                  />
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-200 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Cloudflare Turnstile</span>
                <input
                  type="checkbox"
                  checked={turnstileEnabled}
                  onChange={e => setTurnstileEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-yellow"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Managed challenge for browser verification (uses free Turnstile test keys).
              </p>
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Max IP Rate Limit:</span>
                  <span className="text-brand-yellow font-bold">{rateLimitPerIp} req/sec</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={rateLimitPerIp}
                  onChange={e => setRateLimitPerIp(Number(e.target.value))}
                  className="w-full accent-brand-yellow"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Buttons */}
        <div className="flex gap-4 justify-end">
          <Link to="/admin">
            <Button type="button" size="lg" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={isPublishing}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Publish Drop & Commit Seed
          </Button>
        </div>

      </form>
    </div>
  );
};
