import React from 'react';
import { AlertCircle, Gift, Coins, Home } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const InsufficientPointsModal: React.FC = () => {
  const { insufficientPointsModal, closeInsufficientPointsModal, navigateTo } = useGame();

  if (!insufficientPointsModal || !insufficientPointsModal.open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-red-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scaleUp relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-3xl shadow-lg">
          <AlertCircle className="w-8 h-8 text-red-400 animate-bounce" />
        </div>

        {/* Text */}
        <div>
          <h3 className="text-lg font-black text-white">포인트 부족 알림</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed font-semibold">
            포인트가 부족하여 게임에 참가할 수 없습니다. 포인트를 획득한 후 다시 진행해 주세요.
          </p>
          <div className="mt-2 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 py-1.5 px-3 rounded-xl inline-block">
            필요 포인트: {insufficientPointsModal.requiredPoints.toLocaleString()} P
          </div>
        </div>

        {/* 3 Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          {/* 1. 무료 포인트 받기 */}
          <button
            onClick={() => {
              closeInsufficientPointsModal();
              navigateTo('ad_detail');
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black rounded-2xl text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            id="modal-free-point-btn"
          >
            <Gift className="w-4 h-4 text-purple-200" />
            <span>무료 포인트 받기 (광고 시청)</span>
          </button>

          {/* 2. 포인트 충전 */}
          <button
            onClick={() => {
              closeInsufficientPointsModal();
              navigateTo('point_topup');
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            id="modal-point-topup-btn"
          >
            <Coins className="w-4 h-4 fill-slate-950" />
            <span>포인트 충전</span>
          </button>

          {/* 3. 메인으로 */}
          <button
            onClick={() => {
              closeInsufficientPointsModal();
              navigateTo('home');
            }}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            id="modal-go-main-btn"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>메인으로</span>
          </button>
        </div>
      </div>
    </div>
  );
};
