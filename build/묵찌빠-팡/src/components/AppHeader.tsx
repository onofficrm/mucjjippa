import React from 'react';
import { Bell, Settings, Sparkles } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { PointBadge } from './PointBadge';
import { TicketBadge } from './TicketBadge';
import { SoundToggle } from './SoundToggle';

export const AppHeader: React.FC = () => {
  const { user, navigateTo, openTutorial } = useGame();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 py-2.5 md:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* User Info Section */}
        <div
          onClick={() => navigateTo('my_profile')}
          className="flex items-center gap-2.5 cursor-pointer group p-1 rounded-xl hover:bg-slate-900/60 transition-colors"
          id="header-user-profile"
        >
          {/* Avatar with Glow Ring */}
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 p-[1.5px] shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-xl select-none">
                {user.avatar}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] px-1 rounded-md shadow-sm">
              Lv.{user.level}
            </div>
          </div>

          {/* Nickname & Title */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors leading-tight truncate max-w-[110px] sm:max-w-[160px]">
                {user.nickname}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full leading-none">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                {user.title}
              </span>
            </div>
          </div>
        </div>

        {/* Currency & Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <PointBadge points={user.points} />
          <TicketBadge tickets={user.tickets} />

          <SoundToggle />

          <button
            onClick={openTutorial}
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-colors font-black text-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="초보자 튜토리얼"
            id="header-tutorial-btn"
          >
            ❓
          </button>

          <button
            onClick={() => navigateTo('point_topup')}
            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-full transition-colors relative"
            title="알림 및 소식"
            id="header-bell-btn"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
          </button>

          <button
            onClick={() => navigateTo('settings')}
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-colors"
            title="설정"
            id="header-settings-btn"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
