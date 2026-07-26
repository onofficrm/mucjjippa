import React from 'react';
import { Home, Swords, Trophy, Crown, User } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { PageType } from '../types';

interface NavItem {
  key: PageType;
  label: string;
  icon: React.ElementType;
}

export const MobileBottomNavigation: React.FC = () => {
  const { currentPage, navigateTo } = useGame();

  const navItems: NavItem[] = [
    { key: 'home', label: '홈', icon: Home },
    { key: 'versus_rooms', label: '대전', icon: Swords },
    { key: 'tournament_lobby', label: '토너먼트', icon: Trophy },
    { key: 'ranking', label: '랭킹', icon: Crown },
    { key: 'my_profile', label: 'MY', icon: User },
  ];

  const isCurrentActive = (itemKey: PageType) => {
    if (currentPage === itemKey) return true;
    if (itemKey === 'versus_rooms' && ['versus_rooms', 'versus_game', 'matchmaking_wait', 'game_result'].includes(currentPage)) return true;
    if (itemKey === 'tournament_lobby' && ['tournament_lobby', 'tournament_wait', 'tournament_game', 'tournament_bracket', 'spectate'].includes(currentPage)) return true;
    if (itemKey === 'my_profile' && ['my_profile', 'game_stats', 'point_history', 'avatar', 'title'].includes(currentPage)) return true;
    return false;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 shadow-2xl shadow-cyan-500/10">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrentActive(item.key);

          return (
            <button
              key={item.key}
              onClick={() => navigateTo(item.key)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-90 relative ${
                active ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
              id={`nav-item-${item.key}`}
            >
              {active && (
                <span className="absolute -top-1 w-6 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-sm shadow-cyan-400/50" />
              )}
              <div className={`p-1 rounded-lg transition-transform ${active ? 'scale-110' : ''}`}>
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5] text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
