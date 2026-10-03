import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'stamp';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#090a0f] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-lg gap-2',
    lg: 'text-base px-6 py-3 rounded-xl gap-2.5 font-bold',
    xl: 'text-lg px-8 py-4 rounded-xl gap-3 font-bold tracking-tight',
  };

  const variantStyles = {
    primary: 'bg-brand-yellow text-black hover:bg-yellow-400 focus:ring-brand-yellow shadow-glow-yellow font-display hover:shadow-lg',
    secondary: 'bg-surface-100 text-slate-100 hover:bg-surface-50 border border-white/10 hover:border-white/20 focus:ring-slate-400',
    outline: 'bg-transparent text-slate-200 border border-white/20 hover:border-brand-yellow hover:text-brand-yellow focus:ring-brand-yellow',
    danger: 'bg-rose-600/90 text-white hover:bg-rose-500 focus:ring-rose-500 shadow-glow-rose',
    ghost: 'bg-transparent text-slate-300 hover:text-white hover:bg-white/5 focus:ring-white/20',
    stamp: 'bg-brand-yellow text-black uppercase tracking-wider font-stamp border-2 border-black hover:bg-white hover:text-black transition-colors',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
