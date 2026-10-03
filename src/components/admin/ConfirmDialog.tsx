import React, { useState } from 'react';
import { AlertOctagon, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  variant = 'danger',
  requireReason = true,
  reasonPlaceholder = 'Mandatory audit reason required...',
  onConfirm,
  onCancel,
  onClose,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const handleClose = onCancel || onClose || (() => {});
  const buttonLabel = confirmText || confirmLabel || 'Confirm Action';

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#0d0f17] border border-white/15 p-6 shadow-2xl space-y-5 animate-scale-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              variant === 'danger' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30'
            }`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-stamp font-black text-lg text-white uppercase tracking-tight">
                {title}
              </h3>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          {message}
        </p>

        {requireReason && (
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-slate-400 block">
              Audit Reason <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-sans"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            size="md"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button
            size="md"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={isLoading || (requireReason && !reason.trim())}
          >
            {isLoading ? 'Processing...' : buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
