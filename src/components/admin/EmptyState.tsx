import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionText,
  onAction,
}) => {
  const btnText = actionText || actionLabel;
  return (
    <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/5 space-y-4 max-w-md mx-auto my-8">
      <div className="w-12 h-12 mx-auto rounded-xl bg-white/5 text-slate-400 flex items-center justify-center border border-white/10">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-stamp font-black text-white uppercase tracking-tight">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-slate-400 font-sans">
            {description}
          </p>
        )}
      </div>
      {btnText && onAction && (
        <div className="pt-2">
          <Button size="sm" variant="secondary" onClick={onAction}>
            {btnText}
          </Button>
        </div>
      )}
    </div>
  );
};
