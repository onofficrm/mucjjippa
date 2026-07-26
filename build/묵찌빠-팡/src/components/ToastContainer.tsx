import React from 'react';
import { useGame } from '../context/GameContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGame();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.slice(0, 3).map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between p-3 rounded-2xl shadow-xl border backdrop-blur-md text-xs font-bold transition-all transform animate-fade-in ${
            t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-500/20'
              : t.type === 'error'
              ? 'bg-red-950/90 border-red-500/50 text-red-200 shadow-red-500/20'
              : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200 shadow-cyan-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span>{t.message}</span>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
