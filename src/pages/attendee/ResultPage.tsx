import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Countdown } from '@/components/ui/Countdown';
import confetti from 'canvas-confetti';
import {
  Trophy,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

export const ResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    drops,
    getDrop,
    user,
    getUserEntry,
    activeReservation,
    submitAppeal,
    addToast,
  } = useApp();

  const drop = getDrop(id || 'drop-jack-white-vault') || drops[0];
  const userEntry = getUserEntry(drop.id);

  // Allow manual toggling of result state for testing/demo
  const [outcomeState, setOutcomeState] = useState<'won' | 'not_selected' | 'flagged'>(
    userEntry?.status === 'selected' || activeReservation ? 'won' : 'won'
  );

  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [holdExpiryDate] = useState<string>(() => new Date(Date.now() + 1000 * 300).toISOString());

  useEffect(() => {
    if (outcomeState === 'won') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffde00', '#10b981', '#ffffff'],
      });
    }
  }, [outcomeState]);

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) return;
    await submitAppeal(drop.id, appealReason);
    setAppealSubmitted(true);
    setAppealModalOpen(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 pb-20">
      
      {/* Demo Outcome Switcher Bar */}
      <div className="p-3 rounded-xl bg-surface-100 border border-white/10 flex items-center justify-between gap-3 text-xs">
        <span className="font-mono text-slate-400">Preview Result Outcome:</span>
        <div className="flex gap-1.5 font-mono">
          <button
            onClick={() => setOutcomeState('won')}
            className={`px-3 py-1 rounded transition-colors uppercase font-bold text-[10px] ${
              outcomeState === 'won' ? 'bg-emerald-500 text-black' : 'bg-surface-200 text-slate-300'
            }`}
          >
            Won (Selected)
          </button>
          <button
            onClick={() => setOutcomeState('not_selected')}
            className={`px-3 py-1 rounded transition-colors uppercase font-bold text-[10px] ${
              outcomeState === 'not_selected' ? 'bg-slate-700 text-white' : 'bg-surface-200 text-slate-300'
            }`}
          >
            Not Selected
          </button>
          <button
            onClick={() => setOutcomeState('flagged')}
            className={`px-3 py-1 rounded transition-colors uppercase font-bold text-[10px] ${
              outcomeState === 'flagged' ? 'bg-rose-500 text-white' : 'bg-surface-200 text-slate-300'
            }`}
          >
            Flagged (Appeal)
          </button>
        </div>
      </div>

      {/* OUTCOME: WON */}
      {outcomeState === 'won' && (
        <Card variant="ticket" className="p-8 sm:p-10 border-2 border-brand-yellow/60 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-yellow/15 border-2 border-brand-yellow text-brand-yellow mx-auto shadow-glow-yellow">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <Badge variant="yellow" size="lg" className="mb-2">
                DRAW WINNER · SEAT ALLOCATED
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-stamp font-black text-white uppercase tracking-tight">
                YOU WERE SELECTED!
              </h1>
              <p className="text-sm text-slate-300 max-w-md mx-auto mt-2">
                Your entry was selected in the verifiable seeded Fisher-Yates draw. An exclusive 5-minute seat hold is active.
              </p>
            </div>
          </div>

          {/* Hold Countdown */}
          <div className="p-6 rounded-2xl bg-black/60 border border-brand-yellow/30 text-center space-y-3">
            <span className="text-xs font-mono uppercase text-brand-yellow tracking-widest block">
              Hold Reservation Expires In
            </span>
            <div className="flex justify-center">
              <Countdown
                targetDate={holdExpiryDate}
                size="lg"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Unclaimed seats cascade automatically to the next person on the waitlist.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link to={`/drops/${drop.id}/checkout`} className="flex-1">
              <Button size="xl" variant="primary" className="w-full" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Proceed to Checkout (${drop.price})
              </Button>
            </Link>
            <Link to={`/proof/${drop.id}`} className="sm:w-auto">
              <Button size="xl" variant="outline" className="w-full">
                Verify Seed Proof
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* OUTCOME: NOT SELECTED */}
      {outcomeState === 'not_selected' && (
        <Card variant="glass" className="p-8 space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="slate" size="lg">DRAW RANK #842 OF 4,218</Badge>
            <h2 className="text-3xl font-stamp font-black text-white uppercase tracking-tight">
              Not Selected in Initial Draw
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              500 seats were filled. However, attendees who fail to checkout within their 5-minute hold
              will have their seats released to the waitlist in order.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-200 border border-white/10 max-w-md mx-auto font-mono text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Your Draw Position:</span>
              <span className="text-brand-yellow font-bold">#842</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Initial Winners Cutoff:</span>
              <span className="text-white font-bold">#500</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Waitlist Position:</span>
              <span className="text-cyan-400 font-bold">#342</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              size="lg"
              variant="primary"
              onClick={() => addToast('success', 'Waitlist Joined', 'You are #342 in line for released holds.')}
            >
              Join Priority Waitlist
            </Button>
            <Link to={`/proof/${drop.id}`}>
              <Button size="lg" variant="outline">
                Verify Mathematical Draw Position
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* OUTCOME: FLAGGED */}
      {outcomeState === 'flagged' && (
        <Card variant="glass" className="p-8 space-y-6 text-center border-rose-500/40">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="rose" size="lg">ENTRY FLAGGED BY DEFENCE RULE</Badge>
            <h2 className="text-3xl font-stamp font-black text-white uppercase tracking-tight">
              Entry Under Security Review
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your IP or device exhibited timing or proxy network anomalies during the open window.
              If you are a legitimate attendee, submit an appeal for security review.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Button
              size="lg"
              variant="danger"
              onClick={() => setAppealModalOpen(true)}
              disabled={appealSubmitted}
            >
              {appealSubmitted ? 'Appeal Submitted (In Review)' : 'Submit Attendee Appeal'}
            </Button>
          </div>
        </Card>
      )}

      {/* Appeal Submission Modal */}
      <Modal
        isOpen={appealModalOpen}
        onClose={() => setAppealModalOpen(false)}
        title="Submit Attendee Appeal"
        description="Explain your connection context (e.g. shared university WiFi or corporate VPN)."
      >
        <form onSubmit={handleAppealSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 block">Explanation / Context</label>
            <textarea
              required
              rows={4}
              value={appealReason}
              onChange={e => setAppealReason(e.target.value)}
              placeholder="e.g. I am a genuine fan entering from college dorm WiFi with friends. I am not running a bot script."
              className="w-full p-3 text-xs bg-surface-200 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setAppealModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Submit to Security Queue
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
