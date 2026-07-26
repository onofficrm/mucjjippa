import React, { useState } from 'react';
import { UserPlus, ArrowLeft, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { ApiError } from '../api';

export const SignupPage: React.FC = () => {
  const { signup, navigateTo, showToast } = useGame();
  const [loginId, setLoginId] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError('필수 약관에 동의해 주세요.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        loginId: loginId.trim(),
        nickname: nickname.trim(),
        email: email.trim() || undefined,
        password,
        agreeTerms,
        agreePrivacy,
      });
      showToast('회원가입이 완료되었습니다.', 'success');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : '회원가입에 실패했습니다. 다시 시도해 주세요.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo('login')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            로그인으로
          </button>
          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full">
            회원가입
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-cyan-500/5"
        >
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            새 계정 만들기
          </h2>
          <p className="text-xs text-slate-400 -mt-2">가입 시 3,000P · 티켓 1장이 지급됩니다.</p>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">로그인 ID *</span>
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[44px]"
              placeholder="영문/숫자/_ 4~32자"
              required
              minLength={4}
              maxLength={32}
              pattern="[A-Za-z0-9_]+"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">닉네임 *</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[44px]"
              placeholder="2~16자"
              required
              minLength={2}
              maxLength={16}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">이메일 (선택)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[44px]"
              placeholder="optional@email.com"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">비밀번호 *</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 pr-11 text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[44px]"
                placeholder="8자 이상"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">비밀번호 확인 *</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[44px]"
              required
              minLength={8}
            />
          </label>

          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 accent-cyan-500"
              />
              <span>
                <Check className="w-3 h-3 inline text-cyan-400 mr-1" />
                서비스 이용약관에 동의합니다 (필수)
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-0.5 accent-cyan-500"
              />
              <span>개인정보 처리방침에 동의합니다 (필수)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-black text-sm transition"
          >
            {loading ? '가입 중…' : '회원가입 완료'}
          </button>
        </form>
      </div>
    </div>
  );
};
