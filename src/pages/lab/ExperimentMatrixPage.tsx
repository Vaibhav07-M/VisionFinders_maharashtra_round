import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { Layers, Play, CheckCircle2, ArrowRight, Filter } from 'lucide-react';

interface MatrixRow {
  id: string;
  mode: 'FAIR_DROP' | 'FCFS';
  botShare: number;
  profile: string;
  defences: 'All Active' | 'Turnstile Only' | 'Disabled (Raw)';
  trials: number;
  botWinShare: number;
  botAdvantageRatio: number;
  jainsIndex: number;
  gini: number;
  status: 'completed' | 'running' | 'queued';
}

export const ExperimentMatrixPage: React.FC = () => {
  const [filterMode, setFilterMode] = useState<'all' | 'FAIR_DROP' | 'FCFS'>('all');

  const matrixData: MatrixRow[] = [
    {
      id: 'EXP-001',
      mode: 'FAIR_DROP',
      botShare: 30,
      profile: 'Fast Single-Shot Sniper',
      defences: 'All Active',
      trials: 5,
      botWinShare: 4.2,
      botAdvantageRatio: 1.05,
      jainsIndex: 0.998,
      gini: 0.08,
      status: 'completed',
    },
    {
      id: 'EXP-002',
      mode: 'FCFS',
      botShare: 30,
      profile: 'Fast Single-Shot Sniper',
      defences: 'Disabled (Raw)',
      trials: 5,
      botWinShare: 83.0,
      botAdvantageRatio: 6.42,
      jainsIndex: 0.342,
      gini: 0.68,
      status: 'completed',
    },
    {
      id: 'EXP-003',
      mode: 'FAIR_DROP',
      botShare: 50,
      profile: 'Distributed Residential Botnet',
      defences: 'All Active',
      trials: 10,
      botWinShare: 8.4,
      botAdvantageRatio: 1.08,
      jainsIndex: 0.992,
      gini: 0.11,
      status: 'completed',
    },
    {
      id: 'EXP-004',
      mode: 'FCFS',
      botShare: 50,
      profile: 'Distributed Residential Botnet',
      defences: 'All Active',
      trials: 10,
      botWinShare: 91.2,
      botAdvantageRatio: 8.95,
      jainsIndex: 0.280,
      gini: 0.74,
      status: 'completed',
    },
    {
      id: 'EXP-005',
      mode: 'FAIR_DROP',
      botShare: 20,
      profile: 'Sybil Farm Operator',
      defences: 'All Active',
      trials: 5,
      botWinShare: 18.5,
      botAdvantageRatio: 1.34,
      jainsIndex: 0.940,
      gini: 0.18,
      status: 'completed',
    },
    {
      id: 'EXP-006',
      mode: 'FAIR_DROP',
      botShare: 0,
      profile: 'None (Pure Human Flash Crowd)',
      defences: 'All Active',
      trials: 5,
      botWinShare: 0.0,
      botAdvantageRatio: 1.00,
      jainsIndex: 1.000,
      gini: 0.04,
      status: 'completed',
    },
  ];

  const filtered = matrixData.filter(row =>
    filterMode === 'all' ? true : row.mode === filterMode
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link to="/lab/attack-designer" className="hover:text-rose-400">← Attack Designer</Link>
            <span>/</span>
            <span>C3. Multi-Trial Experiment Matrix</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Combinatorial Test Matrix (N-Trials)
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface-100 p-1 rounded-lg border border-white/10 text-xs font-mono">
            {(['all', 'FAIR_DROP', 'FCFS'] as const).map(m => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-3 py-1 rounded uppercase font-semibold text-[10px] ${
                  filterMode === m ? 'bg-brand-yellow text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'all' ? 'All Configurations' : m === 'FAIR_DROP' ? 'Fair Drop' : 'FCFS Control'}
              </button>
            ))}
          </div>

          <Link to="/lab/report">
            <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View Aggregated Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Matrix Table */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Config ID</TableHeaderCell>
            <TableHeaderCell>Mode</TableHeaderCell>
            <TableHeaderCell>Bot Share</TableHeaderCell>
            <TableHeaderCell>Attack Profile</TableHeaderCell>
            <TableHeaderCell>Defences</TableHeaderCell>
            <TableHeaderCell>Bot Win Share</TableHeaderCell>
            <TableHeaderCell>Bot Advantage Ratio</TableHeaderCell>
            <TableHeaderCell>Gini</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {filtered.map(row => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-brand-yellow font-bold">
                {row.id}
              </TableCell>

              <TableCell>
                <Badge variant={row.mode === 'FAIR_DROP' ? 'yellow' : 'cyan'} size="sm">
                  {row.mode === 'FAIR_DROP' ? 'Fair Drop' : 'FCFS Control'}
                </Badge>
              </TableCell>

              <TableCell className="font-mono text-xs text-white">
                {row.botShare}%
              </TableCell>

              <TableCell className="font-mono text-xs text-slate-300">
                {row.profile}
              </TableCell>

              <TableCell className="text-xs text-slate-400">
                {row.defences}
              </TableCell>

              <TableCell className="font-mono text-xs font-bold">
                <span className={row.botWinShare > 40 ? 'text-rose-400' : 'text-emerald-400'}>
                  {row.botWinShare}%
                </span>
              </TableCell>

              <TableCell className="font-mono text-xs font-black">
                <span
                  className={`px-2 py-0.5 rounded ${
                    row.botAdvantageRatio > 2.0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {row.botAdvantageRatio}x
                </span>
              </TableCell>

              <TableCell className="font-mono text-xs text-slate-300">
                {row.gini}
              </TableCell>

              <TableCell>
                <Badge variant="emerald" size="sm" dot>
                  {row.trials} TRIALS OK
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </div>
  );
};
