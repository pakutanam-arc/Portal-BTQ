import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, LogOut } from 'lucide-react';
import { APP_NAME, APP_SUBTITLE, APP_LOGO } from '../assets/logo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-[#172033] select-none font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center space-y-5 animate-in fade-in zoom-in-95">
            {/* Header / Logo */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl p-1 bg-white ring-2 ring-[#C99A2E]/50 shadow-md">
                <img 
                  src={APP_LOGO} 
                  alt="Logo SMPN 102" 
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#950415] text-xs font-bold mb-2">
                <AlertCircle size={14} />
                <span>Terjadi Kendala Memuat Halaman</span>
              </div>
              <h2 className="text-lg font-black text-[#172033] tracking-tight">
                {APP_NAME} — {APP_SUBTITLE}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Aplikasi mendeteksi kendala saat memuat data atau koneksi. Silakan muat ulang halaman untuk melanjutkan.
              </p>
            </div>

            {/* Error Message Snippet if available */}
            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-auto max-h-24">
                <p className="font-mono text-[11px] text-red-600 font-semibold break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-[#0362D0] hover:bg-[#0252b3] text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Muat Ulang Halaman</span>
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={this.handleGoHome}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Home size={14} />
                  <span>Beranda</span>
                </button>
                <button
                  onClick={this.handleResetSession}
                  className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-[#950415] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Reset Sesi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
