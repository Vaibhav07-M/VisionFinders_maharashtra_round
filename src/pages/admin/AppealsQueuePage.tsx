import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SkeletonLoader } from '@/components/admin/SkeletonLoader';
import { ErrorState } from '@/components/admin/ErrorState';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  LifeBuoy,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  User,
  Fingerprint,
  Calendar,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getAdminHeaders } from '@/utils/api';

export const AppealsQueuePage: React.FC = () => {
  const { addToast } = useApp();

  // Status Tab: 'pending' | 'approved' | 'rejected'
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    appeal: any | null;
    decision: 'approved' | 'rejected' | null;
  }>({
    isOpen: false,
    appeal: null,
    decision: null,
  });

  const fetchAppeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/appeals?status=${activeTab}`, {
        headers: getAdminHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load appeals');
      const data = await res.json();
      setAppeals(data.appeals || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with appeals API.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  const handleConfirmDecision = async (reviewNote: string) => {
    if (!decisionModal.appeal || !decisionModal.decision) return;

    try {
      const res = await fetch(`/api/admin/appeals/${decisionModal.appeal.id}/decide`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          decision: decisionModal.decision,
          reviewNote,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record decision');
      }

      addToast(
        decisionModal.decision === 'approved' ? 'success' : 'info',
        'Appeal Decided',
        `Appeal ${decisionModal.appeal.id} was ${decisionModal.decision.toUpperCase()}. Entry status updated & audit logged.`
      );

      setDecisionModal({ isOpen: false, appeal: null, decision: null });
      fetchAppeals();
    } catch (err: any) {
      addToast('error', 'Decision Error', err.message);
    }
  };

  const pendingCount = appeals.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Participant Appeals Queue"
        subtitle="Review security challenge appeals from flagged attendees, inspect contributing risk signals, and approve or reject."
        badgeText={`${pendingCount} Pending Review`}
        badgeVariant={pendingCount > 0 ? 'warning' : 'primary'}
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        {(['pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
              activeTab === tab
                ? 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <SkeletonLoader count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAppeals} />
      ) : appeals.length === 0 ? (
        <EmptyState
          title={`No ${activeTab.toUpperCase()} Appeals`}
          description={
            activeTab === 'pending'
              ? 'All clear! There are currently no pending participant appeals waiting for security review.'
              : `No appeals currently in ${activeTab} status.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {appeals.map((appeal) => (
            <div
              key={appeal.id}
              className="p-6 bg-surface-100 border border-white/5 rounded-2xl hover:border-white/10 transition-colors space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-yellow/10 rounded-xl text-brand-yellow">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">Appeal #{appeal.id}</span>
                      <Badge
                        variant={
                          appeal.status === 'approved'
                            ? 'emerald'
                            : appeal.status === 'rejected'
                            ? 'rose'
                            : 'amber'
                        }
                      >
                        {appeal.status.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Drop ID: {appeal.dropId} · Submitted: {new Date(appeal.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {appeal.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setDecisionModal({ isOpen: true, appeal, decision: 'approved' })}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-black" /> Approve &amp; Clear
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDecisionModal({ isOpen: true, appeal, decision: 'rejected' })}
                      className="gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Appeal Reason Statement */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Participant Reason / Statement:
                </span>
                <p className="text-sm text-slate-200 italic font-sans leading-relaxed">
                  &quot;{appeal.reason || 'No statement provided by attendee.'}&quot;
                </p>
              </div>

              {/* Details & Signals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Identity & Metadata */}
                <div className="space-y-2 p-3 bg-surface-200/50 rounded-xl border border-white/5">
                  <span className="text-slate-400 uppercase tracking-wider block">Participant Details</span>
                  <div className="space-y-1 text-slate-300">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>UID: {appeal.uid || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
                      <span className="break-all">Identity: {appeal.identityKey}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Signals */}
                <div className="space-y-2 p-3 bg-surface-200/50 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 uppercase tracking-wider block">Entry Risk Signals</span>
                    <span className="font-bold text-amber-400">Score: {appeal.riskScore || 0}/100</span>
                  </div>
                  {appeal.signals && appeal.signals.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {appeal.signals.map((sig: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                          {sig}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>No critical automated signals triggered</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Note if Decided */}
              {appeal.status !== 'pending' && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs font-mono text-slate-300 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Reviewed by: {appeal.reviewedBy || 'operator'}</span>
                    <span>{appeal.reviewedAt ? new Date(appeal.reviewedAt).toLocaleString() : ''}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Review Note:</strong> {appeal.reviewNote || 'No notes provided.'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decision Confirmation Dialog with Required Review Note */}
      <ConfirmDialog
        isOpen={decisionModal.isOpen}
        onClose={() => setDecisionModal({ isOpen: false, appeal: null, decision: null })}
        onConfirm={handleConfirmDecision}
        title={
          decisionModal.decision === 'approved'
            ? 'Approve Appeal & Restore Eligibility'
            : 'Reject Appeal & Maintain Block'
        }
        message={
          decisionModal.decision === 'approved'
            ? `Approving this appeal will restore entry ${decisionModal.appeal?.identityKey?.slice(0, 10)}... to ELIGIBLE status. An audit record will be logged.`
            : `Rejecting this appeal will maintain the BLOCKED status on entry ${decisionModal.appeal?.identityKey?.slice(0, 10)}... An audit record will be logged.`
        }
        variant={decisionModal.decision === 'approved' ? 'primary' : 'danger'}
        confirmText={decisionModal.decision === 'approved' ? 'Approve Appeal' : 'Reject Appeal'}
        requireReason={true}
        reasonPlaceholder="Required operator review note (e.g. Identity verified via secondary channel)..."
      />
    </div>
  );
};
