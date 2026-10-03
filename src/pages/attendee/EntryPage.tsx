import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Countdown } from '@/components/ui/Countdown';
import { solvePoW } from '@/utils/crypto';
import {
  Cpu,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Flame,
  Terminal,
} from 'lucide-react';

export const EntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { drops, getDrop, user, getUserEntry, submitEntry, addToast } = useApp();

  const drop = getDrop(id || 'drop-jack-white-vault') || drops[0];
  const existingEntry = getUserEntry(drop.id);

  // Form states
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `idemp_${Date.now().toString(36)}`);
  const [honeypotValue, setHoneypotValue] = useState(''); // hidden bot trap
  const [isSolvingPoW, setIsSolvingPoW] = useState(false);
  const [powStats, setPowStats] = useState<{ nonce: number; hash: string; iterations: number } | null>(null);
  const [entryReceipt, setEntryReceipt] = useState(existingEntry || null);
  const [duplicateTestCount, setDuplicateTestCount] = useState(0);

  // Simulated challenge simulation mode toggles for demonstration
  const [simulatedState, setSimulatedState] = useState<'normal' | 'rate_limited' | 'challenged' | 'blocked'>('normal');

  const handleEnterDrop = async () => {
    // Check honeypot
    if (honeypotValue.length > 0) {
      addToast('error', 'Bot Trap Triggered', 'Honeypot field was populated by automated scraper.');
      setSimulatedState('blocked');
      return;
    }

    if (simulatedState === 'rate_limited') {
      addToast('error', 'Rate Limited (HTTP 429)', 'Too many requests from your IP. Retry-After: 15s.');
      return;
    }
    if (simulatedState === 'blocked') {
      addToast('error', 'Entry Blocked', 'Risk score 94 exceeds block threshold (automated proxy cluster).');
      return;
    }

    try {
      setIsSolvingPoW(true);
      const challengeString = `${drop.id}:${user.uid}:${idempotencyKey}`;
      const proof = await solvePoW(challengeString, drop.defenceConfig.powDifficulty || 4);
      setPowStats(proof);
      setIsSolvingPoW(false);

      // Submit entry
      const { entry, isDuplicate } = await submitEntry(drop.id, idempotencyKey, proof);
      setEntryReceipt(entry);
      if (isDuplicate) {
        setDuplicateTestCount(prev => prev + 1);
      }
    } catch (err: any) {
      setIsSolvingPoW(false);
      addToast('error', 'Submission Failed', err.message || 'Error occurred');
    }
  };

  const copyReceipt = () => {
    if (entryReceipt) {
      navigator.clipboard.writeText(entryReceipt.receiptId);
      addToast('info', 'Receipt Copied', entryReceipt.receiptId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link to={`/drops/${drop.id}`} className="hover:text-brand-yellow">← Back to Drop</Link>
            <span>/</span>
            <span>Entry Registration</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            {drop.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Window Closes In</span>
            <Countdown targetDate={drop.windowEnd} size="sm" />
          </div>
          <Badge variant="yellow" dot>
            {drop.mode === 'FAIR_DROP' ? 'Fair Drop Draw' : 'FCFS Speed'}
          </Badge>
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Action Console */}
        <div className="lg:col-span-7 space-y-6">
          
          <Card variant="glass" className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-yellow" />
                <CardTitle className="text-lg">Registration Console</CardTitle>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Identity: <span className="text-white font-bold">{user.email}</span>
              </span>
            </div>

            {/* Hidden Honeypot Field (Bot Trap) */}
            <div className="hidden" aria-hidden="true">
              <label>Leave this field blank (Honeypot Trap)</label>
              <input
                type="text"
                tabIndex={-1}
                value={honeypotValue}
                onChange={e => setHoneypotValue(e.target.value)}
              />
            </div>

            {/* Entry Form or Receipt Display */}
            {entryReceipt ? (
              <div className="space-y-6 animate-in zoom-in-95 duration-200">
                
                {/* Official Entry Receipt Stamp */}
                <div className="p-6 rounded-2xl bg-[#0e1017] border-2 border-brand-yellow/50 relative overflow-hidden shadow-glow-yellow/20">
                  <div className="absolute top-3 right-3">
                    <Badge variant="yellow" dot>
                      {entryReceipt.status.toUpperCase()}
                    </Badge>
                  </div>

                  <span className="font-stamp text-xs text-brand-yellow tracking-widest block uppercase mb-1">
                    OFFICIAL DRAW RECEIPT
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-white tracking-wider">
                      {entryReceipt.receiptId}
                    </span>
                    <button
                      onClick={copyReceipt}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                      title="Copy Receipt"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 font-mono text-xs text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Server Timestamp</span>
                      <span>{new Date(entryReceipt.arrivedAt).toLocaleTimeString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Idempotency Key</span>
                      <span className="truncate block">{entryReceipt.idempotencyKey}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Risk Assessment</span>
                      <span className="text-emerald-400 font-bold">08/100 (Clean Fan)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Lottery Weight</span>
                      <span className="text-brand-yellow font-bold">1 Equal Ticket</span>
                    </div>
                  </div>
                </div>

                {/* Idempotency Demonstration Action */}
                <div className="p-4 rounded-xl bg-surface-200 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">Idempotency & Retry Guarantee</span>
                    <span className="font-mono text-brand-yellow">Retries Tested: {duplicateTestCount}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Test the official PS requirement: Pressing "Enter Drop" repeatedly returns the <strong>exact same receipt</strong> and server arrival timestamp.
                  </p>
                  <Button
                    size="md"
                    variant="outline"
                    className="w-full font-mono text-xs"
                    onClick={handleEnterDrop}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5 text-brand-yellow" />}
                  >
                    Click to Test Idempotent Retry (Returns Same Receipt)
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Link to={`/drops/${drop.id}/live`} className="flex-1">
                    <Button size="lg" variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Watch Live Telemetry & Draw
                    </Button>
                  </Link>
                  <Link to={`/proof/${drop.id}`} className="flex-1">
                    <Button size="lg" variant="secondary" className="w-full">
                      View Seed Proof
                    </Button>
                  </Link>
                </div>

              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Proof-of-Work Information */}
                <div className="p-4 rounded-xl bg-surface-200 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-cyan-400" /> Client Proof-of-Work Challenge
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Difficulty: {drop.defenceConfig.powDifficulty} zeros
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    When you submit, your browser computes a SHA-256 cryptographic proof to stop high-frequency API flooding.
                    It takes ~150ms for normal attendees, but raises computational cost for botnets by 10,000x.
                  </p>

                  {powStats && (
                    <div className="p-2.5 rounded bg-black/60 font-mono text-[11px] space-y-1 text-slate-300">
                      <div><span className="text-slate-500">Solved Nonce:</span> {powStats.nonce}</div>
                      <div><span className="text-slate-500">Hash:</span> <span className="text-brand-yellow">{powStats.hash}</span></div>
                    </div>
                  )}
                </div>

                {/* Simulated Attack / Edge Case Selector for Testing */}
                <div className="p-3.5 rounded-xl bg-surface-100 border border-white/10 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block">
                    Demo: Test Edge-Case Response Handling
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                    {(['normal', 'rate_limited', 'challenged', 'blocked'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSimulatedState(s)}
                        className={`p-1.5 rounded text-center transition-colors uppercase text-[10px] font-bold ${
                          simulatedState === s
                            ? 'bg-brand-yellow text-black'
                            : 'bg-surface-200 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {simulatedState === 'rate_limited' && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                      State active: Server returns HTTP 429 "Too Many Requests". Retry-After: 15 seconds.
                    </div>
                  )}
                  {simulatedState === 'blocked' && (
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                      State active: Automated cluster detected. Receipt blocked and flagged for review.
                    </div>
                  )}
                </div>

                <Button
                  size="xl"
                  variant="primary"
                  className="w-full"
                  isLoading={isSolvingPoW}
                  onClick={handleEnterDrop}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  {isSolvingPoW ? 'Computing Proof-of-Work...' : 'Submit Entry (Compute PoW & Register)'}
                </Button>

              </div>
            )}
          </Card>

        </div>

        {/* Right Column: Security Pipeline Diagram */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="glass">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Multi-Layer Request Shedding Order</span>
            </CardTitle>
            <CardDescription>
              Cheapest checks execute first to protect backend compute under 50,000 flash crowd loads.
            </CardDescription>

            <div className="space-y-3 mt-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-surface-200 border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">1. IP & Device Rate Limit</span>
                <Badge variant="emerald" size="sm">PASS</Badge>
              </div>

              <div className="p-3 rounded-lg bg-surface-200 border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">2. Cloudflare Turnstile</span>
                <Badge variant="emerald" size="sm">PASS</Badge>
              </div>

              <div className="p-3 rounded-lg bg-surface-200 border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">3. Proof-of-Work Hash Check</span>
                <Badge variant={powStats ? 'emerald' : 'yellow'} size="sm">
                  {powStats ? 'SOLVED' : 'READY'}
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-surface-200 border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">4. Honeypot Bot Trap</span>
                <Badge variant="emerald" size="sm">CLEAR</Badge>
              </div>

              <div className="p-3 rounded-lg bg-surface-200 border border-white/5 flex items-center justify-between">
                <span className="text-slate-300">5. Idempotency Receipt Cache</span>
                <Badge variant={entryReceipt ? 'yellow' : 'cyan'} size="sm">
                  {entryReceipt ? 'CACHED' : 'AWAITING'}
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-brand-yellow/10 border border-brand-yellow/30 flex items-center justify-between">
                <span className="text-brand-yellow font-bold">6. Atomic Firestore Write</span>
                <span className="text-white text-[10px]">1 Phone = 1 Doc</span>
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};
