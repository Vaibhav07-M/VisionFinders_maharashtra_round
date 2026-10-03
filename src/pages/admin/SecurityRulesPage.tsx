import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShieldAlert, Sliders, Shield, Zap, Lock, ListFilter, Plus, Trash2 } from 'lucide-react';

export const SecurityRulesPage: React.FC = () => {
  const { addToast } = useApp();

  const [rateLimitIp, setRateLimitIp] = useState(15);
  const [rateLimitAccount, setRateLimitAccount] = useState(30);
  const [rateLimitDevice, setRateLimitDevice] = useState(30);
  const [powDifficulty, setPowDifficulty] = useState(4);
  const [turnstileActive, setTurnstileActive] = useState(true);
  const [honeypotActive, setHoneypotActive] = useState(true);

  const [blocklist, setBlocklist] = useState<string[]>([
    '198.51.100.42 (Known Datacenter Proxy)',
    '203.0.113.88 (Scraper Cluster)',
  ]);
  const [newBlockedIp, setNewBlockedIp] = useState('');

  // Live hit counters for rules
  const [ruleHits] = useState({
    ipRateLimit: 4820,
    accountRateLimit: 312,
    deviceRateLimit: 198,
    powChallengeFails: 840,
    honeypotTraps: 54,
    turnstileFails: 1240,
  });

  const handleAddBlockedIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedIp.trim()) return;
    setBlocklist(prev => [...prev, newBlockedIp.trim()]);
    setNewBlockedIp('');
    addToast('success', 'IP Blocked', `Added ${newBlockedIp} to active blocklist.`);
  };

  const handleRemoveBlockedIp = (ip: string) => {
    setBlocklist(prev => prev.filter(item => item !== ip));
    addToast('info', 'Block Removed', `Removed ${ip} from blocklist.`);
  };

  const handleSaveRules = () => {
    addToast('success', 'Security Policy Updated', 'Active defence thresholds synced to in-memory rate limiter.');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Panel B · Organizer</span>
            <span>/</span>
            <span>B5. Security & Rate Limiting</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Abuse Defence & Threshold Config
          </h1>
        </div>

        <Button size="md" variant="primary" onClick={handleSaveRules}>
          Save & Deploy Security Rules
        </Button>
      </div>

      {/* Live Rule Hits Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'IP Rate Limit Hits', val: ruleHits.ipRateLimit, color: 'text-amber-400' },
          { label: 'Account Limits', val: ruleHits.accountRateLimit, color: 'text-amber-400' },
          { label: 'Device ID Limits', val: ruleHits.deviceRateLimit, color: 'text-amber-400' },
          { label: 'PoW Fails', val: ruleHits.powChallengeFails, color: 'text-cyan-400' },
          { label: 'Honeypot Trapped', val: ruleHits.honeypotTraps, color: 'text-rose-400' },
          { label: 'Turnstile Blocks', val: ruleHits.turnstileFails, color: 'text-rose-400' },
        ].map((stat, i) => (
          <div key={i} className="p-3.5 rounded-xl bg-surface-100 border border-white/10 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">{stat.label}</span>
            <span className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.val.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Sliders & Thresholds */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="glass" className="space-y-6">
            <CardTitle className="text-lg">Rate Limiting Thresholds (in-memory sliding window)</CardTitle>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Max Requests / Sec per IP:</span>
                  <span className="text-brand-yellow font-bold">{rateLimitIp} req/sec</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={rateLimitIp}
                  onChange={e => setRateLimitIp(Number(e.target.value))}
                  className="w-full accent-brand-yellow"
                />
                <span className="text-[11px] text-slate-500 block">Surpassing this triggers HTTP 429 with Retry-After header.</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Max Requests / Min per Verified Account:</span>
                  <span className="text-brand-yellow font-bold">{rateLimitAccount} req/min</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={120}
                  value={rateLimitAccount}
                  onChange={e => setRateLimitAccount(Number(e.target.value))}
                  className="w-full accent-brand-yellow"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Max Requests / Min per Device Fingerprint:</span>
                  <span className="text-brand-yellow font-bold">{rateLimitDevice} req/min</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={120}
                  value={rateLimitDevice}
                  onChange={e => setRateLimitDevice(Number(e.target.value))}
                  className="w-full accent-brand-yellow"
                />
              </div>
            </div>
          </Card>

          {/* Proof of work & challenges */}
          <Card variant="glass" className="space-y-6">
            <CardTitle className="text-lg">Active Challenge Engine</CardTitle>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-200">
                <div>
                  <span className="text-xs font-bold text-white block">Cloudflare Turnstile Managed Challenge</span>
                  <span className="text-[11px] text-slate-400">Enforces browser client execution without CAPTCHA friction.</span>
                </div>
                <input
                  type="checkbox"
                  checked={turnstileActive}
                  onChange={e => setTurnstileActive(e.target.checked)}
                  className="w-5 h-5 rounded text-brand-yellow"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-200">
                <div>
                  <span className="text-xs font-bold text-white block">Honeypot Form Trap</span>
                  <span className="text-[11px] text-slate-400">Invisible CSS input that immediately blocks naive bot scrapers.</span>
                </div>
                <input
                  type="checkbox"
                  checked={honeypotActive}
                  onChange={e => setHoneypotActive(e.target.checked)}
                  className="w-5 h-5 rounded text-brand-yellow"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-surface-200 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Proof-of-Work Target Difficulty:</span>
                  <span className="text-cyan-400 font-bold">{powDifficulty} Hex Zeros</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={powDifficulty}
                  onChange={e => setPowDifficulty(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <span className="text-[11px] text-slate-500 block">
                  Difficulty {powDifficulty} requires ~{Math.pow(16, powDifficulty).toLocaleString()} SHA-256 hash checks on client.
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Blocklist & Allowlist */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="default" className="border-white/10 space-y-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>IP & Subnet Blocklist</span>
            </CardTitle>

            <form onSubmit={handleAddBlockedIp} className="flex gap-2">
              <input
                type="text"
                placeholder="192.0.2.1 / Subnet"
                value={newBlockedIp}
                onChange={e => setNewBlockedIp(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-surface-200 border border-white/10 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
              />
              <Button type="submit" size="sm" variant="danger">
                Block
              </Button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {blocklist.map((ip, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-surface-200 border border-white/5 flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-slate-300 truncate max-w-[200px]">{ip}</span>
                  <button
                    onClick={() => handleRemoveBlockedIp(ip)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};
