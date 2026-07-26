import React, { useState } from 'react';
import { Gamepad2, LogIn, UserPlus, Sparkles, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { ApiError } from '../api';

export const LoginPage: React.FC = () => {
  const { login, loginAsGuest, navigateTo, showToast } = useGame();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ loginId: loginId.trim(), password });
      showToast('로그인되었습니다.', 'success');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : '로그인에 실패했습니다. 다시 시도해 주세요.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      await loginAsGuest();
      showToast('게스트로 체험을 시작합니다. 일부 기능이 제한됩니다.', 'info');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : '게스트 체험을 시작할 수 없습니다.';
      setError(message);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 mb-2">
            <Gamepad2 className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">묵찌빠 팡</h1>
          <p className="text-sm text-slate-400">계정으로 로그인하고 대전·토너먼트에 참가하세요</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-cyan-500/5"
        >
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <LogIn className="w-5 h-5 text-cyan-400" />
            로그인
          </h2>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">로그인 ID</span>
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 min-h-[44px]"
              placeholder="예: dorirang"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">비밀번호</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 min-h-[44px]"
                placeholder="비밀번호 입력"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-black text-sm transition"
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>

          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <div className="flex-1 h-px bg-slate-800" />
            또는
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            {guestLoading ? '준비 중…' : '게스트로 체험하기'}
          </button>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            게스트는 연습·데모만 가능하며, 상점·토너먼트·영구 기록은 사용할 수 없습니다.
          </p>
        </form>

        <button
          type="button"
          onClick={() => navigateTo('signup')}
          className="w-full min-h-[48px] rounded-2xl border border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-200 font-bold text-sm flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4 text-cyan-400" />
          계정이 없나요? 회원가입
        </button>

        <p className="text-[10px] text-center text-slate-600">
          데모 계정: dorirang / User1234!
        </p>
      </div>
    </div>
  );
};
