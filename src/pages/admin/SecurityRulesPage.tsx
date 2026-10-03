import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getAdminHeaders } from '@/utils/api';

export const SecurityRulesPage: React.FC = () => {
  const { addToast } = useApp();

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

  // Metadata
  const [lastChangedBy, setLastChangedBy] = useState<string>('system');
  const [lastChangedAt, setLastChangedAt] = useState<string>('');
  const [ruleHits, setRuleHits] = useState<any>({
    ipLimitBlocked: 0,
    blocklistCount: 0,
    activeLimiterPoints: 20,
    activeLimiterDuration: 1,
  });

  // Blocklist state
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [blocklistSearch, setBlocklistSearch] = useState<string>('');
  const [newIdentity, setNewIdentity] = useState<string>('');
  const [importText, setImportText] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Loading & Action dialogs
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'save' | 'clearBlocklist' | 'removeBlock' | null;
    targetItem?: string;
  }>({
    isOpen: false,
    action: null,
  });

  const fetchSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/security', {
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load security configurations');
      const data = await res.json();

      const cfg = data.config;
      if (cfg) {
        setTurnstileEnabled(cfg.turnstileEnabled ?? true);
        setPowEnabled(cfg.powEnabled ?? true);
        setPowDifficulty(cfg.powDifficulty ?? 2);
        setHoneypotEnabled(cfg.honeypotEnabled ?? true);
        setIpWindowSec(cfg.ipWindowSec ?? 1);
        setIpMaxRequests(cfg.ipMaxRequests ?? 20);
        setAccountWindowSec(cfg.accountWindowSec ?? 60);
        setAccountMaxRequests(cfg.accountMaxRequests ?? 60);
        setDeviceWindowSec(cfg.deviceWindowSec ?? 60);
        setDeviceMaxRequests(cfg.deviceMaxRequests ?? 60);
        setMinRiskBlockScore(cfg.minRiskBlockScore ?? 80);
        setMinRiskChallengeScore(cfg.minRiskChallengeScore ?? 50);
      }

      setBlocklist(data.blocklist || []);
      setRuleHits(data.ruleHits || {});
      setLastChangedBy(data.lastChangedBy || 'system');
      setLastChangedAt(data.lastChangedAt || '');
    } catch (err: any) {
      setError(err.message || 'Error communicating with security module');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

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

      addToast('success', 'Security Updated', 'Rate limits and defense parameters updated live in memory.');
      fetchSecurity();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Blocklist mutation
  const handleBlocklistAction = async (action: 'add' | 'remove' | 'import' | 'clear', reason: string, item?: string, items?: string[]) => {
    try {
      const res = await fetch('/api/admin/security/blocklist', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action, reason, item, items }),
      });

      if (!res.ok) throw new Error('Failed to update blocklist');
      const data = await res.json();
      setBlocklist(data.blocklist || []);
      addToast('success', 'Blocklist Updated', `Applied action [${action.toUpperCase()}] with audit log.`);
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
    <div className="space-y-6">
      <PageHeader
        title="Security Defense & Rate Limiting"
        subtitle="Dynamic tuning of multi-layer defenses, active memory limiters, and live IP/Account blocklists."
        badgeText={`Live Hit Rate: ${ruleHits.ipLimitBlocked} 429s/min`}
        badgeVariant="warning"
        action={
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 font-mono block">
                Last modified by: <strong className="text-slate-200">{lastChangedBy}</strong>
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">
                {lastChangedAt ? new Date(lastChangedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
            <Button
              variant="primary"
              onClick={handleSaveRules}
              isLoading={saving}
              className="gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Save Rules
            </Button>
          </div>
        }
      />

      {/* Live Counter Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-100 border border-white/5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono block">Active IP Points</span>
            <span className="text-xl font-mono font-bold text-white">
              {ruleHits.activeLimiterPoints} req / {ruleHits.activeLimiterDuration}s
            </span>
          </div>
          <Zap className="w-6 h-6 text-brand-yellow/80" />
        </div>

        <div className="p-4 bg-surface-100 border border-white/5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono block">429 Blocks (60s)</span>
            <span className="text-xl font-mono font-bold text-rose-400">
              {ruleHits.ipLimitBlocked} intercepted
            </span>
          </div>
          <ShieldAlert className="w-6 h-6 text-rose-400/80" />
        </div>

        <div className="p-4 bg-surface-100 border border-white/5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono block">Active Blocklist</span>
            <span className="text-xl font-mono font-bold text-amber-400">
              {blocklist.length} identities
            </span>
          </div>
          <Globe className="w-6 h-6 text-amber-400/80" />
        </div>

        <div className="p-4 bg-surface-100 border border-white/5 rounded-xl flex items-center justify-between">
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
        <ErrorState message={error} onRetry={fetchSecurity} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Defense Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-surface-100 border border-white/5 rounded-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-base font-bold text-white">Rate Limiters &amp; Burst Controls</h3>
                </div>
                <Badge variant="yellow">In-Memory Limiter</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1.5">
                    IP Rate Limit (Max Requests)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={ipMaxRequests}
                    onChange={(e) => setIpMaxRequests(parseInt(e.target.value) || 20)}
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
                    onChange={(e) => setAccountMaxRequests(parseInt(e.target.value) || 60)}
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
                    onChange={(e) => setDeviceMaxRequests(parseInt(e.target.value) || 60)}
                    className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                  />
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">Window: {deviceWindowSec} seconds</span>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1.5">
                    Proof-of-Work Difficulty
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={powDifficulty}
                    onChange={(e) => setPowDifficulty(parseInt(e.target.value) || 2)}
                    className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                  />
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">Required leading zero nibbles (1-6)</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-4 border-t border-white/5 space-y-4">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Challenge Gates</h4>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-sm font-semibold text-white block">Turnstile / CAPTCHA Challenge</span>
                    <span className="text-xs text-slate-400">Enforce browser token verification before queue entry</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={turnstileEnabled}
                    onChange={(e) => setTurnstileEnabled(e.target.checked)}
                    className="w-5 h-5 accent-brand-yellow cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-sm font-semibold text-white block">Proof of Work (PoW) Mining</span>
                    <span className="text-xs text-slate-400">Forces client CPU to compute SHA-256 hash collision</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={powEnabled}
                    onChange={(e) => setPowEnabled(e.target.checked)}
                    className="w-5 h-5 accent-brand-yellow cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-sm font-semibold text-white block">Honeypot Trap Fields</span>
                    <span className="text-xs text-slate-400">Instantly bans automated headless scripts that fill hidden fields</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={honeypotEnabled}
                    onChange={(e) => setHoneypotEnabled(e.target.checked)}
                    className="w-5 h-5 accent-brand-yellow cursor-pointer"
                  />
                </div>
              </div>

              {/* Risk Thresholds */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Risk Threshold Scoring</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Auto-Block Threshold (0-100)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={minRiskBlockScore}
                      onChange={(e) => setMinRiskBlockScore(parseInt(e.target.value) || 80)}
                      className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Challenge Gate Threshold (0-100)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={minRiskChallengeScore}
                      onChange={(e) => setMinRiskChallengeScore(parseInt(e.target.value) || 50)}
                      className="w-full bg-surface-200 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-brand-yellow"
                    />
                  </div>
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
                  <span className="text-xs text-slate-400">{blocklist.length} intercepted IPs &amp; Accounts</span>
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
                    handleBlocklistAction('add', 'Manual single identity block by security operator', newIdentity.trim());
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
              <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
                {filteredBlocklist.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-mono">
                    No blocklist entries match your search.
                  </div>
                ) : (
                  filteredBlocklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors"
                    >
                      <span className="font-mono text-xs text-rose-300 break-all">{item}</span>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            action: 'removeBlock',
                            targetItem: item,
                          });
                        }}
                        className="p-1 hover:bg-white/10 text-slate-400 hover:text-rose-400 rounded transition-colors"
                        title="Remove Block"
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

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-100 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Import Blocklist (Batch)</h3>
            <p className="text-xs text-slate-400">
              Paste comma or newline-separated IP addresses or account identifiers to append them directly into the live rate limiter.
            </p>
            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="192.168.1.100&#10;10.0.0.45&#10;usr-bot-491..."
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
                    handleBlocklistAction('import', `Bulk imported ${items.length} identities from list`, undefined, items);
                  }
                }}
              >
                Import Identities
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Destructive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={(reason) => {
          if (confirmDialog.action === 'clearBlocklist') {
            handleBlocklistAction('clear', reason);
          } else if (confirmDialog.action === 'removeBlock' && confirmDialog.targetItem) {
            handleBlocklistAction('remove', reason, confirmDialog.targetItem);
          }
          setConfirmDialog({ isOpen: false, action: null });
        }}
        title={
          confirmDialog.action === 'clearBlocklist'
            ? 'Clear Entire Blocklist'
            : 'Remove Blocked Identity'
        }
        message={
          confirmDialog.action === 'clearBlocklist'
            ? 'Are you sure you want to unblock all identities? This will immediately allow them to submit requests.'
            : `Are you sure you want to unblock identity ${confirmDialog.targetItem}?`
        }
        variant="danger"
        confirmText="Confirm Unblock"
        requireReason={true}
        reasonPlaceholder="e.g. False positive verification confirmed"
      />
    </div>
  );
};
