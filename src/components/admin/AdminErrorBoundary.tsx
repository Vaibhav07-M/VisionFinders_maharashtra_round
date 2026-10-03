import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AdminErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-2xl bg-[#10121a] border border-rose-500/20 max-w-xl mx-auto my-12">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-stamp font-black text-white uppercase tracking-tight">
              Admin Module Error
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
            </p>
          </div>
          <div className="pt-2">
            <Button size="md" variant="secondary" onClick={this.handleReset} leftIcon={<RotateCcw className="w-4 h-4" />}>
              Reload Panel
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
