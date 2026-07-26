import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, ScrollText, Search } from 'lucide-react';
import { adminService, type AuditLogRow } from '../../services/adminService';

const LIMIT = 25;

function formatJson(value: unknown) {
  if (value === null || value === undefined) return '-';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export const AdminAuditTab: React.FC<{ onError: (message: string) => void }> = ({ onError }) => {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      try {
        const data = await adminService.auditLogs({
          page: nextPage,
          limit: LIMIT,
          action: actionFilter.trim() || undefined,
          targetId: targetFilter.trim() || undefined,
        });
        setRows(data.items);
        setTotal(data.total);
        setPage(data.page);
      } catch (error) {
        onError(error instanceof Error ? error.message : '감사 로그를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, onError, targetFilter]
  );

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
        모든 관리자 작업은 <span className="text-white font-bold">관리자 · 시간 · IP · 작업 종류 ·
        대상 · 변경 전 · 변경 후 · 사유</span>가 기록됩니다.
      </p>

      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[140px] relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load(1);
            }}
            placeholder="작업 종류 (예: USER_SUSPEND)"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-500"
          />
        </div>
        <input
          value={targetFilter}
          onChange={(e) => setTargetFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load(1);
          }}
          placeholder="대상 ID"
          className="flex-1 min-w-[120px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-500"
        />
        <button
          onClick={() => void load(1)}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-extrabold hover:bg-cyan-400"
        >
          검색
        </button>
        <button onClick={() => void load(page)} className="text-slate-400 hover:text-white px-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-[10px] text-slate-500 px-1">
        {loading ? '불러오는 중…' : `총 ${total.toLocaleString()}건`}
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
        {rows.map((row) => {
          const open = expanded === row.id;
          return (
            <div key={row.id}>
              <button
                onClick={() => setExpanded(open ? null : row.id)}
                className="w-full p-3 flex items-start justify-between gap-2 text-left hover:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {open ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className="text-[10px] font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                      {row.action}
                    </span>
                    <span className="text-[11px] font-bold text-white">
                      {row.admin?.nickname ?? '시스템'}
                    </span>
                    {row.admin?.role && (
                      <span className="text-[10px] text-slate-500">{row.admin.role}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    {row.targetType} · {row.targetId}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">사유: {row.reason ?? '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600">IP {row.ip ?? '-'}</p>
                </div>
              </button>

              {open && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-slate-950 rounded-xl p-2.5">
                      <p className="text-[10px] font-bold text-rose-300 mb-1">변경 전</p>
                      <pre className="text-[10px] text-slate-400 whitespace-pre-wrap break-all">
                        {formatJson(row.before)}
                      </pre>
                    </div>
                    <div className="bg-slate-950 rounded-xl p-2.5">
                      <p className="text-[10px] font-bold text-emerald-300 mb-1">변경 후</p>
                      <pre className="text-[10px] text-slate-400 whitespace-pre-wrap break-all">
                        {formatJson(row.after)}
                      </pre>
                    </div>
                  </div>
                  {row.userAgent && (
                    <p className="text-[10px] text-slate-600 break-all">UA: {row.userAgent}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!rows.length && !loading && (
          <p className="text-[11px] text-slate-500 p-6 text-center flex flex-col items-center gap-2">
            <ScrollText className="w-5 h-5 text-slate-700" />
            감사 로그가 없습니다.
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => void load(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400 disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-[11px] text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => void load(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};
