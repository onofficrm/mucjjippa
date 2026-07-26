import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Users,
  Ticket,
  Play,
  GitBranch,
  ArrowLeft,
  Volume2,
  Bell,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { sound } from '../utils/audio';

export const TournamentWaitPage: React.FC = () => {
  const { navigateTo, goBack, user, activeTournament, cancelTournamentRegistration, isTournamentRegistered, setRewardModal } = useGame();

  const [remainingSeconds, setRemainingSeconds] = useState<number>(135); // 2분 15초
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [soundTestMsg, setSoundTestMsg] = useState<string | null>(null);

  // Mock participants avatar stream
  const [participants, setParticipants] = useState<{ id: string; name: string; avatar: string; entryNo: number }[]>([
    { id: 'p1', name: '전설의주먹', avatar: '👑', entryNo: 1 },
    { id: 'p2', name: '불패가위바위', avatar: '🔥', entryNo: 2 },
    { id: 'p3', name: '네온닌자', avatar: '🥷', entryNo: 3 },
    { id: 'p4', name: '사이보그AI', avatar: '🤖', entryNo: 4 },
    { id: 'p5', name: '승리의신', avatar: '⚡', entryNo: 5 },
    { id: 'p6', name: '드래곤슬레이어', avatar: '🐉', entryNo: 6 },
    { id: 'p7', name: '럭키스타', avatar: '⭐', entryNo: 7 },
    { id: 'p8', name: 'Dorirang (나)', avatar: user.avatar, entryNo: 87 },
  ]);

  const [count, setCount] = useState<number>(117);

  // Live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Continuous avatar add animation (mock participants joining)
  useEffect(() => {
    const avatars = ['🦊', '🐺', '🦁', '🐯', '🐼', '🐨', '🦄', '🦅', '🦈', '🚀'];
    const names = [
      '골드마스터',
      '파이어피스트',
      '샤프슈터',
      '바위의제왕',
      '가위신동',
      '보자기마스터',
      '운칠기삼',
      '토너먼트킹',
    ];

    const stream = setInterval(() => {
      setCount((prev) => {
        if (prev >= (activeTournament?.maxParticipants || 128)) return prev;
        const nextVal = prev + 1;
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        const randomName = names[Math.floor(Math.random() * names.length)];

        setParticipants((current) => [
          ...current.slice(-11), // keep last 12
          {
            id: `p_new_${Date.now()}`,
            name: `${randomName} #${nextVal}`,
            avatar: randomAvatar,
            entryNo: nextVal,
          },
        ]);

        return nextVal;
      });
    }, 2800);

    return () => clearInterval(stream);
  }, [activeTournament]);

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}분 ${s.toString().padStart(2, '0')}초`;
  };

  const handleSoundTest = () => {
    sound.playWin();
    setSoundTestMsg('🎵 효과음 재생 정상! (승리 사운드)');
    setTimeout(() => setSoundTestMsg(null), 3000);
  };

  const handleTogglePush = () => {
    sound.playClick();
    const nextState = !pushEnabled;
    setPushEnabled(nextState);
    if (nextState) {
      setRewardModal({
        title: '푸시 알림 설정 완료',
        message: '토너먼트 1분 전 알림이 성공적으로 설정되었습니다!',
        icon: '🔔',
      });
    }
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8 max-w-xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          로비로 돌아가기
        </button>

        {/* Demo Watermark Tag */}
        <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-full shadow">
          🎮 데모 토너먼트 대기실
        </span>
      </div>

      {/* Main Waiting Room Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 border-2 border-purple-500/60 p-5 shadow-2xl text-center">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 mb-3 animate-bounce">
          🏆
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white">
          {activeTournament?.title || '정규 챔피언십 토너먼트 (128강)'}
        </h2>

        <p className="text-xs text-amber-300 font-extrabold mt-1">
          총 상금: {activeTournament?.totalPrize.toLocaleString() || '1,840,000'} Points
        </p>

        {/* Live Countdown & Checked-in Counter Grid */}
        <div className="my-5 grid grid-cols-2 gap-2.5">
          <div className="bg-slate-950/90 border border-purple-500/40 p-3 rounded-2xl text-center shadow-inner">
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">시작까지 남은 시간</span>
            <span className="text-sm font-black text-amber-300 font-mono flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-amber-400" />
              {formatCountdown(remainingSeconds)}
            </span>
          </div>

          <div className="bg-slate-950/90 border border-purple-500/40 p-3 rounded-2xl text-center shadow-inner">
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">체크인 선수</span>
            <span className="text-sm font-black text-cyan-300 flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-cyan-400" />
              {count} / {activeTournament?.maxParticipants || 128}명
            </span>
          </div>
        </div>

        {/* Player Entry Ticket Info */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-sm">
              {user.avatar}
            </div>
            <div className="text-left">
              <span className="font-black text-white block">{user.nickname}</span>
              <span className="text-[10px] text-cyan-400 font-bold">참가 번호: #087번</span>
            </div>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-black">
            READY (입장 완료)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => navigateTo('tournament_bracket')}
            className="py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-purple-500/50 text-purple-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
            id="wait-view-bracket-btn"
          >
            <GitBranch className="w-4 h-4 text-cyan-400" />
            대진표 미리보기
          </button>

          <button
            onClick={() => {
              if (activeTournament) {
                cancelTournamentRegistration(activeTournament);
              } else {
                navigateTo('tournament_lobby');
              }
            }}
            className="py-3 rounded-2xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
            id="wait-cancel-reg-btn"
          >
            <Ticket className="w-4 h-4 text-red-400" />
            참가 취소 및 티켓 환불
          </button>

          <button
            onClick={() => navigateTo('tournament_game')}
            className="py-3 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-600 to-cyan-500 hover:brightness-110 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/30 active:scale-95 transition-all"
            id="wait-start-match-btn"
          >
            <Play className="w-4 h-4 fill-white" />
            128강 경기 시작
          </button>
        </div>
      </div>

      {/* Participants Live Avatar Stream */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            실시간 체크인 선수 ({count}명)
          </h3>
          <span className="text-[10px] font-extrabold text-emerald-400 animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            실시간 유입 중
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className={`p-2 rounded-2xl border text-center transition-all animate-scaleUp ${
                p.entryNo === 87
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-md ring-2 ring-cyan-400/40'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="text-2xl mb-1">{p.avatar}</div>
              <span className="text-[10px] font-black text-slate-200 block truncate">
                {p.name}
              </span>
              <span className="text-[9px] text-slate-500 font-mono font-bold">
                #{p.entryNo.toString().padStart(3, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Bar: Sound Test & Push Notification Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Sound Test Button */}
        <button
          onClick={handleSoundTest}
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 flex items-center justify-between text-left transition-all group"
          id="sound-test-btn"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white block">사운드 테스트</span>
              <span className="text-[10px] text-slate-400 font-medium">효과음 프리뷰 재생</span>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg">
            테스트
          </span>
        </button>

        {/* Push Notification Toggle */}
        <div
          onClick={handleTogglePush}
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-purple-500/50 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white block">시작 푸시 알림</span>
              <span className="text-[10px] text-slate-400 font-medium">시작 1분 전 알림</span>
            </div>
          </div>

          <div
            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
              pushEnabled ? 'bg-purple-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                pushEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>

      {soundTestMsg && (
        <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold text-center animate-fadeIn">
          {soundTestMsg}
        </div>
      )}

      {/* Rules & Prize Breakdown Accordion */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          토너먼트 진행 규칙 & 상금
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
            <span className="font-extrabold text-cyan-300 block">⚡ 예선 (128강~32강)</span>
            <p className="text-[11px] text-slate-400 font-medium">스피드 단판 승부 (선택 5초)</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
            <span className="font-extrabold text-amber-300 block">🏆 결승 (4강 & 결승)</span>
            <p className="text-[11px] text-slate-400 font-medium">5판 3선승 타이트 매치</p>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-300">👑 1위 (우승)</span>
            <span className="font-black text-amber-400">1,000,000P + [토너먼트 챔피언]</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-300">🥈 2위 (준우승)</span>
            <span className="font-black text-slate-200">300,000P + 챔피언 티켓 3장</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-400">🥉 3~4위 (4강)</span>
            <span className="font-black text-cyan-300">100,000P</span>
          </div>
        </div>
      </div>
    </div>
  );
};
