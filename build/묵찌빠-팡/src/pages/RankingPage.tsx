import React, { useState } from 'react';
import { Crown, Trophy, Flame, Award, Users, Target } from 'lucide-react';
import { mockRankings } from '../data/mockData';
import { RankingCard } from '../components/RankingCard';
import { useGame } from '../context/GameContext';
import { RankItem } from '../types';

type RankingTab = 'weekly' | 'monthly' | 'streak' | 'tournament' | 'near_me';

export const RankingPage: React.FC = () => {
  const { user } = useGame();
  const [tab, setTab] = useState<RankingTab>('weekly');

  const myRankItem: RankItem = {
    rank: 14,
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    title: user.title,
    points: user.points,
    winRate: Number((((user.wins) / (user.wins + user.losses || 1)) * 100).toFixed(1)),
    streak: user.currentStreak,
    wins: user.wins,
    losses: user.losses,
    rewardText: '주간 상금 20,000P',
  };

  const getFilteredRankings = (): RankItem[] => {
    switch (tab) {
      case 'weekly':
        return mockRankings.map((r) => ({ ...r, rewardText: r.rank === 1 ? '500,000P + [무적의] 칭호' : r.rank <= 3 ? '100,000P' : '20,000P' }));
      case 'monthly':
        return [...mockRankings].reverse().map((r, i) => ({ ...r, rank: i + 1, rewardText: i === 0 ? '2,000,000P + 전설 프레임' : '100,000P' }));
      case 'streak':
        return [...mockRankings].sort((a, b) => b.streak - a.streak).map((r, i) => ({ ...r, rank: i + 1, rewardText: i === 0 ? '500,000P + [10연승] 칭호' : '50,000P' }));
      case 'tournament':
        return mockRankings.map((r) => ({ ...r, rewardText: r.rank === 1 ? '1,000,000P + [토너먼트 챔피언]' : '50,000P' }));
      case 'near_me':
        return [
          { ...mockRankings[0], rank: 12, nickname: '마스터G', rewardText: '주간 30,000P' },
          { ...mockRankings[1], rank: 13, nickname: '샤이닝스타', rewardText: '주간 20,000P' },
          myRankItem,
          { ...mockRankings[2], rank: 15, nickname: '승리의날개', rewardText: '주간 15,000P' },
          { ...mockRankings[3], rank: 16, nickname: '락앤롤', rewardText: '주간 10,000P' },
        ];
    }
  };

  const currentList = getFilteredRankings();

  const tabs: { key: RankingTab; label: string; icon: any }[] = [
    { key: 'weekly', label: '주간', icon: Trophy },
    { key: 'monthly', label: '월간', icon: Crown },
    { key: 'streak', label: '연승', icon: Flame },
    { key: 'tournament', label: '토너먼트', icon: Award },
    { key: 'near_me', label: '내 주변 순위', icon: Users },
  ];

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Title Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" />
            전국 명예의 전당 랭크보드
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            실시간 최고 가위바위보 마스터들의 순위와 시즌 보상 목록입니다.
          </p>
        </div>

        {/* Podium Top 1 Preview */}
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-2.5 rounded-2xl border border-amber-500/40">
          <span className="text-2xl">👑</span>
          <div>
            <span className="text-[10px] font-bold text-amber-300 block">현재 1위 마스터</span>
            <span className="text-xs font-black text-white">{mockRankings[0].nickname}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Sticky / Highlighted Current User Rank Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-2 border-cyan-400/80 p-3.5 rounded-3xl shadow-lg shadow-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center shadow">
            #{myRankItem.rank}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{myRankItem.avatar}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white">{myRankItem.nickname}</span>
                <span className="text-[9px] font-black bg-cyan-500 text-slate-950 px-1.5 rounded">MY RANK</span>
              </div>
              <span className="text-[10px] text-cyan-300 font-bold">{myRankItem.title} • {myRankItem.wins}승 ({myRankItem.winRate}%)</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-black text-amber-400 block">{myRankItem.points.toLocaleString()} P</span>
          <span className="text-[9px] text-slate-400">예상 보상: {myRankItem.rewardText}</span>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2.5">
        {currentList.map((item) => (
          <RankingCard key={item.id} item={item} isCurrentUser={item.id === user.id} />
        ))}
      </div>
    </div>
  );
};
