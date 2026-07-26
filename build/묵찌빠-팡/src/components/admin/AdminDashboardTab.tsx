import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  Ban,
  Coins,
  Gamepad2,
  RefreshCw,
  ShieldAlert,
  Swords,
  Timer,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { adminService, type AdminDashboard } from '../../services/adminService';

const REFRESH_MS = 10_000;

const Metric: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'cyan' | 'amber' | 'rose' | 'emerald' | 'purple';
}> = ({ icon, label, value, sub, tone = 'cyan' }) => {
  const tones = {
    cyan: 'border-cyan-500/30 text-cyan-300',
    amber: 'border-amber-500/30 text-amber-300',
    rose: 'border-rose-500/30 text-rose-300',
    emerald: 'border-emerald-500/30 text-emerald-300',
    purple: 'border-purple-500/30 text-purple-300',
  } as const;
  return (
    <div className={`bg-slate-900 border rounded-2xl p-3.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
        {icon}
        <span className="text-slate-400">{label}</span>
      </div>
      <div className="text-xl font-black text-white mt-1.5">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
};

export const AdminDashboardTab: React.FC<{ onError: (message: string) => void }> = ({
  onError,
}) => {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setData(await adminService.dashboard());
      } catch (error) {
        onError(error instanceof Error ? error.message : '대시보드를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (!data) {
    return (
      <div className="text-center py-12 text-xs text-slate-500">
        {loading ? '대시보드를 불러오는 중…' : '데이터가 없습니다.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500">
          갱신 {new Date(data.generatedAt).toLocaleTimeString()} · {REFRESH_MS / 1000}초마다 자동
        </p>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-black text-cyan-300 px-1">실시간</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <Metric
            icon={<Users className="w-3.5 h-3.5" />}
            label="현재 접속 사용자"
            value={data.online.connectedUsers}
            sub="소켓 연결 기준"
          />
          <Metric
            icon={<Timer className="w-3.5 h-3.5" />}
            label="매칭 대기"
            value={data.online.waitingPlayers}
            tone="amber"
          />
          <Metric
            icon={<Swords className="w-3.5 h-3.5" />}
            label="진행 중 경기"
            value={data.online.liveMatches}
            sub={`본선 ${data.online.liveBracketGames} · 중계 ${data.online.liveWatchStreams}`}
          />
          <Metric
            icon={<Trophy className="w-3.5 h-3.5" />}
            label="진행 중 토너먼트"
            value={data.online.activeTournaments}
            tone="purple"
          />
          <Metric
            icon={<Activity className="w-3.5 h-3.5" />}
            label="관전 중계"
            value={data.online.liveWatchStreams}
            tone="emerald"
          />
          <Metric
            icon={<Gamepad2 className="w-3.5 h-3.5" />}
            label="오늘 게임 수"
            value={data.today.games}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-black text-amber-300 px-1">오늘</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <Metric
            icon={<Coins className="w-3.5 h-3.5" />}
            label="포인트 지급"
            value={data.today.pointsGranted}
            sub={`${data.today.pointsGrantedCount.toLocaleString()}건`}
            tone="emerald"
          />
          <Metric
            icon={<Coins className="w-3.5 h-3.5" />}
            label="포인트 사용"
            value={data.today.pointsSpent}
            sub={`${data.today.pointsSpentCount.toLocaleString()}건`}
            tone="amber"
          />
          <Metric
            icon={<Coins className="w-3.5 h-3.5" />}
            label="티켓 지급"
            value={data.today.ticketsGranted}
            tone="purple"
          />
          <Metric
            icon={<AlertOctagon className="w-3.5 h-3.5" />}
            label="오류 수"
            value={data.today.errors}
            tone="rose"
          />
          <Metric
            icon={<UserPlus className="w-3.5 h-3.5" />}
            label="신규 가입"
            value={data.today.newSignups}
            tone="emerald"
          />
          <Metric
            icon={<Ban className="w-3.5 h-3.5" />}
            label="제재 사용자"
            value={data.moderation.total}
            sub={`정지 ${data.moderation.suspended} · 영구 ${data.moderation.banned}`}
            tone="rose"
          />
          <Metric
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            label="부정 이용 신호"
            value={data.fraud.open}
            sub={`심각 ${data.fraud.critical} · 미검토`}
            tone={data.fraud.critical > 0 ? 'rose' : 'amber'}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-black text-slate-300 px-1">최근 관리자 작업</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          {data.recentAudit.length === 0 && (
            <p className="text-[11px] text-slate-500 p-4 text-center">기록이 없습니다.</p>
          )}
          {data.recentAudit.map((row) => (
            <div key={row.id} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                    {row.action}
                  </span>
                  <span className="text-[11px] font-bold text-white">{row.admin}</span>
                  {row.role && <span className="text-[10px] text-slate-500">{row.role}</span>}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  {row.targetType} · {row.targetId}
                </p>
                {row.reason && (
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">사유: {row.reason}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-500">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-600">{row.ip ?? '-'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
