import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'yellow' | 'emerald' | 'rose' | 'cyan' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  variant = 'default',
}) => {
  const borderColors = {
    default: 'border-white/10 hover:border-white/20',
    yellow: 'border-brand-yellow/30 bg-brand-yellow/[0.03]',
    emerald: 'border-emerald-500/30 bg-emerald-500/[0.03]',
    rose: 'border-rose-500/30 bg-rose-500/[0.03]',
    cyan: 'border-cyan-500/30 bg-cyan-500/[0.03]',
    purple: 'border-purple-500/30 bg-purple-500/[0.03]',
  };

  const textColors = {
    default: 'text-white',
    yellow: 'text-brand-yellow',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`p-5 rounded-2xl bg-[#0e1018] border transition-colors space-y-2 ${borderColors[variant]}`}>
      <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
        <span>{label}</span>
        {icon && <div className="shrink-0">{icon}</div>}
      </div>
      <div className={`text-3xl font-mono font-black tracking-tight ${textColors[variant]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtext && (
        <div className="text-[11px] text-slate-400 font-mono truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};
