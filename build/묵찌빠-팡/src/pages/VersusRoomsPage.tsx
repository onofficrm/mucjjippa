import React, { useState } from 'react';
import { Swords, Filter, Plus, ShieldAlert } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { mockGameRooms } from '../data/mockData';
import { GameModeCard } from '../components/GameModeCard';

export const VersusRoomsPage: React.FC = () => {
  const { user, startMatchmaking, navigateTo } = useGame();
  const [filterTier, setFilterTier] = useState<string>('all');

  const filteredRooms = mockGameRooms.filter((room) => {
    if (filterTier === 'all') return true;
    if (filterTier === 'vip') return room.isVip;
    if (filterTier === 'beginner') return room.entryFee <= 5000;
    if (filterTier === 'pro') return room.entryFee > 5000 && !room.isVip;
    return true;
  });

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-cyan-400" />
            1:1 대전방 선택
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            원하는 포인트 배팅 금액의 방에 입장하여 실시간 상대를 찾아 승리해보세요.
          </p>
        </div>

        {/* Quick Balance Status */}
        <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">내 포인트:</span>
          <span className="text-sm font-black text-amber-400">
            {user.points.toLocaleString()} P
          </span>
          <button
            onClick={() => navigateTo('point_topup')}
            className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            충전
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: '전체 게임방' },
          { id: 'beginner', label: '입문/초보방 (1k~5k)' },
          { id: 'pro', label: '고수 배틀방 (20k)' },
          { id: 'vip', label: '👑 마스터 VIP (100k)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTier(tab.id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              filterTier === tab.id
                ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredRooms.map((room) => (
          <GameModeCard key={room.id} room={room} />
        ))}
      </div>

      {/* Notice Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p>
          모든 1:1 대전은 승자가 배팅 포인트의 1.9배를 수령하게 됩니다. (수수료 5% 제외)
          <br />
          연승 지속 시 추가 경험치와 칭호 해금 혜택이 부여됩니다!
        </p>
      </div>
    </div>
  );
};
