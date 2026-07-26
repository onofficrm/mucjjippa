import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  adminService,
  type FraudScanResult,
  type FraudSeverity,
  type FraudSignalPage,
  type FraudSignalRow,
  type FraudSignalStatus,
} from '../../services/adminService';
import type { ReasonPromptRequest } from './ReasonPrompt';

interface Props {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  requestReason: (request: ReasonPromptRequest) => void;
}

const SEVERITY_STYLE: Record<FraudSeverity, string> = {
  INFO: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  WARN: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  CRITICAL: 'bg-rose-500/15 text-rose-300 border-rose-500/50',
};

const STATUS_FILTERS: Array<{ key: FraudSignalStatus | 'ALL'; label: string }> = [
  { key: 'OPEN', label: '미검토' },
  { key: 'REVIEWING', label: '검토 중' },
  { key: 'RESOLVED', label: '처리됨' },
  { key: 'IGNORED', label: '무시' },
  { key: 'ALL', label: '전체' },
];

const TYPE_LABEL: Record<string, string> = {
  RAPID_CHOICE: '지나치게 빠른 선택',
  REPEATED_DISCONNECT: '반복 접속 종료',
  SAME_OPPONENT_REMATCH: '특정 상대 반복 매칭',
  MULTI_ACCOUNT_SAME_IP: '동일 IP 다계정',
  ABNORMAL_WINRATE: '비정상 승률',
  ABNORMAL_POINT_GAIN: '비정상 포인트 증가',
  REPEATED_REWARD: '보상 반복 요청',
  REPLAY_ATTEMPT: '재생 공격 시도',
  PERMISSION_DENIED: '권한 거부',
};

export const AdminSecurityTab: React.FC<Props> = ({ onError, onSuccess, requestReason }) => {
  const [statusFilter, setStatusFilter] = useState<FraudSignalStatus | 'ALL'>('OPEN');
  const [page, setPage] = useState<FraudSignalPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [twoFA, setTwoFA] = useState<{ enabled: boolean } | null>(null);
  const [enroll, setEnroll] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.fraudSignals({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 50,
      });
      setPage(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : '신호를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    adminService.twoFactorStatus().then(setTwoFA).catch(() => setTwoFA(null));
  }, []);

  const runScan = async () => {
    setScanning(true);
    try {
      const result: FraudScanResult = await adminService.runFraudScan();
      onSuccess(`배치 스캔 완료 — 신호 ${result.total}건 갱신`);
      await load();
    } catch (error) {
      onError(error instanceof Error ? error.message : '스캔에 실패했습니다.');
    } finally {
      setScanning(false);
    }
  };

  const review = (signal: FraudSignalRow, status: 'REVIEWING' | 'RESOLVED' | 'IGNORED') => {
    const labels = { REVIEWING: '검토 시작', RESOLVED: '처리 완료', IGNORED: '무시' };
    requestReason({
      title: `신호 ${labels[status]}`,
      description: `${TYPE_LABEL[signal.type] ?? signal.type} — ${signal.message}`,
      confirmLabel: labels[status],
      onSubmit: async (reason) => {
        try {
          await adminService.reviewFraudSignal({ signalId: signal.id, status, reason });
          onSuccess(`${labels[status]} 처리되었습니다.`);
          await load();
        } catch (error) {
          onError(error instanceof Error ? error.message : '처리에 실패했습니다.');
        }
      },
    });
  };

  const startEnroll = async () => {
    try {
      setEnroll(await adminService.twoFactorEnroll());
    } catch (error) {
      onError(error instanceof Error ? error.message : '2FA 등록을 시작하지 못했습니다.');
    }
  };

  const confirmEnroll = async () => {
    try {
      await adminService.twoFactorConfirm(code.trim());
      setTwoFA({ enabled: true });
      setEnroll(null);
      setCode('');
      onSuccess('2단계 인증이 활성화되었습니다.');
    } catch (error) {
      onError(error instanceof Error ? error.message : '인증 코드가 올바르지 않습니다.');
    }
  };

  const disable2FA = () => {
    requestReason({
      title: '2단계 인증 비활성화',
      description: '관리자 계정의 2FA를 해제합니다.',
      confirmLabel: '비활성화',
      onSubmit: async (reason) => {
        try {
          await adminService.twoFactorDisable(reason);
          setTwoFA({ enabled: false });
          onSuccess('2단계 인증이 비활성화되었습니다.');
        } catch (error) {
          onError(error instanceof Error ? error.message : '비활성화에 실패했습니다.');
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* 2FA 준비 카드 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            관리자 2단계 인증 (TOTP)
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
              twoFA?.enabled
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
            }`}
          >
            {twoFA?.enabled ? '활성' : '미설정'}
          </span>
        </div>

        {!twoFA?.enabled && !enroll && (
          <button
            onClick={() => void startEnroll()}
            className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-extrabold"
          >
            2FA 등록 시작
          </button>
        )}

        {enroll && (
          <div className="space-y-2 bg-slate-950 border border-slate-700 rounded-xl p-3">
            <p className="text-[11px] text-slate-400">
              인증 앱(Google Authenticator 등)에 아래 secret 또는 URI를 등록한 뒤 6자리 코드를 입력하세요.
            </p>
            <code className="block break-all text-[11px] text-cyan-300 bg-slate-900 rounded-lg px-2 py-1.5">
              {enroll.secret}
            </code>
            <code className="block break-all text-[10px] text-slate-500">{enroll.otpauthUri}</code>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6자리 코드"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => void confirmEnroll()}
                disabled={code.length !== 6}
                className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-extrabold disabled:bg-slate-800 disabled:text-slate-600"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {twoFA?.enabled && (
          <button
            onClick={disable2FA}
            className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-extrabold"
          >
            2FA 비활성화
          </button>
        )}
        <p className="text-[10px] text-slate-500">
          준비 단계 — 현재 로그인 강제는 적용되지 않으며 이후 단계에서 활성화됩니다.
        </p>
      </div>

      {/* 부정 이용 신호 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap ${
                statusFilter === f.key
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => void runScan()}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold disabled:opacity-50"
          >
            <ScanSearch className={`w-3.5 h-3.5 ${scanning ? 'animate-pulse' : ''}`} />
            배치 스캔
          </button>
        </div>
      </div>

      {page && (
        <div className="flex gap-3 text-[11px]">
          <span className="text-amber-300 font-bold">미검토 {page.openCount}</span>
          <span className="text-rose-300 font-bold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> 심각 {page.criticalCount}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {page?.items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
            <ShieldCheck className="w-8 h-8 text-emerald-500/60" />
            <p className="text-xs">해당 조건의 신호가 없습니다.</p>
          </div>
        )}
        {page?.items.map((signal) => (
          <div
            key={signal.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${SEVERITY_STYLE[signal.severity]}`}
                  >
                    {signal.severity}
                  </span>
                  <span className="text-xs font-black text-white">
                    {TYPE_LABEL[signal.type] ?? signal.type}
                  </span>
                  {signal.hitCount > 1 && (
                    <span className="text-[10px] text-slate-500">×{signal.hitCount}</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">{signal.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {signal.user ? `${signal.user.nickname} (${signal.user.status})` : '대상 미지정'} ·{' '}
                  {new Date(signal.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">{signal.status}</span>
            </div>
            {signal.status !== 'RESOLVED' && signal.status !== 'IGNORED' && (
              <div className="flex gap-1.5">
                {signal.status === 'OPEN' && (
                  <button
                    onClick={() => review(signal, 'REVIEWING')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-extrabold text-slate-300 hover:text-white"
                  >
                    검토 시작
                  </button>
                )}
                <button
                  onClick={() => review(signal, 'RESOLVED')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-extrabold text-emerald-300"
                >
                  처리 완료
                </button>
                <button
                  onClick={() => review(signal, 'IGNORED')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-extrabold text-slate-400 hover:text-white"
                >
                  무시
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
