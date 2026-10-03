import React, { useState } from 'react';
import { Projector, Maximize2 } from 'lucide-react';

export interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number | string;
  badge?: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  subtitle,
  children,
  height = 300,
  badge,
}) => {
  const [isProjectorMode, setIsProjectorMode] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-all duration-300 p-5 ${
        isProjectorMode
          ? 'bg-black border-brand-yellow/60 shadow-glow-yellow'
          : 'bg-[#12141c]/90 border-white/10'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className={`font-display font-bold tracking-tight ${
                isProjectorMode ? 'text-2xl text-brand-yellow' : 'text-base sm:text-lg text-white'
              }`}
            >
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30 uppercase">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`text-xs mt-1 ${isProjectorMode ? 'text-slate-200 text-sm' : 'text-slate-400'}`}>
              {subtitle}
            </p>
          )}
        </div>

        <button
          onClick={() => setIsProjectorMode(!isProjectorMode)}
          className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border transition-colors ${
            isProjectorMode
              ? 'bg-brand-yellow text-black border-brand-yellow font-bold'
              : 'text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
          }`}
          title="Toggle High-Contrast Projector View"
        >
          <Projector className="w-3.5 h-3.5" />
          <span>{isProjectorMode ? 'Projector Mode: ON' : 'Projector Mode'}</span>
        </button>
      </div>

      <div style={{ height: typeof height === 'number' ? `${height}px` : height }} className="w-full">
        {children}
      </div>
    </div>
  );
};
