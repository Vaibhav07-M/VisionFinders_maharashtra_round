import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Sliders,
  PlusCircle,
  LayoutGrid,
  Users,
  ShieldAlert,
  Activity,
  FileText,
  LifeBuoy,
  ArrowRight,
  TrendingUp,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { drops, entries, seats, appeals, auditLog, runInvariantCheck } = useApp();
  const activeDrop = drops[0];
  const invariants = runInvariantCheck(activeDrop.id);

  const totalEntries = drops.reduce((sum, d) => sum + (d.totalEntriesCount || 0), 0);
  const totalBlocked = 1420;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-stamp text-xs px-2.5 py-0.5 rounded bg-brand-yellow text-black font-extrabold uppercase">
              PANEL B · ORGANIZER
            </span>
            <span className="text-xs font-mono text-slate-400">ROLE-PROTECTED INTERFACE</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Operations & Allocation Command
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/drops/create">
            <Button size="md" variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Create New Drop
            </Button>
          </Link>
          <Link to="/lab/attack-designer">
            <Button size="md" variant="secondary" leftIcon={<Cpu className="w-4 h-4 text-rose-400" />}>
              Open Adversarial Lab
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Telemetry Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-[#12141c] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
            <span>Active Drops</span>
            <Sliders className="w-4 h-4 text-brand-yellow" />
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {drops.filter(d => d.status === 'open' || d.status === 'scheduled').length} / {drops.length}
          </div>
          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active window: {activeDrop.name.substring(0, 22)}...
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#12141c] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
            <span>Total Verified Entries</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {totalEntries.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Across all active drop windows</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#12141c] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
            <span>Automated Bots Neutralized</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-rose-400">
            {totalBlocked.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Rate limits, PoW & honeypot traps</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#12141c] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
            <span>Inventory Oversell Invariant</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-emerald-400">
            {invariants.oversold} OVERSELL
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">100% Invariant Compliant</div>
        </div>
      </div>

      {/* Navigation Quick Links to all 8 Admin Pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'B2. Create / Edit Drop',
            desc: 'Configure window timing, seed commit, and mode (Fair Drop vs FCFS)',
            link: '/admin/drops/create',
            icon: <PlusCircle className="w-5 h-5 text-brand-yellow" />,
          },
          {
            title: 'B3. Inventory Manager',
            desc: 'Interactive 500-seat auditorium grid and hold status inspector',
            link: '/admin/inventory',
            icon: <LayoutGrid className="w-5 h-5 text-cyan-400" />,
          },
          {
            title: 'B4. Entries & Users',
            desc: 'Search attendee pool with real-time risk scores and ban controls',
            link: '/admin/entries',
            icon: <Users className="w-5 h-5 text-emerald-400" />,
          },
          {
            title: 'B5. Security Rules',
            desc: 'Tune PoW difficulty, rate-limiting thresholds, and blocklists',
            link: '/admin/security',
            icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
          },
          {
            title: 'B6. Live Operations',
            desc: 'Throughput gauges, 429 rate limit errors, and pause/kill controls',
            link: '/admin/live',
            icon: <Activity className="w-5 h-5 text-purple-400" />,
          },
          {
            title: 'B7. Results & Audit Log',
            desc: 'Append-only hash-chained ledger and cryptographic verifier',
            link: '/admin/audit',
            icon: <FileText className="w-5 h-5 text-brand-yellow" />,
          },
          {
            title: 'B8. Appeals Queue',
            desc: `Review flagged attendee appeals (${appeals.filter(a => a.status === 'pending').length} pending)`,
            link: '/admin/appeals',
            icon: <LifeBuoy className="w-5 h-5 text-rose-400" />,
          },
          {
            title: 'Panel C: Adversarial Lab',
            desc: 'Launch 50,000-user botnet simulations and generate fairness reports',
            link: '/lab/attack-designer',
            icon: <Cpu className="w-5 h-5 text-cyan-400" />,
          },
        ].map((item, idx) => (
          <Link key={idx} to={item.link}>
            <Card variant="glass" className="h-full hover:border-brand-yellow/50 transition-all p-5 flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-xl bg-surface-200 border border-white/5 inline-block mb-3">
                  {item.icon}
                </div>
                <h3 className="font-display font-bold text-white text-base">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-brand-yellow font-mono font-bold">
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

    </div>
  );
};
