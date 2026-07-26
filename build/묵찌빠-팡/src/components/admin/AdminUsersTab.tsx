import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Coins,
  Search,
  ShieldCheck,
  Ticket,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  adminService,
  type AdminUserDetail,
  type AdminUserRow,
  type UserAccountStatus,
} from '../../services/adminService';
import type { ReasonPromptRequest } from './ReasonPrompt';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  SUSPENDED: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  BANNED: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  DELETED: 'bg-slate-700/30 text-slate-400 border-slate-600',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '정상',
  SUSPENDED: '이용 정지',
  BANNED: '영구 정지',
  DELETED: '탈퇴',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
      STATUS_STYLE[status] ?? STATUS_STYLE.DELETED
    }`}
  >
    {STATUS_LABEL[status] ?? status}
  </span>
);

type DetailTab = 'points' | 'matches' | 'tournaments' | 'audit';

export const AdminUsersTab: React.FC<{
  isSuperAdmin: boolean;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  requestReason: (request: ReasonPromptRequest) => void;
}> = ({ isSuperAdmin, onError, onSuccess, requestReason }) => {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserAccountStatus | ''>('');
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('points');
  const [amount, setAmount] = useState(1000);

  const search = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      try {
        const data = await adminService.searchUsers({
          q: keyword.trim() || undefined,
          status: statusFilter || undefined,
          page: nextPage,
          limit: 20,
        });
        setRows(data.items);
        setTotal(data.total);
        setPage(data.page);
      } catch (error) {
        onError(error instanceof Error ? error.message : '사용자 검색에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [keyword, onError, statusFilter]
  );

  const loadDetail = useCallback(
    async (userId: string) => {
      try {
        setDetail(await adminService.userDetail(userId));
        setSelectedId(userId);
      } catch (error) {
        onError(error instanceof Error ? error.message : '상세 조회에 실패했습니다.');
      }
    },
    [onError]
  );

  useEffect(() => {
    void search(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeStatus = (
    user: { id: string; nickname: string; status: string },
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  ) => {
    const labels = { ACTIVE: '정지 해제', SUSPENDED: '이용 정지', BANNED: '영구 정지' };
    requestReason({
      title: `${user.nickname} — ${labels[status]}`,
      description:
        status === 'ACTIVE'
          ? '계정을 정상 상태로 되돌립니다.'
          : '해당 계정의 모든 세션이 즉시 만료되며 로그인이 차단됩니다.',
      critical: true,
      confirmLabel: labels[status],
      onSubmit: async (reason) => {
        try {
          await adminService.setUserStatus({ userId: user.id, status, reason });
          onSuccess(`${user.nickname} 계정을 ${labels[status]} 처리했습니다.`);
          await search(page);
          if (selectedId === user.id) await loadDetail(user.id);
        } catch (error) {
          onError(error instanceof Error ? error.message : '상태 변경에 실패했습니다.');
        }
      },
    });
  };

  const adjustWallet = (
    user: { id: string; nickname: string },
    asset: 'POINT' | 'TICKET',
    credit: boolean
  ) => {
    const unit = asset === 'POINT' ? 'P' : '장';
    const verb = credit ? '지급' : '회수';
    requestReason({
      title: `${user.nickname} — ${asset === 'POINT' ? '포인트' : '티켓'} ${verb}`,
      description: `${amount.toLocaleString()}${unit} ${verb}합니다. 원장에 거래로 기록되며 되돌릴 수 없습니다.`,
      critical: true,
      confirmLabel: `${verb} 실행`,
      onSubmit: async (reason) => {
        try {
          const result = await adminService.adjustWallet({
            userId: user.id,
            asset,
            amount,
            credit,
            reason,
          });
          onSuccess(
            result.duplicated
              ? '이미 처리된 거래입니다.'
              : `${verb} 완료 — 포인트 ${result.wallet.points.toLocaleString()}P · 티켓 ${result.wallet.tickets}장`
          );
          await search(page);
          if (selectedId === user.id) await loadDetail(user.id);
        } catch (error) {
          onError(error instanceof Error ? error.message : `${verb}에 실패했습니다.`);
        }
      },
    });
  };

  if (detail) {
    const p = detail.profile;
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setDetail(null);
            setSelectedId(null);
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{p.avatar}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">{p.nickname}</h3>
                  <StatusBadge status={p.status} />
                  <span className="text-[10px] text-slate-500">{p.role}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {p.loginId} · {p.email ?? '이메일 없음'} · Lv.{p.level}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">ID {p.id}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-amber-300">
                {detail.wallet.points.toLocaleString()} P
              </p>
              <p className="text-[11px] font-bold text-purple-300">
                티켓 {detail.wallet.tickets}장
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-slate-950 rounded-xl p-2.5">
              <p className="text-slate-500 text-[10px]">전적</p>
              <p className="text-white font-bold">
                {p.wins}승 {p.losses}패 {p.draws}무
              </p>
            </div>
            <div className="bg-slate-950 rounded-xl p-2.5">
              <p className="text-slate-500 text-[10px]">연승</p>
              <p className="text-white font-bold">
                현재 {p.currentStreak} · 최고 {p.maxStreak}
              </p>
            </div>
            <div className="bg-slate-950 rounded-xl p-2.5">
              <p className="text-slate-500 text-[10px]">손 사용</p>
              <p className="text-white font-bold">
                바위 {p.rockCount} 보 {p.paperCount} 가위 {p.scissorsCount}
              </p>
            </div>
            <div className="bg-slate-950 rounded-xl p-2.5">
              <p className="text-slate-500 text-[10px]">로그인 상태</p>
              <p className={`font-bold ${detail.loginState.online ? 'text-emerald-300' : 'text-slate-400'}`}>
                {detail.loginState.online ? '접속 중' : '오프라인'}
                {detail.loginState.lastLoginAt && (
                  <span className="text-slate-500 font-normal">
                    {' '}
                    · {new Date(detail.loginState.lastLoginAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 제재 · 잔액 조정 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            제재 및 잔액 관리
            <span className="text-[10px] font-normal text-slate-500">사유 필수</span>
          </h4>

          <div className="flex flex-wrap gap-2">
            {p.status === 'ACTIVE' ? (
              <>
                <button
                  onClick={() => changeStatus(p, 'SUSPENDED')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold hover:bg-amber-500/25"
                >
                  <UserX className="w-3.5 h-3.5" />
                  이용 정지
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => changeStatus(p, 'BANNED')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] font-extrabold hover:bg-rose-500/25"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    영구 정지 (특별 권한)
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => changeStatus(p, 'ACTIVE')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-extrabold hover:bg-emerald-500/25"
              >
                <UserCheck className="w-3.5 h-3.5" />
                정지 해제
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
              className="w-28 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => adjustWallet(p, 'POINT', true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-extrabold"
            >
              <Coins className="w-3.5 h-3.5" /> 포인트 지급
            </button>
            <button
              onClick={() => adjustWallet(p, 'POINT', false)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold"
            >
              <Coins className="w-3.5 h-3.5" /> 포인트 회수
            </button>
            <button
              onClick={() => adjustWallet(p, 'TICKET', true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[11px] font-extrabold"
            >
              <Ticket className="w-3.5 h-3.5" /> 티켓 지급
            </button>
            <button
              onClick={() => adjustWallet(p, 'TICKET', false)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-extrabold"
            >
              <Ticket className="w-3.5 h-3.5" /> 티켓 회수
            </button>
          </div>
        </div>

        {/* 상세 탭 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(
            [
              ['points', `포인트 거래내역 (${detail.transactions.length})`],
              ['matches', `게임 기록 (${detail.matches.length})`],
              ['tournaments', `토너먼트 기록 (${detail.tournaments.length})`],
              ['audit', `관리 이력 (${detail.auditTrail.length})`],
            ] as Array<[DetailTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDetailTab(key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap ${
                detailTab === key
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 max-h-96 overflow-y-auto">
          {detailTab === 'points' &&
            detail.transactions.map((t) => (
              <div key={t.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">
                    {t.description ?? t.reason}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {t.reason} · {t.key}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-[11px] font-black ${
                      t.type === 'DEBIT' ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {t.type === 'DEBIT' ? '-' : '+'}
                    {t.amount.toLocaleString()} {t.asset === 'TICKET' ? '장' : 'P'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    잔액 {t.balanceAfter.toLocaleString()} ·{' '}
                    {new Date(t.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

          {detailTab === 'matches' &&
            detail.matches.map((m) => (
              <div key={m.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">vs {m.opponent}</p>
                  <p className="text-[10px] text-slate-500">
                    {m.mode} · {m.status} · {m.rounds}라운드 · 참가 {m.entryPoint.toLocaleString()}P
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-[11px] font-black ${
                      m.result === 'WIN'
                        ? 'text-emerald-300'
                        : m.result === 'LOSS'
                          ? 'text-rose-300'
                          : 'text-slate-400'
                    }`}
                  >
                    {m.result === 'WIN' ? '승' : m.result === 'LOSS' ? '패' : '무'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {m.completedAt ? new Date(m.completedAt).toLocaleString() : '진행 중'}
                  </p>
                </div>
              </div>
            ))}

          {detailTab === 'tournaments' &&
            detail.tournaments.map((t) => (
              <div key={t.tournamentId} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {t.tournamentStatus} · 참가상태 {t.participantStatus}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-black text-purple-300">
                    {t.finalRank ? `${t.finalRank}위` : '-'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(t.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}

          {detailTab === 'audit' &&
            detail.auditTrail.map((a) => (
              <div key={a.id} className="p-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                    {a.action}
                  </span>
                  <span className="text-[11px] font-bold text-white">{a.admin}</span>
                  <span className="text-[10px] text-slate-500">{a.ip ?? '-'}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">사유: {a.reason ?? '-'}</p>
                <p className="text-[10px] text-slate-600">
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
            ))}

          {((detailTab === 'points' && !detail.transactions.length) ||
            (detailTab === 'matches' && !detail.matches.length) ||
            (detailTab === 'tournaments' && !detail.tournaments.length) ||
            (detailTab === 'audit' && !detail.auditTrail.length)) && (
            <p className="text-[11px] text-slate-500 p-6 text-center">기록이 없습니다.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void search(1);
            }}
            placeholder="닉네임 · 아이디 · 이메일 · 사용자 ID"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UserAccountStatus | '')}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
        >
          <option value="">전체 상태</option>
          <option value="ACTIVE">정상</option>
          <option value="SUSPENDED">이용 정지</option>
          <option value="BANNED">영구 정지</option>
          <option value="DELETED">탈퇴</option>
        </select>
        <button
          onClick={() => void search(1)}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-extrabold hover:bg-cyan-400"
        >
          검색
        </button>
      </div>

      <p className="text-[10px] text-slate-500 px-1">
        {loading ? '검색 중…' : `총 ${total.toLocaleString()}명`}
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
        {rows.map((u) => (
          <button
            key={u.id}
            onClick={() => void loadDetail(u.id)}
            className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl">{u.avatar}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{u.nickname}</span>
                  <StatusBadge status={u.status} />
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {u.loginId} · Lv.{u.level} · {u.wins}승 {u.losses}패
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-black text-amber-300">
                {u.points.toLocaleString()} P
              </p>
              <p className="text-[10px] text-slate-500">티켓 {u.tickets}장</p>
            </div>
          </button>
        ))}
        {!rows.length && !loading && (
          <p className="text-[11px] text-slate-500 p-6 text-center">검색 결과가 없습니다.</p>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => void search(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400 disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-[11px] text-slate-500">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => void search(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};
