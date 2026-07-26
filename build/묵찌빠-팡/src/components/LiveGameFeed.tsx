import React from 'react';
import { Swords, Eye } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { mockLiveFeeds } from '../data/mockData';
import { RPSChoice } from '../types';

export const LiveGameFeed: React.FC = () => {
  const { navigateTo } = useGame();

  const getRPSIcon = (choice: RPSChoice) => {
    switch (choice) {
      case 'rock':
        return '✊';
      case 'paper':
        return '✋';
      case 'scissors':
        return '✌️';
      default:
        return '❓';
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-cyan-400" />
            실시간 대전 기록
          </h3>
        </div>
        <button
          onClick={() => navigateTo('spectate')}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          관전하기
        </button>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {mockLiveFeeds.map((feed) => (
          <div
            key={feed.id}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
          >
            {/* Winner */}
            <div className="flex items-center gap-2">
              <span className="text-base">{feed.winnerAvatar}</span>
              <div className="flex flex-col">
                <span className="font-bold text-slate-200 truncate max-w-[90px] sm:max-w-[120px]">
                  {feed.winnerName}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  +{feed.pointsWon.toLocaleString()}P
                </span>
              </div>
            </div>

            {/* Hand Comparison */}
            <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 font-bold">
              <span className="text-lg animate-bounce">{getRPSIcon(feed.winnerChoice)}</span>
              <span className="text-[10px] text-slate-500 font-extrabold">VS</span>
              <span className="text-lg opacity-60">{getRPSIcon(feed.loserChoice)}</span>
            </div>

            {/* Loser */}
            <div className="flex items-center gap-2 text-right">
              <div className="flex flex-col items-end">
                <span className="font-medium text-slate-400 truncate max-w-[80px] sm:max-w-[110px]">
                  {feed.loserName}
                </span>
                <span className="text-[10px] text-slate-500">{feed.timestamp}</span>
              </div>
              <span className="text-base opacity-70">{feed.loserAvatar}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
