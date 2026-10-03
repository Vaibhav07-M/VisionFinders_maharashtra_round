import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to Load Data',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
}) => {
  return (
    <div className="p-8 text-center rounded-2xl bg-[#0e1018] border border-rose-500/20 space-y-4 max-w-md mx-auto my-8">
      <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-stamp font-black text-white uppercase tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-slate-400 font-mono">
          {message}
        </p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button size="sm" variant="secondary" onClick={onRetry} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
};
