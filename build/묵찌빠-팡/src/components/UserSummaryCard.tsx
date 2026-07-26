import React from 'react';
import { Trophy, Flame, Sparkles, Plus, Ticket, Coins, Crown, Award } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const UserSummaryCard: React.FC = () => {
  const { user, navigateTo } = useGame();

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/70 p-4 sm:p-5 shadow-xl shadow-cyan-950/30"
      id="user-summary-card"
    >
      {/* Background Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Avatar & Name Area */}
        <div className="flex items-center gap-3.5">
          <div className="relative group cursor-pointer" onClick={() => navigateTo('avatar')}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-400 via-cyan-400 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl sm:text-4xl select-none">
                {user.avatar}
              </div>
            </div>
            <div className="absolute -bottom-2 right-0 bg-slate-900 border border-amber-400/60 text-amber-300 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full shadow">
              Lv.{user.level}
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateTo('title')}
                className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full hover:bg-amber-500/30 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                {user.title}
              </button>
            </div>

            <h2 className="font-black text-lg sm:text-xl text-white tracking-wide">
              {user.nickname}
            </h2>

            {/* Points & Tickets Badges with Plus Buttons */}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              {/* Point Badge */}
              <div className="flex items-center gap-1.5 bg-slate-950/90 border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs font-black text-amber-300">
                <Coins className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{user.points.toLocaleString()}P</span>
                <button
                  onClick={() => navigateTo('point_topup')}
                  className="w-4 h-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center font-bold text-xs ml-1 shadow active:scale-90 transition-transform"
                  title="포인트 충전"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>

              {/* Ticket Badge */}
              <div className="flex items-center gap-1.5 bg-slate-950/90 border border-cyan-500/40 px-2.5 py-1 rounded-xl text-xs font-black text-cyan-300">
                <Ticket className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>{user.tickets}장</span>
                <button
                  onClick={() => navigateTo('ad_detail')}
                  className="w-4 h-4 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center font-bold text-xs ml-1 shadow active:scale-90 transition-transform"
                  title="티켓 획득 (광고)"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Stats Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
          {/* 개인전 전적 */}
          <div className="flex flex-col items-center justify-center p-1.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              개인전 전적
            </span>
            <span className="text-xs sm:text-sm font-black text-white mt-1">
              {user.wins.toLocaleString()}승 {user.losses.toLocaleString()}패
            </span>
            <span className="text-[9px] text-emerald-400 font-semibold mt-0.5">
              승률 {(((user.wins) / (user.wins + user.losses || 1)) * 100).toFixed(1)}%
            </span>
          </div>

          {/* 최대 연승 */}
          <div className="flex flex-col items-center justify-center p-1.5 border-x border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-500" />
              최대 연승
            </span>
            <span className="text-xs sm:text-sm font-black text-red-400 mt-1">
              {user.maxStreak}연승
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
              현재 {user.currentStreak}연승 중
            </span>
          </div>

          {/* 토너먼트 최고 기록 */}
          <div className="flex flex-col items-center justify-center p-1.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Crown className="w-3 h-3 text-purple-400" />
              토너먼트 기록
            </span>
            <span className="text-xs sm:text-sm font-black text-purple-300 mt-1">
              {user.tournamentBestRecord || '3위 2회'}
            </span>
            <span className="text-[9px] text-cyan-400 font-semibold mt-0.5">
              메인 토너먼트
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
