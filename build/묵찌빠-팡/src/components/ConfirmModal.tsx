import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const ConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirmModal } = useGame();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!confirmModal) return null;

  const handleConfirm = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      confirmModal.onConfirm();
    } finally {
      setIsSubmitting(false);
      closeConfirmModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-center">
        <button
          onClick={closeConfirmModal}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-2xl mb-3">
          <HelpCircle className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-black text-white">{confirmModal.title}</h3>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">{confirmModal.message}</p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            onClick={closeConfirmModal}
            disabled={isSubmitting}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl disabled:opacity-50"
          >
            {confirmModal.cancelText || '취소'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {confirmModal.confirmText || '확인'}
          </button>
        </div>
      </div>
    </div>
  );
};
