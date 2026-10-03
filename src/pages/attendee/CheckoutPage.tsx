import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Countdown } from '@/components/ui/Countdown';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  Lock,
  RotateCcw,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    drops,
    getDrop,
    user,
    seats,
    activeReservation,
    checkoutSeat,
    releaseSeat,
    addToast,
  } = useApp();

  const drop = getDrop(id || 'drop-jack-white-vault') || drops[0];
  const assignedSeat = seats.find(s => s.id === activeReservation?.seatId) || seats[12];

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [payIdempotencyKey] = useState<string>(() => `pay_idemp_${Date.now().toString(36)}`);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const ticket = await checkoutSeat(assignedSeat.id, paymentMethod);
      setIsProcessing(false);
      navigate('/me');
    } catch (err: any) {
      setIsProcessing(false);
      addToast('error', 'Payment Failed', err.message);
    }
  };

  const handleRelease = () => {
    if (activeReservation) {
      releaseSeat(activeReservation.id);
      navigate('/');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link to={`/drops/${drop.id}`} className="hover:text-brand-yellow">← {drop.name}</Link>
            <span>/</span>
            <span>Seat Hold Checkout</span>
          </div>
          <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight mt-1">
            Claim Allocated Seat
          </h1>
        </div>

        <Badge variant="emerald" dot>
          5-MINUTE TIMED HOLD ACTIVE
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Checkout Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="glass" className="space-y-6">
            
            {/* Hold Timer Alert Box */}
            <div className="p-4 rounded-xl bg-brand-yellow/10 border border-brand-yellow/30 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-mono text-brand-yellow font-bold block">
                  Time Remaining to Complete Payment
                </span>
                <span className="text-[11px] text-slate-400">
                  If this timer expires, the seat is forfeited to the waitlist.
                </span>
              </div>
              <Countdown targetDate={new Date(Date.now() + 1000 * 280).toISOString()} size="md" />
            </div>

            {/* Payment Method Switcher */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-slate-300 block">Payment Method (Simulated)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                    paymentMethod === 'card'
                      ? 'bg-surface-50 border-brand-yellow text-white'
                      : 'bg-surface-200 border-white/10 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-brand-yellow" />
                  <div className="text-left">
                    <span className="text-xs font-bold block">Credit / Debit</span>
                    <span className="text-[10px] text-slate-400 font-mono">Simulated Card</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                    paymentMethod === 'upi'
                      ? 'bg-surface-50 border-brand-yellow text-white'
                      : 'bg-surface-200 border-white/10 text-slate-400'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-cyan-400" />
                  <div className="text-left">
                    <span className="text-xs font-bold block">Instant UPI</span>
                    <span className="text-[10px] text-slate-400 font-mono">Simulated UPI App</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handlePay} className="space-y-4">
              {paymentMethod === 'card' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400 block">Card Number (Simulated)</label>
                    <input
                      type="text"
                      readOnly
                      value="4242 •••• •••• 4242"
                      className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 block">Expiry</label>
                      <input
                        type="text"
                        readOnly
                        value="12/28"
                        className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 block">CVC</label>
                      <input
                        type="text"
                        readOnly
                        value="888"
                        className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 block">Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    readOnly
                    value="alex.chen@okaxis"
                    className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-mono"
                  />
                </div>
              )}

              {/* Notice */}
              <div className="p-3 rounded-lg bg-surface-200 border border-white/10 text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-yellow" />
                  <span>Official Free Tier Simulation</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  No real funds will be deducted. Clicking Pay generates a cryptographically signed HMAC QR ticket.
                </p>
                <div className="font-mono text-[10px] text-slate-500 pt-1">
                  Idempotency Key: {payIdempotencyKey}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  size="xl"
                  variant="primary"
                  className="flex-1"
                  isLoading={isProcessing}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Confirm & Pay ${drop.price} (Simulated)
                </Button>
                <Button
                  type="button"
                  size="xl"
                  variant="ghost"
                  onClick={handleRelease}
                  className="text-slate-400 hover:text-rose-400"
                >
                  Release Seat
                </Button>
              </div>
            </form>

          </Card>
        </div>

        {/* Right Column: Seat Details & Location */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="default" className="border-brand-yellow/30">
            <CardTitle className="text-base">Assigned Seat Allocation</CardTitle>
            
            <div className="mt-4 p-5 rounded-2xl bg-surface-200 border border-white/10 text-center space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block">
                Auditorium Reservation
              </span>
              <div className="text-2xl font-stamp font-black text-brand-yellow">
                {assignedSeat.label}
              </div>
              <p className="text-xs text-slate-300">
                {drop.venue}, {drop.city}
              </p>
            </div>

            <div className="mt-4 divide-y divide-white/10 text-xs font-mono">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Seat Price</span>
                <span className="text-white font-bold">${drop.price} USD</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Booking Fee</span>
                <span className="text-emerald-400 font-bold">$0.00 (Zero Fee)</span>
              </div>
              <div className="py-2.5 flex justify-between text-sm">
                <span className="text-white font-bold">Total Due</span>
                <span className="text-brand-yellow font-black">${drop.price} USD</span>
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};
