import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/utils/api';
import { Drop, LabAttackGroup, LabAttackType, LabHumanTrafficConfig, LabScenarioConfig } from '@shared/types';
import {
  Zap,
  Cpu,
  ShieldAlert,
  Play,
  Bookmark,
  Layers,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Target,
  ExternalLink,
  Users,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Globe,
  Lock,
  Plus,
  Trash2,
  Sliders,
  Server,
  KeyRound,
  CheckCircle2,
  Info,
} from 'lucide-react';

const ATTACK_TYPE_DETAILS: Record<LabAttackType, { label: string; desc: string; icon: any; color: string }> = {
  naive_flooder: {
    label: 'Naive Flooder',
    desc: 'Single IP, tight HTTP loop, ignores 429 Retry-After, skips PoW.',
    icon: Flame,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  fast_single_shot: {
    label: 'Fast Single-Shot',
    desc: 'High-precision sniper firing requests at the exact millisecond of window open.',
    icon: Zap,
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  },
  retry_spammer: {
    label: 'Retry Spammer',
    desc: 'Repeats rejections immediately with 0 backoff, defying server rate headers.',
    icon: RotateCcw,
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  },
  distributed_botnet: {
    label: 'Distributed Botnet',
    desc: 'Spreads attack across large IP proxy pool with low individual frequency.',
    icon: Globe,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  sybil: {
    label: 'Sybil Farm',
    desc: 'Multiple verified identities per human operator to flood entry pool.',
    icon: Users,
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  },
  smart_bot: {
    label: 'Smart Bot',
    desc: 'Solves client-side PoW, rotates user-agents, respects Retry-After with jitter.',
    icon: Cpu,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  socket_spammer: {
    label: 'Socket Spammer',
    desc: 'Opens concurrent WebSocket connections to flood heartbeat & live room buffers.',
    icon: Layers,
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
  },
  unauthenticated_spam: {
    label: 'Unauthenticated Spam',
    desc: 'Forges join packets without valid session tokens to test fast auth shedding.',
    icon: Lock,
    color: 'text-red-400 border-red-500/30 bg-red-500/10',
  },
};

interface UiAttackGroup {
  id: string;
  name: string;
  attackType: LabAttackType;
  clientCount: number;
  requestsPerClient: number;
  startOffsetSec: number;
  durationSec: number;
  powSolveSpeedMs?: number;
  jitterMs?: number;
  ipPoolSize?: number;
  accountsPerOperator?: number;
}

interface UiHumanTrafficConfig {
  count: number;
  arrivalPattern: 'surge' | 'steady' | 'waves';
  fastConnectionSplit: number;
  retryOnFailure: boolean;
}

export const AttackDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useApp();

  // State: Drops & Target
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loadingDrops, setLoadingDrops] = useState(true);
  const [selectedDropId, setSelectedDropId] = useState<string>('');
  const [targetMode, setTargetMode] = useState<'SANDBOX_CLONE' | 'LIVE_EVENT'>('LIVE_EVENT');

  // State: Scenario Settings
  const [scenarioName, setScenarioName] = useState('Standard Adversarial Benchmark');
  const [randomSeed, setRandomSeed] = useState('FAIRDROP_SEED_NASHVILLE_2026');
  const [trafficPattern, setTrafficPattern] = useState<'steady' | 'flash_crowd' | 'ramp_up' | 'burst_waves'>('flash_crowd');

  // State: Attack Groups
  const [attackGroups, setAttackGroups] = useState<UiAttackGroup[]>([
    {
      id: 'grp_smart',
      name: 'Smart Sniper Cluster',
      attackType: 'smart_bot',
      clientCount: 150,
      requestsPerClient: 2,
      startOffsetSec: 0,
      durationSec: 5,
      powSolveSpeedMs: 120,
      jitterMs: 80,
    },
    {
      id: 'grp_flooder',
      name: 'Volumetric Naive Flood',
      attackType: 'naive_flooder',
      clientCount: 300,
      requestsPerClient: 5,
      startOffsetSec: 0,
      durationSec: 10,
    },
  ]);

  // State: Human Traffic (Control Group)
  const [includeHumanTraffic, setIncludeHumanTraffic] = useState<boolean>(false);
  const [humanConfig, setHumanConfig] = useState<UiHumanTrafficConfig>({
    count: 50,
    arrivalPattern: 'surge',
    fastConnectionSplit: 0.6,
    retryOnFailure: true,
  });

  // State: Security Snapshot
  const [defenceSnapshot, setDefenceSnapshot] = useState<any>(null);
  const [syntheticAccountsCount, setSyntheticAccountsCount] = useState<number>(0);
  const [provisioning, setProvisioning] = useState<boolean>(false);

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [typedConfirmation, setTypedConfirmation] = useState<string>('');
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  // Load drops on mount
  useEffect(() => {
    let mounted = true;
    const fetchDrops = async () => {
      try {
        setLoadingDrops(true);
        const res = await api.drops.list();
        if (mounted && res.drops && res.drops.length > 0) {
          setDrops(res.drops);
          const defaultDrop = res.drops.find(d => d.status === 'open' || d.status === 'scheduled') || res.drops[0];
          setSelectedDropId(defaultDrop.id);
        }
      } catch (err: any) {
        if (mounted) addToast('error', 'Failed to fetch drops', err.message);
      } finally {
        if (mounted) setLoadingDrops(false);
      }
    };

    const fetchSnapshot = async () => {
      try {
        const secRes = await api.security.getRules();
        if (mounted && secRes.config) {
          setDefenceSnapshot(secRes.config);
        }
      } catch (_) {}
    };

    fetchDrops();
    fetchSnapshot();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedDrop = drops.find(d => d.id === selectedDropId) || drops[0];

  // Calculate live planned requests
  const plannedBotRequests = attackGroups.reduce((acc, g) => acc + (g.clientCount * g.requestsPerClient), 0);
  const plannedHumanRequests = includeHumanTraffic ? (humanConfig.count * (humanConfig.retryOnFailure ? 2 : 1)) : 0;
  const totalPlannedRequests = plannedBotRequests + plannedHumanRequests;
  const isLargeQuotaRisk = totalPlannedRequests > 2000;

  // Add new attack group
  const addGroup = () => {
    const newId = `grp_${Date.now()}`;
    const newGroup: UiAttackGroup = {
      id: newId,
      name: `Attack Group #${attackGroups.length + 1}`,
      attackType: 'distributed_botnet',
      clientCount: 100,
      requestsPerClient: 3,
      startOffsetSec: 0,
      durationSec: 10,
      ipPoolSize: 500,
    };
    setAttackGroups([...attackGroups, newGroup]);
  };

  const removeGroup = (id: string) => {
    if (attackGroups.length <= 1) {
      addToast('error', 'Cannot Remove', 'You must have at least one attack group.');
      return;
    }
    setAttackGroups(attackGroups.filter(g => g.id !== id));
  };

  const updateGroup = (id: string, updates: Partial<UiAttackGroup>) => {
    setAttackGroups(attackGroups.map(g => (g.id === id ? { ...g, ...updates } : g)));
  };

  // Presets
  const applyPreset = (presetKey: string) => {
    if (presetKey === 'normal_crowd') {
      setScenarioName('Normal Organic Traffic with Isolated Bot Attempts');
      setAttackGroups([
        {
          id: 'grp_isolated',
          name: 'Occasional Sniper',
          attackType: 'fast_single_shot',
          clientCount: 50,
          requestsPerClient: 2,
          startOffsetSec: 0,
          durationSec: 5,
        },
      ]);
      setHumanConfig({ count: 1200, arrivalPattern: 'surge', fastConnectionSplit: 0.7, retryOnFailure: true });
    } else if (presetKey === 'naive_flood') {
      setScenarioName('10% Volumetric Naive Flooder');
      setAttackGroups([
        {
          id: 'grp_flood',
          name: 'Heavy Naive Flooder',
          attackType: 'naive_flooder',
          clientCount: 200,
          requestsPerClient: 10,
          startOffsetSec: 0,
          durationSec: 10,
        },
      ]);
      setHumanConfig({ count: 800, arrivalPattern: 'steady', fastConnectionSplit: 0.5, retryOnFailure: true });
    } else if (presetKey === 'distributed_botnet') {
      setScenarioName('30% Distributed Residential Botnet');
      setAttackGroups([
        {
          id: 'grp_botnet',
          name: 'Proxy Botnet Pool',
          attackType: 'distributed_botnet',
          clientCount: 400,
          requestsPerClient: 3,
          startOffsetSec: 0,
          durationSec: 10,
          ipPoolSize: 1200,
        },
      ]);
      setHumanConfig({ count: 700, arrivalPattern: 'surge', fastConnectionSplit: 0.6, retryOnFailure: true });
    } else if (presetKey === 'sybil_farm') {
      setScenarioName('Sybil Attack: Multi-Identity Account Farm');
      setAttackGroups([
        {
          id: 'grp_sybil',
          name: 'Organized Sybil Ring',
          attackType: 'sybil',
          clientCount: 150,
          requestsPerClient: 3,
          startOffsetSec: 0,
          durationSec: 8,
          accountsPerOperator: 5,
        },
      ]);
      setHumanConfig({ count: 600, arrivalPattern: 'steady', fastConnectionSplit: 0.5, retryOnFailure: true });
    } else if (presetKey === 'smart_bots') {
      setScenarioName('30% Smart Bot Infiltration');
      setAttackGroups([
        {
          id: 'grp_smart',
          name: 'PoW-Solving Smart Cluster',
          attackType: 'smart_bot',
          clientCount: 350,
          requestsPerClient: 2,
          startOffsetSec: 0,
          durationSec: 8,
          powSolveSpeedMs: 110,
          jitterMs: 120,
        },
      ]);
      setHumanConfig({ count: 700, arrivalPattern: 'surge', fastConnectionSplit: 0.5, retryOnFailure: true });
    } else if (presetKey === 'everything') {
      setScenarioName('Combined Adversarial Stress Matrix (All Attack Types)');
      setAttackGroups([
        { id: 'g1', name: 'Naive Flooder', attackType: 'naive_flooder', clientCount: 150, requestsPerClient: 6, startOffsetSec: 0, durationSec: 10 },
        { id: 'g2', name: 'Fast Single-Shot', attackType: 'fast_single_shot', clientCount: 100, requestsPerClient: 1, startOffsetSec: 0, durationSec: 2 },
        { id: 'g3', name: 'Retry Spammer', attackType: 'retry_spammer', clientCount: 100, requestsPerClient: 5, startOffsetSec: 0, durationSec: 8 },
        { id: 'g4', name: 'Distributed Botnet', attackType: 'distributed_botnet', clientCount: 150, requestsPerClient: 3, startOffsetSec: 0, durationSec: 10, ipPoolSize: 600 },
        { id: 'g5', name: 'Sybil Farm', attackType: 'sybil', clientCount: 100, requestsPerClient: 2, startOffsetSec: 0, durationSec: 8, accountsPerOperator: 4 },
        { id: 'g6', name: 'Smart Bots', attackType: 'smart_bot', clientCount: 150, requestsPerClient: 2, startOffsetSec: 0, durationSec: 8, powSolveSpeedMs: 100, jitterMs: 100 },
        { id: 'g7', name: 'Unauthenticated Spammer', attackType: 'unauthenticated_spam', clientCount: 150, requestsPerClient: 4, startOffsetSec: 0, durationSec: 8 },
      ]);
      setHumanConfig({ count: 800, arrivalPattern: 'surge', fastConnectionSplit: 0.6, retryOnFailure: true });
    }
    addToast('info', 'Preset Loaded', `Scenario set to "${presetKey}".`);
  };

  // Save Scenario to LocalStorage
  const handleSaveScenario = () => {
    const scenario = {
      scenarioName,
      targetDropId: selectedDropId,
      targetMode,
      randomSeed,
      trafficPattern,
      attackGroups,
      humanConfig,
    };
    localStorage.setItem('fairdrop_saved_lab_scenario', JSON.stringify(scenario));
    addToast('success', 'Scenario Saved', 'Configuration saved to local storage.');
  };

  // Load Scenario from LocalStorage
  const handleLoadScenario = () => {
    const raw = localStorage.getItem('fairdrop_saved_lab_scenario');
    if (!raw) {
      addToast('error', 'No Saved Scenario', 'No saved scenario found in browser storage.');
      return;
    }
    try {
      const parsed: any = JSON.parse(raw);
      setScenarioName(parsed.scenarioName || 'Custom Scenario');
      if (parsed.targetDropId) setSelectedDropId(parsed.targetDropId);
      if (parsed.targetMode) setTargetMode(parsed.targetMode);
      if (parsed.randomSeed) setRandomSeed(parsed.randomSeed);
      if (parsed.trafficPattern) setTrafficPattern(parsed.trafficPattern);
      if (parsed.attackGroups?.length) setAttackGroups(parsed.attackGroups);
      if (parsed.humanConfig) setHumanConfig(parsed.humanConfig);
      addToast('success', 'Scenario Loaded', 'Loaded custom scenario.');
    } catch (_) {
      addToast('error', 'Parse Error', 'Failed to load scenario configuration.');
    }
  };

  // Provision Synthetic Accounts
  const handleProvisionAccounts = async () => {
    try {
      setProvisioning(true);
      const res = await api.lab.provisionAccounts(200);
      setSyntheticAccountsCount(res.count);
      addToast('success', 'Identities Provisioned', `Created ${res.count} verified synthetic accounts for simulation testing.`);
    } catch (err: any) {
      addToast('error', 'Provisioning Failed', err.message);
    } finally {
      setProvisioning(false);
    }
  };

  // Open confirmation modal
  const handlePreLaunch = () => {
    if (!selectedDrop) {
      addToast('error', 'No Event Selected', 'Please select an event to test against.');
      return;
    }
    setTypedConfirmation('');
    setShowConfirmModal(true);
  };

  // Execute Launch
  const handleExecuteLaunch = async () => {
    if (typedConfirmation.trim().toLowerCase() !== selectedDrop.name.trim().toLowerCase()) {
      addToast('error', 'Confirmation Mismatch', 'You must type the exact event name to confirm launch.');
      return;
    }

    try {
      setIsLaunching(true);
      const scenario: LabScenarioConfig = {
        name: scenarioName,
        targetDropId: selectedDropId,
        targetEventName: selectedDrop.name.trim(),
        targetMode: targetMode === 'SANDBOX_CLONE' ? 'sandbox' : 'live',
        trafficPattern,
        seed: randomSeed,
        attackGroups: attackGroups.map(g => ({
          ...g,
          options: {
            powSolveSpeedMs: (g as any).powSolveSpeedMs,
            jitterRangeMs: [-(g as any).jitterMs || -50, (g as any).jitterMs || 50],
            ipPoolSize: (g as any).ipPoolSize,
            accountsPerOperator: (g as any).accountsPerOperator,
          },
        })),
        humanTraffic: {
          enabled: includeHumanTraffic,
          clientCount: includeHumanTraffic ? humanConfig.count : 0,
          pattern: humanConfig.arrivalPattern === 'surge' ? 'surge_tail' : humanConfig.arrivalPattern === 'waves' ? 'waves' : 'steady',
          fastConnectionRatio: humanConfig.fastConnectionSplit,
          retryOnFailure: humanConfig.retryOnFailure,
        },
        durationSec: Math.max(...attackGroups.map(g => (g.startOffsetSec || 0) + (g.durationSec || 10)), 15),
        confirmationEventName: typedConfirmation.trim(),
      };

      const res = await api.lab.startRun(scenario);
      setShowConfirmModal(false);
      addToast('success', 'Assault Launched', `Real attack runner initiated (Run ID: ${res.runId}).`);
      navigate(`/lab/runs/${res.runId}/live`);
    } catch (err: any) {
      addToast('error', 'Launch Failed', err.message);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-24 text-slate-100">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-stamp text-xs px-2.5 py-0.5 rounded bg-rose-600 text-white font-extrabold uppercase tracking-wider">
              PANEL C · ADVERSARIAL LAB
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              REAL HTTP EXECUTION ENGINE
            </span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Real-Time Attack Scenario Designer
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-1">
            Launches genuine HTTP traffic with zero bot labels against real server endpoints.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleProvisionAccounts}
            disabled={provisioning}
            leftIcon={<KeyRound className="w-3.5 h-3.5 text-brand-yellow" />}
          >
            {provisioning ? 'Provisioning...' : `Provision Synthetic Identities (${syntheticAccountsCount})`}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleSaveScenario} leftIcon={<Bookmark className="w-3.5 h-3.5" />}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleLoadScenario} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Load
          </Button>
        </div>
      </div>

      {/* Presets Bar */}
      <div className="p-3 bg-surface-100/60 border border-white/10 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-yellow" /> Load Benchmark Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'normal_crowd', label: 'Normal Crowd' },
            { id: 'naive_flood', label: '10% Naive Flood' },
            { id: 'distributed_botnet', label: '30% Distributed' },
            { id: 'sybil_farm', label: 'Sybil (5 Accounts)' },
            { id: 'smart_bots', label: 'Smart Bots 30%' },
            { id: 'everything', label: 'Everything at Once' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="px-2.5 py-1 text-xs font-mono bg-surface-200 hover:bg-surface-300 border border-white/10 rounded text-slate-200 hover:border-brand-yellow/50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Grid: Config vs Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main 2 Columns: Event Selection, Groups, Traffic */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: Select Event & Mode */}
          <Card className="p-6 space-y-5 border-white/10 bg-surface-100/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" />
                1. Target Event & Environment
              </h2>
              <span className="text-xs font-mono text-slate-400">Step 1 of 4</span>
            </div>

            {/* Event Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 block uppercase">
                Select Real Event (Open or Scheduled)
              </label>
              {loadingDrops ? (
                <div className="text-xs font-mono text-slate-400">Loading events...</div>
              ) : (
                <select
                  value={selectedDropId}
                  onChange={e => setSelectedDropId(e.target.value)}
                  className="w-full bg-surface-200 border border-white/10 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-yellow"
                >
                  {drops.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} · [{d.mode}] · {d.status.toUpperCase()} · {d.seatCount} seats
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Event Spec Preview */}
            {selectedDrop && (
              <div className="p-3 bg-surface-200/80 border border-white/5 rounded text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Mode: <strong className="text-white">{selectedDrop.mode}</strong></span>
                  <span>Status: <Badge variant={selectedDrop.status === 'open' ? 'emerald' : 'amber'}>{selectedDrop.status}</Badge></span>
                  <span>Seats: <strong className="text-white">{selectedDrop.seatCount}</strong></span>
                </div>
                {selectedDrop.tiers && selectedDrop.tiers.length > 0 && (
                  <div className="text-slate-400 pt-1 border-t border-white/5">
                    Tiers: {selectedDrop.tiers.map(t => `${t.name} (${t.seatCount})`).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Target Mode: Radio Selector */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-mono text-slate-300 block uppercase">
                Target Execution Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    targetMode === 'SANDBOX_CLONE'
                      ? 'border-brand-yellow bg-brand-yellow/10 text-white'
                      : 'border-white/10 bg-surface-200 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="targetMode"
                      checked={targetMode === 'SANDBOX_CLONE'}
                      onChange={() => setTargetMode('SANDBOX_CLONE')}
                      className="accent-brand-yellow"
                    />
                    <span className="font-bold text-sm text-white">Sandbox Clone (Recommended)</span>
                  </div>
                  <p className="text-xs mt-1.5 text-slate-300">
                    Copies seats, tiers, window, and security rules into an isolated temporary event (`simulation=true`). Attendees cannot see it.
                  </p>
                </label>

                <label
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    targetMode === 'LIVE_EVENT'
                      ? 'border-rose-500 bg-rose-500/10 text-white'
                      : 'border-white/10 bg-surface-200 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="targetMode"
                      checked={targetMode === 'LIVE_EVENT'}
                      onChange={() => setTargetMode('LIVE_EVENT')}
                      className="accent-rose-500"
                    />
                    <span className="font-bold text-sm text-rose-400">Live Event Attack</span>
                  </div>
                  <p className="text-xs mt-1.5 text-slate-300">
                    Attacks the actual production drop. Entries compete in the real draw. Can be purged later.
                  </p>
                </label>
              </div>
            </div>
          </Card>

          {/* STEP 2: Attack Groups */}
          <Card className="p-6 space-y-5 border-white/10 bg-surface-100/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  2. Adversarial Bot Groups
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Configure synthetic bot clusters. Each operates through standard public APIs.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addGroup} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Add Group
              </Button>
            </div>

            <div className="space-y-4">
              {attackGroups.map((grp, idx) => {
                const typeInfo = ATTACK_TYPE_DETAILS[grp.attackType] || ATTACK_TYPE_DETAILS.naive_flooder;
                const IconComponent = typeInfo.icon;

                return (
                  <div key={grp.id} className="p-4 rounded-lg bg-surface-200 border border-white/10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded border ${typeInfo.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={grp.name}
                          onChange={e => updateGroup(grp.id, { name: e.target.value })}
                          className="bg-transparent border-b border-white/10 font-bold text-sm text-white px-1 py-0.5 focus:outline-none focus:border-brand-yellow font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">
                          {grp.clientCount * grp.requestsPerClient} planned requests
                        </span>
                        <button
                          onClick={() => removeGroup(grp.id)}
                          className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                          title="Remove Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Group Parameters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                      <div>
                        <label className="text-slate-400 block mb-1">Attack Type</label>
                        <select
                          value={grp.attackType}
                          onChange={e => updateGroup(grp.id, { attackType: e.target.value as LabAttackType })}
                          className="w-full bg-surface-100 border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none"
                        >
                          {Object.entries(ATTACK_TYPE_DETAILS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Virtual Clients</label>
                        <input
                          type="number"
                          min={1}
                          max={5000}
                          value={grp.clientCount}
                          onChange={e => updateGroup(grp.id, { clientCount: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full bg-surface-100 border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Requests / Client</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={grp.requestsPerClient}
                          onChange={e => updateGroup(grp.id, { requestsPerClient: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full bg-surface-100 border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Duration (Sec)</label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={grp.durationSec}
                          onChange={e => updateGroup(grp.id, { durationSec: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full bg-surface-100 border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Specific Sub-Options */}
                    {grp.attackType === 'smart_bot' && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs font-mono">
                        <div>
                          <label className="text-slate-400 block mb-1">PoW Solve Latency (ms)</label>
                          <input
                            type="number"
                            value={grp.powSolveSpeedMs ?? 120}
                            onChange={e => updateGroup(grp.id, { powSolveSpeedMs: parseInt(e.target.value) || 100 })}
                            className="w-full bg-surface-100 border border-white/10 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Jitter Range (±ms)</label>
                          <input
                            type="number"
                            value={grp.jitterMs ?? 80}
                            onChange={e => updateGroup(grp.id, { jitterMs: parseInt(e.target.value) || 50 })}
                            className="w-full bg-surface-100 border border-white/10 rounded px-2 py-1 text-white"
                          />
                        </div>
                      </div>
                    )}

                    {grp.attackType === 'distributed_botnet' && (
                      <div className="pt-2 border-t border-white/5 text-xs font-mono">
                        <label className="text-slate-400 block mb-1">IP Proxy Pool Size</label>
                        <input
                          type="number"
                          value={grp.ipPoolSize ?? 1000}
                          onChange={e => updateGroup(grp.id, { ipPoolSize: parseInt(e.target.value) || 500 })}
                          className="w-full sm:w-1/2 bg-surface-100 border border-white/10 rounded px-2 py-1 text-white"
                        />
                      </div>
                    )}

                    {grp.attackType === 'sybil' && (
                      <div className="pt-2 border-t border-white/5 text-xs font-mono">
                        <label className="text-slate-400 block mb-1">Accounts per Operator</label>
                        <input
                          type="number"
                          value={grp.accountsPerOperator ?? 5}
                          onChange={e => updateGroup(grp.id, { accountsPerOperator: parseInt(e.target.value) || 2 })}
                          className="w-full sm:w-1/2 bg-surface-100 border border-white/10 rounded px-2 py-1 text-white"
                        />
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 italic">
                      {typeInfo.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* STEP 3: Human Traffic Control Group */}
          <Card className="p-6 space-y-4 border-white/10 bg-surface-100/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  3. Human Background Traffic (Control Group)
                </h2>
                <p className="text-xs font-mono text-slate-400">
                  Optional synthetic background humans to measure false-positive rate and latency impact.
                </p>
              </div>

              <label className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface-200/80 border border-white/10 cursor-pointer text-xs font-mono select-none hover:border-emerald-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={includeHumanTraffic}
                  onChange={e => setIncludeHumanTraffic(e.target.checked)}
                  className="w-4 h-4 rounded bg-surface-100 border-white/20 text-emerald-500 focus:ring-emerald-400 accent-emerald-500"
                />
                <span className={includeHumanTraffic ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {includeHumanTraffic ? 'Enabled (Simulated Humans Active)' : 'Disabled (Solo Real Human Mode)'}
                </span>
              </label>
            </div>

            {!includeHumanTraffic ? (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs font-mono text-emerald-300/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300 block mb-0.5">Solo Real Human Mode (Recommended)</span>
                    <span className="text-slate-400">
                      0 simulated human requests will be generated. All entries in the live admin dashboard will belong strictly to you, with zero phantom human passes.
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIncludeHumanTraffic(true)}
                  className="text-xs shrink-0 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30"
                >
                  Enable Control Group
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Human Attendees</label>
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      value={humanConfig.count}
                      onChange={e => setHumanConfig({ ...humanConfig, count: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-surface-200 border border-white/10 rounded px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Arrival Pattern</label>
                    <select
                      value={humanConfig.arrivalPattern}
                      onChange={e => setHumanConfig({ ...humanConfig, arrivalPattern: e.target.value as any })}
                      className="w-full bg-surface-200 border border-white/10 rounded px-3 py-2 text-white font-mono"
                    >
                      <option value="surge">Surge at open then tail</option>
                      <option value="steady">Steady arrivals</option>
                      <option value="waves">Periodic burst waves</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">
                      Fast Connection: {Math.round(humanConfig.fastConnectionSplit * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={humanConfig.fastConnectionSplit}
                      onChange={e => setHumanConfig({ ...humanConfig, fastConnectionSplit: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Slow (4G/WiFi)</span>
                      <span>Fiber</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar: Execution Parameters, Snapshot & Launch CTA */}
        <div className="space-y-6">
          
          {/* Summary Box */}
          <Card className="p-6 space-y-4 border-brand-yellow/30 bg-surface-100/70">
            <h3 className="text-sm font-bold text-brand-yellow uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4" /> Planned Assault Summary
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between pb-1 border-b border-white/5">
                <span className="text-slate-400">Planned Bot Requests:</span>
                <span className="text-rose-400 font-bold">{plannedBotRequests.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-white/5">
                <span className="text-slate-400">Planned Human Requests:</span>
                <span className="text-emerald-400 font-bold">{plannedHumanRequests.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-white/5 text-sm">
                <span className="text-white font-bold">Total Measured Scale:</span>
                <span className="text-brand-yellow font-black">{totalPlannedRequests.toLocaleString()} reqs</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-white/5">
                <span className="text-slate-400">Deterministic Seed:</span>
                <input
                  type="text"
                  value={randomSeed}
                  onChange={e => setRandomSeed(e.target.value)}
                  className="w-32 bg-surface-200 border border-white/10 rounded px-1.5 py-0.5 text-right text-slate-200 font-mono text-[11px]"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Traffic Curve:</span>
                <select
                  value={trafficPattern}
                  onChange={e => setTrafficPattern(e.target.value as any)}
                  className="bg-surface-200 border border-white/10 rounded px-1.5 py-0.5 text-slate-200 text-[11px]"
                >
                  <option value="flash_crowd">Flash Crowd Spike</option>
                  <option value="steady">Steady Flow</option>
                  <option value="ramp_up">Ramp Up</option>
                  <option value="burst_waves">Burst Waves</option>
                </select>
              </div>
            </div>

            {/* Quota warning */}
            {isLargeQuotaRisk && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-mono text-amber-300 space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" /> High Volume Quota Warning
                </div>
                <p className="text-[11px]">
                  Assault planned with &gt; 2,000 live HTTP requests. If targeting cloud Firestore, ensure quota is monitored.
                </p>
              </div>
            )}

            {/* Launch Button */}
            <Button
              size="lg"
              variant="primary"
              className="w-full font-black uppercase tracking-wider"
              onClick={handlePreLaunch}
              leftIcon={<Play className="w-4 h-4 fill-black" />}
            >
              Configure & Launch Attack
            </Button>
          </Card>

          {/* Active Defence Snapshot */}
          <Card className="p-6 space-y-4 border-white/10 bg-surface-100/50">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-yellow" /> Active Defence Snapshot
              </h3>
              <Link to="/admin/security" className="text-[11px] font-mono text-rose-400 hover:underline flex items-center gap-1">
                Edit Rules <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              The server will enforce these active security thresholds during the assault:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center bg-surface-200/60 p-2 rounded">
                <span className="text-slate-400">Rate Limiter:</span>
                <span className="text-emerald-400 font-bold">
                  {defenceSnapshot?.rateLimitPerIpWindow ?? 30} reqs / 10s
                </span>
              </div>
              <div className="flex justify-between items-center bg-surface-200/60 p-2 rounded">
                <span className="text-slate-400">Proof-of-Work:</span>
                <Badge variant={defenceSnapshot?.powEnabled ?? true ? 'emerald' : 'rose'}>
                  {defenceSnapshot?.powEnabled ?? true ? 'Enforced' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between items-center bg-surface-200/60 p-2 rounded">
                <span className="text-slate-400">Honeypot Trap:</span>
                <Badge variant={defenceSnapshot?.honeypotEnabled ?? true ? 'emerald' : 'rose'}>
                  {defenceSnapshot?.honeypotEnabled ?? true ? 'Armed' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between items-center bg-surface-200/60 p-2 rounded">
                <span className="text-slate-400">Turnstile CAPTCHA:</span>
                <Badge variant={defenceSnapshot?.turnstileEnabled ?? true ? 'emerald' : 'rose'}>
                  {defenceSnapshot?.turnstileEnabled ?? true ? 'Enforced' : 'Bypassed'}
                </Badge>
              </div>
              <div className="flex justify-between items-center bg-surface-200/60 p-2 rounded">
                <span className="text-slate-400">Risk Threshold:</span>
                <span className="text-white font-bold">{defenceSnapshot?.riskScoreThreshold ?? 70} / 100</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-100 border border-white/20 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <ShieldAlert className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                  Confirm Real Attack Execution
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Target: {targetMode === 'SANDBOX_CLONE' ? 'Sandbox Clone' : 'PRODUCTION LIVE EVENT'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface-200 rounded border border-white/10 text-xs font-mono space-y-2">
              <p className="text-slate-300">
                You are about to launch a REAL network flood of{' '}
                <strong className="text-brand-yellow font-bold">{totalPlannedRequests.toLocaleString()} requests</strong>{' '}
                against:
              </p>
              <div className="p-2 bg-surface-300 rounded text-center text-white font-bold select-all">
                {selectedDrop?.name?.trim()}
              </div>
              <p className="text-slate-400 text-[11px]">
                {targetMode === 'LIVE_EVENT'
                  ? 'CRITICAL WARNING: This attack will inject bot entries directly into the live production database. Use the Purge tool after the run to clean synthetic artifacts.'
                  : 'SAFE: A temporary sandbox clone of the event will be created and targeted. Attendees will not be impacted.'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 block">
                Type the event name to confirm:
              </label>
              <input
                type="text"
                placeholder={selectedDrop?.name?.trim()}
                value={typedConfirmation}
                onChange={e => setTypedConfirmation(e.target.value)}
                className="w-full bg-surface-200 border border-white/20 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowConfirmModal(false)}
                disabled={isLaunching}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleExecuteLaunch}
                disabled={isLaunching || typedConfirmation.trim().toLowerCase() !== selectedDrop?.name.trim().toLowerCase()}
                leftIcon={<Play className="w-4 h-4 fill-white" />}
              >
                {isLaunching ? 'Initiating Runner...' : 'Authorize & Launch'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
