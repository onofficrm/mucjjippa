import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Wrench,
  User,
  Swords,
  Trophy,
  RotateCcw,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowLeft,
  FileCode2,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { Tournament } from '../types';

export const DevTestPage: React.FC = () => {
  const {
    user,
    setUser,
    setDevBalance,
    navigateTo,
    goBack,
    registerTournament,
    cancelTournamentRegistration,
    setActiveMatch,
    setActiveTournament,
    openTutorial,
    reduceMotion,
    setReduceMotion,
    showToast,
    setRewardModal,
  } = useGame();

  const [mobilePreview, setMobilePreview] = useState<boolean>(false);

  // User State Quick Presets
  // 잔액은 컴포넌트가 직접 계산하지 않고 walletService(setDevBalance)를 통해서만 변경한다.
  const handleSetPoints = async (pts: number) => {
    await setDevBalance({ points: pts }, '[개발 프리셋] 포인트 지정');
    showToast(`포인트가 ${pts.toLocaleString()}P로 설정되었습니다.`, 'success');
  };

  const handleSetTickets = async (tkts: number) => {
    await setDevBalance({ tickets: tkts }, '[개발 프리셋] 티켓 지정');
    showToast(`티켓이 ${tkts}장으로 설정되었습니다.`, 'success');
  };

  const handleSetUserType = async (type: 'new' | 'pro') => {
    if (type === 'new') {
      setUser((prev) => ({
        ...prev,
        nickname: '새싹플레이어',
        level: 1,
        exp: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0,
        maxStreak: 0,
      }));
      await setDevBalance({ points: 100, tickets: 1 }, '[개발 프리셋] 신규 사용자');
      showToast('신규 사용자 상태로 설정되었습니다.', 'info');
    } else {
      setUser((prev) => ({
        ...prev,
        nickname: '전설의가위바위보',
        title: '전설의 가위바위보',
        avatar: '👑',
        level: 30,
        exp: 80,
        wins: 158,
        losses: 22,
        draws: 8,
        currentStreak: 12,
        maxStreak: 15,
      }));
      await setDevBalance({ points: 50000, tickets: 20 }, '[개발 프리셋] 고레벨 사용자');
      showToast('고레벨 사용자 상태로 설정되었습니다.', 'success');
    }
  };

  // 1:1 Match Force Actions
  const handleForceMatchResult = (result: 'win' | 'loss' | 'draw') => {
    setActiveMatch({
      matchId: 'match_dev_forced',
      roomId: 'room_100p',
      roomName: '[1:1 대전] 개발자 테스트 방',
      opponent: {
        id: 'opp_dev',
        nickname: '테스트AI',
        avatar: '🤖',
        title: '시뮬레이터',
        wins: 100,
        losses: 100,
        winRate: 50,
        maxStreak: 5,
        recentLastHand: 'rock',
        greeting: '개발자 테스트용 상대입니다.',
      },
      stakePoints: 100,
      round: 3,
      maxRounds: 3,
      playerScore: result === 'win' ? 2 : result === 'draw' ? 1 : 0,
      opponentScore: result === 'loss' ? 2 : result === 'draw' ? 1 : 0,
      playerChoice: 'rock',
      opponentChoice: result === 'win' ? 'scissors' : result === 'draw' ? 'rock' : 'paper',
      roundResult: result,
      matchWinner: result === 'win' ? 'player' : result === 'loss' ? 'opponent' : null,
      phase: 'result',
    });
    navigateTo('game_result');
    showToast(`1:1 강제 ${result.toUpperCase()} 상태가 생성되었습니다.`, 'info');
  };

  const handleSimulateError = (type: 'matching_fail' | 'timeout' | 'network') => {
    if (type === 'matching_fail') {
      setRewardModal({
        title: '매칭 실패 (데모)',
        message: '현재 조건에 맞는 상대 플레이어가 없습니다. 나중에 다시 시도해 주세요.',
        icon: '⚠️',
      });
    } else if (type === 'timeout') {
      setRewardModal({
        title: '상대 응답 없음 (타임아웃)',
        message: '상대방의 네트워크 접속이 불안정하여 게임이 중단되었습니다.',
        icon: '⏳',
      });
    } else {
      setRewardModal({
        title: '네트워크 연결 오류',
        message: '서버와의 통신이 원활하지 않습니다. 인터넷 연결 상태를 확인하세요.',
        icon: '🌐',
      });
    }
  };

  // Tournament Force Actions
  const handleSetTournamentState = async (stage: string) => {
    const mockTour: Tournament = {
      id: 'tour_daily',
      title: '매일 100만P 프리미엄 토너먼트',
      type: 'daily',
      totalPrize: 1000000,
      ticketCost: 1,
      maxParticipants: 64,
      currentParticipants: stage === 'low_participants' ? 4 : 64,
      startTime: '20:00',
      startTimeEpoch: Date.now() + (stage === '10s_before' ? 10_000 : 1000 * 60 * 30),
      status: 'open',
      currentRound: '참가 접수 중',
      description: '개발자 테스트용 토너먼트 상태입니다.',
    };

    setActiveTournament(mockTour);

    if (stage === 'registering') {
      navigateTo('tournament_lobby');
      showToast('토너먼트 참가 접수 중 상태로 변경되었습니다.', 'info');
    } else if (stage === 'ticket_shortage') {
      await setDevBalance({ tickets: 0 }, '[개발 프리셋] 티켓 부족 상태');
      navigateTo('tournament_lobby');
      showToast('티켓 부족 상태가 설정되었습니다.', 'error');
    } else if (stage === 'registered') {
      await registerTournament(mockTour);
      navigateTo('tournament_wait');
    } else if (stage === '10s_before') {
      await registerTournament(mockTour);
      navigateTo('tournament_wait');
      showToast('시작 10초 전 시뮬레이션 상태입니다.', 'info');
    } else if (stage === 'bracket') {
      navigateTo('tournament_bracket');
      showToast('대진표 화면으로 이동했습니다.', 'success');
    }
  };

  // Reset Operations
  const handleResetAll = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sound.playClick();
      showToast('localStorage 및 모든 테스트 데이터가 초기화되었습니다.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div
      className={`space-y-6 transition-all ${
        mobilePreview ? 'max-w-[390px] mx-auto border-4 border-cyan-500 rounded-3xl p-3 bg-slate-950 shadow-2xl' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black text-amber-400 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              개발자 검수 패널 (/dev-test)
            </h1>
            <p className="text-[11px] text-slate-400">실시간 게임 상태 및 예외 케이스 검증 툴</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('admin_center')}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-cyan-500/20"
          >
            관리자센터
          </button>
          <button
            onClick={() => navigateTo('development_status')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-indigo-500/20"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            개발 현황 보고서
          </button>
        </div>
      </div>

      {/* 1. User Profile Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
          <User className="w-4 h-4 text-cyan-400" />
          1. 사용자 상태 제어
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
          <button
            onClick={() => handleSetPoints(0)}
            className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300"
          >
            포인트 0P
          </button>
          <button
            onClick={() => handleSetPoints(5)}
            className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-amber-300"
          >
            포인트 5P (부족)
          </button>
          <button
            onClick={() => handleSetPoints(1000)}
            className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-cyan-300"
          >
            포인트 1,000P
          </button>
          <button
            onClick={() => handleSetPoints(50000)}
            className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-emerald-300"
          >
            포인트 50,000P
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs font-bold">
          <button
            onClick={() => handleSetTickets(0)}
            className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-red-300"
          >
            티켓 0장
          </button>
          <button
            onClick={() => handleSetTickets(1)}
            className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-cyan-300"
          >
            티켓 1장
          </button>
          <button
            onClick={() => handleSetTickets(10)}
            className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-purple-300"
          >
            티켓 10장
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-black pt-1">
          <button
            onClick={() => handleSetUserType('new')}
            className="py-2.5 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded-xl hover:brightness-110"
          >
            🌱 신규 사용자 설정
          </button>
          <button
            onClick={() => handleSetUserType('pro')}
            className="py-2.5 bg-purple-950 border border-purple-500/40 text-purple-300 rounded-xl hover:brightness-110"
          >
            👑 고레벨 사용자 설정
          </button>
        </div>
      </div>

      {/* 2. 1:1 Match Force Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
          <Swords className="w-4 h-4 text-amber-400" />
          2. 1:1 대전 상태 강제 생성
        </h3>

        <div className="grid grid-cols-3 gap-2 text-xs font-extrabold">
          <button
            onClick={() => handleForceMatchResult('win')}
            className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
          >
            🎉 강제 승리
          </button>
          <button
            onClick={() => handleForceMatchResult('loss')}
            className="py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md"
          >
            💀 강제 패배
          </button>
          <button
            onClick={() => handleForceMatchResult('draw')}
            className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md"
          >
            🤝 강제 무승부
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs font-bold pt-1">
          <button
            onClick={() => handleSimulateError('matching_fail')}
            className="py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 hover:bg-slate-800"
          >
            매칭 실패 모달
          </button>
          <button
            onClick={() => handleSimulateError('timeout')}
            className="py-2 bg-slate-950 border border-slate-800 rounded-xl text-red-300 hover:bg-slate-800"
          >
            상대 응답 없음
          </button>
          <button
            onClick={() => handleSimulateError('network')}
            className="py-2 bg-slate-950 border border-slate-800 rounded-xl text-purple-300 hover:bg-slate-800"
          >
            네트워크 오류
          </button>
        </div>
      </div>

      {/* 3. Tournament Force Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-black text-purple-300 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-purple-400" />
          3. 토너먼트 상태 시뮬레이션
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
          <button
            onClick={() => handleSetTournamentState('registering')}
            className="py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800"
          >
            참가 접수 중
          </button>
          <button
            onClick={() => handleSetTournamentState('ticket_shortage')}
            className="py-2 bg-slate-950 border border-slate-800 text-red-300 rounded-xl hover:bg-slate-800"
          >
            티켓 부족
          </button>
          <button
            onClick={() => handleSetTournamentState('registered')}
            className="py-2 bg-slate-950 border border-slate-800 text-cyan-300 rounded-xl hover:bg-slate-800"
          >
            참가 완료 대기실
          </button>
          <button
            onClick={() => handleSetTournamentState('10s_before')}
            className="py-2 bg-slate-950 border border-slate-800 text-amber-300 rounded-xl hover:bg-slate-800"
          >
            시작 10초 전
          </button>
          <button
            onClick={() => handleSetTournamentState('bracket')}
            className="py-2 bg-slate-950 border border-slate-800 text-purple-300 rounded-xl hover:bg-slate-800"
          >
            대진표 보기
          </button>
          <button
            onClick={() => navigateTo('tournament_game')}
            className="py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black"
          >
            토너먼트 경기 진입
          </button>
        </div>
      </div>

      {/* 4. System & UI Utilities */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          4. 시스템 및 UI 유틸리티
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
          <button
            onClick={openTutorial}
            className="py-2.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-xl hover:brightness-110"
          >
            초보자 튜토리얼 다시 열기
          </button>
          <button
            onClick={() => setReduceMotion(!reduceMotion)}
            className={`py-2.5 border rounded-xl font-extrabold ${
              reduceMotion ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            애니메이션 감소: {reduceMotion ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setMobilePreview(!mobilePreview)}
            className={`py-2.5 border rounded-xl font-extrabold flex items-center justify-center gap-1 ${
              mobilePreview ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            모바일 미리보기
          </button>
        </div>

        <button
          onClick={handleResetAll}
          className="w-full py-3 bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-300 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 mt-2 shadow-lg"
        >
          <RotateCcw className="w-4 h-4" />
          전체 localStorage 및 mock 데이터 완전 초기화
        </button>
      </div>
    </div>
  );
};
