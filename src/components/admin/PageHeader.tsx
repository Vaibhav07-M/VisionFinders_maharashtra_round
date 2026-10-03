import React from 'react';

interface PageHeaderProps {
  category?: string;
  title: string;
  description?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
  badgeText?: string;
  badgeVariant?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  category = 'PANEL B · OPERATIONS & ALLOCATION COMMAND',
  title,
  description,
  subtitle,
  actions,
  action,
  badgeText,
  badgeVariant,
}) => {
  const desc = description || subtitle;
  const acts = actions || action;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-stamp text-[10px] px-2 py-0.5 rounded bg-brand-yellow/15 text-brand-yellow font-extrabold uppercase border border-brand-yellow/30">
            {category}
          </span>
          {badgeText && (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-yellow/15 text-brand-yellow font-bold uppercase border border-brand-yellow/30">
              {badgeText}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-stamp font-black text-white uppercase tracking-tight">
          {title}
        </h1>
        {desc && (
          <p className="text-xs sm:text-sm text-slate-400 font-sans">
            {desc}
          </p>
        )}
      </div>

      {acts && (
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {acts}
        </div>
      )}
    </div>
  );
};
