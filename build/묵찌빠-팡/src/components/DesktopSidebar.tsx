import React from 'react';
import {
  Home,
  Swords,
  Trophy,
  Crown,
  User,
  ShoppingBag,
  Gift,
  Tv,
  BarChart3,
  Sparkles,
  Ticket,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { PageType } from '../types';

interface SidebarSection {
  title: string;
  items: { key: PageType; label: string; icon: React.ElementType; badge?: string }[];
}

export const DesktopSidebar: React.FC = () => {
  const { currentPage, navigateTo, user } = useGame();

  const sections: SidebarSection[] = [
    {
      title: '메인 메뉴',
      items: [
        { key: 'home', label: '홈 피드', icon: Home },
        { key: 'versus_rooms', label: '1:1 대전', icon: Swords, badge: 'HOT' },
        { key: 'tournament_lobby', label: '토너먼트', icon: Trophy, badge: 'LIVE' },
        { key: 'spectate', label: '실시간 관전', icon: Tv },
        { key: 'ranking', label: '전국 랭킹', icon: Crown },
      ],
    },
    {
      title: '상점 & 포인트',
      items: [
        { key: 'point_topup', label: '포인트 충전소', icon: Zap, badge: '무료' },
        { key: 'ad_detail', label: '광고 보상 받기', icon: Gift },
        { key: 'item_shop', label: '아이템 상점', icon: ShoppingBag },
        { key: 'point_exchange', label: '쿠폰 교환소', icon: Ticket },
      ],
    },
    {
      title: '마이 페이지',
      items: [
        { key: 'my_profile', label: '내 프로필', icon: User },
        { key: 'game_stats', label: '대전 통계', icon: BarChart3 },
        { key: 'avatar', label: '아바타 꾸미기', icon: Sparkles },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-950/80 backdrop-blur-md border-r border-slate-800/80 p-4 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto shrink-0 select-none">
      {/* Brand Title */}
      <div className="flex items-center gap-2 px-2 py-3 mb-2 border-b border-slate-800/60">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-cyan-500/30">
          👊
        </div>
        <div>
          <h1 className="font-black text-sm tracking-tight text-slate-100 flex items-center gap-1">
            묵찌빠 <span className="text-cyan-400">팡</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">실시간 묵찌빠 아케이드</p>
        </div>
      </div>

      {/* Nav Groups */}
      <div className="space-y-5 flex-1">
        {sections.map((sec, idx) => (
          <div key={idx}>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              {sec.title}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = currentPage === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => navigateTo(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                    }`}
                    id={`sidebar-item-${item.key}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          item.badge === 'LIVE'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                            : item.badge === 'HOT'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Card at bottom of sidebar */}
      <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-slate-300">현재 연승</span>
          <span className="text-amber-400 font-extrabold flex items-center gap-0.5">
            🔥 {user.currentStreak}연승
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-400 to-red-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (user.currentStreak / 10) * 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
          10연승 시 [불패의 신화] 칭호 지급!
        </p>
      </div>
    </aside>
  );
};
