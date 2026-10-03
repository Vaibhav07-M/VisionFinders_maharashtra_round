import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp, DEMO_PERSONAS } from '@/context/AppContext';
import {
  Sliders,
  Ticket,
  Terminal,
  RotateCcw,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

export const FloatingControlPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const {
    currentPersonaKey,
    loginAsPersona,
    socketConnected,
    simulateDisconnect,
    simulateReconnect,
    resetDemoData,
  } = useApp();

  const isDevMode = localStorage.getItem('DEV_MODE') === 'true' || (window as any).__DEV_MODE__ === true;
  if (!isDevMode) return null;

  const activePersona = DEMO_PERSONAS[currentPersonaKey] || DEMO_PERSONAS.attendee;

  // Determine current active view based on pathname
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

  // Close on outside click or Esc key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 left-5 z-50 font-sans"
      style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 50 }}
    >
      {/* Dev Control Panel Popover (Opens Upward) */}
      <div
        id="dev-control-panel"
        className={`fixed sm:absolute bottom-[72px] left-4 right-4 sm:left-0 sm:right-auto w-auto sm:w-[310px] bg-[#0c0d14]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 text-xs transition-all duration-150 ease-out origin-bottom-left ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-brand-yellow" />
            <span className="font-mono text-[11px] font-bold text-white uppercase tracking-wider">
              Control Panel
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Close control panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Section A: Active Persona */}
        <div className="py-3 border-b border-white/10">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            Active Persona
          </div>
          <div className="bg-surface-100/80 p-2.5 rounded-xl border border-white/5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                <span
                  id="active-persona-name"
                  className="font-bold text-white font-display text-xs truncate"
                >
                  {activePersona.displayName}
                </span>
              </div>
              <div
                id="active-persona-email"
                className="text-[10px] text-slate-400 font-mono truncate mt-0.5"
              >
                {activePersona.email}
              </div>
            </div>
            <span
              id="active-persona-badge"
              className="text-[10px] font-mono text-brand-yellow font-semibold px-2 py-0.5 bg-brand-yellow/10 rounded border border-brand-yellow/30 uppercase shrink-0"
            >
              {activePersona.badge}
            </span>
          </div>
        </div>

        {/* Section B: Quick Switch (3 Views) */}
        <div className="py-3 border-b border-white/10">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            Quick Switch
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {/* Attendee View */}
            <button
              id="btn-switch-attendee"
              onClick={() => handlePortalSwitch('attendee')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'attendee'
                  ? 'bg-brand-yellow text-black font-bold shadow-glow-yellow'
                  : 'bg-surface-100 text-slate-300 hover:text-white hover:bg-surface-50 border border-white/10'
              }`}
              title="1-Click Login as Attendee Alex Chen and open Drop catalog"
            >
              <div className="flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5" />
                <span>Attendee View</span>
              </div>
              {currentView === 'attendee' && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                  Active
                </span>
              )}
            </button>

            {/* Organizer Admin */}
            <button
              id="btn-switch-organizer"
              onClick={() => handlePortalSwitch('organizer')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-brand-yellow text-black font-bold shadow-glow-yellow'
                  : 'bg-surface-100 text-slate-300 hover:text-white hover:bg-surface-50 border border-white/10'
              }`}
              title="1-Click Login as Organizer Elena Rostova and open Admin operations"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                <span>Organizer Admin</span>
              </div>
              {currentView === 'admin' && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                  Active
                </span>
              )}
            </button>

            {/* Adversarial Lab */}
            <button
              id="btn-switch-lab"
              onClick={() => handlePortalSwitch('evaluator')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'lab'
                  ? 'bg-rose-500 text-white font-bold shadow-glow-rose'
                  : 'bg-surface-100 text-rose-300 hover:bg-surface-50 border border-rose-500/20'
              }`}
              title="1-Click Login as Dr. Thorne and open 50k Attack Lab"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>Adversarial Lab</span>
              </div>
              {currentView === 'lab' && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                  Active
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Section C: Status */}
        <div className="py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Status
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
                }`}
              />
              <span className="text-[11px] font-mono text-slate-200">
                {socketConnected ? 'Socket OK' : 'Disconnected'}
              </span>
            </div>
          </div>

          <button
            id="btn-socket-toggle"
            onClick={socketConnected ? simulateDisconnect : simulateReconnect}
            title={socketConnected ? 'Simulate network disconnect' : 'Simulate reconnect'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono border transition-all ${
              socketConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
            }`}
          >
            {socketConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{socketConnected ? 'Disconnect' : 'Reconnect'}</span>
          </button>
        </div>

        {/* Section D: Reset Button */}
        <div className="pt-3">
          <button
            id="btn-reset-demo"
            onClick={resetDemoData}
            title="1-Click Reset demo to clean initial state"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-brand-yellow hover:bg-white/5 border border-white/10 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Floating Toggle Button (Pill / Circular style) */}
      <button
        id="btn-floating-control-toggle"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border shadow-2xl backdrop-blur-md transition-all duration-150 ${
          isOpen
            ? 'bg-brand-yellow text-black border-brand-yellow shadow-glow-yellow'
            : 'bg-[#0f111a]/90 text-slate-300 hover:text-white border-white/20 hover:border-white/40 hover:bg-[#161825]'
        }`}
        title="Open developer control panel"
        aria-label="Developer Control Panel"
      >
        <Sliders className="w-4 h-4" />
        <span className="font-mono text-xs font-bold tracking-tight hidden sm:inline">
          Dev Controls
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            socketConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
          }`}
        />
      </button>
    </div>
  );
};
