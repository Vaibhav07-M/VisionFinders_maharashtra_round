import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp, DEMO_PERSONAS, DemoPersona } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  Mail,
  Lock,
  CheckCircle2,
  ArrowRight,
  Shield,
  Ticket,
  Sliders,
  Terminal,
  Zap,
  UserCheck,
  Sparkles,
} from 'lucide-react';

import { api } from '@/utils/api';

export const AuthPage: React.FC<{ initialMode?: 'login' | 'signup' }> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { user, loginAsPersona, addToast } = useApp();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'password' | 'magic_link'>('password');
  const [email, setEmail] = useState('alex.chen@fairdrop.io');
  const [password, setPassword] = useState('Alex123!');
  const [turnstileVerified, setTurnstileVerified] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // 1-Click Instant Persona Login Handler backed by Firestore
  const handleInstantLogin = async (personaKey: 'attendee' | 'organizer' | 'security' | 'evaluator') => {
    setIsLoading(true);
    try {
      await loginAsPersona(personaKey);
      const persona = DEMO_PERSONAS[personaKey];
      navigate(persona.defaultRoute);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileVerified) {
      addToast('error', 'Bot Verification', 'Please complete the Cloudflare Turnstile challenge.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const res = await api.auth.signup({
          email,
          password,
          displayName: email.split('@')[0],
          role: 'attendee',
        });
        localStorage.setItem('fairdrop_session_id', res.sessionId);
        localStorage.setItem('fairdrop_user', JSON.stringify(res.user));
        addToast('success', 'Account Created', `Created ${res.user.email} in Firestore.`);
        navigate('/');
      } else {
        const res = await api.auth.login({ email, password });
        localStorage.setItem('fairdrop_session_id', res.sessionId);
        localStorage.setItem('fairdrop_user', JSON.stringify(res.user));
        addToast('success', 'Authenticated', `Signed in as ${res.user.email} from Firestore.`);
        if (res.user.role === 'organizer') navigate('/admin');
        else if (res.user.role === 'security') navigate('/admin/security');
        else if (res.user.role === 'evaluator') navigate('/lab/attack-designer');
        else navigate('/');
      }
    } catch (err: any) {
      addToast('error', 'Authentication Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-10">
      
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow text-xs font-mono font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Evaluation & Demo Portal Access</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-stamp font-black text-white uppercase tracking-tight">
          Select Your Persona
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-slate-300">
          Click any persona card below for <strong className="text-brand-yellow font-semibold">1-Click Instant Login</strong>.
          You will be immediately authenticated and taken straight to their dedicated view.
        </p>
      </div>

      {/* 4 Dedicated 1-Click Persona Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* CARD 1: ATTENDEE */}
        <div
          onClick={() => handleInstantLogin('attendee')}
          className="group relative cursor-pointer p-6 rounded-2xl bg-surface-100/90 hover:bg-surface-100 border-2 border-emerald-500/30 hover:border-emerald-400 transition-all duration-200 shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Ticket className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                1-Click Attendee
              </span>
            </div>

            <div>
              <h2 className="text-xl font-stamp font-bold text-white group-hover:text-emerald-300 transition-colors">
                Alex Chen
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                alex.chen@fairdrop.io • Phone Verified
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Standard consumer buyer experience. Enter live waiting rooms, solve client-side Proof-of-Work, observe commit-reveal Fisher-Yates draws, and view HMAC-signed QR tickets.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">Waiting Room</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">PoW Solver</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">QR Tickets</span>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="md"
              className="w-full bg-emerald-500/10 text-emerald-300 border-emerald-500/30 group-hover:bg-emerald-400 group-hover:text-black group-hover:font-bold transition-all"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              1-Click Login as Attendee
            </Button>
          </div>
        </div>

        {/* CARD 2: ORGANIZER */}
        <div
          onClick={() => handleInstantLogin('organizer')}
          className="group relative cursor-pointer p-6 rounded-2xl bg-surface-100/90 hover:bg-surface-100 border-2 border-brand-yellow/30 hover:border-brand-yellow transition-all duration-200 shadow-lg hover:shadow-brand-yellow/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sliders className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30">
                1-Click Organizer
              </span>
            </div>

            <div>
              <h2 className="text-xl font-stamp font-bold text-white group-hover:text-brand-yellow transition-colors">
                Elena Rostova
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                elena.rostova@fairdrop.io • Event Director
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Full organizer admin console. Manage 500-seat real-time visual grid, inspect risk scores, set tier quotas, trigger deterministic draw, view append-only audit ledger, and handle appeals.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">500-Seat Grid</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">Draw Trigger</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">Audit Ledger</span>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="md"
              className="w-full bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30 group-hover:bg-brand-yellow group-hover:text-black group-hover:font-bold transition-all"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              1-Click Login as Organizer
            </Button>
          </div>
        </div>

        {/* CARD 3: SECURITY LEAD */}
        <div
          onClick={() => handleInstantLogin('security')}
          className="group relative cursor-pointer p-6 rounded-2xl bg-surface-100/90 hover:bg-surface-100 border-2 border-cyan-500/30 hover:border-cyan-400 transition-all duration-200 shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                1-Click Security
              </span>
            </div>

            <div>
              <h2 className="text-xl font-stamp font-bold text-white group-hover:text-cyan-300 transition-colors">
                Marcus Vance
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                marcus.vance@fairdrop.io • Fraud & Anti-Bot Lead
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Cheapest-first request shedding cockpit. Configure dynamic Proof-of-Work difficulty, IP sliding-window limits, honeypot traps, active blocklists, and monitor automated bot bans.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">Adaptive PoW</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">Risk Radar</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">Shedding Layers</span>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="md"
              className="w-full bg-cyan-500/10 text-cyan-300 border-cyan-500/30 group-hover:bg-cyan-400 group-hover:text-black group-hover:font-bold transition-all"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              1-Click Login as Security Lead
            </Button>
          </div>
        </div>

        {/* CARD 4: ADVERSARIAL LAB EVALUATOR */}
        <div
          onClick={() => handleInstantLogin('evaluator')}
          className="group relative cursor-pointer p-6 rounded-2xl bg-surface-100/90 hover:bg-surface-100 border-2 border-rose-500/30 hover:border-rose-400 transition-all duration-200 shadow-lg hover:shadow-rose-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Terminal className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                1-Click Lab Evaluator
              </span>
            </div>

            <div>
              <h2 className="text-xl font-stamp font-bold text-white group-hover:text-rose-300 transition-colors">
                Dr. Aris Thorne
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                aris.thorne@fairdrop.io • Adversarial Evaluation Lead
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Adversarial fairness research lab. Configure up to 50,000 competing virtual bots across 7 attack profiles, benchmark against FCFS baseline, and measure Jain's index & Gini coefficients.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">50k Simulator</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">Jain's Fairness</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">Chaos Injection</span>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="md"
              className="w-full bg-rose-500/10 text-rose-300 border-rose-500/30 group-hover:bg-rose-500 group-hover:text-white group-hover:font-bold transition-all"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              1-Click Login as Lab Evaluator
            </Button>
          </div>
        </div>

      </div>

      {/* Manual Credentials Accordion */}
      <div className="max-w-md mx-auto pt-6">
        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 text-center font-mono border-t border-white/10 flex items-center justify-center gap-1.5"
        >
          <span>{showManualForm ? 'Hide' : 'Or'} sign in with custom email / password</span>
          <span className="text-brand-yellow">{showManualForm ? '▲' : '▼'}</span>
        </button>

        {showManualForm && (
          <Card variant="glass" className="mt-4 space-y-4">
            <div className="flex p-1 bg-surface-200 rounded-lg border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-1.5 rounded transition-colors ${
                  mode === 'login' ? 'bg-brand-yellow text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-1.5 rounded transition-colors ${
                  mode === 'signup' ? 'bg-brand-yellow text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
                  />
                </div>
              </div>

              {/* Turnstile Checkbox */}
              <div className="p-3 rounded-lg bg-surface-200/90 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="turnstile"
                    checked={turnstileVerified}
                    onChange={e => setTurnstileVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-yellow focus:ring-brand-yellow bg-surface-100 border-white/20"
                  />
                  <label htmlFor="turnstile" className="text-xs text-slate-300 select-none cursor-pointer">
                    I am human (Cloudflare Turnstile)
                  </label>
                </div>
                <Shield className="w-4 h-4 text-cyan-400" />
              </div>

              <Button
                type="submit"
                size="md"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In With Custom Email
              </Button>
            </form>
          </Card>
        )}
      </div>

    </div>
  );
};
