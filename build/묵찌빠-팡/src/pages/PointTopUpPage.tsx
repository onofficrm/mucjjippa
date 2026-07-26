import React, { useState } from 'react';
import { Gift, ArrowLeft, Coins, Check, Tv, Smartphone, FileText, CalendarCheck, CheckSquare, UserPlus, Sparkles } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface MissionCardData {
  id: string;
  title: string;
  category: string;
  desc: string;
  rewardPoints: number;
  rewardTickets?: number;
  icon: any;
  iconBg: string;
  badgeText: string;
}

export const PointTopUpPage: React.FC = () => {
  const { goBack, topUpPoints, user } = useGame();
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const missionList: MissionCardData[] = [
    {
      id: 'mission_video',
      title: '짧은 영상 보기',
      category: '동영상 광고',
      desc: '15~30초 짧은 영상 시청 후 무료 포인트 수령',
      rewardPoints: 5000,
      rewardTickets: 1,
      icon: Tv,
      iconBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      badgeText: '매일 5회',
    },
    {
      id: 'mission_app',
      title: '앱 체험',
      category: '제휴 앱',
      desc: '추천 신작 게임 또는 앱 설치 체험 진행',
      rewardPoints: 25000,
      rewardTickets: 2,
      icon: Smartphone,
      iconBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      badgeText: '대형 보상',
    },
    {
      id: 'mission_survey',
      title: '설문 참여',
      category: '리서치',
      desc: '간단한 1분 사용자 선호도 설문조사 완료',
      rewardPoints: 15000,
      icon: FileText,
      iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      badgeText: '즉시 지급',
    },
    {
      id: 'mission_attendance',
      title: '출석 체크',
      category: '데일리 혜택',
      desc: '오늘의 정기 출석체크 보상 받기',
      rewardPoints: 10000,
      icon: CalendarCheck,
      iconBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      badgeText: '매일 1회',
    },
    {
      id: 'mission_daily',
      title: '일일 미션',
      category: '업적',
      desc: '오늘 1:1 대전 3판 플레이 미션 달성',
      rewardPoints: 20000,
      icon: CheckSquare,
      iconBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      badgeText: '오늘의 미션',
    },
    {
      id: 'mission_invite',
      title: '친구 초대',
      category: '소셜 혜택',
      desc: '친구에게 초대 링크 공유 및 등록 완료',
      rewardPoints: 30000,
      rewardTickets: 3,
      icon: UserPlus,
      iconBg: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      badgeText: '무제한',
    },
  ];

  const handleClaim = (mission: MissionCardData) => {
    if (completedIds.includes(mission.id)) return;
    topUpPoints(mission.rewardPoints, `[무료 충전] ${mission.title}`);
    setCompletedIds((prev) => [...prev, mission.id]);
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          보유 포인트: {user.points.toLocaleString()} P
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              무료 포인트 충전소 (광고 & 미션)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">광고 시청, 미션 참여, 친구 초대로 포인트를 무제한 받으세요.</p>
          </div>
        </div>
      </div>

      {/* Mission Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {missionList.map((mission) => {
          const Icon = mission.icon;
          const isDone = completedIds.includes(mission.id);

          return (
            <div
              key={mission.id}
              className={`bg-slate-900/90 border rounded-3xl p-4 transition-all shadow-xl flex flex-col justify-between ${
                isDone
                  ? 'border-slate-800/60 opacity-75'
                  : 'border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                    {mission.category}
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {mission.badgeText}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${mission.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-white">{mission.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{mission.desc}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-xs text-amber-400">
                  <Coins className="w-4 h-4 fill-amber-400" />
                  +{mission.rewardPoints.toLocaleString()} P
                  {mission.rewardTickets && (
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                      +티켓 {mission.rewardTickets}장
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleClaim(mission)}
                  disabled={isDone}
                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1 ${
                    isDone
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {isDone ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> 참여 완료
                    </>
                  ) : (
                    '참여 완료 (포인트 수령)'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
