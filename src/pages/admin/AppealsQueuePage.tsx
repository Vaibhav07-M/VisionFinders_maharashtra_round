import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { LifeBuoy, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';
import { Appeal } from '@shared/types';

export const AppealsQueuePage: React.FC = () => {
  const { addToast } = useApp();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.appeals.list();
      setAppeals(res.appeals || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load appeals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const handleDecide = async (id: string, status: 'approved' | 'rejected', notes: string) => {
    try {
      const res = await api.appeals.decide(id, status, notes);
      setAppeals(prev => prev.map(a => (a.id === id ? res.appeal : a)));
      addToast(
        status === 'approved' ? 'success' : 'info',
        'Appeal Decided',
        `Appeal ${id} marked ${status.toUpperCase()} in Firestore.`
      );
    } catch (err: any) {
      addToast('error', 'Decision Error', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Panel B · Organizer / Security</span>
            <span>/</span>
            <span>B8. Flagged Attendee Appeals</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Attendee Appeals Queue
          </h1>
        </div>

        <Badge variant="amber">
          {appeals.filter(a => a.status === 'pending').length} PENDING DECISION
        </Badge>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-yellow animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading appeals from Firestore...</p>
        </div>
      ) : error ? (
        <Card variant="default" className="border-rose-500/30 p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-stamp uppercase text-white font-bold">Failed to load appeals</h2>
          <p className="text-xs text-slate-400 font-mono">{error}</p>
          <Button onClick={fetchAppeals} size="sm" variant="primary">
            Retry
          </Button>
        </Card>
      ) : appeals.length === 0 ? (
        <Card variant="glass" className="text-center py-12 space-y-3">
          <LifeBuoy className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white font-display">No Flagged Appeals in Queue</h3>
          <p className="text-xs text-slate-400">
            When an attendee's receipt is flagged by rate limits or proxy checks, they can submit an explanation here.
          </p>
        </Card>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Appeal ID</TableHeaderCell>
              <TableHeaderCell>User Email</TableHeaderCell>
              <TableHeaderCell>Drop Event</TableHeaderCell>
              <TableHeaderCell>Submitted Reason</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {appeals.map(appeal => (
              <TableRow key={appeal.id}>
                <TableCell className="font-mono text-brand-yellow font-bold">
                  {appeal.id}
                </TableCell>

                <TableCell className="font-mono text-xs text-white">
                  {appeal.userEmail}
                </TableCell>

                <TableCell className="text-xs text-slate-300">
                  {appeal.dropName}
                </TableCell>

                <TableCell className="text-xs text-slate-300 max-w-xs">
                  <p className="line-clamp-2 italic">"{appeal.reason}"</p>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={
                      appeal.status === 'approved'
                        ? 'emerald'
                        : appeal.status === 'rejected'
                        ? 'rose'
                        : 'amber'
                    }
                    size="sm"
                  >
                    {appeal.status.toUpperCase()}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  {appeal.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleDecide(appeal.id, 'approved', 'Identity verified as genuine fan.')}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDecide(appeal.id, 'rejected', 'Automated proxy cluster confirmed.')}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500">
                      Decided by {appeal.decidedBy || 'Security Analyst'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
