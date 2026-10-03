import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { DEMO_PERSONAS, DemoPersona } from '@/context/AppContext';
import {
  ShieldAlert,
  Sliders,
  Ticket,
  Terminal,
  RotateCcw,
  Wifi,
  WifiOff,
  UserCheck,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Users,
  LayoutGrid,
  Activity,
  FileText,
  LifeBuoy,
  PlusCircle,
  Lock,
  Layers,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    currentPersonaKey,
    loginAsPersona,
    socketConnected,
    simulateDisconnect,
    simulateReconnect,
    resetDemoData,
    reconnectNotice,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect current active view from URL path
  const currentView: 'attendee' | 'admin' | 'lab' = location.pathname.startsWith('/admin')
    ? 'admin'
    : location.pathname.startsWith('/lab')
    ? 'lab'
    : 'attendee';

  const handlePortalSwitch = (personaKey: 'attendee' | 'organizer' | 'evaluator') => {
    loginAsPersona(personaKey);
    const targetRoute = DEMO_PERSONAS[personaKey].defaultRoute;
    navigate(targetRoute);
  };

  const isCurrent = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname === path) return true;
    return false;
  };

  const activePersona = DEMO_PERSONAS[currentPersonaKey] || DEMO_PERSONAS.attendee;

  return (
    <>
      {/* ================= 1-CLICK PERSONA & PORTAL CONTROL STRIP ================= */}
      <div className="bg-[#0b0c13] border-b border-white/10 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Left: Active Persona Identifier */}
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest hidden sm:inline">
              Active Persona:
            </span>
            <div className="flex items-center gap-2 bg-surface-100/90 px-3 py-1 rounded-full border border-white/10 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white font-display text-xs">{activePersona.displayName}</span>
              <span className="text-[10px] font-mono text-brand-yellow font-semibold px-1.5 py-0.2 bg-brand-yellow/10 rounded border border-brand-yellow/30 uppercase">
                {activePersona.badge}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono hidden lg:inline">
              ({activePersona.email})
            </span>
          </div>

          {/* Center / Right: 3 Clear 1-Click View Switchers */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              1-Click Switch:
            </span>

            {/* 1-Click Attendee View */}
            <button
              onClick={() => handlePortalSwitch('attendee')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'attendee'
                  ? 'bg-brand-yellow text-black font-bold shadow-glow-yellow'
                  : 'bg-surface-100 text-slate-300 hover:text-white hover:bg-surface-50 border border-white/10'
              }`}
              title="1-Click Login as Attendee Alex Chen and open Drop catalog"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Attendee View</span>
            </button>

            {/* 1-Click Organizer Admin */}
            <button
              onClick={() => handlePortalSwitch('organizer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-brand-yellow text-black font-bold shadow-glow-yellow'
                  : 'bg-surface-100 text-slate-300 hover:text-white hover:bg-surface-50 border border-white/10'
              }`}
              title="1-Click Login as Organizer Elena Rostova and open Admin operations"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Organizer Admin</span>
            </button>

            {/* 1-Click Adversarial Lab */}
            <button
              onClick={() => handlePortalSwitch('evaluator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'lab'
                  ? 'bg-rose-500 text-white font-bold shadow-glow-rose'
                  : 'bg-surface-100 text-rose-300 hover:bg-surface-50 border border-rose-500/20'
              }`}
              title="1-Click Login as Dr. Thorne and open 50k Attack Lab"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Adversarial Lab</span>
            </button>

            {/* Socket Test Tool */}
            <button
              onClick={socketConnected ? simulateDisconnect : simulateReconnect}
              title={socketConnected ? 'Simulate network disconnect' : 'Simulate reconnect'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-all ${
                socketConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
              }`}
            >
              {socketConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden xl:inline">{socketConnected ? 'Socket OK' : 'Reconnect'}</span>
            </button>

            {/* 1-Click Reset Demo */}
            <button
              onClick={resetDemoData}
              title="1-Click Reset demo to clean initial state"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 hover:text-brand-yellow hover:bg-white/5 border border-white/10 text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Reset</span>
            </button>
          </div>

        </div>
      </div>

      {/* Reconnect notice banner */}
      {reconnectNotice && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/40 text-emerald-300 px-4 py-1.5 text-xs font-mono text-center flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{reconnectNotice}</span>
        </div>
      )}

      {/* ================= PRIMARY NAVIGATION BAR (CONTEXT-AWARE) ================= */}
      <header className="sticky top-0 z-40 w-full bg-[#090a0f]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Portal Name */}
          <Link to={currentView === 'admin' ? '/admin' : currentView === 'lab' ? '/lab/attack-designer' : '/'} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-brand-yellow flex items-center justify-center font-stamp font-extrabold text-black text-xl tracking-tighter shadow-glow-yellow group-hover:scale-105 transition-transform">
              FD
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-stamp text-lg font-black tracking-tight text-white uppercase group-hover:text-brand-yellow transition-colors">
                  FAIR DROP
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  currentView === 'admin'
                    ? 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30'
                    : currentView === 'lab'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {currentView === 'admin' ? 'ORGANIZER' : currentView === 'lab' ? 'ADVERSARIAL LAB' : 'ATTENDEE'}
                </span>
              </div>
            </div>
          </Link>

          {/* DYNAMIC NAV LINKS PER PORTAL */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            {/* VIEW 1: ATTENDEE LINKS */}
            {currentView === 'attendee' && (
              <>
                <Link
                  to="/"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/') ? 'bg-white/10 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Drops Catalog
                </Link>
                <Link
                  to="/drops/drop-jack-white-vault"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname === '/drops/drop-jack-white-vault' ? 'bg-white/10 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Featured Event
                </Link>
                <Link
                  to="/drops/drop-jack-white-vault/wait"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname.endsWith('/wait') ? 'bg-white/10 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Waiting Room
                </Link>
                <Link
                  to="/drops/drop-jack-white-vault/enter"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname.endsWith('/enter') ? 'bg-white/10 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Enter Drop (PoW)
                </Link>
                <Link
                  to="/drops/drop-jack-white-vault/live"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname.endsWith('/live') ? 'bg-white/10 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Live Telemetry
                </Link>
                <Link
                  to="/me"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/me') ? 'bg-white/10 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  My Tickets (QR)
                </Link>
                <Link
                  to="/proof/drop-jack-white-vault"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname.startsWith('/proof') ? 'bg-white/10 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Seed Proof
                </Link>
              </>
            )}

            {/* VIEW 2: ORGANIZER ADMIN LINKS */}
            {currentView === 'admin' && (
              <>
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/admin') ? 'bg-brand-yellow/20 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/drops/create"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/admin/drops/create') ? 'bg-brand-yellow/20 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Create Drop
                </Link>
                <Link
                  to="/admin/inventory"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/admin/inventory') ? 'bg-brand-yellow/20 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  500-Seat Grid
                </Link>
                <Link
                  to="/admin/entries"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/admin/entries') ? 'bg-brand-yellow/20 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Risk Register
                </Link>
                <Link
                  to="/admin/security"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/admin/security') ? 'bg-brand-yellow/20 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Security Rules
                </Link>
                <Link
                  to="/admin/live"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/admin/live') ? 'bg-brand-yellow/20 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Live Radar
                </Link>
                <Link
                  to="/admin/audit"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/admin/audit') ? 'bg-brand-yellow/20 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Audit Ledger
                </Link>
                <Link
                  to="/admin/appeals"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/admin/appeals') ? 'bg-brand-yellow/20 text-brand-yellow font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Appeals
                </Link>
              </>
            )}

            {/* VIEW 3: ADVERSARIAL LAB LINKS */}
            {currentView === 'lab' && (
              <>
                <Link
                  to="/lab/attack-designer"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/lab/attack-designer') ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  1. Attack Designer
                </Link>
                <Link
                  to="/lab/simulation-live"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/lab/simulation-live') ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  2. Live 50k Funnel & Chaos
                </Link>
                <Link
                  to="/lab/matrix"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/lab/matrix') ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  3. Experiment Matrix
                </Link>
                <Link
                  to="/lab/report"
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent('/lab/report') ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  4. Fairness Report (Export)
                </Link>
              </>
            )}
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-2">
            <Link to="/login">
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10">
                Switch Account
              </button>
            </Link>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#090a0f] p-4 flex flex-col gap-2 text-sm">
            <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Portals</div>
            <button
              onClick={() => {
                handlePortalSwitch('attendee');
                setMobileMenuOpen(false);
              }}
              className="p-2 rounded bg-surface-100 text-left text-white font-bold"
            >
              Attendee Experience
            </button>
            <button
              onClick={() => {
                handlePortalSwitch('organizer');
                setMobileMenuOpen(false);
              }}
              className="p-2 rounded bg-surface-100 text-left text-brand-yellow font-bold"
            >
              Organizer Admin
            </button>
            <button
              onClick={() => {
                handlePortalSwitch('evaluator');
                setMobileMenuOpen(false);
              }}
              className="p-2 rounded bg-surface-100 text-left text-rose-400 font-bold"
            >
              Adversarial Lab
            </button>
          </div>
        )}
      </header>
    </>
  );
};
