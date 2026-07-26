import React, { useState } from 'react';
import { Bot, Sparkles, Trophy, ArrowLeft, RotateCcw, Swords, CheckCircle2, ShieldCheck, Flame } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { RPSChoice } from '../types';
import { sound } from '../utils/audio';

export const PracticeGamePage: React.FC = () => {
  const { goBack, navigateTo, user, topUpPoints, setRewardModal } = useGame();

  const [selectedHand, setSelectedHand] = useState<RPSChoice>(null);
  const [aiHand, setAiHand] = useState<RPSChoice>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [hasWonBonus, setHasWonBonus] = useState(false);

  const handlePlayPractice = (choice: RPSChoice) => {
    sound.playSelectRPS();
    setSelectedHand(choice);
    setIsSpinning(true);
    setResult(null);

    // Spin reel delay
    setTimeout(() => {
      sound.playShowdownImpact();
      setIsSpinning(false);

      // AI picks hand
      const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];
      const aiPick = choices[Math.floor(Math.random() * choices.length)];
      setAiHand(aiPick);

      // Evaluate result
      if (choice === aiPick) {
        setResult('draw');
        sound.playDraw();
      } else if (
        (choice === 'rock' && aiPick === 'scissors') ||
        (choice === 'scissors' && aiPick === 'paper') ||
        (choice === 'paper' && aiPick === 'rock')
      ) {
        setResult('win');
        sound.playWin();

        if (!hasWonBonus) {
          setHasWonBonus(true);
          topUpPoints(10000, '연습모드 첫 승리 보상');
        }
      } else {
        setResult('loss');
        sound.playLose();
      }
    }, 1000);
  };

  const handleReset = () => {
    sound.playClick();
    setSelectedHand(null);
    setAiHand(null);
    setResult(null);
  };

  const getHandEmoji = (choice: RPSChoice) => {
    if (choice === 'rock') return '✊';
    if (choice === 'paper') return '✋';
    if (choice === 'scissors') return '✌️';
    return '❓';
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          무료 연습 경기 (포인트 차감 없음)
        </span>
      </div>

      {/* Title Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            초보자 AI 연습 경기장
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            포인트 차감 없이 AI 상대로 규칙과 타이밍을 연습하세요!
          </p>
        </div>

        <div className="bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800 text-center">
          <span className="text-[9px] text-slate-400 font-bold block">첫 승리 보상</span>
          <span className="text-xs font-black text-amber-300">+10,000P</span>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <div className="bg-purple-950/40 border border-purple-500/30 p-2 rounded-xl text-purple-300">
          ✌️ 가위 &gt; ✋ 보
        </div>
        <div className="bg-cyan-950/40 border border-cyan-500/30 p-2 rounded-xl text-cyan-300">
          ✊ 바위 &gt; ✌️ 가위
        </div>
        <div className="bg-amber-950/40 border border-amber-500/30 p-2 rounded-xl text-amber-300">
          ✋ 보 &gt; ✊ 바위
        </div>
      </div>

      {/* Arena Stage */}
      <div className="bg-slate-950/90 border-2 border-emerald-500/40 rounded-3xl p-6 text-center space-y-4 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-around py-4">
          {/* AI Bot Side */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border-2 border-emerald-500/60 flex items-center justify-center text-4xl shadow-xl">
              {isSpinning ? (
                <span className="animate-spin">🎰</span>
              ) : (
                getHandEmoji(aiHand)
              )}
            </div>
            <span className="text-xs font-black text-slate-300 mt-2">연습용 알파보트 🤖</span>
          </div>

          {/* Center vs badge */}
          <div className="text-center">
            {isSpinning ? (
              <span className="text-xs font-black text-amber-400 animate-pulse">대결 계산 중...</span>
            ) : result === 'win' ? (
              <div className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl animate-bounce">
                🏆 승리! (WIN)
              </div>
            ) : result === 'loss' ? (
              <div className="bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-xl">
                💀 패배 (LOSS)
              </div>
            ) : result === 'draw' ? (
              <div className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl">
                🤝 무승부 (DRAW)
              </div>
            ) : (
              <span className="text-2xl font-black text-slate-600">VS</span>
            )}
          </div>

          {/* User Side */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border-2 border-cyan-400/80 flex items-center justify-center text-4xl shadow-xl">
              {getHandEmoji(selectedHand)}
            </div>
            <span className="text-xs font-black text-cyan-300 mt-2">{user.nickname} (나)</span>
          </div>
        </div>

        {/* Guidance Prompt */}
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl text-xs text-slate-300">
          💡 <span className="font-bold text-amber-300">선택 가이드:</span> 아래 버튼 중 제출하고 싶은 패를 누르세요. 포인트를 차감하지 않는 안전한 연습 경기입니다.
        </div>
      </div>

      {/* 3 RPS Choice Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => handlePlayPractice('scissors')}
          disabled={isSpinning}
          className="py-5 rounded-3xl bg-gradient-to-b from-purple-900/90 to-indigo-950 border-2 border-purple-500 text-white font-black flex flex-col items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-3xl mb-1">✌️</span>
          <span className="text-xs">가위 선택</span>
        </button>

        <button
          onClick={() => handlePlayPractice('rock')}
          disabled={isSpinning}
          className="py-5 rounded-3xl bg-gradient-to-b from-cyan-900/90 to-blue-950 border-2 border-cyan-500 text-white font-black flex flex-col items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-3xl mb-1">✊</span>
          <span className="text-xs">바위 선택</span>
        </button>

        <button
          onClick={() => handlePlayPractice('paper')}
          disabled={isSpinning}
          className="py-5 rounded-3xl bg-gradient-to-b from-amber-900/90 to-yellow-950 border-2 border-amber-500 text-white font-black flex flex-col items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-3xl mb-1">✋</span>
          <span className="text-xs">보 선택</span>
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2">
        <button
          onClick={() => navigateTo('versus_rooms')}
          className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all min-h-[44px]"
        >
          <Swords className="w-4 h-4" />
          <span>실전 1:1 대전하러 가기</span>
        </button>

        <button
          onClick={handleReset}
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>다시 연습하기</span>
        </button>
      </div>
    </div>
  );
};
