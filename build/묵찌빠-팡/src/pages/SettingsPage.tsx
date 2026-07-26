import React, { useState } from 'react';
import {
  Settings,
  ArrowLeft,
  Volume2,
  VolumeX,
  Bell,
  Vibrate,
  RotateCcw,
  Sparkles,
  Music,
  Sliders,
  Eye,
  Type,
  Subtitles,
  Bot,
  HelpCircle,
  Check,
  LogOut,
  Shield,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { sound } from '../utils/audio';
import { authService } from '../services/authService';

export const SettingsPage: React.FC = () => {
  const {
    goBack,
    navigateTo,
    soundMuted,
    toggleSound,
    masterVolume,
    bgmVolume,
    sfxVolume,
    setVolumes,
    bgmEnabled,
    toggleBGM,
    hapticEnabled,
    setHapticEnabled,
    reduceMotion,
    setReduceMotion,
    largeFont,
    setLargeFont,
    audioSubtitlesEnabled,
    setAudioSubtitlesEnabled,
    openTutorial,
    startPracticeGame,
    logout,
    isGuest,
    user,
    showToast,
  } = useGame();

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [autoplayUnlocked, setAutoplayUnlocked] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const persistServerSettings = (patch: {
    bgmVolume?: number;
    effectVolume?: number;
    vibration?: boolean;
    reducedMotion?: boolean;
    tournamentNotification?: boolean;
  }) => {
    if (isGuest) return;
    authService.updateMySettings(patch).catch(() => {
      showToast('설정 저장에 실패했습니다.', 'error');
    });
  };

  const handleUnlockAudio = () => {
    sound.initCtx();
    sound.playClick();
    if (bgmEnabled) sound.startBGM();
    setAutoplayUnlocked(true);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <span className="text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
          환경 설정 v2.0 (Step 7)
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          환경, 사운드 및 접근성 설정
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          볼륨 조절, BGM/효과음, 초보자 튜토리얼 및 접근성 옵션 관리
        </p>
      </div>

      {/* Autoplay Banner Notice */}
      {!autoplayUnlocked && (
        <div
          onClick={handleUnlockAudio}
          className="bg-gradient-to-r from-cyan-950 via-indigo-950 to-slate-900 border-2 border-cyan-400 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:brightness-110 shadow-lg shadow-cyan-500/10 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="font-extrabold text-xs text-cyan-200">
                브라우저 사운드 자동재생 활성화
              </div>
              <div className="text-[10px] text-slate-400">
                화면 어디든 터치하거나 이 배너를 누르면 BGM과 효과음이 활성화됩니다.
              </div>
            </div>
          </div>
          <span className="text-[10px] bg-cyan-400 text-slate-950 font-black px-2.5 py-1 rounded-lg">
            활성화 🔊
          </span>
        </div>
      )}

      {/* 1. 사운드 및 볼륨 상세 설정 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-4 shadow-xl">
        <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-cyan-400" />
          사운드 & 볼륨 섬세 조절
        </h3>

        {/* Master Sound Mute */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-cyan-400">
              {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-bold text-xs text-white">마스터 사운드 음소거</div>
              <div className="text-[10px] text-slate-400">모든 게임 소리를 즉시 켜거나 끕니다</div>
            </div>
          </div>

          <button
            onClick={toggleSound}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center min-h-[44px] ${
              !soundMuted ? 'bg-cyan-400 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950" />
          </button>
        </div>

        {/* BGM Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-purple-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">배경음악 (BGM)</div>
              <div className="text-[10px] text-slate-400">아케이드 메인 & 대진 루프 사운드</div>
            </div>
          </div>

          <button
            onClick={toggleBGM}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center min-h-[44px] ${
              bgmEnabled && !soundMuted ? 'bg-purple-500 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950" />
          </button>
        </div>

        {/* Master Volume Slider */}
        <div className="p-3 rounded-2xl bg-slate-950/70 space-y-1.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">전체 볼륨 (Master)</span>
            <span className="text-cyan-400 font-mono">{Math.round(masterVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => setVolumes(parseFloat(e.target.value), bgmVolume, sfxVolume)}
            className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
        </div>

        {/* BGM Volume Slider */}
        <div className="p-3 rounded-2xl bg-slate-950/70 space-y-1.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">BGM 볼륨</span>
            <span className="text-purple-400 font-mono">{Math.round(bgmVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={bgmVolume}
            onChange={(e) => {
              const next = parseFloat(e.target.value);
              setVolumes(masterVolume, next, sfxVolume);
              persistServerSettings({ bgmVolume: next });
            }}
            className="w-full accent-purple-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
        </div>

        {/* SFX Volume Slider */}
        <div className="p-3 rounded-2xl bg-slate-950/70 space-y-1.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">효과음 볼륨 (SFX)</span>
            <span className="text-amber-400 font-mono">{Math.round(sfxVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sfxVolume}
            onChange={(e) => {
              const next = parseFloat(e.target.value);
              setVolumes(masterVolume, bgmVolume, next);
              persistServerSettings({ effectVolume: next });
            }}
            className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 2. 초보자 UX 가이드 & 연습 모드 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-xl">
        <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          초보자 UX 가이드 & AI 연습
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={openTutorial}
            className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all group min-h-[44px]"
          >
            <HelpCircle className="w-5 h-5 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="font-extrabold text-xs text-white">4단계 튜토리얼</div>
            <div className="text-[10px] text-slate-400">초보자 안내 다시 보기</div>
          </button>

          <button
            onClick={startPracticeGame}
            className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all group min-h-[44px]"
          >
            <Bot className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="font-extrabold text-xs text-white">AI 연습 경기</div>
            <div className="text-[10px] text-emerald-400 font-bold">무료 연습 (첫승 보상)</div>
          </button>
        </div>
      </div>

      {/* 3. 접근성 & UX 옵션 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-xl">
        <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-emerald-400" />
          접근성 및 편의 옵션
        </h3>

        {/* Audio Captions Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400">
              <Subtitles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">사운드 실시간 자막</div>
              <div className="text-[10px] text-slate-400">소리가 없어도 화면 자막으로 음향 전달</div>
            </div>
          </div>

          <button
            onClick={() => setAudioSubtitlesEnabled(!audioSubtitlesEnabled)}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center min-h-[44px] ${
              audioSubtitlesEnabled ? 'bg-emerald-400 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950" />
          </button>
        </div>

        {/* Reduce Motion Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-cyan-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">애니메이션 효과 감소</div>
              <div className="text-[10px] text-slate-400">과도한 화면 번쩍임 및 진동 연출 완화</div>
            </div>
          </div>

          <button
            onClick={() => {
              const next = !reduceMotion;
              setReduceMotion(next);
              persistServerSettings({ reducedMotion: next });
            }}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center min-h-[44px] ${
              reduceMotion ? 'bg-emerald-400 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950" />
          </button>
        </div>

        {/* Large Font Mode */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">큰 글씨 시니어/가독성 모드</div>
              <div className="text-[10px] text-slate-400">주요 텍스트 크기를 확대하여 가독성 향상</div>
            </div>
          </div>

          <button
            onClick={() => setLargeFont(!largeFont)}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center min-h-[44px] ${
              largeFont ? 'bg-emerald-400 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950" />
          </button>
        </div>

        {/* Haptic Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-purple-400">
              <Vibrate className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">입체 진동 피드백</div>
              <div className="text-[10px] text-slate-400">가위바위보 제출 및 충돌 시 진동 효과</div>
            </div>
          </div>

          <button
            onClick={() => {
              const next = !hapticEnabled;
              setHapticEnabled(next);
              persistServerSettings({ vibration: next });
            }}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center min-h-[44px] ${
              hapticEnabled ? 'bg-emerald-400 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950" />
          </button>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">토너먼트 시작 푸시 알림</div>
              <div className="text-[10px] text-slate-400">정기 대진 10분 전 알림</div>
            </div>
          </div>

          <button
            onClick={() => {
              const next = !notificationsEnabled;
              setNotificationsEnabled(next);
              persistServerSettings({ tournamentNotification: next });
            }}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center min-h-[44px] ${
              notificationsEnabled ? 'bg-emerald-400 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <h3 className="text-sm font-black text-white">계정</h3>
        <div className="text-xs text-slate-400">
          {isGuest ? (
            <span>게스트 체험 중 — 영구 기록이 저장되지 않습니다.</span>
          ) : (
            <span>
              {user.nickname}
              {user.loginId ? ` (@${user.loginId})` : ''}
            </span>
          )}
        </div>
        {!isGuest && (
          <button
            type="button"
            onClick={() => navigateTo('admin_center')}
            className="w-full min-h-[48px] rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-sm flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            관리자센터
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full min-h-[48px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? '로그아웃 중…' : isGuest ? '게스트 종료' : '로그아웃'}
        </button>
      </div>
    </div>
  );
};
