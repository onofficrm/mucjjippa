import React from 'react';
import { Swords, Zap, ShieldAlert, Sparkles, Clock, Users, ArrowRight } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameRoom } from '../types';

export const VersusCardsSection: React.FC = () => {
  const { startMatchmaking } = useGame();

  const versusRooms: (GameRoom & { badge: string; badgeColor: string; descriptionList: string[]; avgTime: string })[] = [
    {
      id: 'room_10p',
      title: '10포인트 대전',
      entryFee: 10,
      minTier: '모든 사용자',
      rewardPoints: 20,
      activePlayers: 18,
      maxPlayers: 50,
      bgGradient: 'from-blue-950/80 via-slate-900 to-indigo-950',
      accentColor: 'border-blue-500/50 hover:border-blue-400 shadow-blue-950/30',
      badge: '초보자 추천',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      descriptionList: ['한 번씩 패를 선택', '무승부 시 재대결', '빠른 매칭'],
      avgTime: '1초',
    },
    {
      id: 'room_100p',
      title: '100포인트 대전',
      entryFee: 100,
      minTier: '일반 대전',
      rewardPoints: 200,
      activePlayers: 42,
      maxPlayers: 100,
      bgGradient: 'from-cyan-950/80 via-slate-900 to-blue-950',
      accentColor: 'border-cyan-500/50 hover:border-cyan-400 shadow-cyan-950/30',
      badge: '일반 대전',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      descriptionList: ['한 번씩 패를 선택', '무승부 시 재대결', '더 큰 승리 보상'],
      avgTime: '2초',
    },
    {
      id: 'room_300p',
      title: '300포인트 대전',
      entryFee: 300,
      minTier: '고수 전용',
      rewardPoints: 600,
      activePlayers: 25,
      maxPlayers: 50,
      bgGradient: 'from-purple-950/80 via-slate-900 to-purple-950',
      accentColor: 'border-purple-500/50 hover:border-purple-400 shadow-purple-950/30',
      badge: '전략 대전 (고수 추천)',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      descriptionList: ['가위·바위·보를 순서대로 3개 선택', '3회 결과로 승패 판정', '전략 대전'],
      avgTime: '3초',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <Swords className="w-4 h-4 text-cyan-400" />
          실시간 1:1 포인트 대전
        </h3>
        <span className="text-xs text-slate-400 font-medium">원하는 대전 방을 선택하세요</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {versusRooms.map((room) => (
          <div
            key={room.id}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-b ${room.bgGradient} border ${room.accentColor} p-4 shadow-lg flex flex-col justify-between transition-all duration-300 hover:scale-[1.01]`}
          >
            <div>
              {/* Badge & Title */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${room.badgeColor}`}>
                  {room.badge}
                </span>
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Users className="w-3 h-3 text-cyan-400" />
                  {room.activePlayers}명 대기 중
                </span>
              </div>

              <h4 className="text-lg font-black text-white mb-2">{room.title}</h4>

              {/* Description List */}
              <ul className="space-y-1 mb-4">
                {room.descriptionList.map((desc, idx) => (
                  <li key={idx} className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    {desc}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Details & Join Button */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold">참가 포인트</span>
                  <span className="font-black text-amber-300">{room.entryFee.toLocaleString()}P</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-slate-400 font-bold">예상 승리 보상</span>
                  <span className="font-black text-emerald-400">+{room.rewardPoints.toLocaleString()}P</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  평균 매칭: {room.avgTime}
                </span>
              </div>

              <button
                onClick={() => startMatchmaking(room)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>게임 시작 ({room.entryFee}P)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
