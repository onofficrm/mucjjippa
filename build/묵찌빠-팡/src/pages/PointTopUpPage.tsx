import React, { useCallback, useEffect, useState } from 'react';
import {
  Gift,
  ArrowLeft,
  Coins,
  Check,
  Tv,
  Smartphone,
  FileText,
  CalendarCheck,
  CheckSquare,
  UserPlus,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Mission } from '../types';
import { missionService } from '../services/missionService';

interface AdCardData {
  id: string;
  title: string;
  category: string;
  desc: string;
  rewardPoints: number;
  rewardTickets?: number;
  icon: typeof Tv;
  iconBg: string;
  badgeText: string;
}

export const PointTopUpPage: React.FC = () => {
  const { goBack, topUpPoints, user, showToast, setUser } = useGame();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  const reloadMissions = useCallback(() => {
    missionService
      .list()
      .then(setMissions)
      .catch(() => setMissions([]));
  }, []);

  useEffect(() => {
    reloadMissions();
  }, [reloadMissions]);

  const adList: AdCardData[] = [
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

  const handleAdClaim = (mission: AdCardData) => {
    if (completedIds.includes(mission.id)) return;
    topUpPoints(mission.rewardPoints, `[무료 충전] ${mission.title}`);
    setCompletedIds((prev) => [...prev, mission.id]);
  };

  const handleMissionClaim = async (mission: Mission) => {
    if (mission.status !== 'completed') {
      showToast('미션이 아직 완료되지 않았습니다.', 'info');
      return;
    }
    try {
      const result = await missionService.claim(mission.id);
      if (result.duplicated) {
        showToast('이미 수령한 보상입니다.', 'info');
      } else {
        showToast(
          `미션 보상 +${result.rewards.points.toLocaleString()}P` +
            (result.rewards.tickets ? ` · 티켓 ${result.rewards.tickets}` : ''),
          'success'
        );
        if (result.wallet) {
          setUser((prev) => ({
            ...prev,
            points: result.wallet!.points,
            tickets: result.wallet!.tickets,
          }));
        }
      }
      reloadMissions();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '보상 수령 실패', 'error');
    }
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8">
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
            <p className="text-xs text-slate-400 mt-0.5">
              광고 시청, 미션 참여, 친구 초대로 포인트를 무제한 받으세요.
            </p>
          </div>
        </div>
      </div>

      {/* 서버 일일/주간 미션 */}
      <div className="space-y-2">
        <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5 px-1">
          <CheckSquare className="w-3.5 h-3.5" />
          일일·주간 미션 (서버 판정)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {missions.map((mission) => {
            const done = mission.status === 'claimed';
            const canClaim = mission.status === 'completed';
            const pct = Math.min(100, Math.round((mission.progress / mission.goal) * 100));
            return (
              <div
                key={mission.id}
                className={`bg-slate-900/90 border rounded-3xl p-4 transition-all shadow-xl flex flex-col justify-between ${
                  done
                    ? 'border-slate-800/60 opacity-75'
                    : 'border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                      업적
                    </span>
                    <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      {mission.progress}/{mission.goal}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-white">{mission.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {mission.description ?? ''}
                  </p>
                  <div className="mt-2 w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                    <div className="bg-cyan-400 h-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-xs text-amber-400">
                    <Coins className="w-4 h-4 fill-amber-400" />
                    +{(mission.rewardPoints ?? 0).toLocaleString()} P
                    {!!mission.rewardTickets && (
                      <span className="text-[10px] font-bold text-cyan-300">
                        +티켓 {mission.rewardTickets}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => void handleMissionClaim(mission)}
                    disabled={done || !canClaim}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1 ${
                      done || !canClaim
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                    }`}
                  >
                    {done ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> 수령 완료
                      </>
                    ) : canClaim ? (
                      '보상 수령'
                    ) : (
                      '진행 중'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 광고/제휴 카드 — 기존 디자인 유지 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {adList.map((mission) => {
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
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${mission.iconBg}`}
                  >
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
                  onClick={() => handleAdClaim(mission)}
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
