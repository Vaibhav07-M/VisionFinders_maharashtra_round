import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cpu, GitBranch, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#090a0f] text-slate-400 text-xs py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Mandatory Official Scale & Claims Statement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-[#12141c]/60 border border-white/10">
          <div>
            <div className="flex items-center gap-2 text-brand-yellow font-display font-bold text-sm mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Core Allocation Integrity Claim</span>
            </div>
            <p className="text-slate-300 leading-relaxed italic">
              "Fair Drop removes arrival speed and request volume as direct allocation advantages and measures the remaining effects of adversarial behaviour."
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-display font-bold text-sm mb-1.5">
              <Cpu className="w-4 h-4" />
              <span>50k Virtual Client Scale Statement</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              "The application is real. The 50,000 users are virtual clients run against a local or staged instance with the Firebase Emulator, because free hosting and the Firebase Spark plan have connection and write limits."
            </p>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div>
            <h4 className="font-display font-bold text-white uppercase tracking-wider mb-3 text-[11px]">
              Panel A · Attendee
            </h4>
            <ul className="space-y-2">
              <li><Link to="/" className="hover:text-brand-yellow transition-colors">Drops Catalog</Link></li>
              <li><Link to="/drops/drop-jack-white-vault" className="hover:text-brand-yellow transition-colors">Featured Drop</Link></li>
              <li><Link to="/verify" className="hover:text-brand-yellow transition-colors">Identity Verification</Link></li>
              <li><Link to="/me" className="hover:text-brand-yellow transition-colors">My Signed Tickets</Link></li>
              <li><Link to="/proof/drop-jack-white-vault" className="hover:text-brand-yellow transition-colors">Cryptographic Proof Explorer</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white uppercase tracking-wider mb-3 text-[11px]">
              Panel B · Organizer / Admin
            </h4>
            <ul className="space-y-2">
              <li><Link to="/admin" className="hover:text-brand-yellow transition-colors">Operations Dashboard</Link></li>
              <li><Link to="/admin/drops/create" className="hover:text-brand-yellow transition-colors">Create / Configure Drop</Link></li>
              <li><Link to="/admin/inventory" className="hover:text-brand-yellow transition-colors">500-Seat Auditorium Map</Link></li>
              <li><Link to="/admin/entries" className="hover:text-brand-yellow transition-colors">Risk Scoring & Entries</Link></li>
              <li><Link to="/admin/live" className="hover:text-brand-yellow transition-colors">Live Rate-Limit Radar</Link></li>
              <li><Link to="/admin/audit" className="hover:text-brand-yellow transition-colors">Append-Only Audit Hash Chain</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-rose-400 uppercase tracking-wider mb-3 text-[11px]">
              Panel C · Adversarial Lab
            </h4>
            <ul className="space-y-2">
              <li><Link to="/lab/attack-designer" className="hover:text-rose-300 transition-colors">Bot Attack Designer</Link></li>
              <li><Link to="/lab/simulation-live" className="hover:text-rose-300 transition-colors">Live 50k Funnel & Chaos</Link></li>
              <li><Link to="/lab/matrix" className="hover:text-rose-300 transition-colors">Experiment Matrix (N-Trials)</Link></li>
              <li><Link to="/lab/report" className="hover:text-rose-300 transition-colors">Fairness Measurement Report</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white uppercase tracking-wider mb-3 text-[11px]">
              Cryptographic Guarantees
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand-yellow" /> SHA-256 Commit-Reveal</li>
              <li className="flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 text-cyan-400" /> Fisher-Yates Permutation</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Idempotent Entry Receipts</li>
              <li className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-purple-400" /> Zero Oversell Invariant</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 Fair Drop Architecture · Verified Random Allocation Engine
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-brand-yellow">SEED_HASH: e3b0c44...855</span>
            <span className="font-mono text-emerald-400">INVENTORY_INVARIANT: 0 OVERSELL</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
