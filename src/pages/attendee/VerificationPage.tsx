import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';

export const VerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, sendPhoneOtp, verifyPhoneOtp, addToast } = useApp();

  const [phone, setPhone] = useState(user.phone || '+1 (555) 382-9901');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>(user.phoneVerified ? 'phone' : 'phone');
  const [isLoading, setIsLoading] = useState(false);
  const [dispatchedOtp, setDispatchedOtp] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const code = await sendPhoneOtp(phone);
    setDispatchedOtp(code);
    setIsLoading(false);
    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await verifyPhoneOtp(otpCode);
    setIsLoading(false);
    if (success) {
      setTimeout(() => navigate('/'), 1200);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-8">
      
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-2">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-stamp font-black text-white uppercase tracking-tight">
          Attendee Identity Verification
        </h1>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          To prevent Sybil bots and automated bulk registrations, each attendee must bind a verified phone number.
        </p>
      </div>

      <Card variant="glass" className="space-y-6">
        
        {/* Verification Status Header */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-200 border border-white/10">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-brand-yellow" />
            <div>
              <span className="text-xs font-mono text-slate-400 block">Current Identity Status</span>
              <span className="text-sm font-bold text-white">{user.email}</span>
            </div>
          </div>
          {user.phoneVerified ? (
            <Badge variant="emerald" dot>
              VERIFIED IDENTITY
            </Badge>
          ) : (
            <Badge variant="amber">UNVERIFIED</Badge>
          )}
        </div>

        {user.phoneVerified ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-white">Your Identity is Bound & Verified</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Phone hash is anchored in Firestore doc <code className="font-mono text-brand-yellow">identities/&#123;hash&#125;</code>.
                You are eligible to join all live and upcoming drops.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/drops/drop-jack-white-vault">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Go to Live Featured Drop
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 block">Mobile Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-sm bg-surface-200 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-brand-yellow"
                  />
                  <p className="text-[11px] text-slate-400">
                    Free tier demo mode: SMS is simulated. The OTP code will appear instantly in a toast alert.
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  className="w-full"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Send Verification OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 rounded-lg bg-brand-yellow/10 border border-brand-yellow/30 font-mono text-xs text-slate-200 flex items-center justify-between">
                  <span>Simulated OTP Code Dispatched:</span>
                  <span className="font-bold text-brand-yellow text-sm tracking-widest">{dispatchedOtp || '772910'}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 block">Enter 6-Digit Code</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="772910"
                      className="w-full pl-9 pr-3 py-2 text-lg tracking-widest text-center font-mono font-bold bg-surface-200 border border-white/10 rounded-lg text-brand-yellow focus:outline-none focus:border-brand-yellow"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    className="flex-1"
                    onClick={() => setStep('phone')}
                  >
                    Change Phone
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="flex-1"
                    isLoading={isLoading}
                  >
                    Verify Code
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Security Info */}
        <div className="p-4 rounded-xl bg-surface-200 border border-white/10 space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Lock className="w-3.5 h-3.5 text-brand-yellow" />
            <span>One Identity = One Entry Constraint</span>
          </div>
          <p className="leading-relaxed">
            In Firestore, identity document IDs are stored as the cryptographic SHA-256 hash of the phone number.
            If duplicate registration requests occur, the atomic Firestore write fails immediately, guaranteeing that
            1 identity cannot hold multiple entries.
          </p>
        </div>

      </Card>
    </div>
  );
};
