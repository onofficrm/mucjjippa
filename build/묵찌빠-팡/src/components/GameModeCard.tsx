import React from 'react';
import { Users, Coins, Crown, Play } from 'lucide-react';
import { GameRoom } from '../types';
import { useGame } from '../context/GameContext';

interface GameModeCardProps {
  room: GameRoom;
}

export const GameModeCard: React.FC<GameModeCardProps> = ({ room }) => {
  const { startMatchmaking } = useGame();

  return (
    <div
      onClick={() => startMatchmaking(room)}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${room.bgGradient} border ${room.accentColor} p-4 sm:p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between`}
      id={`game-room-card-${room.id}`}
    >
      {/* VIP Badge if applicable */}
      {room.isVip && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow flex items-center gap-1">
          <Crown className="w-3 h-3 fill-slate-950" />
          VIP ARENA
        </div>
      )}

      <div>
        <div className="text-[11px] font-bold text-cyan-400 tracking-wider mb-1">
          {room.minTier}
        </div>
        <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
          {room.title}
        </h3>

        {/* Entry fee and reward */}
        <div className="mt-3 space-y-1 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">입장료</span>
            <span className="font-extrabold text-amber-400 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {room.entryFee.toLocaleString()} P
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">승리 시 보상</span>
            <span className="font-extrabold text-emerald-400">
              +{room.rewardPoints.toLocaleString()} P
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{room.activePlayers}명 대전 중</span>
        </div>

        <button className="flex items-center gap-1 text-xs font-black bg-cyan-500 group-hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-xl shadow-md shadow-cyan-500/20 transition-all">
          <span>입장하기</span>
          <Play className="w-3 h-3 fill-slate-950" />
        </button>
      </div>
    </div>
  );
};
