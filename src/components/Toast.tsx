import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  show: boolean;
  message: string;
  description?: string;
  type: ToastType;
}

interface ToastProps extends Omit<ToastConfig, 'show'> {
  onClose: () => void;
}

export function Toast({ message, description, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 size={24} className="shrink-0" />,
    error: <XCircle size={24} className="shrink-0" />,
    warning: <AlertTriangle size={24} className="shrink-0" />,
    info: <Info size={24} className="shrink-0" />,
  };

  const themeStyles = {
    success: 'bg-[#172033] text-white shadow-xl shadow-black/10 border border-slate-100/20',
    error: 'bg-rose-600 text-white shadow-xl shadow-rose-600/20 border border-rose-500',
    warning: 'bg-[#C99A2E] text-[#172033] shadow-xl shadow-[#C99A2E]/20 border border-[#C99A2E]',
    info: 'bg-[#0362D0] text-white shadow-xl shadow-[#0362D0]/20 border border-[#0362D0]',
  };

  return (
    <div className={cn(
      "fixed top-4 sm:top-8 left-4 right-4 sm:left-auto sm:right-8 max-w-md z-[100] px-4 sm:px-5 py-3 sm:py-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-5 fade-in duration-300 shadow-2xl",
      themeStyles[type]
    )}>
      {icons[type]}
      <div className="flex-1 mr-4 mt-0.5">
        <p className="text-sm font-black">{message}</p>
        {description && <p className="text-xs font-medium mt-1 opacity-90 leading-relaxed">{description}</p>}
      </div>
      <button onClick={onClose} className="shrink-0 p-1 mt-0.5 opacity-70 hover:opacity-100 transition-opacity rounded-lg cursor-pointer">
        <X size={16} />
      </button>
    </div>
  );
}
