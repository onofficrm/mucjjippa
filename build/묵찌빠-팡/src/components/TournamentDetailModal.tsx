import React from 'react';
import { X, Trophy, Ticket, Users, Clock, ShieldCheck, Play, Bell } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Tournament } from '../types';
import { sound } from '../utils/audio';

interface TournamentDetailModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TournamentDetailModal: React.FC<TournamentDetailModalProps> = ({
  tournament,
  isOpen,
  onClose,
}) => {
  const { registerTournament, isTournamentRegistered, setRewardModal } = useGame();

  if (!isOpen || !tournament) return null;

  const isComingSoon = tournament.status === 'coming_soon';
  const isDeferred = tournament.status === 'deferred';
  const isRegistered = isTournamentRegistered(tournament.id);

  const handleJoinTournament = () => {
    if (isComingSoon || isDeferred) return;
    onClose();
    registerTournament(tournament);
  };

  const handleReserveSpectate = () => {
    sound.playClick();
    setRewardModal({
      title: '관전 알림 예약 완료',
      message: `[${tournament.title}] 8강 및 결승전 시작 시 관전 알림을 보내드립니다!`,
      icon: '🔔',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-base text-white">토너먼트 상세 안내</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Watermark */}
        <div className="bg-slate-950 p-2 rounded-xl border border-cyan-500/30 text-center">
          <span className="text-[10px] font-black text-cyan-300">
            🎮 데모 토너먼트 (모의 진행용) • 실제 현금 거래는 지원하지 않습니다.
          </span>
        </div>

        {/* Tournament Name & Type */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              {tournament.type === 'hourly' ? '매시간 정규' : tournament.type === 'weekly' ? '주간 하이롤러' : '일간 연습'}
            </span>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {tournament.startTime}
            </span>
          </div>

          <h2 className="text-xl font-black text-white">{tournament.title}</h2>
          {tournament.subTitle && (
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{tournament.subTitle}</p>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
          <div>
            <span className="text-[9px] text-slate-400 font-bold block">참가 티켓</span>
            <span className="text-xs font-black text-cyan-300 flex items-center justify-center gap-1 mt-0.5">
              <Ticket className="w-3.5 h-3.5 fill-cyan-400 text-slate-950" />
              {tournament.ticketCost}장
            </span>
          </div>

          <div className="border-x border-slate-800">
            <span className="text-[9px] text-slate-400 font-bold block">참가 인원</span>
            <span className="text-xs font-black text-amber-300 flex items-center justify-center gap-1 mt-0.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              {tournament.currentParticipants} / {tournament.maxParticipants}명
            </span>
          </div>

          <div>
            <span className="text-[9px] text-slate-400 font-bold block">총 상금</span>
            <span className="text-xs font-black text-emerald-400 mt-0.5 block">
              {tournament.totalPrize.toLocaleString()}P
            </span>
          </div>
        </div>

        {/* Format & Rules Breakdown */}
        {tournament.rules && (
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <span className="font-extrabold text-slate-200 block border-b border-slate-800 pb-1.5">
              📋 대진 진행 규칙
            </span>
            <div className="space-y-1 text-[11px] text-slate-300">
              <p>• <strong className="text-cyan-300">예선 방식:</strong> {tournament.rules.preliminary}</p>
              <p>• <strong className="text-amber-300">본선 방식:</strong> {tournament.rules.main}</p>
              <p>• <strong className="text-purple-300">준결승·결승:</strong> {tournament.rules.finals}</p>
            </div>
          </div>
        )}

        {/* Prize Distribution Table */}
        {tournament.prizes && (
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <span className="font-extrabold text-slate-200 block border-b border-slate-800 pb-1.5">
              💰 순위별 보상 안내
            </span>
            <div className="space-y-1.5">
              {tournament.prizes.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-300">{p.rank}</span>
                  <span className="font-black text-amber-400">{p.prize}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleReserveSpectate}
            className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Bell className="w-4 h-4 text-cyan-400" />
            <span>관전 예약</span>
          </button>

          <button
            disabled={isComingSoon || isDeferred}
            onClick={handleJoinTournament}
            className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all ${
              isComingSoon
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : isDeferred
                ? 'bg-slate-800 text-amber-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 via-indigo-600 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white active:scale-95'
            }`}
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              {isComingSoon
                ? 'COMING SOON (준비 중)'
                : isDeferred
                ? '다음 회차 이월'
                : isRegistered
                ? '참가 완료 (대기실 이동)'
                : '참가하기 (대기실 입장)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
