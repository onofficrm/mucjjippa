import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Copy,
  Eye,
  Lock,
  Plug,
  RefreshCw,
  Timer,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  adminService,
  type DuplicateReport,
  type ErrorLogRow,
  type LiveMonitor,
  type MonitorPlayer,
} from '../../services/adminService';
import type { ReasonPromptRequest } from './ReasonPrompt';

const REFRESH_MS = 5_000;

type MonitorSection = 'live' | 'errors' | 'duplicates';

const PlayerCell: React.FC<{ player: MonitorPlayer; revealed: boolean }> = ({
  player,
  revealed,
}) => (
  <div className="flex-1 min-w-0 bg-slate-950 rounded-xl p-2.5 space-y-1">
    <div className="flex items-center gap-1.5">
      {player.connected ? (
        <Wifi className="w-3 h-3 text-emerald-400" />
      ) : (
        <WifiOff className="w-3 h-3 text-rose-400" />
      )}
      <span className="text-[11px] font-bold text-white truncate">{player.nickname}</span>
    </div>
    <div className="flex items-center gap-1.5 text-[10px]">
      <span
        className={`px-1.5 py-0.5 rounded font-bold ${
          player.choiceSubmitted
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-slate-800 text-slate-500'
        }`}
      >
        {player.choiceSubmitted ? '제출 완료' : '미제출'}
      </span>
      {player.choiceLocked && (
        <span className="flex items-center gap-0.5 text-amber-300">
          <Lock className="w-3 h-3" />
          확정
        </span>
      )}
    </div>
    <p className="text-[10px] text-slate-500">
      점수 {player.score} ·{' '}
      {revealed && player.choice ? (
        <span className="text-white font-bold">{player.choice}</span>
      ) : (
        <span className="text-slate-600">선택 비공개</span>
      )}
    </p>
  </div>
);

export const AdminMonitorTab: React.FC<{
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  requestReason: (request: ReasonPromptRequest) => void;
}> = ({ onError, onSuccess, requestReason }) => {
  const [section, setSection] = useState<MonitorSection>('live');
  const [live, setLive] = useState<LiveMonitor | null>(null);
  const [errors, setErrors] = useState<ErrorLogRow[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateReport | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLive = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setLive(await adminService.liveMonitor());
      } catch (error) {
        onError(error instanceof Error ? error.message : '모니터링 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  const loadErrors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.errorLogs({ limit: 50 });
      setErrors(data.items);
    } catch (error) {
      onError(error instanceof Error ? error.message : '오류 로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      setDuplicates(await adminService.duplicates(10));
    } catch (error) {
      onError(error instanceof Error ? error.message : '중복 거래 탐지에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (section === 'live') {
      void loadLive();
      const timer = setInterval(() => void loadLive(true), REFRESH_MS);
      return () => clearInterval(timer);
    }
    if (section === 'errors') void loadErrors();
    if (section === 'duplicates') void loadDuplicates();
    return undefined;
  }, [loadDuplicates, loadErrors, loadLive, section]);

  const resolve = (row: ErrorLogRow) => {
    requestReason({
      title: `오류 처리 완료 — ${row.code}`,
      description: row.message,
      confirmLabel: '처리 완료',
      onSubmit: async (reason) => {
        try {
          await adminService.resolveError(row.id, reason);
          onSuccess('오류를 처리 완료로 표시했습니다.');
          await loadErrors();
        } catch (error) {
          onError(error instanceof Error ? error.message : '처리에 실패했습니다.');
        }
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(
            [
              ['live', '진행 중 매치'],
              ['errors', '오류 로그'],
              ['duplicates', '중복 거래 탐지'],
            ] as Array<[MonitorSection, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap ${
                section === key
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (section === 'live') void loadLive();
            if (section === 'errors') void loadErrors();
            if (section === 'duplicates') void loadDuplicates();
          }}
          className="text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {section === 'live' && live && (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Plug className="w-3.5 h-3.5 text-cyan-400" />
              소켓 {live.connectedSockets.toLocaleString()}
            </span>
            <span className="text-slate-400">경기 {live.matches.length}</span>
            <span className="text-slate-400">
              대기 {live.queues.reduce((sum, q) => sum + q.waiting, 0)}
            </span>
            <span className="text-slate-400">중계 {live.watchStreams.length}</span>
          </div>

          <p className="text-[10px] text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
            선택값은 결과 공개 전까지 서버가 마스킹합니다. 관리자는 진행 중 경기의 선택을 조회·변경할
            수 없습니다.
          </p>

          <div className="space-y-2">
            {live.matches.map((m) => (
              <div key={m.matchId} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">
                      {m.roomName} · {m.stake.toLocaleString()}P
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {m.matchId} · {m.round}라운드
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                      {m.state}
                    </span>
                    {m.endsAt && (
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 justify-end">
                        <Timer className="w-3 h-3" />
                        {new Date(m.endsAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <PlayerCell player={m.player1} revealed={m.revealed} />
                  <PlayerCell player={m.player2} revealed={m.revealed} />
                </div>
                <p className="text-[10px] text-slate-500">
                  결과 {m.winnerId ? `승자 ${m.winnerId}` : m.revealed ? '공개' : '대기'} · 참가비{' '}
                  {m.feesDeducted ? '차감됨' : '미차감'}
                </p>
              </div>
            ))}
            {!live.matches.length && (
              <p className="text-[11px] text-slate-500 p-6 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                진행 중인 경기가 없습니다.
              </p>
            )}
          </div>

          {live.queues.some((q) => q.waiting > 0) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1.5">
              <h4 className="text-[11px] font-black text-amber-300">매칭 대기열</h4>
              {live.queues
                .filter((q) => q.waiting > 0)
                .map((q) => (
                  <div key={q.stake} className="text-[10px] text-slate-400">
                    <span className="font-bold text-white">
                      {q.stake.toLocaleString()}P 방 — {q.waiting}명
                    </span>
                    {q.players.map((p) => (
                      <span key={p.userId} className="ml-2">
                        {p.nickname}(Lv.{p.level}, {Math.round(p.waitingMs / 1000)}s)
                      </span>
                    ))}
                  </div>
                ))}
            </div>
          )}

          {live.watchStreams.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1.5">
              <h4 className="text-[11px] font-black text-emerald-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                관전 중계
              </h4>
              {live.watchStreams.map((s) => (
                <p key={s.matchId} className="text-[10px] text-slate-400">
                  {s.matchId} · {s.kind} · {s.phase} · 시청 {s.viewerCount}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {section === 'errors' && (
        <div className="space-y-2">
          {errors.map((row) => (
            <div key={row.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <AlertOctagon
                      className={`w-3.5 h-3.5 ${
                        row.level === 'FATAL'
                          ? 'text-rose-400'
                          : row.level === 'ERROR'
                            ? 'text-orange-400'
                            : 'text-amber-400'
                      }`}
                    />
                    <span className="text-[11px] font-black text-white">{row.code}</span>
                    <span className="text-[10px] text-slate-500">{row.level}</span>
                    {row.resolved && (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        처리됨
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 break-words">{row.message}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {row.scope ?? '-'} · {row.requestId ?? '-'} ·{' '}
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
                {!row.resolved && (
                  <button
                    onClick={() => resolve(row)}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-extrabold text-emerald-300"
                  >
                    처리 완료
                  </button>
                )}
              </div>
            </div>
          ))}
          {!errors.length && !loading && (
            <p className="text-[11px] text-slate-500 p-6 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              오류 로그가 없습니다.
            </p>
          )}
        </div>
      )}

      {section === 'duplicates' && duplicates && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 px-1">
            최근 {duplicates.windowMinutes}분 · 거래 {duplicates.scannedTransactions.toLocaleString()}건
            검사 · 의심 {duplicates.suspects.length}건
          </p>
          {duplicates.suspects.map((s, index) => (
            <div
              key={`${s.userId}-${index}`}
              className="bg-slate-900 border border-amber-500/25 rounded-2xl p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">
                    {s.nickname}
                    <span className="text-slate-500 font-normal"> · {s.userId}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {s.reason} · {s.type} · {s.amount.toLocaleString()}
                    {s.asset === 'TICKET' ? '장' : 'P'}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-black text-amber-300">
                  {s.hits}회
                </span>
              </div>
              <p className="text-[10px] text-slate-600 mt-1 flex items-start gap-1">
                <Copy className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="break-all">{s.transactionKeys.join(', ')}</span>
              </p>
              <p className="text-[10px] text-slate-600">
                {new Date(s.firstAt).toLocaleTimeString()} ~{' '}
                {new Date(s.lastAt).toLocaleTimeString()}
              </p>
            </div>
          ))}
          {!duplicates.suspects.length && (
            <p className="text-[11px] text-emerald-300 p-6 text-center bg-slate-900 border border-emerald-500/20 rounded-2xl">
              중복 의심 거래가 없습니다.
            </p>
          )}

          {duplicates.referenceHotspots.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
              <h4 className="text-[11px] font-black text-slate-300">참조 집중 구간</h4>
              {duplicates.referenceHotspots.map((r, index) => (
                <p key={index} className="text-[10px] text-slate-400">
                  {r.referenceType} · {r.referenceId} — {r.hits}건
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
