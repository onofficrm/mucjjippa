import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  LayoutDashboard,
  Megaphone,
  MonitorPlay,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Trophy,
  Users,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import {
  ADMIN_CONFIRM_PHRASE,
  adminService,
  type AdminMe,
} from '../services/adminService';
import { ReasonPrompt, type ReasonPromptRequest } from '../components/admin/ReasonPrompt';
import { AdminDashboardTab } from '../components/admin/AdminDashboardTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminTournamentsTab } from '../components/admin/AdminTournamentsTab';
import { AdminNoticesTab } from '../components/admin/AdminNoticesTab';
import { AdminMonitorTab } from '../components/admin/AdminMonitorTab';
import { AdminAuditTab } from '../components/admin/AdminAuditTab';
import { AdminSecurityTab } from '../components/admin/AdminSecurityTab';

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'tournaments'
  | 'notices'
  | 'monitor'
  | 'security'
  | 'audit';

const TABS: Array<{ key: AdminTab; label: string; icon: React.ReactNode }> = [
  { key: 'dashboard', label: '대시보드', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { key: 'users', label: '사용자', icon: <Users className="w-3.5 h-3.5" /> },
  { key: 'tournaments', label: '토너먼트', icon: <Trophy className="w-3.5 h-3.5" /> },
  { key: 'notices', label: '공지', icon: <Megaphone className="w-3.5 h-3.5" /> },
  { key: 'monitor', label: '모니터링', icon: <MonitorPlay className="w-3.5 h-3.5" /> },
  { key: 'security', label: '보안', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { key: 'audit', label: '감사 로그', icon: <ScrollText className="w-3.5 h-3.5" /> },
];

/**
 * 관리자센터.
 * 접근 판정은 서버(`GET /admin/me`)가 담당한다 — 클라이언트 플래그만으로는 열리지 않는다.
 */
export const AdminCenterPage: React.FC = () => {
  const { goBack, navigateTo, showToast, authReady, isAuthenticated } = useGame();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [me, setMe] = useState<AdminMe | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [prompt, setPrompt] = useState<ReasonPromptRequest | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      setChecking(false);
      setDenied('로그인이 필요합니다.');
      return;
    }
    let cancelled = false;
    setChecking(true);
    adminService
      .me()
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        setDenied(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setDenied(
          error instanceof Error ? error.message : '관리자 권한이 없어 접근할 수 없습니다.'
        );
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated]);

  const onError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const onSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const requestReason = useCallback((request: ReasonPromptRequest) => setPrompt(request), []);

  if (!authReady || checking) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <ShieldCheck className="w-8 h-8 text-cyan-400 animate-pulse" />
        <p className="text-xs text-slate-400">관리자 권한을 확인하고 있습니다…</p>
      </div>
    );
  }

  if (denied || !me) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-rose-400" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-black text-white">접근 권한이 없습니다</h2>
          <p className="text-xs text-slate-400 max-w-xs">
            {denied ?? '관리자센터는 ADMIN 또는 SUPER_ADMIN 계정만 이용할 수 있습니다.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigateTo('home')}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-extrabold text-slate-300 hover:text-white"
          >
            홈으로
          </button>
          {!isAuthenticated && (
            <button
              onClick={() => navigateTo('login')}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-xs font-extrabold text-slate-950 hover:bg-cyan-400"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
              me.isSuperAdmin
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
            }`}
          >
            {me.role}
          </span>
          <span className="text-[10px] text-slate-500">
            {me.nickname} · {me.ip}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/25 rounded-3xl p-4">
        <h1 className="text-lg font-black text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          관리자센터
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          모든 변경 작업은 사유가 필수이며 관리자·시간·IP와 함께 감사 로그에 기록됩니다.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all ${
              tab === item.key
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <AdminDashboardTab onError={onError} />}
      {tab === 'users' && (
        <AdminUsersTab
          isSuperAdmin={me.isSuperAdmin}
          onError={onError}
          onSuccess={onSuccess}
          requestReason={requestReason}
        />
      )}
      {tab === 'tournaments' && (
        <AdminTournamentsTab
          isSuperAdmin={me.isSuperAdmin}
          onError={onError}
          onSuccess={onSuccess}
          requestReason={requestReason}
        />
      )}
      {tab === 'notices' && (
        <AdminNoticesTab
          onError={onError}
          onSuccess={onSuccess}
          requestReason={requestReason}
        />
      )}
      {tab === 'monitor' && (
        <AdminMonitorTab
          onError={onError}
          onSuccess={onSuccess}
          requestReason={requestReason}
        />
      )}
      {tab === 'security' && (
        <AdminSecurityTab
          onError={onError}
          onSuccess={onSuccess}
          requestReason={requestReason}
        />
      )}
      {tab === 'audit' && <AdminAuditTab onError={onError} />}

      <ReasonPrompt
        request={prompt}
        confirmPhrase={me.confirmPhrase || ADMIN_CONFIRM_PHRASE}
        onClose={() => setPrompt(null)}
      />
    </div>
  );
};
