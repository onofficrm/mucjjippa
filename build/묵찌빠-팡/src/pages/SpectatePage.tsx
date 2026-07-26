import React, { useState, useEffect, useRef } from 'react';
import { Tv, MessageSquare, Send, Heart, Flame, ThumbsUp, ArrowLeft, Swords, Trophy, Play, Pause, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { RPSChoice } from '../types';

export const SpectatePage: React.FC = () => {
  const { goBack, navigateTo, spectatingMatch, setRewardModal } = useGame();
  const [chatInput, setChatInput] = useState<string>('');
  const [chats, setChats] = useState([
    { user: '관전자1', text: '전설의주먹 가위 낼 듯!' },
    { user: '가위바위보팬', text: '승리의가위바위보 가즈아!' },
    { user: '네온닌자', text: '결승전 대박 긴장되네요' },
    { user: '타짜99', text: '이번 판 올인 가나요?' },
  ]);

  // Reactions count
  const [likes, setLikes] = useState(1240);
  const [flames, setFlames] = useState(840);
  const [thumbs, setThumbs] = useState(520);

  // Spectate Match Flow States
  const [currentRound, setCurrentRound] = useState(1);
  const [p1Score, setP1Score] = useState(1);
  const [p2Score, setP2Score] = useState(0);

  const [phase, setPhase] = useState<'SELECTION' | 'REVEAL' | 'ROUND_RESULT' | 'FINAL_RESULT'>('SELECTION');
  const [p1Hand, setP1Hand] = useState<RPSChoice>(null);
  const [p2Hand, setP2Hand] = useState<RPSChoice>(null);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);

  // Auto Next Match States
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  // Timers refs for clean unmount
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getRPSHandIcon = (hand: RPSChoice) => {
    switch (hand) {
      case 'rock': return '✊';
      case 'paper': return '🖐️';
      case 'scissors': return '✌️';
      default: return '❓';
    }
  };

  // Simulate round progression safely
  useEffect(() => {
    if (phase === 'SELECTION') {
      setP1Hand(null);
      setP2Hand(null);
      setRoundWinner(null);

      phaseTimerRef.current = setTimeout(() => {
        const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];
        const h1 = choices[Math.floor(Math.random() * choices.length)];
        const h2 = choices[Math.floor(Math.random() * choices.length)];
        setP1Hand(h1);
        setP2Hand(h2);
        setPhase('REVEAL');
      }, 2500);
    } else if (phase === 'REVEAL') {
      phaseTimerRef.current = setTimeout(() => {
        if (p1Hand === p2Hand) {
          setRoundWinner('draw');
        } else if (
          (p1Hand === 'rock' && p2Hand === 'scissors') ||
          (p1Hand === 'paper' && p2Hand === 'rock') ||
          (p1Hand === 'scissors' && p2Hand === 'paper')
        ) {
          setRoundWinner('p1');
          setP1Score((s) => s + 1);
        } else {
          setRoundWinner('p2');
          setP2Score((s) => s + 1);
        }
        setPhase('ROUND_RESULT');
      }, 1500);
    } else if (phase === 'ROUND_RESULT') {
      phaseTimerRef.current = setTimeout(() => {
        if (p1Score >= 2 || p2Score >= 2 || currentRound >= 3) {
          setPhase('FINAL_RESULT');
        } else {
          setCurrentRound((r) => r + 1);
          setPhase('SELECTION');
        }
      }, 2000);
    }

    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, [phase, p1Score, p2Score, currentRound, p1Hand, p2Hand]);

  // Handle Auto Next Match Countdown
  useEffect(() => {
    if (phase === 'FINAL_RESULT' && autoNextEnabled) {
      setAutoNextCountdown(5);
    } else {
      setAutoNextCountdown(null);
    }
  }, [phase, autoNextEnabled]);

  useEffect(() => {
    if (autoNextCountdown === null) return;

    if (autoNextCountdown <= 0) {
      // Load next match demo
      setCurrentRound(1);
      setP1Score(0);
      setP2Score(0);
      setPhase('SELECTION');
      setAutoNextCountdown(null);
      setChats((prev) => [...prev, { user: '시스템', text: '▶️ 다음 경기로 자동 이동했습니다.' }]);
      return;
    }

    autoNextTimerRef.current = setTimeout(() => {
      setAutoNextCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    };
  }, [autoNextCountdown]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChats((prev) => [...prev, { user: '나(관전자)', text: chatInput }]);
    setChatInput('');
  };

  const isDemoMatch = spectatingMatch.isDemo !== false;

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
          id="spectate-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <div className="flex items-center gap-2">
          {isDemoMatch && (
            <span className="text-[11px] font-extrabold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              데모 경기
            </span>
          )}

          <span className="flex items-center gap-1 text-xs font-black text-red-400 bg-red-500/20 border border-red-500/40 px-3 py-1 rounded-full animate-pulse">
            <Tv className="w-3.5 h-3.5" />
            LIVE 관전 중 ({spectatingMatch.viewerCount || '1,240'}명)
          </span>
        </div>
      </div>

      {/* Spectator Read-only Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px]">관전 모드: 가위·바위·보 선택 및 게임 결과 변경 불가</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[10px] text-slate-400">자동 다음</span>
          <button
            onClick={() => setAutoNextEnabled(!autoNextEnabled)}
            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
              autoNextEnabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                autoNextEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Spectate Screen */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border-2 border-red-500/50 p-5 shadow-2xl text-center">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <span className="text-xs font-black text-amber-400 flex items-center gap-1">
            <Tv className="w-4 h-4 text-amber-400" />
            {spectatingMatch.status || '실시간 토너먼트 경기'}
          </span>
          <span className="text-xs font-bold text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-500/30">
            {currentRound}라운드 (3판 2선승)
          </span>
        </div>

        {/* Game Phase Notice */}
        <div className="text-xs font-extrabold mb-4 py-1.5 px-4 rounded-xl inline-block bg-slate-900 border border-slate-800">
          {phase === 'SELECTION' && <span className="text-amber-300 animate-pulse">⏳ 양 플레이어 손 선택 중...</span>}
          {phase === 'REVEAL' && <span className="text-cyan-300 animate-bounce">⚡ 손 공개!</span>}
          {phase === 'ROUND_RESULT' && (
            <span className="text-emerald-300">
              {roundWinner === 'draw'
                ? '무승부!'
                : roundWinner === 'p1'
                ? `🎉 ${spectatingMatch.player1} 승리!`
                : `🎉 ${spectatingMatch.player2} 승리!`}
            </span>
          )}
          {phase === 'FINAL_RESULT' && (
            <span className="text-amber-400 font-black">
              🏆 final result: {p1Score > p2Score ? spectatingMatch.player1 : spectatingMatch.player2} 최종 승리!
            </span>
          )}
        </div>

        {/* Players Hand Display */}
        <div className="flex items-center justify-around my-4">
          {/* Player 1 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-2xl bg-slate-900 border-2 flex items-center justify-center text-4xl shadow-lg transition-all ${
                phase === 'ROUND_RESULT' && roundWinner === 'p1'
                  ? 'border-amber-400 scale-105 shadow-amber-500/40'
                  : 'border-slate-700'
              }`}
            >
              {phase === 'SELECTION' ? '❓' : getRPSHandIcon(p1Hand)}
            </div>
            <span className="font-bold text-xs text-white mt-2">{spectatingMatch.player1}</span>
            <span className="text-xs font-black text-amber-400">{p1Score} 승</span>
          </div>

          <div className="text-2xl font-black text-red-500 animate-pulse">VS</div>

          {/* Player 2 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-2xl bg-slate-900 border-2 flex items-center justify-center text-4xl shadow-lg transition-all ${
                phase === 'ROUND_RESULT' && roundWinner === 'p2'
                  ? 'border-cyan-400 scale-105 shadow-cyan-500/40'
                  : 'border-slate-700'
              }`}
            >
              {phase === 'SELECTION' ? '❓' : getRPSHandIcon(p2Hand)}
            </div>
            <span className="font-bold text-xs text-white mt-2">{spectatingMatch.player2}</span>
            <span className="text-xs font-black text-cyan-400">{p2Score} 승</span>
          </div>
        </div>

        {/* Auto Next Match Countdown Banner */}
        {phase === 'FINAL_RESULT' && autoNextCountdown !== null && (
          <div className="mt-4 bg-purple-950/80 border border-purple-500/50 p-3 rounded-2xl space-y-2">
            <div className="text-xs font-extrabold text-purple-200">
              {autoNextCountdown}초 후 다음 경기로 자동 이동합니다
            </div>
            <button
              onClick={() => setAutoNextCountdown(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-600"
            >
              자동 이동 취소
            </button>
          </div>
        )}

        {/* Quick Action CTA for Spectators */}
        <div className="mt-5 grid grid-cols-2 gap-2 pt-4 border-t border-slate-800">
          <button
            onClick={() => navigateTo('versus_rooms')}
            className="py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
            id="spectate-to-versus-btn"
          >
            <Swords className="w-4 h-4" />
            나도 1:1 대전하기
          </button>
          <button
            onClick={() => navigateTo('tournament_lobby')}
            className="py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-95 transition-all"
            id="spectate-to-tour-btn"
          >
            <Trophy className="w-4 h-4" />
            토너먼트 참가하기
          </button>
        </div>

        {/* Floating Reaction Bar */}
        <div className="flex items-center justify-center gap-3 pt-4 mt-3 border-t border-slate-800/80">
          <button
            onClick={() => setLikes((l) => l + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-red-400 font-bold text-xs border border-slate-800 active:scale-90 transition-transform"
          >
            <Heart className="w-3.5 h-3.5 fill-red-400" /> {likes}
          </button>
          <button
            onClick={() => setFlames((f) => f + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-slate-800 active:scale-90 transition-transform"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-400" /> {flames}
          </button>
          <button
            onClick={() => setThumbs((t) => t + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold text-xs border border-slate-800 active:scale-90 transition-transform"
          >
            <ThumbsUp className="w-3.5 h-3.5 fill-cyan-400" /> {thumbs}
          </button>
        </div>
      </div>

      {/* Live Chat Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          실시간 관전 채팅
        </h3>

        <div className="space-y-2 max-h-40 overflow-y-auto mb-3 text-xs pr-1">
          {chats.map((c, i) => (
            <div key={i} className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
              <span className="font-bold text-cyan-400 mr-2">{c.user}:</span>
              <span className="text-slate-200">{c.text}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="응원의 메시지를 남겨보세요!"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="p-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
