import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090a0f] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-surface-100 border border-white/10 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h2 className="text-xl font-stamp font-black text-white uppercase tracking-tight">
              Something Interrupted the View
            </h2>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Fair Drop caught an unexpected UI error. You can restore default clean demo state with 1 click.
            </p>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-black/50 border border-white/5 text-[11px] font-mono text-rose-300/80 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-3 rounded-lg bg-brand-yellow text-black font-bold text-xs hover:bg-brand-yellow/90 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo State</span>
              </button>
              
              <button
                onClick={() => (window.location.href = '/')}
                className="py-2 px-3 rounded-lg bg-white/10 text-white font-semibold text-xs hover:bg-white/15 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
