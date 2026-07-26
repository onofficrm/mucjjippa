import React, { useState } from 'react';
import { Trophy, RotateCcw, ArrowRight, Coins, Sparkles, Flame, Share2, Swords, Home } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { ShareResultModal } from '../components/ShareResultModal';

export const GameResultPage: React.FC = () => {
  const { activeMatch, restartMatch, navigateTo, user, selectedRoom, startMatchmaking } = useGame();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  if (!activeMatch) return null;

  const isWin = activeMatch.matchWinner === 'player' || activeMatch.roundResult === 'win';
  // 보상 금액은 서버 정산값을 그대로 사용한다.
  const rewardPoints = isWin ? activeMatch.rewardPoints ?? activeMatch.stakePoints * 2 : 0;

  const handleNextOpponent = () => {
    if (selectedRoom) {
      startMatchmaking(selectedRoom);
    } else {
      navigateTo('versus_rooms');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] max-w-md mx-auto text-center p-4">
      {/* Result Graphic & Crown */}
      <div className="relative mb-6">
        <div
          className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center text-6xl shadow-2xl border-4 ${
            isWin
              ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 border-yellow-200 shadow-amber-500/50 animate-gold-burst'
              : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-slate-950 animate-shake'
          }`}
        >
          {isWin ? '🏆' : '💀'}
        </div>

        {isWin && (
          <div className="absolute -top-4 -right-2 bg-gradient-to-r from-red-500 to-amber-500 text-white font-black text-xs px-3 py-1 rounded-full border border-amber-300 shadow-lg flex items-center gap-1 animate-bounce">
            <Flame className="w-3.5 h-3.5 fill-white" />
            {user.currentStreak}연승 달성!
          </div>
        )}
      </div>

      {/* Main Title */}
      <h2
        className={`text-2xl sm:text-3xl font-black ${
          isWin ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'text-slate-400'
        }`}
      >
        {isWin ? 'VICTORY! 승리하셨습니다!' : 'DEFEAT... 아쉬운 패배'}
      </h2>

      <p className="text-xs text-slate-300 mt-1 font-semibold">
        {activeMatch.opponent.nickname} 님과의 대결 결과
      </p>

      {/* Reward Card */}
      <div className="w-full my-6 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
          <span className="text-slate-400 font-medium">배팅 포인트방</span>
          <span className="font-bold text-slate-200">{activeMatch.roomName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">획득 보상</span>
          {isWin ? (
            <span className="font-black text-lg text-amber-400 flex items-center gap-1">
              <Coins className="w-4 h-4 fill-amber-400" />
              +{rewardPoints.toLocaleString()} P
            </span>
          ) : (
            <span className="font-bold text-xs text-slate-500">보상 없음 (입장료 차감)</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
          <span className="text-slate-400 font-medium">획득 경험치</span>
          <span className="font-bold text-cyan-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            +{isWin ? 50 : 10} EXP
          </span>
        </div>
      </div>

      {/* Bottom Action Buttons: Rematch, Next Opponent, Main, Share */}
      <div className="w-full space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* 1. 재대결 */}
          <button
            onClick={restartMatch}
            className={`py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
              !isWin
                ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white ring-2 ring-amber-400 animate-pulse'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950'
            }`}
            id="result-rematch-btn"
          >
            <RotateCcw className="w-4 h-4" />
            <span>재대결하기</span>
          </button>

          {/* 2. 다음 상대 찾기 */}
          <button
            onClick={handleNextOpponent}
            className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition-all"
            id="result-next-opp-btn"
          >
            <Swords className="w-4 h-4 text-cyan-400" />
            <span>다음 상대 찾기</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 3. 메인으로 */}
          <button
            onClick={() => navigateTo('home')}
            className="py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            id="result-go-home-btn"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>메인으로</span>
          </button>

          {/* 4. 결과 공유 */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 transition-all"
            id="result-share-btn"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span>결과 공유</span>
          </button>
        </div>
      </div>

      <ShareResultModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} />
    </div>
  );
};
