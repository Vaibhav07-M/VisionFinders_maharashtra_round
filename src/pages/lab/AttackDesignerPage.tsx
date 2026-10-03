import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BOT_PROFILES_INFO, DEFAULT_DEFENCE_CONFIG } from '@shared/constants';
import { BotProfileType, SimulationConfig, DropMode } from '@shared/types';
import {
  Terminal,
  Zap,
  Cpu,
  ShieldAlert,
  Play,
  Bookmark,
  Layers,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

export const AttackDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const { runSimulation, addToast } = useApp();

  // Attack Parameters
  const [scenarioName, setScenarioName] = useState('Flash Crowd 50,000 Bot Assault');
  const [totalUsers, setTotalUsers] = useState(50000);
  const [botShare, setBotShare] = useState(30);
  const [selectedProfiles, setSelectedProfiles] = useState<BotProfileType[]>([
    'fast_single_shot',
    'distributed_botnet',
    'smart_bot',
  ]);
  const [requestsPerSec, setRequestsPerSec] = useState(50);
  const [retriesPerBot, setRetriesPerBot] = useState(10);
  const [ipPoolSize, setIpPoolSize] = useState(2000);
  const [accountsPerOperator, setAccountsPerOperator] = useState(15);
  const [mode, setMode] = useState<DropMode>('FAIR_DROP');
  const [trialCount, setTrialCount] = useState(5);
  const [randomSeed, setRandomSeed] = useState('LAB_ENTROPY_NASHVILLE_50K');

  // Defences
  const [turnstileOn, setTurnstileOn] = useState(true);
  const [powOn, setPowOn] = useState(true);

  const toggleProfile = (p: BotProfileType) => {
    setSelectedProfiles(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const loadPreset = (preset: 'flash_crowd' | 'distributed' | 'sybil_farm' | 'fcfs_speed') => {
    if (preset === 'flash_crowd') {
      setScenarioName('50,000 Flash Crowd: Naive Flooder + Sniper');
      setTotalUsers(50000);
      setBotShare(35);
      setSelectedProfiles(['naive_flooder', 'fast_single_shot']);
      setMode('FAIR_DROP');
    } else if (preset === 'distributed') {
      setScenarioName('Distributed Residential Proxy Botnet');
      setTotalUsers(35000);
      setBotShare(40);
      setIpPoolSize(5000);
      setSelectedProfiles(['distributed_botnet', 'smart_bot']);
      setMode('FAIR_DROP');
    } else if (preset === 'sybil_farm') {
      setScenarioName('Sybil Attack: Multi-Identity Farm');
      setTotalUsers(25000);
      setBotShare(25);
      setAccountsPerOperator(50);
      setSelectedProfiles(['sybil']);
      setMode('FAIR_DROP');
    } else if (preset === 'fcfs_speed') {
      setScenarioName('FCFS Baseline Speed Dominance Test');
      setTotalUsers(50000);
      setBotShare(30);
      setSelectedProfiles(['fast_single_shot']);
      setMode('FCFS');
    }
    addToast('info', 'Preset Loaded', `Loaded scenario preset "${preset.replace('_', ' ').toUpperCase()}".`);
  };

  const handleLaunch = async () => {
    if (selectedProfiles.length === 0) {
      addToast('error', 'Select Bot Profile', 'Please select at least one bot attack vector.');
      return;
    }

    const config: SimulationConfig = {
      scenarioName,
      totalUsers,
      botSharePercentage: botShare,
      selectedProfiles,
      requestsPerSecPerBot: requestsPerSec,
      retriesPerBot,
      ipPoolSize,
      accountsPerOperator,
      mode,
      trialCount,
      randomSeed,
      defences: {
        ...DEFAULT_DEFENCE_CONFIG,
        turnstileEnabled: turnstileOn,
        powEnabled: powOn,
      },
    };

    navigate('/lab/simulation-live');
    runSimulation(config);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-stamp text-xs px-2.5 py-0.5 rounded bg-rose-500 text-white font-extrabold uppercase">
              PANEL C · ADVERSARIAL LAB
            </span>
            <span className="text-xs font-mono text-slate-400">BENCHMARK ENGINE</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Bot Attack Scenario Designer
          </h1>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-1">Load Preset:</span>
          <button
            onClick={() => loadPreset('flash_crowd')}
            className="px-2.5 py-1 text-xs font-mono bg-surface-100 hover:bg-surface-50 border border-white/10 rounded text-slate-200"
          >
            50k Flash Crowd
          </button>
          <button
            onClick={() => loadPreset('distributed')}
            className="px-2.5 py-1 text-xs font-mono bg-surface-100 hover:bg-surface-50 border border-white/10 rounded text-slate-200"
          >
            Proxy Botnet
          </button>
          <button
            onClick={() => loadPreset('sybil_farm')}
            className="px-2.5 py-1 text-xs font-mono bg-surface-100 hover:bg-surface-50 border border-white/10 rounded text-slate-200"
          >
            Sybil Farm
          </button>
          <button
            onClick={() => loadPreset('fcfs_speed')}
            className="px-2.5 py-1 text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded"
          >
            FCFS Control
          </button>
        </div>
      </div>

      {/* Bot Profiles Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-stamp font-extrabold text-white tracking-tight uppercase">
              1. Select Adversarial Bot Profiles
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose one or more simulated client profiles to compete against normal humans
            </p>
          </div>
          <span className="text-xs font-mono text-brand-yellow">
            {selectedProfiles.length} Profiles Armed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(BOT_PROFILES_INFO) as BotProfileType[]).map(key => {
            const info = BOT_PROFILES_INFO[key];
            const isSelected = selectedProfiles.includes(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleProfile(key)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-rose-500/15 border-rose-500 shadow-glow-rose/20'
                    : 'bg-surface-100 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-white text-sm">{info.name}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                        info.dangerLevel === 'Critical'
                          ? 'bg-rose-500/30 text-rose-300'
                          : 'bg-amber-500/30 text-amber-300'
                      }`}
                    >
                      {info.dangerLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">{info.tagline}</p>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{info.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Status</span>
                  <span className={isSelected ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                    {isSelected ? 'ARMED' : 'INACTIVE'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulation Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Volume & Distribution Sliders */}
        <div className="lg:col-span-8 space-y-6">
          <Card variant="glass" className="space-y-6">
            <CardTitle className="text-lg">2. Traffic Volume & Scale Parameters</CardTitle>

            <div className="space-y-6">
              
              {/* Total Virtual Users Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Total Virtual Clients:</span>
                  <span className="text-2xl font-bold font-mono text-brand-yellow">
                    {totalUsers.toLocaleString()} Users
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={totalUsers}
                  onChange={e => setTotalUsers(Number(e.target.value))}
                  className="w-full accent-brand-yellow"
                />
                <span className="text-[11px] text-slate-400 block">
                  Simulated flash crowd running against local emulator architecture. Max 50,000.
                </span>
              </div>

              {/* Bot Share Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Bot Share Percentage:</span>
                  <span className="text-2xl font-bold font-mono text-rose-400">
                    {botShare}% Bots ({(Math.floor(totalUsers * (botShare / 100))).toLocaleString()} Bots)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={botShare}
                  onChange={e => setBotShare(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>0% (All Pure Humans)</span>
                  <span>25% (Moderate Threat)</span>
                  <span>50% (Max Stress Test)</span>
                </div>
              </div>

              {/* Advanced Tunables */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-slate-300 block">RPS Per Bot</span>
                  <input
                    type="number"
                    value={requestsPerSec}
                    onChange={e => setRequestsPerSec(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono bg-surface-200 border border-white/10 rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono text-slate-300 block">Proxy IP Pool Size</span>
                  <input
                    type="number"
                    value={ipPoolSize}
                    onChange={e => setIpPoolSize(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono bg-surface-200 border border-white/10 rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono text-slate-300 block">Accounts / Operator</span>
                  <input
                    type="number"
                    value={accountsPerOperator}
                    onChange={e => setAccountsPerOperator(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono bg-surface-200 border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>

            </div>
          </Card>
        </div>

        {/* Right Column: Mode & Launch Action */}
        <div className="lg:col-span-4 space-y-6">
          <Card variant="default" className="border-brand-yellow/30 space-y-5">
            <CardTitle className="text-base">3. Allocation Mode</CardTitle>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMode('FAIR_DROP')}
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  mode === 'FAIR_DROP'
                    ? 'bg-brand-yellow/15 border-brand-yellow text-white'
                    : 'bg-surface-200 border-white/10 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs uppercase font-stamp">FAIR DROP (Random Draw)</div>
                <div className="text-[11px] text-slate-400 mt-1">Zero arrival speed advantage</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('FCFS')}
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  mode === 'FCFS'
                    ? 'bg-cyan-500/15 border-cyan-400 text-white'
                    : 'bg-surface-200 border-white/10 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs uppercase font-stamp">FCFS (Speed Baseline Control)</div>
                <div className="text-[11px] text-slate-400 mt-1">First-come arrival timestamp</div>
              </button>
            </div>

            {/* Launch Button */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <Button
                size="xl"
                variant="primary"
                className="w-full"
                onClick={handleLaunch}
                rightIcon={<Play className="w-5 h-5 fill-current" />}
              >
                Launch Simulation Run
              </Button>
              <p className="text-[10px] text-slate-500 text-center font-mono">
                Runs up to 50k virtual clients & calculates real fairness metrics.
              </p>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};
