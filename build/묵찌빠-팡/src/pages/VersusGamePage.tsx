import React, { useEffect, useState } from 'react';
import { Sparkles, Trophy, Zap, ShieldAlert, Lock, Swords, Flame, RotateCcw, ArrowRight, Share2, Coins } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { MatchChoice, RPSChoice } from '../types';
import { sound } from '../utils/audio';
import { ShareResultModal } from '../components/ShareResultModal';

type GameStep = 'MATCH_FOUND' | 'COUNTDOWN' | 'SELECTION' | 'SLOT_REEL' | 'SHOWDOWN' | 'RESULT';

const RANDOM_HANDS: MatchChoice[] = ['rock', 'paper', 'scissors'];

export const VersusGamePage: React.FC = () => {
  const {
    activeMatch,
    playRPSRound,
    playStrategyRound,
    strategyRound,
    user,
    startMatchmaking,
    selectedRoom,
    navigateTo,
  } = useGame();

  const [step, setStep] = useState<GameStep>('MATCH_FOUND');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [selectionTimer, setSelectionTimer] = useState<number>(5);
  const [selectedHand, setSelectedHand] = useState<RPSChoice>(null);

  // 300P Strategic Match — 서버 STRATEGY_* 이벤트로 진행된다.
  const isStrategic300P = activeMatch?.stakePoints === 300 || activeMatch?.roomId === 'room_300p';
  const [presetSlots, setPresetSlots] = useState<RPSChoice[]>([null, null, null]);
  const strategyPhase = strategyRound?.phase ?? null;
  const canPickSlots = strategyPhase === 'SUBMITTING';

  // Slot Reel state
  const [slotReelHandP1, setSlotReelHandP1] = useState<RPSChoice>('rock');
  const [slotReelHandP2, setSlotReelHandP2] = useState<RPSChoice>('scissors');

  // Rematch auto countdown on Draw
  const [drawRematchSec, setDrawRematchSec] = useState<number>(3);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);

  /* ── 300P 전략 대전: 서버 이벤트가 단계를 결정한다 ───────────────────────── */
  useEffect(() => {
    if (!isStrategic300P || !strategyRound) return;
    // 새 세트가 시작되면 슬롯을 비운다.
    setPresetSlots([null, null, null]);
    setSelectedHand(null);
  }, [isStrategic300P, strategyRound?.setNumber]);

  useEffect(() => {
    if (!isStrategic300P || !strategyPhase) return;
    if (strategyPhase === 'SUBMITTING') {
      sound.playCountdownGo();
      setStep('SELECTION');
    } else if (strategyPhase === 'LOCKED') {
      setStep('SLOT_REEL');
    } else if (strategyPhase === 'REVEALING') {
      setStep('SHOWDOWN');
    } else {
      setStep('RESULT');
    }
  }, [isStrategic300P, strategyPhase]);

  // 제한시간은 서버 시각(endsAt) 기준
  useEffect(() => {
    if (!isStrategic300P) return;
    const endsAt = strategyRound?.endsAt ?? null;
    if (!endsAt) return;
    const tick = () => {
      setSelectionTimer(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isStrategic300P, strategyRound?.endsAt]);

  // 공개되는 순번마다 임팩트 연출
  useEffect(() => {
    if (!isStrategic300P || strategyPhase !== 'REVEALING') return;
    const last = strategyRound?.reveals[strategyRound.reveals.length - 1];
    if (!last) return;
    if (last.outcome === 'win') sound.playWin();
    else if (last.outcome === 'loss') sound.playLose();
    else sound.playTick();
  }, [isStrategic300P, strategyPhase, strategyRound?.reveals.length]);

  useEffect(() => {
    if (!activeMatch) return;
    // 전략 대전은 선택·공개·결과를 서버가 주도한다 (로컬 타이머 미사용).
    if (isStrategic300P && step !== 'MATCH_FOUND' && step !== 'COUNTDOWN') return;

    // 1. MATCH FOUND -> COUNTDOWN (after 1.8s)
    if (step === 'MATCH_FOUND') {
      sound.playMatchFound();
      const timer = setTimeout(() => {
        setStep('COUNTDOWN');
        setCountdownNum(3);
      }, 1800);
      return () => clearTimeout(timer);
    }

    // 2. COUNTDOWN 3 -> 2 -> 1 -> START -> SELECTION
    if (step === 'COUNTDOWN') {
      const interval = setInterval(() => {
        setCountdownNum((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // 전략 대전은 STRATEGY_ROUND_STARTED 를 기다린다.
            if (isStrategic300P) return 1;
            sound.playCountdownGo();
            setStep('SELECTION');
            setSelectionTimer(5);
            return 0;
          }
          sound.playTick();
          return prev - 1;
        });
      }, 900);
      return () => clearInterval(interval);
    }

    // 3. SELECTION TIMER (5s countdown)
    if (step === 'SELECTION') {
      const interval = setInterval(() => {
        setSelectionTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);

            if (!selectedHand) {
              setSelectedHand(RANDOM_HANDS[Math.floor(Math.random() * RANDOM_HANDS.length)]);
            }

            // Move to SLOT_REEL spin phase
            setStep('SLOT_REEL');
            return 0;
          }
          sound.playTick();
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }

    // 4. SLOT REEL RAPID SPIN (1s)
    if (step === 'SLOT_REEL') {
      const reelChoices: RPSChoice[] = ['rock', 'paper', 'scissors'];
      let ticks = 0;
      const spinInterval = setInterval(() => {
        setSlotReelHandP1(reelChoices[ticks % 3]);
        setSlotReelHandP2(reelChoices[(ticks + 1) % 3]);
        ticks += 1;
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(spinInterval);

        // Execute game round in context
        const currentPick = selectedHand || 'rock';
        playRPSRound(currentPick);
        setStep('SHOWDOWN');
      }, 1200);

      return () => {
        clearInterval(spinInterval);
        clearTimeout(timeout);
      };
    }

    // 5. SHOWDOWN -> RESULT (after 1s)
    if (step === 'SHOWDOWN') {
      const timeout = setTimeout(() => {
        setStep('RESULT');
      }, 1000);
      return () => clearTimeout(timeout);
    }

    // 6. DRAW AUTO REMATCH TIMER
    if (step === 'RESULT' && activeMatch.roundResult === 'draw') {
      setDrawRematchSec(3);
      const interval = setInterval(() => {
        setDrawRematchSec((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Restart same round
            handleNextOpponentOrRematch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, activeMatch?.round, isStrategic300P]);

  if (!activeMatch) return null;

  const opponent = activeMatch.opponent;

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

  const handleSelectHand = (choice: RPSChoice) => {
    if (isStrategic300P) {
      if (!canPickSlots || !choice) return;
      sound.playSelectRPS();

      const next = [...presetSlots];
      const emptyIdx = next.findIndex((slot) => slot === null);
      if (emptyIdx !== -1) {
        next[emptyIdx] = choice;
      } else {
        // If all 3 full, replace last slot
        next[2] = choice;
      }
      setPresetSlots(next);
      setSelectedHand(choice);

      // 3개가 모두 채워지면 순서 그대로 서버에 제출한다 (마감 전까지 재제출 가능).
      if (next.every((slot) => slot !== null)) {
        playStrategyRound(next as MatchChoice[]);
      }
      return;
    }

    if (step !== 'SELECTION') return;
    sound.playSelectRPS();
    setSelectedHand(choice);
  };

  const handleClearSlot = (index: number) => {
    if (!isStrategic300P || !canPickSlots) return;
    sound.playClick();
    setPresetSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleResetSlots = () => {
    if (!isStrategic300P || !canPickSlots) return;
    sound.playClick();
    setPresetSlots([null, null, null]);
    setSelectedHand(null);
  };

  /** 전략 대전: 남은 슬롯은 랜덤으로 채워 즉시 확정 제출 */
  const handleConfirmSlots = () => {
    if (isStrategic300P) {
      if (!canPickSlots) return;
      sound.playClick();
      const filled = presetSlots.map(
        (slot) => slot ?? RANDOM_HANDS[Math.floor(Math.random() * RANDOM_HANDS.length)]
      ) as MatchChoice[];
      setPresetSlots(filled);
      playStrategyRound(filled);
      return;
    }

    if (step !== 'SELECTION') return;
    sound.playClick();
    if (!selectedHand) {
      setSelectedHand(RANDOM_HANDS[Math.floor(Math.random() * RANDOM_HANDS.length)]);
    }
    setStep('SLOT_REEL');
  };

  const handleNextOpponentOrRematch = () => {
    setSelectedHand(null);
    setStep('MATCH_FOUND');
    if (selectedRoom) {
      startMatchmaking(selectedRoom);
    } else {
      navigateTo('versus_rooms');
    }
  };

  const strategyReveal = isStrategic300P
    ? strategyRound?.reveals[strategyRound.reveals.length - 1] ?? null
    : null;
  const strategySettled = strategyPhase === 'SET_RESULT' || strategyPhase === 'FINISHED';
  const strategySubmitted = (strategyRound?.submittedChoices.length ?? 0) === 3;

  let isWin: boolean;
  let isLoss: boolean;
  let isDraw: boolean;
  if (isStrategic300P) {
    isWin = strategySettled
      ? strategyRound?.matchWinner === 'player'
      : strategyReveal?.outcome === 'win';
    isLoss = strategySettled
      ? strategyRound?.matchWinner === 'opponent'
      : strategyReveal?.outcome === 'loss';
    isDraw = strategySettled
      ? Boolean(strategyRound?.isDraw)
      : strategyReveal?.outcome === 'draw';
  } else {
    isWin = activeMatch.matchWinner === 'player' || activeMatch.roundResult === 'win';
    isLoss = activeMatch.matchWinner === 'opponent' || activeMatch.roundResult === 'loss';
    isDraw = activeMatch.roundResult === 'draw';
  }

  const myShownHand: RPSChoice = isStrategic300P
    ? strategyReveal?.playerChoice ?? null
    : selectedHand;
  const opponentShownHand: RPSChoice = isStrategic300P
    ? strategyReveal?.opponentChoice ?? null
    : activeMatch.opponentChoice;
  const rewardDisplay =
    (isStrategic300P ? strategyRound?.rewardPoints : activeMatch.rewardPoints) ||
    activeMatch.stakePoints * 2;
  // 전략 대전은 무승부 시 서버가 새 세트를 시작하므로 종료 화면은 FINISHED 에서만 노출
  const showPostGame = isStrategic300P ? strategyPhase === 'FINISHED' : step === 'RESULT';
  const pickDisabled = isStrategic300P ? !canPickSlots : step !== 'SELECTION';

  return (
    <div className="flex flex-col justify-between min-h-[calc(100vh-140px)] max-w-xl mx-auto py-2 px-1 relative">
      {/* ================= 1. MATCH FOUND / OPPONENT PROFILE MODAL ================= */}
      {step === 'MATCH_FOUND' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 border-2 border-cyan-400 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scaleUp relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black animate-pulse">
              <Swords className="w-3.5 h-3.5 text-cyan-400" />
              MATCH FOUND! 상대 탐색 완료
            </div>

            {/* Opponent Main Avatar & Name */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-red-500/80 p-1 shadow-xl shadow-red-500/30 mb-2">
                <div className="w-full h-full bg-slate-950 rounded-[12px] flex items-center justify-center text-4xl">
                  {opponent.avatar}
                </div>
              </div>
              <span className="text-xs font-black bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full mb-1">
                {opponent.title}
              </span>
              <h3 className="text-lg font-black text-white">{opponent.nickname}</h3>
            </div>

            {/* Greeting Box */}
            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl text-xs text-amber-300 font-bold italic">
              "{opponent.greeting}"
            </div>

            {/* Opponent Detailed Stats */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
              <div>
                <span className="text-[9px] text-slate-400 font-bold block">전적 / 승률</span>
                <span className="text-xs font-black text-white">
                  {opponent.wins}승 {opponent.losses}패
                </span>
                <span className="text-[9px] text-cyan-400 font-extrabold block">
                  ({opponent.winRate}%)
                </span>
              </div>

              <div className="border-x border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold block">최대 연승</span>
                <span className="text-xs font-black text-red-400 flex items-center justify-center gap-0.5 mt-0.5">
                  <Flame className="w-3 h-3 fill-red-400" />
                  {opponent.maxStreak}연승
                </span>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 font-bold block">최근 손 기록</span>
                <div className="flex items-center justify-center gap-1 text-xs mt-1">
                  <span className="p-0.5 bg-amber-500/20 rounded border border-amber-500/40">
                    {getRPSHand(opponent.recentLastHand)}
                  </span>
                  <span className="text-slate-500">🔒</span>
                  <span className="text-slate-500">🔒</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('COUNTDOWN')}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black rounded-2xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span>경기 시작 (READY)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= 2. OPPONENT TOP BAR ================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-red-500/50 flex items-center justify-center text-2xl shadow-md">
            {opponent.avatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-white">{opponent.nickname}</span>
              <span className="text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded-full">
                {opponent.title}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              승률 {opponent.winRate}% ({opponent.wins}승 {opponent.losses}패)
            </span>
          </div>
        </div>

        {/* Stake Points Display */}
        <div className="bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800 text-right">
          <span className="text-[9px] text-slate-400 font-bold block">배팅금</span>
          <span className="text-xs font-black text-amber-300">
            {activeMatch.stakePoints.toLocaleString()}P
          </span>
        </div>
      </div>

      {/* ================= 3. CENTER MATCH ARENA ================= */}
      <div
        className={`my-4 relative flex flex-col items-center justify-center rounded-3xl bg-slate-950/90 border-2 ${
          step === 'RESULT' && isWin
            ? 'border-amber-400 shadow-2xl shadow-amber-500/30 animate-gold-burst'
            : step === 'RESULT' && isLoss
            ? 'border-red-500/60 animate-shake'
            : 'border-cyan-500/30'
        } p-6 text-center shadow-2xl overflow-hidden min-h-[280px] transition-all`}
      >
        {/* Background Radial Glow */}
        <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Top Status Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
            {activeMatch.roomName}
          </span>
        </div>

        {/* BIG AVATARS + ARENA SHOWDOWN */}
        <div className="w-full flex items-center justify-around my-3">
          {/* Opponent Avatar & Hand */}
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 border-2 ${
                step === 'RESULT' && isLoss ? 'border-amber-400 scale-110 shadow-lg' : 'border-red-500/60'
              } flex items-center justify-center text-4xl sm:text-5xl shadow-xl transition-all relative overflow-hidden`}
            >
              {step === 'SLOT_REEL' && (
                <span className="animate-slot-spin">{getRPSHand(slotReelHandP2)}</span>
              )}
              {(step === 'SHOWDOWN' || step === 'RESULT') && (
                <span className={isLoss ? 'scale-125 transition-transform' : ''}>
                  {getRPSHand(opponentShownHand)}
                </span>
              )}
              {step !== 'SLOT_REEL' && step !== 'SHOWDOWN' && step !== 'RESULT' && (
                <span className="text-3xl opacity-80">{opponent.avatar}</span>
              )}
            </div>
            <span className="text-xs font-black text-slate-300 mt-2">{opponent.nickname}</span>
          </div>

          {/* Center Dynamic Status Indicator */}
          <div className="flex flex-col items-center">
            {step === 'COUNTDOWN' && (
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">
                  READY
                </span>
                <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-amber-400 text-amber-300 font-mono text-3xl font-black flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
                  {countdownNum}
                </div>
              </div>
            )}

            {step === 'SELECTION' && (
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">
                  선택 시간
                </span>
                <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-cyan-400 text-cyan-300 font-mono text-3xl font-black flex items-center justify-center shadow-lg shadow-cyan-500/40 animate-pulse">
                  {selectionTimer}
                </div>
              </div>
            )}

            {step === 'SLOT_REEL' && (
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-amber-400 animate-spin">🎰</span>
                <span className="text-xs font-extrabold text-amber-300 mt-1">
                  {isStrategic300P ? '양쪽 선택 확정! 공개 준비 중...' : '패 회전 공개 중...'}
                </span>
              </div>
            )}

            {step === 'SHOWDOWN' && (
              <div className="flex flex-col items-center">
                <div className="text-2xl font-black text-amber-400 animate-collide">
                  ⚡ IMPACT!
                </div>
                {isStrategic300P && strategyReveal && (
                  <span className="text-[10px] font-black text-cyan-300 mt-1">
                    {strategyReveal.index}번째 공개 · {strategyRound?.revealedPlayerWins ?? 0}승{' '}
                    {strategyRound?.revealedOpponentWins ?? 0}패
                  </span>
                )}
              </div>
            )}

            {step === 'RESULT' && (
              <div className="flex flex-col items-center">
                {isWin && (
                  <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-sm px-4 py-1.5 rounded-xl shadow-lg shadow-amber-500/40 animate-bounce flex items-center gap-1">
                    <Trophy className="w-4 h-4 fill-slate-950" />
                    WIN! (+{rewardDisplay.toLocaleString()}P)
                  </div>
                )}
                {isLoss && (
                  <div className="bg-red-600 text-white font-black text-sm px-4 py-1.5 rounded-xl shadow-lg shadow-red-500/40">
                    💀 LOSE...
                  </div>
                )}
                {isDraw && (
                  <div className="bg-amber-500 text-slate-950 font-black text-sm px-4 py-1.5 rounded-xl shadow-lg shadow-amber-500/40">
                    🤝 DRAW (무승부)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* My Avatar & Selected Hand */}
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 border-2 ${
                step === 'RESULT' && isWin ? 'border-amber-400 scale-110 shadow-lg' : 'border-cyan-400/80'
              } flex items-center justify-center text-4xl sm:text-5xl shadow-xl transition-all relative overflow-hidden`}
            >
              {step === 'SLOT_REEL' && (
                <span className="animate-slot-spin">{getRPSHand(slotReelHandP1)}</span>
              )}
              {(step === 'SHOWDOWN' || step === 'RESULT') && (
                <span className={isWin ? 'scale-125 transition-transform' : ''}>
                  {getRPSHand(myShownHand)}
                </span>
              )}
              {step !== 'SLOT_REEL' && step !== 'SHOWDOWN' && step !== 'RESULT' && (
                <span className="text-3xl opacity-80">{user.avatar}</span>
              )}
            </div>
            <span className="text-xs font-black text-cyan-300 mt-2">{user.nickname} (나)</span>
          </div>
        </div>

        {/* Result Sub-text / Auto Rematch Indicator */}
        {step === 'RESULT' && isDraw && (
          <p className="text-xs font-bold text-amber-300 mt-2">
            {isStrategic300P
              ? '승수가 같습니다. 추가 참가비 없이 새 3선택 세트가 곧 시작됩니다!'
              : `${drawRematchSec}초 후 자동으로 재대결이 시작됩니다!`}
          </p>
        )}
      </div>

      {/* ================= 4. PLAYER BOTTOM BAR ================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-xl flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-cyan-400 flex items-center justify-center text-2xl shadow-md">
            {user.avatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-white">{user.nickname}</span>
              <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded-full">
                {user.title}
              </span>
            </div>
            <span className="text-[10px] text-cyan-400 font-extrabold">
              보유 포인트: {user.points.toLocaleString()}P
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800">
          <Flame className="w-4 h-4 text-red-400 fill-red-400" />
          <span className="text-xs font-black text-red-400">{user.currentStreak}연승 중</span>
        </div>
      </div>

      {/* ================= 5. 3 CIRCULAR RPS CONTROLS OR POST-GAME BUTTONS ================= */}
      {!showPostGame ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3">
          {/* 300P Strategic Preset Slots Display */}
          {isStrategic300P && (
            <div className="bg-slate-950/90 p-3 rounded-2xl border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  300P 전략전 · {strategyRound?.setNumber ?? 1}세트 (내 {strategyRound?.setWins ?? 0}
                  승 / 상대 {strategyRound?.opponentSetWins ?? 0}승)
                </span>
                <button
                  onClick={handleResetSlots}
                  disabled={!canPickSlots}
                  className="text-[10px] text-slate-400 hover:text-white underline font-bold disabled:opacity-40"
                >
                  초기화
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {presetSlots.map((slot, idx) => {
                  const reveal = strategyRound?.reveals.find((item) => item.index === idx + 1);
                  const shown = reveal?.playerChoice ?? slot;
                  return (
                    <button
                      key={idx}
                      disabled={!canPickSlots}
                      onClick={() => handleClearSlot(idx)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                        reveal
                          ? reveal.outcome === 'win'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : reveal.outcome === 'loss'
                            ? 'bg-red-500/20 border-red-400 text-red-200'
                            : 'bg-slate-800 border-slate-600 text-slate-300'
                          : shown
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-600'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400">{idx + 1}번째</span>
                      <span className="text-2xl my-0.5">{getRPSHand(shown)}</span>
                      <span className="text-[9px] text-slate-500">
                        {reveal
                          ? `${getRPSHand(reveal.opponentChoice)} ${
                              reveal.outcome === 'win'
                                ? '승'
                                : reveal.outcome === 'loss'
                                ? '패'
                                : '무'
                            }`
                          : !canPickSlots
                          ? '확정'
                          : shown
                          ? '터치 시 취소'
                          : '미선택'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {canPickSlots && (
                <button
                  onClick={handleConfirmSlots}
                  className="w-full py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-[11px] font-black active:scale-95 transition-all"
                  id="strategy-confirm-slots-btn"
                >
                  {presetSlots.every((slot) => slot !== null)
                    ? `지금 확정 제출 (${selectionTimer}초 남음)`
                    : '남은 칸 랜덤으로 채우고 확정'}
                </button>
              )}

              {strategySubmitted && (
                <p className="text-[10px] font-bold text-cyan-300 text-center">
                  제출 완료 · 상대 선택은 공개 전까지 볼 수 없습니다
                  {strategyRound?.opponentSubmitted ? ' (상대도 제출 완료)' : ''}
                </p>
              )}
            </div>
          )}

          <div className="text-center text-xs font-black text-cyan-300 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {isStrategic300P
              ? canPickSlots
                ? '가위·바위·보를 순서대로 선택하여 3개 슬롯을 채우세요! (마감 전까지 변경 가능)'
                : strategyPhase === 'REVEALING' || strategyPhase === 'SET_RESULT'
                ? '순번별 결과 공개 중...'
                : '상대 선택 확정 대기 중...'
              : step === 'SELECTION'
              ? '원하는 손을 선택하세요! (남은 시간 동안 변경 가능)'
              : '게임 준비 중...'}
          </div>

          {/* 3 Circular RPS Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {/* Scissors (가위) */}
            <button
              disabled={pickDisabled}
              onClick={() => handleSelectHand('scissors')}
              className={`relative flex flex-col items-center justify-center py-5 rounded-full border-4 font-black transition-all active:scale-95 shadow-xl ${
                selectedHand === 'scissors'
                  ? 'bg-purple-600 border-purple-300 text-white scale-110 ring-4 ring-purple-500/50 animate-vibrate shadow-purple-500/60'
                  : 'bg-gradient-to-b from-purple-900/90 to-indigo-950 border-purple-900/80 text-purple-200 hover:border-purple-500'
              } ${pickDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              id="rps-scissors-circular-btn"
            >
              <span className="text-4xl mb-0.5">✌️</span>
              <span className="text-[11px] font-black tracking-wider">가위</span>
              {selectedHand === 'scissors' && (
                <span className="absolute -top-2 bg-purple-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow">
                  선택 완료
                </span>
              )}
            </button>

            {/* Rock (바위) */}
            <button
              disabled={pickDisabled}
              onClick={() => handleSelectHand('rock')}
              className={`relative flex flex-col items-center justify-center py-5 rounded-full border-4 font-black transition-all active:scale-95 shadow-xl ${
                selectedHand === 'rock'
                  ? 'bg-cyan-500 border-cyan-200 text-slate-950 scale-110 ring-4 ring-cyan-400/50 animate-vibrate shadow-cyan-500/60'
                  : 'bg-gradient-to-b from-cyan-900/90 to-blue-950 border-cyan-900/80 text-cyan-200 hover:border-cyan-500'
              } ${pickDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              id="rps-rock-circular-btn"
            >
              <span className="text-4xl mb-0.5">✊</span>
              <span className="text-[11px] font-black tracking-wider">바위</span>
              {selectedHand === 'rock' && (
                <span className="absolute -top-2 bg-cyan-300 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow">
                  선택 완료
                </span>
              )}
            </button>

            {/* Paper (보) */}
            <button
              disabled={pickDisabled}
              onClick={() => handleSelectHand('paper')}
              className={`relative flex flex-col items-center justify-center py-5 rounded-full border-4 font-black transition-all active:scale-95 shadow-xl ${
                selectedHand === 'paper'
                  ? 'bg-amber-400 border-yellow-200 text-slate-950 scale-110 ring-4 ring-amber-400/50 animate-vibrate shadow-amber-500/60'
                  : 'bg-gradient-to-b from-amber-900/90 to-yellow-950 border-amber-900/80 text-amber-200 hover:border-amber-500'
              } ${pickDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              id="rps-paper-circular-btn"
            >
              <span className="text-4xl mb-0.5">✋</span>
              <span className="text-[11px] font-black tracking-wider">보</span>
              {selectedHand === 'paper' && (
                <span className="absolute -top-2 bg-amber-300 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow">
                  선택 완료
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Post Game Action Buttons */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-2.5 animate-fadeIn">
          <div className="grid grid-cols-2 gap-2">
            {/* 1. 재대결 (Rematch) */}
            <button
              onClick={handleNextOpponentOrRematch}
              className={`py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
                isLoss
                  ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white ring-2 ring-amber-400 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950'
              }`}
              id="game-rematch-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>재대결하기</span>
            </button>

            {/* 2. 다음 상대 찾기 */}
            <button
              onClick={handleNextOpponentOrRematch}
              className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition-all"
              id="game-next-opponent-btn"
            >
              <Swords className="w-4 h-4 text-cyan-400" />
              <span>다음 상대 찾기</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 3. 메인으로 */}
            <button
              onClick={() => navigateTo('home')}
              className="py-2.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              id="game-go-main-btn"
            >
              <span>메인으로</span>
            </button>

            {/* 4. 결과 공유 */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 transition-all"
              id="game-share-result-btn"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>결과 공유</span>
            </button>
          </div>
        </div>
      )}

      {/* Share Result Modal */}
      <ShareResultModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} />
    </div>
  );
};
