import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Users, Ticket, Eye, GitBranch, ArrowRight, AlertTriangle, CheckCircle2, PlayCircle, Lock } from 'lucide-react';
import { useGame } from '../context/GameContext';

type TournamentStatus = 'OPEN' | 'JOINED' | 'IN_PROGRESS' | 'NO_TICKET' | 'CLOSED';

export const MainTournamentCard: React.FC = () => {
  const { user, navigateTo, showConfirmModal } = useGame();
  const [status, setStatus] = useState<TournamentStatus>('OPEN');
  const [secondsLeft, setSecondsLeft] = useState(754); // 12m 34s
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleJoinClick = () => {
    if (status === 'NO_TICKET' || user.tickets < 1) {
      setTicketModalOpen(true);
      return;
    }
    if (status === 'CLOSED') return;

    if (status === 'IN_PROGRESS') {
      navigateTo('tournament_game');
    } else {
      setStatus('JOINED');
      navigateTo('tournament_wait');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-purple-950 border-2 border-amber-500/60 p-5 sm:p-6 shadow-2xl shadow-amber-950/50">
      {/* Background Animated Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
            <Trophy className="w-3.5 h-3.5 fill-slate-950" />
            오늘의 메인 토너먼트
          </span>
          <span className="text-xs font-bold text-amber-300/80">128강 정기전</span>
        </div>

        {/* State Preview Switcher for Testing */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <span className="text-[9px] font-bold text-slate-400 px-1">상태 테스트:</span>
          <button
            onClick={() => setStatus('OPEN')}
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg transition-colors ${
              status === 'OPEN' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
            }`}
          >
            참가 가능
          </button>
          <button
            onClick={() => setStatus('JOINED')}
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg transition-colors ${
              status === 'JOINED' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400'
            }`}
          >
            참가 중
          </button>
          <button
            onClick={() => setStatus('IN_PROGRESS')}
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg transition-colors ${
              status === 'IN_PROGRESS' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400'
            }`}
          >
            진행 중
          </button>
          <button
            onClick={() => setStatus('NO_TICKET')}
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg transition-colors ${
              status === 'NO_TICKET' ? 'bg-red-400 text-slate-950' : 'text-slate-400'
            }`}
          >
            티켓 부족
          </button>
          <button
            onClick={() => setStatus('CLOSED')}
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg transition-colors ${
              status === 'CLOSED' ? 'bg-slate-700 text-slate-300' : 'text-slate-400'
            }`}
          >
            모집 마감
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Left Column: Countdown & Info */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            실시간 챔피언십 토너먼트
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Timer Box */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-amber-500/40 px-3.5 py-2 rounded-2xl shadow-inner">
              <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-bold uppercase">시작까지 남은 시간</span>
                <span className="font-mono text-lg sm:text-xl font-black text-amber-300 tracking-widest">
                  {formatTime(secondsLeft)}
                </span>
              </div>
            </div>

            {/* Participants */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-2xl">
              <Users className="w-5 h-5 text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-bold">현재 참가자</span>
                <span className="text-sm font-black text-cyan-300">
                  87 <span className="text-slate-500 font-normal">/ 128명</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-300 pt-1">
            <span className="flex items-center gap-1 text-amber-400 font-extrabold">
              🏆 예상 총상금: 18,400P
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Ticket className="w-3.5 h-3.5 text-cyan-400" />
              참가 티켓 1장
            </span>
          </div>
        </div>

        {/* Right Column: Dynamic Action Buttons */}
        <div className="flex flex-col space-y-2.5">
          {/* Status Badge */}
          <div className="flex items-center justify-end">
            {status === 'OPEN' && (
              <span className="text-xs font-black text-amber-300 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                참가 가능
              </span>
            )}
            {status === 'JOINED' && (
              <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                참가 완료 (대기 중)
              </span>
            )}
            {status === 'IN_PROGRESS' && (
              <span className="text-xs font-black text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                <PlayCircle className="w-3.5 h-3.5 text-cyan-400" />
                토너먼트 진행 중
              </span>
            )}
            {status === 'NO_TICKET' && (
              <span className="text-xs font-black text-red-300 bg-red-500/20 border border-red-500/40 px-3 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                티켓 부족 (티켓 1장 필요)
              </span>
            )}
            {status === 'CLOSED' && (
              <span className="text-xs font-black text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                모집 마감 (128/128명)
              </span>
            )}
          </div>

          {/* Main Join Button */}
          <button
            onClick={handleJoinClick}
            disabled={status === 'CLOSED'}
            className={`w-full py-3.5 px-5 rounded-2xl font-black text-base transition-all duration-200 shadow-xl flex items-center justify-center gap-2 ${
              status === 'CLOSED'
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : status === 'JOINED'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 active:scale-95'
                : status === 'IN_PROGRESS'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 active:scale-95'
                : status === 'NO_TICKET'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white active:scale-95'
                : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 active:scale-95'
            }`}
          >
            {status === 'OPEN' && (
              <>
                <span>토너먼트 참가하기 (티켓 1장)</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
            {status === 'JOINED' && (
              <>
                <span>참가 중 (대기실로 이동)</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
            {status === 'IN_PROGRESS' && (
              <>
                <span>토너먼트 경기장 입장</span>
                <PlayCircle className="w-5 h-5" />
              </>
            )}
            {status === 'NO_TICKET' && (
              <>
                <AlertTriangle className="w-5 h-5 text-white" />
                <span>티켓 부족 - 충전/광고로 받기</span>
              </>
            )}
            {status === 'CLOSED' && <span>참가 인원 모집 마감</span>}
          </button>

          {/* Secondary Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigateTo('spectate')}
              className="py-2.5 px-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              관전하기
            </button>
            <button
              onClick={() => navigateTo('tournament_bracket')}
              className="py-2.5 px-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 hover:text-amber-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              대진표 미리보기
            </button>
          </div>
        </div>
      </div>

      {/* Insufficient Ticket Modal */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-2xl">
              🎟️
            </div>
            <div>
              <h3 className="text-lg font-black text-white">티켓이 부족합니다</h3>
              <p className="text-xs text-slate-300 mt-1">
                토너먼트에 참가하려면 <strong>티켓 1장</strong>이 필요합니다.
                <br />
                포인트로 티켓을 구매하거나 광고 시청으로 무료 티켓을 받아보세요!
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setTicketModalOpen(false);
                  navigateTo('item_shop');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-xl text-sm shadow hover:brightness-110"
              >
                상점에서 티켓 구매하기 (30,000P)
              </button>
              <button
                onClick={() => {
                  setTicketModalOpen(false);
                  navigateTo('ad_detail');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-xl text-sm shadow hover:brightness-110"
              >
                광고 보고 무료 티켓 1장 받기
              </button>
              <button
                onClick={() => setTicketModalOpen(false)}
                className="w-full py-2 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs hover:text-white"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
