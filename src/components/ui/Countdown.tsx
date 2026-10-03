import React, { useState, useEffect } from 'react';

export interface CountdownProps {
  targetDate: string | Date;
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'giant';
  showLabels?: boolean;
}

export const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  onExpire,
  size = 'md',
  showLabels = true,
}) => {
  const targetTime = React.useMemo(() => {
    try {
      return new Date(targetDate).getTime();
    } catch (_) {
      return Date.now();
    }
  }, [typeof targetDate === 'string' ? targetDate : (targetDate as Date)?.getTime?.()]);

  const hasExpiredRef = React.useRef(false);

  const calculateTimeLeft = React.useCallback(() => {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  }, [targetTime]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    hasExpiredRef.current = false;
    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    if (initial.expired) {
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpire?.();
      }
      return;
    }

    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);
      if (updated.expired) {
        clearInterval(timer);
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpire?.();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTime, calculateTimeLeft, onExpire]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const unitStyles = {
    sm: 'text-sm font-mono font-bold px-2 py-1 bg-surface-100 rounded border border-white/10',
    md: 'text-xl sm:text-2xl font-mono font-bold px-3 py-1.5 bg-surface-100/90 rounded-lg border border-white/10 shadow-inner',
    lg: 'text-3xl sm:text-4xl font-mono font-bold px-4 py-2 bg-surface-100 rounded-xl border border-brand-yellow/30 text-brand-yellow shadow-glow-yellow/20',
    giant: 'text-4xl sm:text-6xl font-mono font-black px-5 py-3 bg-[#0d0e14] rounded-2xl border-2 border-brand-yellow text-brand-yellow shadow-glow-yellow',
  };

  const labelStyles = {
    sm: 'text-[9px] text-slate-400 uppercase mt-0.5 tracking-wider',
    md: 'text-[10px] text-slate-400 uppercase mt-1 tracking-wider',
    lg: 'text-xs text-slate-400 uppercase mt-1 tracking-widest',
    giant: 'text-sm text-slate-300 font-bold uppercase mt-2 tracking-widest',
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3" role="timer" aria-live="polite">
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
        <span className={`${unitStyles[size]} ${timeLeft.minutes === 0 ? 'text-rose-400 border-rose-500/40 animate-pulse' : ''}`}>
          {pad(timeLeft.seconds)}
        </span>
        {showLabels && <span className={labelStyles[size]}>Secs</span>}
      </div>
    </div>
  );
};
