import React from 'react';
import { Coins, ShoppingBag, Gift, Trophy, BarChart3, UserCheck } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { PageType } from '../types';

export const BottomShortcuts: React.FC = () => {
  const { navigateTo } = useGame();

  const shortcuts: { id: string; label: string; subLabel: string; icon: React.ReactNode; page: PageType; gradient: string; borderColor: string }[] = [
    {
      id: 'topup',
      label: '포인트 무료 충전',
      subLabel: '광고 & 일일보상',
      icon: <Coins className="w-5 h-5 text-amber-400" />,
      page: 'point_topup',
      gradient: 'from-amber-950/60 to-slate-900',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
    },
    {
      id: 'shop',
      label: '아이템 상점',
      subLabel: '티켓 & 실드',
      icon: <ShoppingBag className="w-5 h-5 text-purple-400" />,
      page: 'item_shop',
      gradient: 'from-purple-950/60 to-slate-900',
      borderColor: 'border-purple-500/40 hover:border-purple-400',
    },
    {
      id: 'exchange',
      label: '포인트 사용 / 쿠폰',
      subLabel: '기프티콘 교환',
      icon: <Gift className="w-5 h-5 text-pink-400" />,
      page: 'point_exchange',
      gradient: 'from-pink-950/60 to-slate-900',
      borderColor: 'border-pink-500/40 hover:border-pink-400',
    },
    {
      id: 'ranking',
      label: '주간/월간 랭킹',
      subLabel: 'TOP 100 경쟁',
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      page: 'ranking',
      gradient: 'from-yellow-950/60 to-slate-900',
      borderColor: 'border-yellow-500/40 hover:border-yellow-400',
    },
    {
      id: 'stats',
      label: '내 전적 & 통계',
      subLabel: '상세 경기 기록',
      icon: <BarChart3 className="w-5 h-5 text-cyan-400" />,
      page: 'game_stats',
      gradient: 'from-cyan-950/60 to-slate-900',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400',
    },
    {
      id: 'avatar',
      label: '아바타 / 칭호',
      subLabel: '프로필 커스텀',
      icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
      page: 'avatar',
      gradient: 'from-emerald-950/60 to-slate-900',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    },
  ];

  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-base font-black text-white">바로가기 메뉴</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {shortcuts.map((item) => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.page)}
            className={`p-3.5 rounded-2xl bg-gradient-to-br ${item.gradient} border ${item.borderColor} flex items-center gap-3 text-left transition-all duration-200 hover:scale-[1.02] shadow-md group active:scale-95`}
          >
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors truncate">
                {item.label}
              </span>
              <span className="text-[10px] text-slate-400 font-bold truncate">{item.subLabel}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
