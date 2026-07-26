import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Gift,
  ListOrdered,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import {
  adminService,
  type AdminTournamentOps,
  type AdminTournamentRow,
  type TournamentAdminAction,
  type TournamentDraft,
} from '../../services/adminService';
import type { ReasonPromptRequest } from './ReasonPrompt';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-700/30 text-slate-300 border-slate-600',
  REGISTRATION: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  READY: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  QUALIFIER: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  BRACKET: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  SEMIFINAL: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  FINAL: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  CANCELLED: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  POSTPONED: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDraft(): TournamentDraft {
  const start = new Date(Date.now() + 2 * 3_600_000);
  const regEnd = new Date(start.getTime() - 10 * 60_000);
  return {
    name: '',
    type: 'DAILY',
    tier: 'REGULAR',
    minParticipants: 8,
    maxParticipants: 64,
    bracketTarget: 16,
    entryTicket: 1,
    totalPrize: 1_000_000,
    startsAt: toLocalInput(start.toISOString()),
    registrationEndsAt: toLocalInput(regEnd.toISOString()),
    refundOnPostpone: true,
  };
}

const ACTION_META: Record<
  TournamentAdminAction,
  { label: string; critical: boolean; superOnly: boolean; description: string }
> = {
  OPEN_REGISTRATION: {
    label: '모집 시작',
    critical: false,
    superOnly: false,
    description: '참가 신청을 받기 시작합니다.',
  },
  CLOSE_REGISTRATION: {
    label: '모집 종료',
    critical: false,
    superOnly: false,
    description: '모집을 닫고 시작 대기 상태로 전환합니다.',
  },
  START: {
    label: '시작',
    critical: true,
    superOnly: false,
    description: '예선을 즉시 개시합니다. 인원 미달이면 자동 연기됩니다.',
  },
  POSTPONE: {
    label: '연기',
    critical: true,
    superOnly: false,
    description: '토너먼트를 연기합니다. 환불 설정이 켜져 있으면 티켓이 반환됩니다.',
  },
  CANCEL: {
    label: '취소',
    critical: true,
    superOnly: true,
    description: '토너먼트를 취소하고 모든 참가 티켓을 환불합니다. 되돌릴 수 없습니다.',
  },
  FORCE_COMPLETE: {
    label: '강제 종료',
    critical: true,
    superOnly: true,
    description: '남은 경기를 취소하고 현재 대진 기준으로 순위·보상을 확정합니다.',
  },
};

export const AdminTournamentsTab: React.FC<{
  isSuperAdmin: boolean;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  requestReason: (request: ReasonPromptRequest) => void;
}> = ({ isSuperAdmin, onError, onSuccess, requestReason }) => {
  const [rows, setRows] = useState<AdminTournamentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ops, setOps] = useState<AdminTournamentOps | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<TournamentDraft>(defaultDraft);
  const [rewardRows, setRewardRows] = useState<
    Array<{ rankFrom: number; rankTo: number; pointReward: number; label?: string }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.tournaments({ limit: 30 });
      setRows(data.items);
    } catch (error) {
      onError(error instanceof Error ? error.message : '토너먼트 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const loadOps = useCallback(
    async (tournamentId: string) => {
      try {
        const data = await adminService.tournamentOps(tournamentId);
        setOps(data);
        setRewardRows(
          data.rewards.map((r) => ({
            rankFrom: r.rankFrom,
            rankTo: r.rankTo,
            pointReward: r.pointReward,
            label: r.label ?? undefined,
          }))
        );
      } catch (error) {
        onError(error instanceof Error ? error.message : '토너먼트 상세를 불러오지 못했습니다.');
      }
    },
    [onError]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = (
    tournament: { id: string; name: string },
    action: TournamentAdminAction
  ) => {
    const meta = ACTION_META[action];
    requestReason({
      title: `${tournament.name} — ${meta.label}`,
      description: meta.description,
      critical: meta.critical,
      confirmLabel: meta.label,
      onSubmit: async (reason) => {
        try {
          const result = await adminService.runTournamentAction({
            tournamentId: tournament.id,
            action,
            reason,
          });
          onSuccess(`${meta.label} 완료 — 현재 상태 ${result.status}`);
          await load();
          if (ops?.tournament.id === tournament.id) await loadOps(tournament.id);
        } catch (error) {
          onError(error instanceof Error ? error.message : `${meta.label}에 실패했습니다.`);
        }
      },
    });
  };

  const submitCreate = () => {
    if (draft.name.trim().length < 2) {
      onError('토너먼트 이름을 입력해 주세요.');
      return;
    }
    requestReason({
      title: `토너먼트 생성 — ${draft.name}`,
      description: '초안(DRAFT) 상태로 생성됩니다. 이후 모집 시작을 눌러 공개하세요.',
      confirmLabel: '생성',
      onSubmit: async (reason) => {
        try {
          await adminService.createTournament(
            {
              ...draft,
              startsAt: new Date(draft.startsAt).toISOString(),
              registrationEndsAt: new Date(draft.registrationEndsAt).toISOString(),
            },
            reason
          );
          onSuccess('토너먼트를 생성했습니다.');
          setCreating(false);
          setDraft(defaultDraft());
          await load();
        } catch (error) {
          onError(error instanceof Error ? error.message : '생성에 실패했습니다.');
        }
      },
    });
  };

  const saveRewards = () => {
    if (!ops) return;
    requestReason({
      title: `${ops.tournament.name} — 보상표 설정`,
      description: '기존 보상표를 교체합니다. 구간이 겹치면 저장되지 않습니다.',
      confirmLabel: '보상표 저장',
      onSubmit: async (reason) => {
        try {
          await adminService.setRewardTable({
            tournamentId: ops.tournament.id,
            rows: rewardRows,
            reason,
          });
          onSuccess('보상표를 저장했습니다.');
          await loadOps(ops.tournament.id);
        } catch (error) {
          onError(error instanceof Error ? error.message : '보상표 저장에 실패했습니다.');
        }
      },
    });
  };

  if (ops) {
    const t = ops.tournament;
    const actions: TournamentAdminAction[] = [
      'OPEN_REGISTRATION',
      'CLOSE_REGISTRATION',
      'START',
      'POSTPONE',
      'CANCEL',
      'FORCE_COMPLETE',
    ];

    return (
      <div className="space-y-4">
        <button
          onClick={() => setOps(null)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{t.name}</h3>
                <span
                  className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                    STATUS_STYLE[t.status] ?? STATUS_STYLE.DRAFT
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t.type} · {t.tier} · {t.currentRoundLabel ?? '-'}
              </p>
            </div>
            <button
              onClick={() => void loadOps(t.id)}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-slate-950 rounded-xl p-2.5">
              <p className="text-[10px] text-slate-500">인원</p>
              <p className="text-white font-bold">
                {ops.participants.length} / {t.maxParticipants} (최소 {t.minParticipants})
              </p>
            </div>
            <div className="bg-slate-950 rounded-xl p-2.5">
              <p className="text-[10px] text-slate-500">본선 목표</p>
              <p className="text-white font-bold">{t.bracketTarget}강</p>
            </div>
            <div className="bg-slate-950 rounded-xl p-2.5">
              <p className="text-[10px] text-slate-500">참가 티켓 / 상금</p>
              <p className="text-white font-bold">
                {t.entryTicket}장 · {t.totalPrize.toLocaleString()}P
              </p>
            </div>
            <div className="bg-slate-950 rounded-xl p-2.5">
              <p className="text-[10px] text-slate-500">일정</p>
              <p className="text-white font-bold">
                {new Date(t.startsAt).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">
                모집 종료 {new Date(t.registrationEndsAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
            <Play className="w-4 h-4 text-cyan-400" />
            운영 조작
            <span className="text-[10px] font-normal text-slate-500">사유 필수</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const meta = ACTION_META[action];
              const blocked = meta.superOnly && !isSuperAdmin;
              return (
                <button
                  key={action}
                  onClick={() => runAction(t, action)}
                  disabled={blocked}
                  title={blocked ? '최고 관리자(SUPER_ADMIN) 권한이 필요합니다' : meta.description}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-extrabold border ${
                    blocked
                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                      : meta.superOnly
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                        : meta.critical
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                          : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25'
                  }`}
                >
                  {meta.superOnly ? (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  ) : action === 'CANCEL' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <CalendarClock className="w-3.5 h-3.5" />
                  )}
                  {meta.label}
                  {meta.superOnly && <span className="text-[9px] opacity-70">특별</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 보상표 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-amber-400" />
              보상표 설정
            </h4>
            <button
              onClick={() =>
                setRewardRows((prev) => [
                  ...prev,
                  {
                    rankFrom: (prev.at(-1)?.rankTo ?? 0) + 1,
                    rankTo: (prev.at(-1)?.rankTo ?? 0) + 1,
                    pointReward: 0,
                  },
                ])
              }
              className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200"
            >
              <Plus className="w-3.5 h-3.5" /> 구간 추가
            </button>
          </div>

          <div className="space-y-1.5">
            {rewardRows.map((row, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={row.rankFrom}
                  onChange={(e) =>
                    setRewardRows((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, rankFrom: Number(e.target.value) || 1 } : r
                      )
                    )
                  }
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                />
                <span className="text-[10px] text-slate-500">~</span>
                <input
                  type="number"
                  min={1}
                  value={row.rankTo}
                  onChange={(e) =>
                    setRewardRows((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, rankTo: Number(e.target.value) || 1 } : r
                      )
                    )
                  }
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                />
                <span className="text-[10px] text-slate-500">위</span>
                <input
                  type="number"
                  min={0}
                  value={row.pointReward}
                  onChange={(e) =>
                    setRewardRows((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, pointReward: Number(e.target.value) || 0 } : r
                      )
                    )
                  }
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                />
                <span className="text-[10px] text-slate-500">P</span>
                <button
                  onClick={() => setRewardRows((prev) => prev.filter((_, i) => i !== index))}
                  className="text-slate-500 hover:text-rose-400"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
            {!rewardRows.length && (
              <p className="text-[11px] text-slate-500">보상 구간이 없습니다.</p>
            )}
          </div>

          <button
            onClick={saveRewards}
            disabled={!rewardRows.length}
            className="w-full py-2 rounded-xl bg-amber-500 text-slate-950 text-[11px] font-extrabold disabled:bg-slate-800 disabled:text-slate-600"
          >
            보상표 저장
          </button>
        </div>

        {/* 참가자 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-cyan-400" />
            참가자 ({ops.participants.length})
          </h4>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-800">
            {ops.participants.map((p) => (
              <div key={p.userId} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{p.nickname}</p>
                  <p className="text-[10px] text-slate-500">
                    Lv.{p.level} · {p.status}
                    {p.accountStatus && p.accountStatus !== 'ACTIVE' && (
                      <span className="text-rose-400"> · 계정 {p.accountStatus}</span>
                    )}
                  </p>
                </div>
                <span className="text-[11px] font-black text-purple-300 shrink-0">
                  {p.finalRank ? `${p.finalRank}위` : (p.seed ? `시드 ${p.seed}` : '-')}
                </span>
              </div>
            ))}
            {!ops.participants.length && (
              <p className="text-[11px] text-slate-500 py-4 text-center">참가자가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 대진표 · 경기 상태 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
            <ListOrdered className="w-4 h-4 text-purple-400" />
            대진표 및 경기 상태 ({ops.bracket.length})
            {ops.liveGames.length > 0 && (
              <span className="text-[10px] font-bold text-emerald-300">
                진행 중 {ops.liveGames.length}
              </span>
            )}
          </h4>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
            {ops.bracket.map((m) => {
              const live = ops.liveGames.find((g) => g.tournamentMatchId === m.id);
              return (
                <div key={m.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-white truncate">
                      {m.roundLabel ?? `${m.round}R`}
                      {m.isThirdPlace && ' (3·4위전)'} #{m.bracketPosition}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">{m.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {m.player1?.nickname ?? 'TBD'} {m.player1Wins} : {m.player2Wins}{' '}
                    {m.player2?.nickname ?? 'TBD'}
                    <span className="text-slate-600"> ({m.winsRequired}선승)</span>
                  </p>
                  {live && (
                    <p className="text-[10px] text-emerald-300 mt-0.5">
                      제출 {live.player1Submitted ? '✓' : '…'} /{' '}
                      {live.player2Submitted ? '✓' : '…'} · 마감{' '}
                      {new Date(live.endsAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              );
            })}
            {!ops.bracket.length && (
              <p className="text-[11px] text-slate-500 py-4 text-center">
                대진표가 아직 생성되지 않았습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500">
          {loading ? '불러오는 중…' : `${rows.length}개`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-[11px] font-extrabold hover:bg-cyan-400"
          >
            <Plus className="w-3.5 h-3.5" />
            토너먼트 생성
          </button>
        </div>
      </div>

      {creating && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-black text-cyan-300">새 토너먼트</h4>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="토너먼트 이름"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">종류</span>
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, type: e.target.value as TournamentDraft['type'] }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              >
                <option value="DAILY">일일</option>
                <option value="WEEKLY">주간</option>
                <option value="HOURLY">시간별</option>
                <option value="SPECIAL">특별</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">등급</span>
              <select
                value={draft.tier}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tier: e.target.value as TournamentDraft['tier'] }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              >
                <option value="BEGINNER">초보자 (최대 32)</option>
                <option value="REGULAR">정규 (최대 128)</option>
                <option value="MEGA">메가 (준비 중)</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">최소 인원</span>
              <input
                type="number"
                value={draft.minParticipants}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, minParticipants: Number(e.target.value) || 2 }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">최대 인원</span>
              <input
                type="number"
                value={draft.maxParticipants}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, maxParticipants: Number(e.target.value) || 2 }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">본선 목표</span>
              <input
                type="number"
                value={draft.bracketTarget ?? 16}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bracketTarget: Number(e.target.value) || 16 }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">참가 티켓</span>
              <input
                type="number"
                value={draft.entryTicket}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, entryTicket: Number(e.target.value) || 0 }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">총 상금 (P)</span>
              <input
                type="number"
                value={draft.totalPrize}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, totalPrize: Number(e.target.value) || 0 }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">모집 종료</span>
              <input
                type="datetime-local"
                value={draft.registrationEndsAt}
                onChange={(e) => setDraft((d) => ({ ...d, registrationEndsAt: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1 col-span-2">
              <span className="text-[10px] text-slate-400">시작 시각</span>
              <input
                type="datetime-local"
                value={draft.startsAt}
                onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={draft.refundOnPostpone ?? true}
              onChange={(e) => setDraft((d) => ({ ...d, refundOnPostpone: e.target.checked }))}
            />
            인원 미달·연기 시 티켓 자동 환불
          </label>
          <button
            onClick={submitCreate}
            className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-extrabold hover:bg-cyan-400"
          >
            생성 (사유 입력)
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
        {rows.map((t) => (
          <button
            key={t.id}
            onClick={() => void loadOps(t.id)}
            className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-slate-800/50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-white truncate">{t.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                    STATUS_STYLE[t.status] ?? STATUS_STYLE.DRAFT
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {t.tier} · {t.participants}/{t.maxParticipants}명 · 상금{' '}
                {t.totalPrize.toLocaleString()}P
              </p>
              <p className="text-[10px] text-slate-600">
                시작 {new Date(t.startsAt).toLocaleString()}
              </p>
            </div>
            <Trophy className="w-4 h-4 text-purple-400 shrink-0" />
          </button>
        ))}
        {!rows.length && !loading && (
          <p className="text-[11px] text-slate-500 p-6 text-center">토너먼트가 없습니다.</p>
        )}
      </div>
    </div>
  );
};
