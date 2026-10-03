import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'yellow' | 'emerald' | 'cyan' | 'rose' | 'amber' | 'slate' | 'outline' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 font-semibold tracking-wide uppercase rounded-full select-none';

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 leading-none',
    md: 'text-xs px-2.5 py-1 leading-none',
    lg: 'text-sm px-3 py-1.5 leading-none',
  };

  const variantStyles = {
    yellow: 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 font-display',
    emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    slate: 'bg-slate-800 text-slate-300 border border-slate-700',
    outline: 'bg-transparent text-slate-300 border border-white/20',
    pulse: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse',
  };

  const dotColors = {
    yellow: 'bg-brand-yellow',
    emerald: 'bg-emerald-400 animate-ping',
    cyan: 'bg-cyan-400',
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    slate: 'bg-slate-400',
    outline: 'bg-white',
    pulse: 'bg-emerald-400',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
