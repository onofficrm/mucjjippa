import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Trophy, Flame, Award, Users, Target } from 'lucide-react';
import { RankingCard } from '../components/RankingCard';
import { useGame } from '../context/GameContext';
import { RankItem } from '../types';
import { rankingService, type RankingKind } from '../services/rankingService';

type RankingTab = 'weekly' | 'monthly' | 'win-rate' | 'streak' | 'tournament' | 'near_me';

const TAB_TO_KIND: Record<Exclude<RankingTab, 'near_me'>, RankingKind> = {
  weekly: 'weekly',
  monthly: 'monthly',
  'win-rate': 'win-rate',
  streak: 'streak',
  tournament: 'tournament',
};

export const RankingPage: React.FC = () => {
  const { user, showToast } = useGame();
  const [tab, setTab] = useState<RankingTab>('weekly');
  const [items, setItems] = useState<RankItem[]>([]);
  const [myRank, setMyRank] = useState<RankItem | null>(null);
  const [top, setTop] = useState<RankItem | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'near_me') {
        const data = await rankingService.getAroundMe('weekly');
        setItems(data.items);
        setMyRank(data.myRank);
        setTop(data.items[0] ?? null);
        if (data.message) showToast(data.message, 'info');
      } else {
        const kind = TAB_TO_KIND[tab];
        const data = await rankingService.getRankings(kind, 1, 30);
        setItems(data.items);
        setMyRank(data.myRank);
        setTop(data.top);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '랭킹을 불러오지 못했습니다.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const myRankItem: RankItem = myRank ?? {
    rank: 0,
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    title: user.title,
    points: user.points,
    winRate: Number((((user.wins) / (user.wins + user.losses || 1)) * 100).toFixed(1)),
    streak: user.currentStreak,
    wins: user.wins,
    losses: user.losses,
    rewardText: '조건 미충족',
  };

  const tabs: { key: RankingTab; label: string; icon: typeof Trophy }[] = [
    { key: 'weekly', label: '주간', icon: Trophy },
    { key: 'monthly', label: '월간', icon: Crown },
    { key: 'win-rate', label: '승률', icon: Target },
    { key: 'streak', label: '연승', icon: Flame },
    { key: 'tournament', label: '토너먼트', icon: Award },
    { key: 'near_me', label: '내 주변 순위', icon: Users },
  ];

  return (
    <div className="space-y-5 pb-20 md:pb-8">
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

        <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-2.5 rounded-2xl border border-amber-500/40">
          <span className="text-2xl">👑</span>
          <div>
            <span className="text-[10px] font-bold text-amber-300 block">현재 1위 마스터</span>
            <span className="text-xs font-black text-white">{top?.nickname ?? '집계 중'}</span>
          </div>
        </div>
      </div>

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

      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-2 border-cyan-400/80 p-3.5 rounded-3xl shadow-lg shadow-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center shadow">
            {myRankItem.rank > 0 ? `#${myRankItem.rank}` : '-'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{myRankItem.avatar}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white">{myRankItem.nickname}</span>
                <span className="text-[9px] font-black bg-cyan-500 text-slate-950 px-1.5 rounded">MY RANK</span>
              </div>
              <span className="text-[10px] text-cyan-300 font-bold">
                {myRankItem.title} • {myRankItem.wins}승 ({myRankItem.winRate}%)
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-black text-amber-400 block">
            {myRankItem.points.toLocaleString()} P
          </span>
          <span className="text-[9px] text-slate-400">
            예상 보상: {myRankItem.rewardText ?? '-'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-xs text-slate-400 py-10">랭킹 불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-10">
          표시할 랭킹이 없습니다. (최소 게임 수 조건을 확인해 주세요)
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <RankingCard key={`${item.id}-${item.rank}`} item={item} isCurrentUser={item.id === user.id} />
          ))}
        </div>
      )}
    </div>
  );
};
