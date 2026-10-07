import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  isDark?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isDark = this.props.isDark ?? false;
      return (
        <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center my-4 transition-all ${
          isDark 
            ? 'bg-slate-900/90 border-rose-900/50 text-slate-200' 
            : 'bg-rose-50/70 border-rose-200 text-slate-800'
        }`}>
          <div className={`p-3 rounded-xl mb-3 ${isDark ? 'bg-rose-950/60 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
            <AlertTriangle size={24} />
          </div>
          <h4 className={`text-base font-extrabold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {this.props.fallbackTitle || 'Não foi possível renderizar este componente'}
          </h4>
          <p className={`text-xs max-w-md mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {this.props.fallbackMessage || 'Ocorreu uma instabilidade pontual ao processar os dados deste gráfico ou painel.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Recarregar Componente</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
