import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Sparkles,
  Swords,
  Crown,
  Users,
  Clock,
  Eye,
  Settings,
  HelpCircle,
  Tv,
  RotateCcw,
  Bell,
  Home,
  Flame,
  Award,
  ChevronRight,
  Zap,
  Volume2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { RPSChoice } from '../types';
import { sound } from '../utils/audio';
import { gameSocket } from '../api/socket';
import { tournamentService } from '../services/tournamentService';

// Tournament progression steps definition
export interface TourStep {
  id: string;
  label: string;
  roundName: string;
}

export const TOURNAMENT_STEPS: TourStep[] = [
  { id: 'reg', label: '참가 접수', roundName: '체크인 완료' },
  { id: 'prelim', label: '예선전', roundName: '예선 소수결' },
  { id: 'r64', label: '64강', roundName: '64강전' },
  { id: 'r32', label: '32강', roundName: '32강전' },
  { id: 'r16', label: '16강', roundName: '16강전' },
  { id: 'r8', label: '8강', roundName: '8강전' },
  { id: 'semi', label: '준결승', roundName: '4강 준결승 (3판 2선승)' },
  { id: 'final', label: '결승전', roundName: '🏆 황금 결승전 (3판 2선승)' },
  { id: 'result', label: '결과 발표', roundName: '우승 시상식' },
];

export const TournamentGamePage: React.FC = () => {
  const { navigateTo, user, setRewardModal, activeTournament } = useGame();

  // Current stage in the tournament flow
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1); // Default: Preliminaries (index 1)

  // Preliminary Config Mode: 'minority_pass' (소수 패 그룹 통과) or 'majority_pass' (다수 패 그룹 통과)
  const [prelimRuleMode, setPrelimRuleMode] = useState<'minority_pass' | 'majority_pass'>('minority_pass');

  // Preliminary State
  const [prelimSelectedCount, setPrelimSelectedCount] = useState<number>(104);
  const [prelimTimeLeft, setPrelimTimeLeft] = useState<number>(10);
  const [prelimChoice, setPrelimChoice] = useState<RPSChoice>(null);
  const [prelimSubmitted, setPrelimSubmitted] = useState<boolean>(false);
  const [prelimResult, setPrelimResult] = useState<{
    rock: number;
    paper: number;
    scissors: number;
    winningHand: RPSChoice;
    userPassed: boolean;
  } | null>(null);

  // Main & Finals Match State
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  const [matchChoice, setMatchChoice] = useState<RPSChoice>(null);
  const [oppChoice, setOppChoice] = useState<RPSChoice>(null);
  const [roundResultText, setRoundResultText] = useState<string | null>(null);

  // Elimination / Victory Modal states
  const [isEliminated, setIsEliminated] = useState<boolean>(false);
  const [eliminatedRound, setEliminatedRound] = useState<string>('');
  const [replayModalOpen, setReplayModalOpen] = useState<boolean>(false);
  const [interviewText, setInterviewText] = useState<string>(
    '손가락 끝에서 느껴진 가위의 직감이 승리로 이끌었습니다! 응원해주신 모든 전사들께 감사드립니다!'
  );

  // Audience cheering floaters for Finals
  const [cheers, setCheers] = useState<string[]>([
    'Dorirang 파이팅! 🏆',
    '전설의주먹 킹이다!',
    '🔥 2승 먼저 따내자!',
    '👏 명경기 감상 중!',
  ]);

  // Live match tickers on other tables
  const [tickerText, setTickerText] = useState<string>(
    'B구역 2번 테이블: [네온닌자] 1 - 0 [샤프슈터] • C구역 4번: [골드마스터] 승리 진출!'
  );

  // Preliminary live participant selection count generator
  useEffect(() => {
    if (currentStepIndex === 1 && !prelimSubmitted) {
      const interval = setInterval(() => {
        setPrelimSelectedCount((prev) => Math.min(128, prev + Math.floor(Math.random() * 3) + 1));
      }, 800);
      return () => clearInterval(interval);
    }
  }, [currentStepIndex, prelimSubmitted]);

  // Preliminary Timer
  useEffect(() => {
    if (currentStepIndex === 1 && !prelimSubmitted && prelimTimeLeft > 0) {
      const timer = setInterval(() => setPrelimTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (currentStepIndex === 1 && prelimTimeLeft === 0 && !prelimSubmitted) {
      // Auto submit default choice if time runs out
      handlePrelimSubmit('rock');
    }
  }, [currentStepIndex, prelimTimeLeft, prelimSubmitted]);

  // Finals Audience Cheer Interval
  useEffect(() => {
    if (currentStepIndex === 7) {
      const messages = [
        'Dorirang 챔피언 가자!! 👑',
        '전설의주먹 가위 들어간다!! ✌️',
        '🔥 명불허전 1위전!',
        '💰 상금 100만P의 주인공은?!',
        '⚡ 미친 순발력!',
      ];
      const interval = setInterval(() => {
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        setCheers((prev) => [...prev.slice(-3), randomMsg]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentStepIndex]);

  // Handle Preliminary Submission — 서버 소수결 집계
  const handlePrelimSubmit = (choice: RPSChoice) => {
    if (!choice || !activeTournament) return;
    sound.playSelectRPS();
    setPrelimChoice(choice);
    setPrelimSubmitted(true);
    gameSocket.emit('QUALIFIER_CHOICE_SUBMIT', {
      tournamentId: activeTournament.id,
      choice,
    });
  };

  useEffect(() => {
    if (!activeTournament) return;
    tournamentService.subscribe(activeTournament.id);

    const offStarted = gameSocket.on('QUALIFIER_STARTED', (payload) => {
      const data = payload as { endsAt?: number; alive?: number };
      setCurrentStepIndex(1);
      setPrelimSubmitted(false);
      setPrelimChoice(null);
      setPrelimResult(null);
      if (data.endsAt) {
        setPrelimTimeLeft(Math.max(1, Math.ceil((data.endsAt - Date.now()) / 1000)));
      }
      if (data.alive) setPrelimSelectedCount(0);
    });

    const offResult = gameSocket.on('QUALIFIER_RESULT', (payload) => {
      const data = payload as {
        isTie?: boolean;
        minorityChoice?: string;
        tallies?: { ROCK: number; PAPER: number; SCISSORS: number };
        survivors?: number;
      };
      const tallies = data.tallies ?? { ROCK: 0, PAPER: 0, SCISSORS: 0 };
      const winning = (data.minorityChoice?.toLowerCase() as RPSChoice) || 'scissors';
      const passed = !data.isTie && prelimChoice === winning;
      setPrelimResult({
        rock: tallies.ROCK,
        paper: tallies.PAPER,
        scissors: tallies.SCISSORS,
        winningHand: winning,
        userPassed: data.isTie ? true : passed,
      });
      if (data.isTie) {
        sound.playTick();
        setRewardModal({
          title: '예선 동률',
          message: '최소 그룹이 동률이라 재라운드가 진행됩니다.',
          icon: '🤝',
        });
      } else if (passed) sound.playWin();
      else sound.playLose();
    });

    const offBracket = gameSocket.on('BRACKET_CREATED', () => {
      setCurrentStepIndex(2);
      navigateTo('tournament_bracket');
    });

    const offMatch = gameSocket.on('TOURNAMENT_MATCH_READY', (payload) => {
      const data = payload as {
        matchId: string;
        player1Id: string;
        player2Id: string;
        endsAt: number;
        roundLabel?: string;
      };
      // 본선 UI는 기존 단계 흐름 유지 — 내 경기면 선택 가능하도록 힌트
      if (data.roundLabel?.includes('준결승')) setCurrentStepIndex(6);
      else if (data.roundLabel === '결승') setCurrentStepIndex(7);
    });

    const offDone = gameSocket.on('TOURNAMENT_COMPLETED', () => {
      setCurrentStepIndex(8);
    });

    return () => {
      offStarted();
      offResult();
      offBracket();
      offMatch();
      offDone();
    };
  }, [activeTournament?.id, prelimChoice]);

  // Move to next stage
  const handleNextStep = () => {
    sound.playClick();
    if (currentStepIndex < TOURNAMENT_STEPS.length - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      // Reset match choices & scores
      setP1Score(0);
      setP2Score(0);
      setMatchChoice(null);
      setOppChoice(null);
      setRoundResultText(null);
      setIsEliminated(false);
    }
  };

  // Play a round in 1:1 Main / Semifinal / Finals Match
  const playMatchRound = (choice: RPSChoice) => {
    if (!choice) return;
    sound.playSelectRPS();
    setMatchChoice(choice);

    const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];
    const opp = choices[Math.floor(Math.random() * choices.length)];
    setOppChoice(opp);

    setTimeout(() => {
      let res: 'win' | 'loss' | 'draw' = 'draw';
      if (choice === opp) {
        res = 'draw';
        setRoundResultText('🤝 무승부! 다시 선택하세요.');
      } else if (
        (choice === 'rock' && opp === 'scissors') ||
        (choice === 'scissors' && opp === 'paper') ||
        (choice === 'paper' && opp === 'rock')
      ) {
        res = 'win';
        sound.playWin();
        const nextScore = p1Score + 1;
        setP1Score(nextScore);
        setRoundResultText('⚡ Round 득점 성공!');

        // Semifinal or Finals (3판 2선승)
        if ((currentStepIndex === 6 || currentStepIndex === 7) && nextScore >= 2) {
          if (currentStepIndex === 7) {
            // WIN FINALS!
            setTimeout(() => {
              setCurrentStepIndex(8); // Move to Result / Victory Interview
              sound.playWin();
            }, 1200);
          } else {
            // WIN SEMIFINALS -> Move to Finals
            setTimeout(() => {
              setRewardModal({
                title: '🎉 결승전 진출!',
                message: '준결승전에서 2승을 거두어 최종 황금 결승전에 진출하였습니다!',
                icon: '👑',
              });
              handleNextStep();
            }, 1200);
          }
        } else if (currentStepIndex >= 2 && currentStepIndex <= 5) {
          // Single elimination main rounds (64강, 32강, 16강, 8강)
          setTimeout(() => handleNextStep(), 1200);
        }
      } else {
        res = 'loss';
        sound.playLose();
        const nextOppScore = p2Score + 1;
        setP2Score(nextOppScore);
        setRoundResultText('💔 상대 득점...');

        if ((currentStepIndex === 6 || currentStepIndex === 7) && nextOppScore >= 2) {
          // Eliminated in 3-round match
          setTimeout(() => {
            setEliminatedRound(TOURNAMENT_STEPS[currentStepIndex].roundName);
            setIsEliminated(true);
          }, 1200);
        } else if (currentStepIndex >= 2 && currentStepIndex <= 5) {
          // Single match loss -> Elimination
          setTimeout(() => {
            setEliminatedRound(TOURNAMENT_STEPS[currentStepIndex].roundName);
            setIsEliminated(true);
          }, 1200);
        }
      }
    }, 1000);
  };

  const getRPSHand = (choice: RPSChoice) => {
    switch (choice) {
      case 'rock':
        return '✊';
      case 'paper':
        return '✋';
      case 'scissors':
        return '✌️';
      default:
        return '❓';
    }
  };

  const isFinals = currentStepIndex === 7;
  const currentStep = TOURNAMENT_STEPS[currentStepIndex];

  return (
    <div className="space-y-5 pb-20 md:pb-8 max-w-2xl mx-auto">
      {/* 1. TOP STEP BAR (토너먼트 진행 단계 상단 스텝바) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-xl overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-[620px] gap-1 px-1">
          {TOURNAMENT_STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isDone = idx < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => {
                    sound.playClick();
                    setCurrentStepIndex(idx);
                    setIsEliminated(false);
                  }}
                  className={`flex flex-col items-center cursor-pointer transition-all ${
                    isActive
                      ? 'scale-105'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/30'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 whitespace-nowrap ${
                      isActive ? 'text-amber-300 font-black' : isDone ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < TOURNAMENT_STEPS.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 min-w-[12px] rounded-full transition-colors ${
                      idx < currentStepIndex ? 'bg-emerald-500/50' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 px-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
              {currentStep.roundName}
            </span>
            <h2 className="text-sm font-black text-white">매시간 정규 128강 토너먼트</h2>
          </div>
        </div>

        <button
          onClick={() => navigateTo('tournament_bracket')}
          className="text-xs font-black text-cyan-300 bg-cyan-950 border border-cyan-500/40 px-3 py-1.5 rounded-xl hover:bg-cyan-900/80 transition-colors flex items-center gap-1"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>대진표</span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* 2. PRELIMINARIES SCREEN (예선전: 128명 동시 선택 화면) */}
      {/* ================================================================ */}
      {currentStepIndex === 1 && (
        <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
          {/* Prelim Rule Config Bar */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-purple-400" />
              <span className="font-extrabold text-white">예선 방식 설정:</span>
              <span className="text-purple-300 font-black">
                {prelimRuleMode === 'minority_pass' ? '소수 패 그룹 통과 (기본)' : '다수 패 그룹 통과'}
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setPrelimRuleMode((m) => (m === 'minority_pass' ? 'majority_pass' : 'minority_pass'));
              }}
              className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-extrabold text-[11px] rounded-lg border border-purple-500/40 transition-colors"
            >
              규칙 전환 🔄
            </button>
          </div>

          {/* Prelim Rules Guide Card */}
          <div className="bg-gradient-to-r from-purple-950/60 to-slate-950 p-3.5 rounded-2xl border border-purple-500/30 text-xs text-slate-300 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-amber-300">예선전 통과 규칙 안내:</span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {prelimRuleMode === 'minority_pass'
                  ? '모든 128명이 동시에 패를 제출합니다. [가위/바위/보] 중 가장 적은 인원이 선택한 소수 그룹이 64강으로 전원 통과합니다!'
                  : '모든 128명이 동시에 패를 제출합니다. [가위/바위/보] 중 가장 많은 인원이 선택한 다수 그룹이 64강으로 전원 통과합니다!'}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">전체 참가자</span>
              <span className="text-base font-black text-white">128명</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">제출 완료</span>
              <span className="text-base font-black text-cyan-300">
                {prelimSelectedCount} / 128명
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">남은 제한시간</span>
              <span className="text-base font-black text-red-400 animate-pulse">
                00:0{prelimTimeLeft}s
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">64강 통과 정원</span>
              <span className="text-base font-black text-amber-400">64명</span>
            </div>
          </div>

          {/* RPS Choice Buttons for Prelim */}
          {!prelimSubmitted ? (
            <div className="space-y-3 pt-2">
              <h3 className="text-center font-black text-sm text-white">
                제한 시간 내에 제출할 내 손을 선택하세요!
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handlePrelimSubmit('scissors')}
                  className="arcade-btn-3d py-5 bg-purple-900 hover:bg-purple-800 text-white font-black rounded-2xl border-b-4 border-purple-950 flex flex-col items-center transition-all active:scale-95 shadow-lg"
                >
                  <span className="text-4xl mb-1">✌️</span>
                  <span className="text-xs">가위 선택</span>
                </button>

                <button
                  onClick={() => handlePrelimSubmit('rock')}
                  className="arcade-btn-3d py-5 bg-cyan-900 hover:bg-cyan-800 text-white font-black rounded-2xl border-b-4 border-cyan-950 flex flex-col items-center transition-all active:scale-95 shadow-lg"
                >
                  <span className="text-4xl mb-1">✊</span>
                  <span className="text-xs">바위 선택</span>
                </button>

                <button
                  onClick={() => handlePrelimSubmit('paper')}
                  className="arcade-btn-3d py-5 bg-amber-900 hover:bg-amber-800 text-white font-black rounded-2xl border-b-4 border-amber-950 flex flex-col items-center transition-all active:scale-95 shadow-lg"
                >
                  <span className="text-4xl mb-1">✋</span>
                  <span className="text-xs">보 선택</span>
                </button>
              </div>
            </div>
          ) : (
            /* Prelim Result Reveal */
            <div className="bg-slate-950 p-5 rounded-3xl border border-purple-500/50 text-center space-y-4">
              {!prelimResult ? (
                <div className="py-6 space-y-2">
                  <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-black text-cyan-300">
                    전체 128명 제출 결과 집계 중...
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full">
                      128명 예선 집계 완료
                    </span>
                    <h3 className="text-lg font-black text-white">
                      {prelimResult.userPassed ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-5 h-5" /> 64강 진출 성공! 🎉
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center justify-center gap-1">
                          <XCircle className="w-5 h-5" /> 예선 탈락... 💀
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Distribution breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold bg-slate-900 p-3 rounded-2xl border border-slate-800">
                    <div className="p-2 rounded-xl bg-slate-950 border border-purple-500/30">
                      <span>✌️ 가위:</span>
                      <span className="text-purple-300 font-extrabold block text-sm">
                        {prelimResult.scissors}명
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-cyan-500/30">
                      <span>✊ 바위:</span>
                      <span className="text-cyan-300 font-extrabold block text-sm">
                        {prelimResult.rock}명
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-amber-500/30">
                      <span>✋ 보:</span>
                      <span className="text-amber-300 font-extrabold block text-sm">
                        {prelimResult.paper}명
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900/80 py-2 px-3 rounded-xl border border-slate-800">
                    {prelimRuleMode === 'minority_pass'
                      ? `가장 적은 선택 [${getRPSHand(prelimResult.winningHand)}] 그룹이 통과하였습니다!`
                      : `가장 많은 선택 [${getRPSHand(prelimResult.winningHand)}] 그룹이 통과하였습니다!`}
                  </p>

                  {prelimResult.userPassed ? (
                    <button
                      onClick={handleNextStep}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110"
                    >
                      64강전 본선 경기장 입장하기 →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEliminatedRound('128명 예선전');
                        setIsEliminated(true);
                      }}
                      className="w-full py-3 rounded-2xl bg-red-600 text-white font-black text-xs shadow-lg"
                    >
                      탈락 메뉴로 이동하기
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* 3. MAIN MATCH SCREEN (본선: 64강, 32강, 16강, 8강, 준결승, 결승) */}
      {/* ================================================================ */}
      {currentStepIndex >= 2 && currentStepIndex <= 7 && !isEliminated && (
        <div
          className={`border rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden transition-all duration-500 ${
            isFinals
              ? 'bg-gradient-to-b from-amber-950/90 via-slate-950 to-purple-950/90 border-2 border-amber-400 shadow-amber-500/30'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          {/* Finals Special Glamour Header Effects */}
          {isFinals && (
            <div className="bg-amber-500/20 border border-amber-400/60 p-3 rounded-2xl text-center space-y-1 animate-pulse">
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                골든 아레나 메인 스포트라이트
              </span>
              <h3 className="text-base font-black text-amber-200">
                🏆 최후의 1인을 가리는 최종 결승전 (3판 2선승제)
              </h3>
            </div>
          )}

          {/* Audience Cheer Reactions Bar for Finals */}
          {isFinals && cheers.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-[11px] font-bold">
              <span className="text-amber-400 font-black shrink-0">📣 관중 리액션:</span>
              {cheers.map((c, i) => (
                <span
                  key={i}
                  className="bg-slate-950 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30 shrink-0 animate-bounce"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Info Overview Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">현재 라운드</span>
              <span className="text-amber-400 font-extrabold">{currentStep.label}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">남은 참가자</span>
              <span className="text-cyan-300 font-extrabold">
                {currentStepIndex === 2
                  ? '64명'
                  : currentStepIndex === 3
                  ? '32명'
                  : currentStepIndex === 4
                  ? '16명'
                  : currentStepIndex === 5
                  ? '8명'
                  : currentStepIndex === 6
                  ? '4명'
                  : '2명'}
              </span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">내 테이블 시드</span>
              <span className="text-purple-300 font-extrabold">A구역 #01</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">관전자 수</span>
              <span className="text-emerald-400 font-extrabold flex items-center justify-center gap-1">
                <Eye className="w-3 h-3" /> {isFinals ? '3,820명' : '1,240명'}
              </span>
            </div>
          </div>

          {/* Semifinals & Finals Scoreboard */}
          {(currentStepIndex === 6 || currentStepIndex === 7) && (
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/40 text-center space-y-1">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                3판 2선승제 스코어보드 (2승 선취)
              </span>
              <div className="flex items-center justify-center gap-4 text-lg font-black text-white">
                <span className="text-cyan-400">{user.nickname} {p1Score}</span>
                <span className="text-amber-400 font-mono text-xl">:</span>
                <span className="text-red-400">{p2Score} {isFinals ? '전설의주먹' : '네온닌자'}</span>
              </div>
            </div>
          )}

          {/* Next Expected Opponent Banner */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center text-[11px] text-slate-400 font-bold">
            <span>다음 예상 승자 대결 상대: </span>
            <span className="text-cyan-300 font-extrabold">[승리의신] or [사이보그AI]</span>
          </div>

          {/* Match Arena Stage */}
          <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 text-center space-y-4">
            <div className="flex items-center justify-around">
              {/* My Opponent */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-20 h-20 rounded-2xl bg-slate-900 border flex items-center justify-center text-4xl shadow-xl ${
                    isFinals ? 'border-amber-400' : 'border-red-500/50'
                  }`}
                >
                  {matchChoice ? getRPSHand(oppChoice) : isFinals ? '👑' : '🥷'}
                </div>
                <span className="text-xs font-black text-white mt-1.5">
                  {isFinals ? '전설의주먹' : '네온닌자'}
                </span>
                <span className="text-[10px] text-amber-300 font-bold">
                  {isFinals ? '세계 챔피언' : '16강 시드 #2'}
                </span>
              </div>

              {/* VS Divider */}
              <div className="text-center">
                <div className="text-xl font-black text-amber-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                  VS
                </div>
                {roundResultText && (
                  <p className="text-[11px] font-black text-amber-300 mt-2 bg-slate-900/90 py-1 px-2.5 rounded-lg border border-slate-800 animate-pulse">
                    {roundResultText}
                  </p>
                )}
              </div>

              {/* Player (Me) */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-cyan-400 flex items-center justify-center text-4xl shadow-xl">
                  {matchChoice ? getRPSHand(matchChoice) : user.avatar}
                </div>
                <span className="text-xs font-black text-white mt-1.5">{user.nickname} (나)</span>
                <span className="text-[10px] text-cyan-300 font-bold">{user.title}</span>
              </div>
            </div>

            {/* Action RPS Buttons */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-900">
              <button
                onClick={() => playMatchRound('scissors')}
                className="arcade-btn-3d py-4 bg-purple-900 hover:bg-purple-800 text-white font-black rounded-2xl border-b-4 border-purple-950 flex flex-col items-center"
              >
                <span className="text-3xl mb-1">✌️</span>
                <span className="text-xs">가위</span>
              </button>

              <button
                onClick={() => playMatchRound('rock')}
                className="arcade-btn-3d py-4 bg-cyan-900 hover:bg-cyan-800 text-white font-black rounded-2xl border-b-4 border-cyan-950 flex flex-col items-center"
              >
                <span className="text-3xl mb-1">✊</span>
                <span className="text-xs">바위</span>
              </button>

              <button
                onClick={() => playMatchRound('paper')}
                className="arcade-btn-3d py-4 bg-amber-900 hover:bg-amber-800 text-white font-black rounded-2xl border-b-4 border-amber-950 flex flex-col items-center"
              >
                <span className="text-3xl mb-1">✋</span>
                <span className="text-xs">보</span>
              </button>
            </div>
          </div>

          {/* Live matches ticker on other tables */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-2">
            <span className="text-cyan-400 shrink-0 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              타 테이블 중계:
            </span>
            <span className="truncate">{tickerText}</span>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 4. VICTORY CHAMPION RESULT CARD (결승전 우승 시 인터뷰 카드) */}
      {/* ================================================================ */}
      {currentStepIndex === 8 && (
        <div className="bg-gradient-to-b from-amber-950 via-slate-900 to-purple-950 border-2 border-amber-400 rounded-3xl p-6 text-center space-y-5 shadow-2xl shadow-amber-500/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

          {/* Trophy Header */}
          <div className="space-y-2">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center text-5xl mx-auto shadow-2xl shadow-amber-500/50 animate-bounce">
              🏆
            </div>
            <span className="text-xs font-black text-amber-300 uppercase tracking-widest block">
              128강 정규 토너먼트 최종 챔피언
            </span>
            <h2 className="text-2xl font-black text-white">
              축하합니다! <span className="text-amber-400">{user.nickname}</span> 님 우승!
            </h2>
            <p className="text-xs text-amber-200">
              우승 상금 <span className="font-black text-emerald-400">1,000,000P</span> + 전설 칭호 [토너먼트 챔피언] 획득!
            </p>
          </div>

          {/* Winner Interview Card Format */}
          <div className="bg-slate-950/90 p-4 rounded-2xl border border-amber-500/40 text-left space-y-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-amber-300">챔피언 승리 소감 인터뷰</span>
            </div>

            <textarea
              value={interviewText}
              onChange={(e) => setInterviewText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none h-20"
              placeholder="우승 소감을 남겨주세요..."
            />
            <span className="text-[10px] text-slate-500 block text-right">
              * 챔피언 전당에 등록되어 전 세계 유저에게 노출됩니다.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => navigateTo('tournament_bracket')}
              className="flex-1 py-3 rounded-2xl bg-slate-900 border border-amber-500/50 text-amber-300 font-extrabold text-xs hover:border-amber-300 transition-colors"
            >
              우승 대진표 기록 보기
            </button>
            <button
              onClick={() => navigateTo('home')}
              className="flex-1 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg"
            >
              메인으로 이동하기
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 5. TOURNAMENT ELIMINATION SCREEN (토너먼트 탈락 화면) */}
      {/* ================================================================ */}
      {isEliminated && (
        <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center text-3xl mx-auto">
            💀
          </div>

          <div>
            <span className="text-xs font-bold text-red-400 uppercase block">
              [{eliminatedRound}] 경기 완료
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">토너먼트에서 탈락하였습니다</h2>
            <p className="text-xs text-slate-400 mt-1">
              아쉽지만 다음 회차 토너먼트에 다시 도전해보세요!
            </p>
          </div>

          {/* Interactive Navigation Options Menu */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigateTo('spectate')}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 border border-cyan-500/50 text-cyan-300 font-extrabold text-xs flex items-center justify-between hover:bg-cyan-950/60 transition-colors shadow-lg"
            >
              <span className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-cyan-400" />
                남은 경기 실시간 관전하기
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setReplayModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 border border-purple-500/50 text-purple-300 font-extrabold text-xs flex items-center justify-between hover:bg-purple-950/60 transition-colors shadow-lg"
            >
              <span className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-400" />
                내 경기 하이라이트 다시보기
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setRewardModal({
                  title: '다음 토너먼트 예약 완료',
                  message: '다음 128강 정규 리그 개최 10분 전 스마트 푸시 알림이 발송됩니다!',
                  icon: '🔔',
                });
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 border border-amber-500/50 text-amber-300 font-extrabold text-xs flex items-center justify-between hover:bg-amber-950/60 transition-colors shadow-lg"
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                다음 회차 토너먼트 알림 예약
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigateTo('versus_rooms')}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-extrabold text-xs flex items-center justify-between hover:bg-slate-800 transition-colors shadow-lg"
            >
              <span className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-cyan-400" />
                1:1 실시간 대전하러 가기
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigateTo('home')}
              className="w-full py-3 px-4 rounded-2xl bg-slate-950 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <Home className="w-4 h-4" />
              메인 로비로 이동
            </button>
          </div>
        </div>
      )}

      {/* Replay Modal */}
      {replayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <h3 className="font-black text-base text-white flex items-center justify-center gap-2">
              <RotateCcw className="w-5 h-5 text-purple-400" />
              경기 다시보기 시뮬레이션
            </h3>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-around text-2xl">
                <span>{user.avatar} ✊</span>
                <span className="text-xs text-red-400 font-black">VS</span>
                <span>🥷 ✋</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                [00:03] 상대의 '보' 선택에 패배
              </p>
            </div>

            <button
              onClick={() => setReplayModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
