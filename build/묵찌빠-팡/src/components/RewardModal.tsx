import React from 'react';
import { Sparkles, X, Coins, Ticket } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const RewardModal: React.FC = () => {
  const { rewardModal, closeRewardModal } = useGame();

  if (!rewardModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border-2 border-amber-400/80 p-6 shadow-2xl shadow-amber-500/30 text-center animate-scale-up">
        {/* Background glow rays */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={closeRewardModal}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
          id="close-reward-modal-btn"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/40 mb-4 animate-bounce">
          {rewardModal.icon || '🎁'}
        </div>

        <h3 className="text-xl font-black text-white flex items-center justify-center gap-1.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          {rewardModal.title}
        </h3>

        <p className="text-xs text-slate-300 font-medium mt-2 leading-relaxed">
          {rewardModal.message}
        </p>

        {/* Reward Badges */}
        {(rewardModal.points || rewardModal.tickets) && (
          <div className="my-4 flex items-center justify-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-amber-500/40">
            {rewardModal.points && (
              <div className="flex items-center gap-1.5 text-amber-300 font-black text-sm">
                <Coins className="w-4 h-4 fill-amber-400" />
                +{rewardModal.points.toLocaleString()} P
              </div>
            )}
            {rewardModal.tickets && (
              <div className="flex items-center gap-1.5 text-cyan-300 font-black text-sm">
                <Ticket className="w-4 h-4 fill-cyan-400" />
                +{rewardModal.tickets} 장
              </div>
            )}
          </div>
        )}

        <button
          onClick={closeRewardModal}
          className="w-full mt-2 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
          id="confirm-reward-modal-btn"
        >
          확인
        </button>
      </div>
    </div>
  );
};
