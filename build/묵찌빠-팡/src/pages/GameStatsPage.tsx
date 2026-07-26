import React from 'react';
import { BarChart3, Trophy, Flame, ArrowLeft, PieChart, Crown, Calendar, Zap, Activity } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const GameStatsPage: React.FC = () => {
  const { goBack, user } = useGame();

  const totalGames = user.wins + user.losses + user.draws;
  const winRate = totalGames > 0 ? ((user.wins / totalGames) * 100).toFixed(1) : '0.0';

  const totalHands = user.rockCount + user.paperCount + user.scissorsCount;
  const rockPct = totalHands > 0 ? ((user.rockCount / totalHands) * 100).toFixed(1) : '33.3';
  const paperPct = totalHands > 0 ? ((user.paperCount / totalHands) * 100).toFixed(1) : '33.3';
  const scissorsPct = totalHands > 0 ? ((user.scissorsCount / totalHands) * 100).toFixed(1) : '33.3';

  const recentResults = user.recent10Results || ['W', 'W', 'L', 'W', 'W', 'W', 'D', 'W', 'L', 'W'];

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <span className="text-xs font-extrabold text-cyan-400 bg-cyan-950/80 border border-cyan-500/50 px-3 py-1 rounded-full">
          통계 분석 리포트
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          상세 게임 전적 통계
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">총 {totalGames}전의 승률, 연승/연패, 가위바위보 손선택 패턴 분석</p>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block">전체 승리</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">{user.wins}승</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block">전체 패배</span>
          <span className="text-xl font-black text-rose-400 mt-1 block">{user.losses}패</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block">통산 승률</span>
          <span className="text-xl font-black text-amber-400 mt-1 block">{winRate}%</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block">최대 연승</span>
          <span className="text-xl font-black text-red-400 mt-1 block">{user.maxStreak}연승</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block">최대 연패</span>
          <span className="text-xl font-black text-slate-400 mt-1 block">{user.maxLossStreak || 2}연패</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block">주간 게임 수</span>
          <span className="text-xl font-black text-cyan-300 mt-1 block">{user.weeklyGames || 42}판</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block">월간 게임 수</span>
          <span className="text-xl font-black text-purple-300 mt-1 block">{user.monthlyGames || 158}판</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block">토너먼트 참가 횟수</span>
          <span className="text-xl font-black text-indigo-300 mt-1 block">{user.tournamentParticipations || 12}회</span>
        </div>
      </div>

      {/* Tournament Best Rank Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/40 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center text-xl">
            👑
          </div>
          <div>
            <span className="text-[10px] font-bold text-purple-300 uppercase block">토너먼트 최고 순위</span>
            <span className="text-base font-black text-white">{user.tournamentBestRank || '준우승 (2위)'}</span>
          </div>
        </div>

        <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
          RECORD
        </span>
      </div>

      {/* Recent 10 Matches Results */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          최근 10경기 결과
        </h3>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {recentResults.map((res, idx) => {
            const isWin = res === 'W';
            const isDraw = res === 'D';
            return (
              <div
                key={idx}
                className={`flex-1 min-w-[36px] h-10 rounded-xl font-black text-xs flex flex-col items-center justify-center border shadow-sm ${
                  isWin
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                    : isDraw
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                }`}
              >
                <span>{res}</span>
                <span className="text-[8px] font-medium text-slate-400">{idx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* RPS Choice Distribution Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-cyan-400" />
          가위·바위·보 출제 패턴 (RPS 횟수)
        </h3>

        <div className="space-y-3.5 text-xs">
          {/* Scissors bar */}
          <div>
            <div className="flex justify-between font-bold text-purple-300 mb-1">
              <span>✌️ 가위를 낸 횟수</span>
              <span>{user.scissorsCount}회 ({scissorsPct}%)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
              <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${scissorsPct}%` }} />
            </div>
          </div>

          {/* Rock bar */}
          <div>
            <div className="flex justify-between font-bold text-cyan-300 mb-1">
              <span>✊ 바위를 낸 횟수</span>
              <span>{user.rockCount}회 ({rockPct}%)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
              <div className="bg-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${rockPct}%` }} />
            </div>
          </div>

          {/* Paper bar */}
          <div>
            <div className="flex justify-between font-bold text-amber-300 mb-1">
              <span>✋ 보를 낸 횟수</span>
              <span>{user.paperCount}회 ({paperPct}%)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
              <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${paperPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
