import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Ticket,
  Users,
  Clock,
  Play,
  GitBranch,
  Flame,
  AlertTriangle,
  Info,
  Sparkles,
  ChevronRight,
  Eye,
  Bell,
  Award,
  Swords,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { mockTournaments } from '../data/mockData';
import { Tournament, TournamentStatus } from '../types';
import { TournamentDetailModal } from '../components/TournamentDetailModal';
import { sound } from '../utils/audio';

export const TournamentLobbyPage: React.FC = () => {
  const { navigateTo, setActiveTournament, setRewardModal } = useGame();
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // Virtual game simulation replay state
  const [virtualHandP1, setVirtualHandP1] = useState<'rock' | 'paper' | 'scissors'>('rock');
  const [virtualHandP2, setVirtualHandP2] = useState<'rock' | 'paper' | 'scissors'>('scissors');
  const [simText, setSimText] = useState<string>('⚡ 4강 1경기: [승리의신] vs [네온닌자] 진행 중...');

  useEffect(() => {
    const choices: ('rock' | 'paper' | 'scissors')[] = ['rock', 'paper', 'scissors'];
    const interval = setInterval(() => {
      const p1 = choices[Math.floor(Math.random() * choices.length)];
      const p2 = choices[Math.floor(Math.random() * choices.length)];
      setVirtualHandP1(p1);
      setVirtualHandP2(p2);

      if (p1 === p2) {
        setSimText('🤝 비김! 재대결 개시');
      } else if (
        (p1 === 'rock' && p2 === 'scissors') ||
        (p1 === 'paper' && p2 === 'rock') ||
        (p1 === 'scissors' && p2 === 'paper')
      ) {
        setSimText('⚡ 승리의신 (P1) 포인트 득점!');
      } else {
        setSimText('🥷 네온닌자 (P2) 포인트 득점!');
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const handleOpenDetail = (tour: Tournament) => {
    sound.playClick();
    setSelectedTournament(tour);
    setDetailModalOpen(true);
  };

  const handleRegisterNextNotify = () => {
    sound.playClick();
    setRewardModal({
      title: '다음 회차 알림 신청 완료',
      message: '다음 슈퍼 토너먼트 및 128강 정규 리그 오픈 10분 전 푸시 알림이 발송됩니다!',
      icon: '🔔',
    });
  };

  const getStatusBadge = (status: TournamentStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            참가 가능
          </span>
        );
      case 'imminent':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1 animate-pulse">
            <Flame className="w-3 h-3 text-red-400 fill-red-400" />
            마감 임박!
          </span>
        );
      case 'coming_soon':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            COMING SOON
          </span>
        );
      case 'deferred':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            인원미달 이월
          </span>
        );
      case 'in_progress':
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
            <Swords className="w-3 h-3 text-cyan-400" />
            진행 중
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
            준비 중
          </span>
        );
    }
  };

  const getRPSHand = (choice: 'rock' | 'paper' | 'scissors') => {
    switch (choice) {
      case 'rock':
        return '✊';
      case 'paper':
        return '✋';
      case 'scissors':
        return '✌️';
    }
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8 max-w-2xl mx-auto">
      {/* 0. Demo Watermark Notice Banner */}
      <div className="bg-slate-950 p-2.5 rounded-2xl border border-cyan-500/40 text-center flex items-center justify-between text-xs px-4">
        <span className="text-cyan-300 font-extrabold flex items-center gap-1.5 text-[11px]">
          <Info className="w-4 h-4 text-cyan-400" />
          🎮 데모 토너먼트 (테스트 시뮬레이션 전용)
        </span>
        <span className="text-[10px] text-slate-400">실제 현금 미사용</span>
      </div>

      {/* 1. Urgent Marquee Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-purple-950 border-2 border-red-500/60 p-4 shadow-2xl flex items-center gap-3 animate-pulse">
        <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/40 text-red-400">
          <Flame className="w-6 h-6 fill-red-400" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">
            마감 직전 긴급 알림
          </span>
          <p className="text-xs sm:text-sm font-black text-white">
            현재 <span className="text-amber-400">117명</span>이 참가했습니다.{' '}
            <span className="text-cyan-300 underline">11자리 남았습니다.</span> (선착순 마감)
          </p>
        </div>
      </div>

      {/* 2. Main Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/50 p-5 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-extrabold mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              128강 정규 토너먼트 로비
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              최강의 가위바위보 <br className="sm:hidden" />
              <span className="text-amber-400">챔피언에 도전하세요!</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              초보자 32강, 정규 128강, 슈퍼 256강 토너먼트에서 총 상금과 최상위 전설 칭호를 차지하세요.
            </p>
          </div>

          <button
            onClick={() => navigateTo('tournament_bracket')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 border border-purple-500/50 text-purple-200 font-extrabold text-xs hover:border-cyan-400 transition-all shadow-lg active:scale-95"
            id="lobby-view-bracket-btn"
          >
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>전체 대진표 보기</span>
          </button>
        </div>
      </div>

      {/* 3. Tournament List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-purple-400" />
            개최 예정 토너먼트 카드
          </h3>
          <span className="text-[10px] text-slate-400">카드를 터치하여 상세 규칙 확인</span>
        </div>

        {mockTournaments.map((tour) => (
          <div
            key={tour.id}
            onClick={() => handleOpenDetail(tour)}
            className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 p-4 sm:p-5 shadow-xl transition-all duration-300 cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            id={`tournament-card-${tour.id}`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(tour.status)}
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {tour.startTime}
                </span>
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                  {tour.title}
                </h4>
                {tour.subTitle && (
                  <p className="text-xs text-slate-400 font-medium">{tour.subTitle}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
                <span>
                  총 상금:{' '}
                  <span className="text-amber-400 font-extrabold">
                    {tour.totalPrize.toLocaleString()}P
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  {tour.currentParticipants} / {tour.maxParticipants}명
                </span>
              </div>
            </div>

            {/* Right Ticket & Action */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-slate-800">
              <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-cyan-300">
                <Ticket className="w-4 h-4 fill-cyan-400 text-slate-950" />
                <span>티켓 {tour.ticketCost}장</span>
              </div>

              <button
                disabled={tour.status === 'coming_soon' || tour.status === 'deferred'}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${
                  tour.status === 'coming_soon'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : tour.status === 'deferred'
                    ? 'bg-slate-800 text-amber-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-600 group-hover:from-purple-400 group-hover:to-cyan-400 text-white shadow-purple-500/20'
                }`}
              >
                <span>{tour.status === 'coming_soon' ? 'COMING SOON' : '상세보기 / 입장'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Spectate & Urgency Promotion Section (관전 유도 및 연출) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            <h3 className="font-black text-base text-white">토너먼트 하이라이트 & 관전 중계</h3>
          </div>
          <button
            onClick={() => navigateTo('spectate')}
            className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
          >
            실시간 관전실 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Virtual Match Auto Simulation */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/30 text-center space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="text-cyan-300">🎮 가상 경기 자동 중계</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
          </div>

          <div className="flex items-center justify-around my-2">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-purple-500/50 flex items-center justify-center text-3xl shadow">
                ⚡
              </div>
              <span className="text-xs font-black text-white mt-1">승리의신</span>
              <span className="text-[10px] text-cyan-400 font-extrabold">{getRPSHand(virtualHandP1)}</span>
            </div>

            <div className="text-amber-400 font-black text-xs px-2 py-1 bg-slate-900 rounded-lg border border-slate-800">
              VS
            </div>

            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-red-500/50 flex items-center justify-center text-3xl shadow">
                🥷
              </div>
              <span className="text-xs font-black text-white mt-1">네온닌자</span>
              <span className="text-[10px] text-purple-400 font-extrabold">{getRPSHand(virtualHandP2)}</span>
            </div>
          </div>

          <p className="text-xs font-bold text-amber-300 bg-slate-900/90 py-1.5 px-3 rounded-xl border border-slate-800">
            {simText}
          </p>
        </div>

        {/* Champion Profile & Finals Highlight Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Winner Profile */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="font-extrabold text-xs text-amber-300">지난 회차 우승자</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center text-2xl font-black shadow-lg shadow-amber-500/30">
                👑
              </div>
              <div>
                <h4 className="font-black text-sm text-white">전설의주먹</h4>
                <p className="text-[10px] text-amber-400 font-bold">통산 34연승 • 우승 3회</p>
                <p className="text-[10px] text-slate-400 italic">"가위바위보는 심리전이다!"</p>
              </div>
            </div>
          </div>

          {/* Next Round Notification Button */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="font-extrabold text-xs text-cyan-300 flex items-center gap-1.5 mb-1">
                <Bell className="w-4 h-4 text-cyan-400" />
                다음 회차 오픈 알림
              </span>
              <p className="text-[11px] text-slate-400 font-medium">
                슈퍼 킹덤 256강 개최 10분 전 스마트 알림을 받아보세요.
              </p>
            </div>

            <button
              onClick={handleRegisterNextNotify}
              className="mt-3 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-black text-xs transition-colors flex items-center justify-center gap-1"
            >
              <Bell className="w-3.5 h-3.5" />
              알림 신청하기
            </button>
          </div>
        </div>
      </div>

      {/* Tournament Detail Modal */}
      <TournamentDetailModal
        tournament={selectedTournament}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  );
};
