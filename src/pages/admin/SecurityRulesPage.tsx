import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SkeletonLoader } from '@/components/admin/SkeletonLoader';
import { ErrorState } from '@/components/admin/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Cpu,
  Zap,
  Globe,
  Plus,
  Trash2,
  Upload,
  Search,
  Clock,
  UserCheck,
  Activity,
  AlertTriangle,
  RotateCcw,
  Check,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getAdminHeaders } from '@/utils/api';

export const SecurityRulesPage: React.FC = () => {
  const { drops, addToast } = useApp();
  const { selectedDropId } = useOutletContext<{ selectedDropId: string }>() || {};
  const activeDrop = drops.find(d => d.id === selectedDropId) || drops[0];

  // Rules form state
  const [turnstileEnabled, setTurnstileEnabled] = useState<boolean>(true);
  const [powEnabled, setPowEnabled] = useState<boolean>(true);
  const [powDifficulty, setPowDifficulty] = useState<number>(2);
  const [honeypotEnabled, setHoneypotEnabled] = useState<boolean>(true);
  const [ipWindowSec, setIpWindowSec] = useState<number>(1);
  const [ipMaxRequests, setIpMaxRequests] = useState<number>(20);
  const [accountWindowSec, setAccountWindowSec] = useState<number>(60);
  const [accountMaxRequests, setAccountMaxRequests] = useState<number>(60);
  const [deviceWindowSec, setDeviceWindowSec] = useState<number>(60);
  const [deviceMaxRequests, setDeviceMaxRequests] = useState<number>(60);
  const [minRiskBlockScore, setMinRiskBlockScore] = useState<number>(80);
  const [minRiskChallengeScore, setMinRiskChallengeScore] = useState<number>(50);

  // Baseline state to detect dirty changes
  const [initialFormState, setInitialFormState] = useState<string>('');

  // Metadata & Live Hit Rate
  const [lastChangedBy, setLastChangedBy] = useState<string>('system');
  const [lastChangedAt, setLastChangedAt] = useState<string>('');
  const [ruleHits, setRuleHits] = useState<any>({
    ipLimitBlocked: 0,
    blocklistCount: 2,
    activeLimiterPoints: 20,
    activeLimiterDuration: 1,
  });

  // Blocklist state
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [blocklistSearch, setBlocklistSearch] = useState<string>('');
  const [newIdentity, setNewIdentity] = useState<string>('');
  const [importText, setImportText] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Loading & State flags
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'clearBlocklist' | 'removeBlock' | null;
    targetItem?: string;
  }>({
    isOpen: false,
    action: null,
  });

  // Current serialized state to detect dirty changes
  const currentFormString = useMemo(() => {
    return JSON.stringify({
      turnstileEnabled,
      powEnabled,
      powDifficulty,
      honeypotEnabled,
      ipWindowSec,
      ipMaxRequests,
      accountWindowSec,
      accountMaxRequests,
      deviceWindowSec,
      deviceMaxRequests,
      minRiskBlockScore,
      minRiskChallengeScore,
    });
  }, [
    turnstileEnabled,
    powEnabled,
    powDifficulty,
    honeypotEnabled,
    ipWindowSec,
    ipMaxRequests,
    accountWindowSec,
    accountMaxRequests,
    deviceWindowSec,
    deviceMaxRequests,
    minRiskBlockScore,
    minRiskChallengeScore,
  ]);

  const isDirty = initialFormState !== '' && currentFormString !== initialFormState;

  // Fetch security settings from server
  const fetchSecurity = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const dropParam = selectedDropId || activeDrop?.id || '';
      const res = await fetch(`/api/admin/security?dropId=${encodeURIComponent(dropParam)}`, {
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load security configurations');
      const data = await res.json();

      const cfg = data.config;
      const dropDef = data.dropDefence;

      // If user hasn't edited anything, sync the form values
      if (!isDirty && cfg) {
        const turnstile = dropDef?.turnstileEnabled ?? cfg.turnstileEnabled ?? true;
        const pow = dropDef?.powEnabled ?? cfg.powEnabled ?? true;
        const diff = dropDef?.powDifficulty ?? cfg.powDifficulty ?? 2;
        const honey = dropDef?.honeypotEnabled ?? cfg.honeypotEnabled ?? true;
        const ipWin = cfg.ipWindowSec ?? 1;
        const ipMax = dropDef?.rateLimitPerIp ?? cfg.ipMaxRequests ?? 20;
        const accWin = cfg.accountWindowSec ?? 60;
        const accMax = dropDef?.rateLimitPerAccount ?? cfg.accountMaxRequests ?? 60;
        const devWin = cfg.deviceWindowSec ?? 60;
        const devMax = dropDef?.rateLimitPerDevice ?? cfg.deviceMaxRequests ?? 60;
        const riskBlock = dropDef?.minRiskBlockScore ?? cfg.minRiskBlockScore ?? 80;
        const riskChallenge = dropDef?.minRiskChallengeScore ?? cfg.minRiskChallengeScore ?? 50;

        setTurnstileEnabled(turnstile);
        setPowEnabled(pow);
        setPowDifficulty(diff);
        setHoneypotEnabled(honey);
        setIpWindowSec(ipWin);
        setIpMaxRequests(ipMax);
        setAccountWindowSec(accWin);
        setAccountMaxRequests(accMax);
        setDeviceWindowSec(devWin);
        setDeviceMaxRequests(devMax);
        setMinRiskBlockScore(riskBlock);
        setMinRiskChallengeScore(riskChallenge);

        const initialStr = JSON.stringify({
          turnstileEnabled: turnstile,
          powEnabled: pow,
          powDifficulty: diff,
          honeypotEnabled: honey,
          ipWindowSec: ipWin,
          ipMaxRequests: ipMax,
          accountWindowSec: accWin,
          accountMaxRequests: accMax,
          deviceWindowSec: devWin,
          deviceMaxRequests: devMax,
          minRiskBlockScore: riskBlock,
          minRiskChallengeScore: riskChallenge,
        });
        setInitialFormState(initialStr);
      }

      setBlocklist(data.blocklist || []);
      setRuleHits(data.ruleHits || {});
      setLastChangedBy(data.lastChangedBy || 'system');
      setLastChangedAt(data.lastChangedAt || '');
    } catch (err: any) {
      if (!isBackground) setError(err.message || 'Error communicating with security module');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [selectedDropId, activeDrop?.id, isDirty]);

  // Initial load and background polling every 2.5 seconds
  useEffect(() => {
    fetchSecurity(false);
    const interval = setInterval(() => {
      fetchSecurity(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedDropId]);

  // Save rules
  const handleSaveRules = async () => {
    setSaving(true);
    try {
      const payload = {
        turnstileEnabled,
        powEnabled,
        powDifficulty,
        honeypotEnabled,
        ipWindowSec,
        ipMaxRequests,
        accountWindowSec,
        accountMaxRequests,
        deviceWindowSec,
        deviceMaxRequests,
        minRiskBlockScore,
        minRiskChallengeScore,
        dropId: selectedDropId || activeDrop?.id,
      };

      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update security rules');
      }

      setInitialFormState(currentFormString);
      addToast('success', 'Security Rules Deployed', 'Rate limiters and event defense configuration applied live in memory.');
      fetchSecurity(true);
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveRules();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Preset profiles
  const applyPreset = (preset: 'strict' | 'balanced' | 'permissive') => {
    if (preset === 'strict') {
      setIpMaxRequests(5);
      setIpWindowSec(1);
      setAccountMaxRequests(20);
      setAccountWindowSec(60);
      setDeviceMaxRequests(20);
      setDeviceWindowSec(60);
      setPowEnabled(true);
      setPowDifficulty(3);
      setHoneypotEnabled(true);
      setTurnstileEnabled(true);
      setMinRiskBlockScore(70);
      setMinRiskChallengeScore(40);
      addToast('info', 'Strict Lockdown Selected', 'PoW difficulty set to 3 (Hard), IP rate limit set to 5 req/s. Click Save to apply.');
    } else if (preset === 'balanced') {
      setIpMaxRequests(20);
      setIpWindowSec(1);
      setAccountMaxRequests(60);
      setAccountWindowSec(60);
      setDeviceMaxRequests(60);
      setDeviceWindowSec(60);
      setPowEnabled(true);
      setPowDifficulty(2);
      setHoneypotEnabled(true);
      setTurnstileEnabled(true);
      setMinRiskBlockScore(80);
      setMinRiskChallengeScore(50);
      addToast('info', 'Balanced Standard Selected', 'Standard production defense parameters loaded. Click Save to apply.');
    } else if (preset === 'permissive') {
      setIpMaxRequests(100);
      setIpWindowSec(1);
      setAccountMaxRequests(300);
      setAccountWindowSec(60);
      setDeviceMaxRequests(300);
      setDeviceWindowSec(60);
      setPowEnabled(false);
      setPowDifficulty(1);
      setHoneypotEnabled(false);
      setTurnstileEnabled(false);
      setMinRiskBlockScore(95);
      setMinRiskChallengeScore(70);
      addToast('warning', 'Permissive Demo Selected', 'Defenses relaxed for load testing. Click Save to apply.');
    }
  };

  // Blocklist mutation
  const handleBlocklistAction = async (action: 'add' | 'remove' | 'import' | 'clear', reason?: string, item?: string, items?: string[]) => {
    try {
      const res = await fetch('/api/admin/security/blocklist', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action,
          reason: reason || `Manual operator ${action} via security console`,
          item,
          items,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update blocklist');
      }

      const data = await res.json();
      setBlocklist(data.blocklist || []);
      addToast('success', 'Blocklist Updated', `Applied action [${action.toUpperCase()}] immediately.`);
      setNewIdentity('');
      setShowImportModal(false);
      setImportText('');
    } catch (err: any) {
      addToast('error', 'Blocklist Error', err.message);
    }
  };

  const filteredBlocklist = blocklist.filter(item =>
    item.toLowerCase().includes(blocklistSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Save Button and Active Event Target */}
      <PageHeader
        category="PANEL B · SECURITY & GATEWAY CONTROLS"
        title="Security Rules & Live Radar"
        description={`Active defenses and token-bucket limiters for "${activeDrop?.name || 'All Events'}" (${activeDrop?.mode || 'FAIR_DROP'}).`}
        badgeText={`Live Hit Rate: ${ruleHits.ipLimitBlocked} 429s/min`}
        badgeVariant="warning"
        action={
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 font-mono block">
                Last modified by: <strong className="text-slate-200">{lastChangedBy}</strong>
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">
                {lastChangedAt ? new Date(lastChangedAt).toLocaleTimeString() : 'Active'}
              </span>
            </div>
            <Button
              variant={isDirty ? 'primary' : 'secondary'}
              onClick={handleSaveRules}
              isLoading={saving}
              className={`gap-2 ${isDirty ? 'shadow-glow-yellow animate-pulse' : ''}`}
            >
              <ShieldCheck className="w-4 h-4" />
              {isDirty ? 'Save & Apply Live' : 'Rules Deployed'}
            </Button>
          </div>
        }
      />

      {/* Live Counter Strip (Updates every 2.5s) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-surface-100 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono block">Active IP Points</span>
            <span className="text-xl font-mono font-bold text-white">
              {ruleHits.activeLimiterPoints} req / {ruleHits.activeLimiterDuration}s
            </span>
          </div>
          <Zap className="w-6 h-6 text-brand-yellow/80" />
        </div>

        <div className="p-4 bg-surface-100 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono block">429 Rate Limits (60s)</span>
            <span className="text-xl font-mono font-bold text-rose-400">
              {ruleHits.ipLimitBlocked} throttled
            </span>
          </div>
          <ShieldAlert className="w-6 h-6 text-rose-400/80" />
        </div>

        <div className="p-4 bg-surface-100 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono block">Active Blocklist</span>
            <span className="text-xl font-mono font-bold text-amber-400">
              {blocklist.length} identities
            </span>
          </div>
          <Globe className="w-6 h-6 text-amber-400/80" />
        </div>

        <div className="p-4 bg-surface-100 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono block">PoW Difficulty</span>
            <span className="text-xl font-mono font-bold text-cyan-400">
              {powDifficulty} Leading Zeros
            </span>
          </div>
          <Cpu className="w-6 h-6 text-cyan-400/80" />
        </div>
      </div>

      {loading ? (
        <SkeletonLoader count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchSecurity(false)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Defense Configuration Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className={`p-6 bg-surface-100 border rounded-2xl space-y-6 transition-all ${
              isDirty ? 'border-brand-yellow/40 shadow-glow-yellow/10' : 'border-white/5'
            }`}>
              
              {/* Card Header & Presets */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-yellow" />
                  <div>
                    <h3 className="text-base font-bold text-white">Rate Limiters &amp; Defense Gates</h3>
                    <span className="text-xs text-slate-400 font-mono">
                      Target: {activeDrop?.name}
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-500 mr-1 hidden sm:inline">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('strict')}
                    className="px-2 py-1 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                    title="Strict anti-bot settings (High PoW difficulty, tight rate limits)"
                  >
                    Strict
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('balanced')}
                    className="px-2 py-1 rounded bg-brand-yellow/10 text-brand-yellow hover:bg-brand-yellow/20 border border-brand-yellow/20 transition-colors"
                    title="Standard production settings"
                  >
                    Balanced
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('permissive')}
                    className="px-2 py-1 rounded bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 border border-slate-500/20 transition-colors"
                    title="Relaxed limits for high-scale load testing"
                  >
                    Permissive
                  </button>
                </div>
              </div>

              {/* Rate Limiter Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1.5">
                    IP Rate Limit (Max Requests / Sec)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={ipMaxRequests}
                    onChange={(e) => setIpMaxRequests(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                  />
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">Window: {ipWindowSec} second</span>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1.5">
                    Account Rate Limit (Max / Min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={accountMaxRequests}
                    onChange={(e) => setAccountMaxRequests(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                  />
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">Window: {accountWindowSec} seconds</span>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1.5">
                    Device Fingerprint Limit (Max / Min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={deviceMaxRequests}
                    onChange={(e) => setDeviceMaxRequests(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                  />
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">Window: {deviceWindowSec} seconds</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono text-slate-300">
                      Proof-of-Work Difficulty
                    </label>
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">
                      {powDifficulty === 1 ? 'Level 1: ~16 hashes (<10ms)' :
                       powDifficulty === 2 ? 'Level 2: ~256 hashes (~80ms)' :
                       powDifficulty === 3 ? 'Level 3: ~4,096 hashes (~800ms)' :
                       `Level ${powDifficulty}: High CPU Cost`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={1}
                    value={powDifficulty}
                    onChange={(e) => setPowDifficulty(parseInt(e.target.value) || 2)}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>1 (Light)</span>
                    <span>2 (Standard)</span>
                    <span>3 (Hard)</span>
                    <span>4 (Extreme)</span>
                  </div>
                </div>
              </div>

              {/* Active Challenge Gates (Interactive Toggles) */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Active Challenge Gates (Multi-Layer Funnel)
                </h4>

                {/* Turnstile Gate */}
                <div
                  onClick={() => setTurnstileEnabled(!turnstileEnabled)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    turnstileEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Turnstile / Bot Token Verification</span>
                      <Badge variant={turnstileEnabled ? 'emerald' : 'slate'} className="text-[10px]">
                        {turnstileEnabled ? 'ACTIVE' : 'DISABLED'}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400 block">
                      Enforces cryptographic browser token check before entrant queue insertion.
                    </span>
                  </div>
                  <div className={`w-11 h-6 rounded-full p-1 transition-colors ${turnstileEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${turnstileEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* PoW Gate */}
                <div
                  onClick={() => setPowEnabled(!powEnabled)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    powEnabled
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Client-Bound Proof of Work (PoW)</span>
                      <Badge variant={powEnabled ? 'cyan' : 'slate'} className="text-[10px]">
                        {powEnabled ? 'ACTIVE' : 'DISABLED'}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400 block">
                      Forces client CPU to compute SHA-256 hash collision, making high-frequency botnet floods computationally unviable.
                    </span>
                  </div>
                  <div className={`w-11 h-6 rounded-full p-1 transition-colors ${powEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${powEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Honeypot Gate */}
                <div
                  onClick={() => setHoneypotEnabled(!honeypotEnabled)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    honeypotEnabled
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Invisible Decoy Honeypot Trap</span>
                      <Badge variant={honeypotEnabled ? 'yellow' : 'slate'} className="text-[10px]">
                        {honeypotEnabled ? 'ACTIVE' : 'DISABLED'}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400 block">
                      Instantly intercepts and blocks automated headless crawlers and DOM scripts that blindly fill hidden inputs.
                    </span>
                  </div>
                  <div className={`w-11 h-6 rounded-full p-1 transition-colors ${honeypotEnabled ? 'bg-brand-yellow' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${honeypotEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Risk Thresholds */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Behavioral Machine-Speed Risk Scoring
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Auto-Block Score Threshold (0-100)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={minRiskBlockScore}
                      onChange={(e) => setMinRiskBlockScore(Math.min(100, Math.max(10, parseInt(e.target.value) || 80)))}
                      className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                    />
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Scores &ge; {minRiskBlockScore} receive 403 Hard Block</span>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Secondary Review Threshold (0-100)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={minRiskChallengeScore}
                      onChange={(e) => setMinRiskChallengeScore(Math.min(90, Math.max(5, parseInt(e.target.value) || 50)))}
                      className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                    />
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Scores &ge; {minRiskChallengeScore} flagged for appeal queue</span>
                  </div>
                </div>
              </div>

              {/* In-Card Primary Save Action Bar */}
              <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-mono text-slate-400">
                  {isDirty ? (
                    <span className="text-brand-yellow font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-yellow animate-ping" />
                      Unsaved changes pending deployment
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      All defenses active &amp; in sync
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {isDirty && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchSecurity(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Discard
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleSaveRules}
                    isLoading={saving}
                    className="w-full sm:w-auto gap-2 font-mono uppercase tracking-wide"
                  >
                    <ShieldCheck className="w-4 h-4" /> Save Rules &amp; Apply Live
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Blocklist Manager */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-surface-100 border border-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Active Blocklist</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {blocklist.length} intercepted IPs &amp; Accounts
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowImportModal(true)}
                    className="text-xs h-7 gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> Import
                  </Button>
                  {blocklist.length > 0 && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setConfirmDialog({ isOpen: true, action: 'clearBlocklist' })}
                      className="text-xs h-7"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Add form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newIdentity.trim()) {
                    handleBlocklistAction('add', undefined, newIdentity.trim());
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Add IP address or account UID..."
                  value={newIdentity}
                  onChange={(e) => setNewIdentity(e.target.value)}
                  className="flex-1 bg-surface-200 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow"
                />
                <Button size="sm" variant="primary" type="submit" disabled={!newIdentity.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </form>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search blocklist..."
                  value={blocklistSearch}
                  onChange={(e) => setBlocklistSearch(e.target.value)}
                  className="w-full bg-surface-200/50 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
                />
              </div>

              {/* List */}
              <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
                {filteredBlocklist.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-mono">
                    {blocklist.length === 0
                      ? 'Blocklist is currently clean (0 identities blocked).'
                      : 'No blocklist entries match your search filter.'}
                  </div>
                ) : (
                  filteredBlocklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors"
                    >
                      <span className="font-mono text-xs text-rose-300 break-all">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleBlocklistAction('remove', undefined, item)}
                        className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors"
                        title="Unblock Identity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Reminder Strip when scrolled */}
      {isDirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#0d0f17]/95 border border-brand-yellow/40 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 animate-scale-up">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-yellow animate-ping" />
            <span className="text-xs font-mono font-bold text-white">
              Unsaved Security Rules for "{activeDrop?.name}"
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchSecurity(false)}
              className="text-xs text-slate-400"
            >
              Discard
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveRules}
              isLoading={saving}
              className="text-xs gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Save Now
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-100 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Import Blocklist (Batch)</h3>
            <p className="text-xs text-slate-400 font-mono">
              Paste comma or newline-separated IP addresses or account identifiers to append them directly into the live rate limiter.
            </p>
            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="198.51.100.12&#10;203.0.113.45&#10;usr-bot-491..."
              className="w-full bg-surface-200 border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-brand-yellow"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const items = importText
                    .split(/[\n,]/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (items.length > 0) {
                    handleBlocklistAction('import', undefined, undefined, items);
                  }
                }}
              >
                Import Identities
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Blocklist Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={(reason) => {
          if (confirmDialog.action === 'clearBlocklist') {
            handleBlocklistAction('clear', reason);
          }
          setConfirmDialog({ isOpen: false, action: null });
        }}
        title="Clear Entire Blocklist"
        message="Are you sure you want to unblock all identities? This will immediately allow them to submit requests."
        variant="danger"
        confirmText="Confirm Clear All"
        requireReason={false}
      />
    </div>
  );
};
