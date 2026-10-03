import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useServerClock } from '@/hooks/useServerClock';

export interface CountdownProps {
  deadline?: number | string | Date;
  targetDate?: number | string | Date; // Backward compatibility
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'giant';
  showLabels?: boolean;
  className?: string;
}

export const Countdown: React.FC<CountdownProps> = ({
  deadline,
  targetDate,
  onExpire,
  size = 'md',
  showLabels = true,
  className = '',
}) => {
  const { now } = useServerClock();
  const rawTarget = deadline ?? targetDate ?? 0;

  const targetMs = useMemo(() => {
    if (typeof rawTarget === 'number') return rawTarget;
    if (rawTarget instanceof Date) return rawTarget.getTime();
    try {
      const parsed = new Date(rawTarget).getTime();
      return isNaN(parsed) ? 0 : parsed;
    } catch (_) {
      return 0;
    }
  }, [rawTarget]);

  const hasExpiredRef = useRef(false);

  // Compute time left strictly from synchronized server clock
  const getTimeLeft = useCallback(() => {
    if (targetMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
    }
    const currentServerTime = now();
    const diff = targetMs - currentServerTime;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      totalMs: diff,
      expired: false,
    };
  }, [targetMs, now]);

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    hasExpiredRef.current = false;
    const initial = getTimeLeft();
    setTimeLeft(initial);

    if (initial.expired) {
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpire?.();
      }
      return;
    }

    const interval = setInterval(() => {
      const updated = getTimeLeft();
      setTimeLeft(updated);
      if (updated.expired) {
        clearInterval(interval);
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpire?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMs, getTimeLeft, onExpire]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const unitStyles = {
    sm: 'text-xs font-mono font-bold px-1.5 py-0.5 bg-surface-100 rounded border border-white/10 text-white',
    md: 'text-xl sm:text-2xl font-mono font-bold px-3 py-1.5 bg-surface-100/90 rounded-lg border border-white/10 text-white shadow-inner',
    lg: 'text-3xl sm:text-4xl font-mono font-bold px-4 py-2 bg-surface-100 rounded-xl border border-brand-yellow/30 text-brand-yellow shadow-glow-yellow/20',
    giant: 'text-4xl sm:text-6xl font-mono font-black px-5 py-3 bg-[#0d0e14] rounded-2xl border-2 border-brand-yellow text-brand-yellow shadow-glow-yellow',
  };

  const labelStyles = {
    sm: 'text-[9px] text-slate-400 uppercase mt-0.5 tracking-wider',
    md: 'text-[10px] text-slate-400 uppercase mt-1 tracking-wider',
    lg: 'text-xs text-slate-400 uppercase mt-1 tracking-widest',
    giant: 'text-sm text-slate-300 font-bold uppercase mt-2 tracking-widest',
  };

  if (timeLeft.expired) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-mono text-rose-400 font-bold ${className}`}>
        <span className={unitStyles[size]}>00</span>
        <span className="text-slate-500 font-mono font-bold text-lg -mt-1">:</span>
        <span className={unitStyles[size]}>00</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`} role="timer" aria-live="polite">
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <span className={unitStyles[size]}>{pad(timeLeft.days)}</span>
          {showLabels && <span className={labelStyles[size]}>Days</span>}
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className={unitStyles[size]}>{pad(timeLeft.hours)}</span>
        {showLabels && <span className={labelStyles[size]}>Hours</span>}
      </div>
      <span className="text-slate-500 font-mono font-bold text-lg -mt-3">:</span>
      <div className="flex flex-col items-center">
        <span className={unitStyles[size]}>{pad(timeLeft.minutes)}</span>
        {showLabels && <span className={labelStyles[size]}>Mins</span>}
      </div>
      <span className="text-slate-500 font-mono font-bold text-lg -mt-3">:</span>
      <div className="flex flex-col items-center">
        <span className={unitStyles[size]}>{pad(timeLeft.seconds)}</span>
        {showLabels && <span className={labelStyles[size]}>Secs</span>}
      </div>
    </div>
  );
};
