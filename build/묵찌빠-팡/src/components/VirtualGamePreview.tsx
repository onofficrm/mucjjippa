import React, { useState, useEffect } from 'react';
import { Eye, Swords, Trophy, Sparkles, RefreshCw, Flame, ArrowRight } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { RPSChoice } from '../types';

export const VirtualGamePreview: React.FC = () => {
  const { navigateTo } = useGame();

  const mockVirtualMatches = [
    {
      p1: { name: '전설의주먹 (1위)', avatar: '👑', record: '142승 12패' },
      p2: { name: '네온닌자 (3위)', avatar: '🥷', record: '89승 24패' },
      p1Choice: 'rock' as RPSChoice,
      p2Choice: 'scissors' as RPSChoice,
      winner: 'p1',
      winPoints: 38000,
    },
    {
      p1: { name: '골드마스터', avatar: '👑', record: '64승 18패' },
      p2: { name: '불패가위바위', avatar: '🔥', record: '72승 21패' },
      p1Choice: 'scissors' as RPSChoice,
      p2Choice: 'paper' as RPSChoice,
      winner: 'p1',
      winPoints: 19000,
    },
    {
      p1: { name: '승리의가위바위보', avatar: '⚡', record: '110승 30패' },
      p2: { name: '사이보그AI', avatar: '🤖', record: '95승 40패' },
      p1Choice: 'paper' as RPSChoice,
      p2Choice: 'rock' as RPSChoice,
      winner: 'p1',
      winPoints: 100000,
    },
  ];

  const [matchIdx, setMatchIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [phase, setPhase] = useState<'countdown' | 'reveal' | 'result'>('countdown');

  const currentMatch = mockVirtualMatches[matchIdx];

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === 'countdown') {
      if (countdown > 1) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        timer = setTimeout(() => {
          setPhase('reveal');
        }, 1000);
      }
    } else if (phase === 'reveal') {
      timer = setTimeout(() => {
        setPhase('result');
      }, 1200);
    } else if (phase === 'result') {
      timer = setTimeout(() => {
        setMatchIdx((prev) => (prev + 1) % mockVirtualMatches.length);
        setCountdown(3);
        setPhase('countdown');
      }, 3500);
    }

    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const getHandEmoji = (choice: RPSChoice) => {
    if (choice === 'rock') return '✊';
    if (choice === 'paper') return '✋';
    if (choice === 'scissors') return '✌️';
    return '✊';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-xl">
      {/* Background Subtle Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-cyan-400" />
            실시간 1:1 관전 미리보기
          </h3>
        </div>

        {/* Small watermark tag as requested in prompt */}
        <span className="text-[10px] font-black bg-slate-800/90 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full shadow">
          🎮 게임 화면 미리보기
        </span>
      </div>

      {/* Virtual Game Field */}
      <div className="relative bg-slate-950/90 border border-slate-800 rounded-2xl p-4 my-3 overflow-hidden shadow-inner min-h-[160px] flex flex-col justify-between">
        {/* Players Top Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Player 1 */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-400/50 flex items-center justify-center text-xl shadow">
              {currentMatch.p1.avatar}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white truncate max-w-[100px]">
                {currentMatch.p1.name}
              </span>
              <span className="text-[9px] text-slate-400 font-bold">전적: {currentMatch.p1.record}</span>
            </div>
          </div>

          <span className="text-xs font-black text-slate-600 tracking-widest">VS</span>

          {/* Player 2 */}
          <div className="flex items-center gap-2 text-right">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-white truncate max-w-[100px]">
                {currentMatch.p2.name}
              </span>
              <span className="text-[9px] text-slate-400 font-bold">전적: {currentMatch.p2.record}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-purple-400/50 flex items-center justify-center text-xl shadow">
              {currentMatch.p2.avatar}
            </div>
          </div>
        </div>

        {/* Arena Center Action */}
        <div className="my-4 flex items-center justify-center min-h-[64px]">
          {phase === 'countdown' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                가위바위보 패 선택 중...
              </span>
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-cyan-400/60 flex items-center justify-center font-mono font-black text-2xl text-cyan-300 animate-bounce shadow-lg">
                {countdown}
              </div>
            </div>
          )}

          {phase === 'reveal' && (
            <div className="flex items-center justify-center gap-8 text-4xl sm:text-5xl animate-pulse">
              <span className="animate-spin">{getHandEmoji(currentMatch.p1Choice)}</span>
              <span className="text-xs font-black text-amber-400">⚡</span>
              <span className="animate-spin">{getHandEmoji(currentMatch.p2Choice)}</span>
            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col items-center gap-1 animate-scaleUp">
              <div className="flex items-center gap-6 text-4xl sm:text-5xl">
                <div
                  className={`p-2 rounded-2xl border ${
                    currentMatch.winner === 'p1'
                      ? 'bg-amber-500/20 border-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                      : 'opacity-40 border-slate-800'
                  }`}
                >
                  {getHandEmoji(currentMatch.p1Choice)}
                </div>
                <span className="text-xs font-extrabold text-slate-500">VS</span>
                <div
                  className={`p-2 rounded-2xl border ${
                    currentMatch.winner === 'p2'
                      ? 'bg-amber-500/20 border-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                      : 'opacity-40 border-slate-800'
                  }`}
                >
                  {getHandEmoji(currentMatch.p2Choice)}
                </div>
              </div>

              <div className="mt-2 text-center">
                <span className="text-xs font-black text-amber-300 flex items-center justify-center gap-1">
                  🎉 {currentMatch.p1.name} 승리! (+{currentMatch.winPoints.toLocaleString()}P 획득)
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  3초 후 다음 경기 자동 재생
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 3 Action Buttons as required by prompt */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={() => navigateTo('versus_rooms')}
          className="py-2.5 px-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow transition-transform active:scale-95 flex items-center justify-center gap-1"
        >
          <span>나도 대전하기</span>
        </button>

        <button
          onClick={() => navigateTo('tournament_lobby')}
          className="py-2.5 px-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs shadow transition-transform active:scale-95 flex items-center justify-center gap-1"
        >
          <span>토너먼트 참가</span>
        </button>

        <button
          onClick={() => navigateTo('spectate')}
          className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-black rounded-xl text-xs transition-transform active:scale-95 flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>전체화면 관전</span>
        </button>
      </div>
    </div>
  );
};
