import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07080d] text-slate-400 text-xs py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:pl-28">
        
        {/* Brand & Copyright */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand-yellow flex items-center justify-center font-stamp font-black text-black text-sm shadow-glow-yellow/20">
            FD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-stamp text-xs font-black tracking-wider text-white uppercase">
                FAIR DROP
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                © 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Verifiable high-demand ticket allocation engine.
            </p>
          </div>
        </div>

        {/* Minimal Quick Links */}
        <nav className="flex flex-wrap items-center justify-center gap-5 text-[11px] text-slate-400">
          <Link to="/drops/drop-jack-white-vault" className="hover:text-brand-yellow transition-colors">
            Featured Drop
          </Link>
          <Link to="/proof/drop-jack-white-vault" className="hover:text-brand-yellow transition-colors">
            Proof Explorer
          </Link>
          <Link to="/lab/attack-designer" className="hover:text-rose-400 transition-colors">
            Adversarial Lab
          </Link>
          <Link to="/admin" className="hover:text-brand-yellow transition-colors">
            Admin
          </Link>
        </nav>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-slate-300">
            SHA-256 Commit-Reveal
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            0 Oversell
          </span>
        </div>

      </div>
    </footer>
  );
};
