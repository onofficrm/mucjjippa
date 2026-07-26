import React from 'react';
import { Crown, Flame, Sparkles } from 'lucide-react';
import { RankItem } from '../types';

interface RankingCardProps {
  item: RankItem;
  isCurrentUser?: boolean;
}

export const RankingCard: React.FC<RankingCardProps> = ({ item, isCurrentUser = false }) => {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg shadow-amber-500/30">
            👑 1
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
            🥈 2
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-amber-200 font-black text-sm flex items-center justify-center shadow-md">
            🥉 3
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center">
            {rank}
          </div>
        );
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${
        isCurrentUser
          ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/20'
          : 'bg-slate-900/80 border border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-3">
        {getRankBadge(item.rank)}

        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shrink-0">
          {item.avatar}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-white">{item.nickname}</span>
            {isCurrentUser && (
              <span className="text-[9px] font-black bg-cyan-500 text-slate-950 px-1.5 py-0.2 rounded-md">
                ME
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-amber-300 font-medium flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              {item.title}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-right">
        <div className="flex flex-col items-end">
          <span className="font-black text-sm text-amber-400">
            {item.points.toLocaleString()} <span className="text-xs">P</span>
          </span>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
            <span>승률 {item.winRate}%</span>
            <span className="text-red-400 font-bold flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5 text-red-500" /> {item.streak}연승
            </span>
          </div>
          {item.rewardText && (
            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1 block">
              🎁 {item.rewardText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
