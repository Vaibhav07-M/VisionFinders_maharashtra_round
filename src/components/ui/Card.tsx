import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'glow' | 'ticket' | 'flat';
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  padded = true,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-xl transition-all duration-200 overflow-hidden';
  
  const variantStyles = {
    glass: 'bg-[#12141c]/80 backdrop-blur-md border border-white/10 shadow-glass',
    glow: 'bg-[#12141c]/90 border border-brand-yellow/30 shadow-glow-yellow/20',
    default: 'bg-surface-100 border border-white/10',
    ticket: 'bg-[#12141c] border border-white/15 relative ticket-stub',
    flat: 'bg-surface-200 border border-transparent',
  };

  const paddingStyle = padded ? 'p-5 sm:p-6' : '';

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${paddingStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mb-4 flex items-center justify-between gap-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-lg font-bold font-display text-white tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-sm text-slate-400 mt-1 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);
