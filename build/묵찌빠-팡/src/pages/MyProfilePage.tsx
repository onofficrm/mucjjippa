import React from 'react';
import { User, BarChart3, Coins, Sparkles, ShoppingBag, Settings, ChevronRight, Gift, Ticket } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { UserSummaryCard } from '../components/UserSummaryCard';

export const MyProfilePage: React.FC = () => {
  const { navigateTo } = useGame();

  const menuGroups = [
    {
      title: '게임 전적 & 통계',
      items: [
        { key: 'game_stats', label: '내 전적 및 상세 통계', icon: BarChart3, desc: '승률, 손선택 확률, 최근 20경기 기록' },
        { key: 'point_history', label: '포인트/티켓 이용 내역', icon: Coins, desc: '획득 및 사용 로그 확인' },
      ],
    },
    {
      title: '커스텀 & 칭호',
      items: [
        { key: 'avatar', label: '아바타 상점 및 선택', icon: Sparkles, desc: '희귀/전설 아바타 수집' },
        { key: 'title', label: '보유 칭호 변경', icon: User, desc: '도전과제 달성 칭호 장착' },
      ],
    },
    {
      title: '혜택 & 설정',
      items: [
        { key: 'point_topup', label: '포인트 충전소', icon: Gift, desc: '출석체크 및 무료 포인트' },
        { key: 'point_exchange', label: '쿠폰 교환소', icon: Ticket, desc: '포인트로 카페/상품권 교환' },
        { key: 'settings', label: '게임 환경 설정', icon: Settings, desc: '사운드, 효과음, 계정 정보' },
      ],
    },
  ];

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Summary Banner */}
      <UserSummaryCard />

      {/* Menu Sections */}
      <div className="space-y-4">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-bold text-slate-400 mb-2.5 px-1 uppercase tracking-wider">
              {group.title}
            </h3>

            <div className="space-y-1.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigateTo(item.key as any)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/60 transition-all text-left group"
                    id={`my-menu-item-${item.key}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
