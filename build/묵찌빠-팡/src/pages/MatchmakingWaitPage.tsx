import React, { useEffect, useState } from 'react';
import { Swords, X, Radar, HelpCircle, Users, Clock, ShieldAlert } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const MatchmakingWaitPage: React.FC = () => {
  const { selectedRoom, cancelMatchmaking, user } = useGame();
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center p-4 max-w-md mx-auto">
      {/* Header Room Tag */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-black text-amber-300 shadow mb-6">
        <Swords className="w-3.5 h-3.5 text-amber-400" />
        <span>{selectedRoom?.title || '1:1 포인트 대전'}</span>
        <span className="text-slate-500">|</span>
        <span className="text-cyan-400">입장료 {selectedRoom?.entryFee.toLocaleString()}P</span>
      </div>

      {/* Radar vs Silhouette Animation Arena */}
      <div className="relative w-full max-w-sm h-52 sm:h-60 rounded-3xl bg-slate-950/90 border border-cyan-500/30 p-6 flex items-center justify-around shadow-2xl overflow-hidden mb-6">
        {/* Radar Background Glow */}
        <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 rounded-3xl border border-dashed border-cyan-400/20 animate-spin pointer-events-none" style={{ animationDuration: '15s' }} />

        {/* Left: My Avatar */}
        <div className="flex flex-col items-center z-10">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-xl shadow-cyan-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-4xl">
              {user.avatar}
            </div>
          </div>
          <span className="text-xs font-black text-white mt-2 truncate max-w-[80px]">
            {user.nickname}
          </span>
          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full mt-0.5">
            나 (ME)
          </span>
        </div>

        {/* Center Radar Scanner Indicator */}
        <div className="flex flex-col items-center z-10">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
            <Radar className="w-8 h-8 text-cyan-300 animate-spin stroke-[2]" />
          </div>
          <span className="text-[10px] font-extrabold text-cyan-300 mt-2 font-mono">
            {seconds}초 대기 중
          </span>
        </div>

        {/* Right: Opponent Silhouette */}
        <div className="flex flex-col items-center z-10 opacity-80">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-slate-900 border-2 border-dashed border-red-500/50 flex items-center justify-center text-4xl shadow-xl animate-pulse">
            <span className="filter grayscale blur-[1px]">👤</span>
          </div>
          <span className="text-xs font-black text-slate-400 mt-2">
            상대 탐색 중...
          </span>
          <span className="text-[9px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full mt-0.5">
            매칭 대기
          </span>
        </div>
      </div>

      {/* Waiting Stats */}
      <div className="w-full grid grid-cols-2 gap-2 mb-6">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-slate-400 font-bold block">현재 대기 인원</span>
            <span className="text-xs font-black text-cyan-300">
              {selectedRoom?.activePlayers || 42}명 온라인
            </span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-slate-400 font-bold block">예상 매칭 시간</span>
            <span className="text-xs font-black text-amber-300">약 2~4초</span>
          </div>
        </div>
      </div>

      {/* Game Help Tip Box */}
      <div className="w-full bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl text-left text-xs space-y-1.5 mb-6">
        <div className="flex items-center gap-1.5 font-black text-slate-200">
          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>게임 도움말 (1:1 포인트 대전)</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-5.5">
          • 승리 시 입장료의 <strong className="text-amber-300">2배 포인트</strong>가 서버에서 지급됩니다.
          <br />
          • 상대 확정 전 취소 시 참가비는 아직 차감되지 않습니다. 확정 후에는 연결 종료 정책이 적용됩니다.
        </p>
      </div>

      {/* Cancel Button */}
      <button
        onClick={cancelMatchmaking}
        className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
        id="cancel-matchmaking-btn"
      >
        <X className="w-4 h-4 text-red-400 stroke-[3]" />
        <span>매칭 취소</span>
      </button>
    </div>
  );
};
