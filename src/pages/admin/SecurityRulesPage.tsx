import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, Trash2, Loader2, AlertCircle, Save } from 'lucide-react';
import { api } from '@/utils/api';
import { SecurityConfig } from '../../../server/modules/abuse';

export const SecurityRulesPage: React.FC = () => {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rateLimitIp, setRateLimitIp] = useState(20);
  const [rateLimitAccount, setRateLimitAccount] = useState(60);
  const [rateLimitDevice, setRateLimitDevice] = useState(60);
  const [powDifficulty, setPowDifficulty] = useState(2);
  const [turnstileActive, setTurnstileActive] = useState(true);
  const [honeypotActive, setHoneypotActive] = useState(true);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [newBlockedIp, setNewBlockedIp] = useState('');

  // Fetch security rules from Firestore
  useEffect(() => {
    let mounted = true;
    const fetchRules = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.security.getRules();
        if (mounted && res.config) {
          setRateLimitIp(res.config.ipMaxRequests || 20);
          setRateLimitAccount(res.config.accountMaxRequests || 60);
          setRateLimitDevice(res.config.deviceMaxRequests || 60);
          setPowDifficulty(res.config.powDifficulty || 2);
          setTurnstileActive(res.config.turnstileEnabled !== false);
          setHoneypotActive(res.config.honeypotEnabled !== false);
          setBlocklist(res.config.blocklist || []);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load security rules.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchRules();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddBlockedIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedIp.trim()) return;
    const ip = newBlockedIp.trim();
    if (!blocklist.includes(ip)) {
      setBlocklist(prev => [...prev, ip]);
    }
    setNewBlockedIp('');
    addToast('success', 'IP Blocked', `Added ${ip} to active blocklist.`);
  };

  const handleRemoveBlockedIp = (ip: string) => {
    setBlocklist(prev => prev.filter(item => item !== ip));
    addToast('info', 'Block Removed', `Removed ${ip} from blocklist.`);
  };

  const handleSaveRules = async () => {
    try {
      setSaving(true);
      const updates: Partial<SecurityConfig> = {
        ipMaxRequests: rateLimitIp,
        accountMaxRequests: rateLimitAccount,
        deviceMaxRequests: rateLimitDevice,
        powDifficulty,
        turnstileEnabled: turnstileActive,
        honeypotEnabled: honeypotActive,
        blocklist,
      };
      const res = await api.security.updateRules(updates);
      addToast(
        'success',
        'Security Rules Deployed',
        'Policy committed to Firestore (securityConfig/global) & live rate limiters reconfigured.'
      );
    } catch (err: any) {
      addToast('error', 'Deploy Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading security rules from Firestore...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4">
        <Card variant="default" className="border-rose-500/30 p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-stamp uppercase text-white font-bold">Failed to load security rules</h2>
          <p className="text-xs text-slate-400 font-mono">{error}</p>
          <Button onClick={() => window.location.reload()} size="sm" variant="primary">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Panel B · Organizer & Security</span>
            <span>/</span>
            <span>B5. Security & Rate Limiting</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Abuse Defence & Threshold Config
          </h1>
        </div>

        <Button size="md" variant="primary" onClick={handleSaveRules} disabled={saving} leftIcon={<Save className="w-4 h-4" />}>
          {saving ? 'Deploying...' : 'Save & Deploy Security Rules'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Sliders & Thresholds */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="glass" className="space-y-6">
            <CardTitle className="text-lg">Rate Limiting Thresholds (Live sliding window)</CardTitle>
            
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
                  min={1}
                  max={4}
                  value={powDifficulty}
                  onChange={e => setPowDifficulty(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <span className="text-[11px] text-slate-500 block">
                  Difficulty {powDifficulty} requires client to solve cryptographic SHA-256 challenge before submit.
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Blocklist */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="default" className="border-white/10 space-y-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>IP & Subnet Blocklist</span>
            </CardTitle>

            <form onSubmit={handleAddBlockedIp} className="flex gap-2">
              <input
                type="text"
                placeholder="198.51.100.42"
                value={newBlockedIp}
                onChange={e => setNewBlockedIp(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-surface-200 border border-white/10 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
              />
              <Button type="submit" size="sm" variant="danger">
                Block
              </Button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {blocklist.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2">No IPs currently blocked.</p>
              ) : (
                blocklist.map((ip, i) => (
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
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
