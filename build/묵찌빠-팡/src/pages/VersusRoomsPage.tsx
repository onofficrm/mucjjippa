import React, { useEffect, useState } from 'react';
import { Swords, ShieldAlert } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { mockGameRooms } from '../data/mockData';
import { GameModeCard } from '../components/GameModeCard';
import { matchService } from '../services/matchService';
import type { GameRoom } from '../types';

export const VersusRoomsPage: React.FC = () => {
  const { user, navigateTo } = useGame();
  const [filterTier, setFilterTier] = useState<string>('all');
  const [rooms, setRooms] = useState<GameRoom[]>(mockGameRooms.filter((r) => [10, 100, 300].includes(r.entryFee)));

  useEffect(() => {
    matchService
      .getGameRooms()
      .then((serverRooms) => {
        if (serverRooms.length > 0) setRooms(serverRooms);
      })
      .catch(() => null);
  }, []);

  const filteredRooms = rooms.filter((room) => {
    if (filterTier === 'all') return true;
    if (filterTier === 'vip') return room.isVip;
    if (filterTier === 'beginner') return room.entryFee <= 100;
    if (filterTier === 'pro') return room.entryFee >= 300 && !room.isVip;
    return true;
  });

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-cyan-400" />
            1:1 대전방 선택
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            10P / 100P 단판 실시간 매칭, 300P는 3개를 순서대로 내는 전략 대전입니다.
          </p>
        </div>

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

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: '전체 게임방' },
          { id: 'beginner', label: '입문 (10~100P)' },
          { id: 'pro', label: '전략 (300P)' },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredRooms.map((room) => (
          <GameModeCard key={room.id} room={room} />
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p>
          실시간 대전은 서버가 승패를 판정하며, 상대 패는 결과 공개 전까지 보이지 않습니다.
          <br />
          승리 시 참가비의 2배 포인트가 지급되고, 매칭 확정 전에 취소하면 참가비는 차감되지 않습니다.
        </p>
      </div>
    </div>
  );
};
