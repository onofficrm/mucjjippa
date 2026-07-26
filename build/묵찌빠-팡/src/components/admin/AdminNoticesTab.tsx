import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  BellRing,
  Megaphone,
  Pin,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  adminService,
  type AdminNotice,
  type NoticeAction,
  type NoticeDraft,
} from '../../services/adminService';
import type { ReasonPromptRequest } from './ReasonPrompt';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-700/30 text-slate-300 border-slate-600',
  SCHEDULED: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  ENDED: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  ARCHIVED: 'bg-slate-800 text-slate-500 border-slate-700',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '작성 중',
  SCHEDULED: '예약',
  PUBLISHED: '노출 중',
  ENDED: '종료',
  ARCHIVED: '보관',
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyDraft(): NoticeDraft & { startsAt: string; endsAt: string } {
  return {
    title: '',
    content: '',
    level: 'NORMAL',
    priority: 0,
    pinned: false,
    pushEnabled: false,
    startsAt: toLocalInput(new Date().toISOString()),
    endsAt: toLocalInput(new Date(Date.now() + 7 * 86_400_000).toISOString()),
  };
}

const ACTION_META: Record<NoticeAction, { label: string; icon: React.ReactNode; critical: boolean }> =
  {
    PUBLISH: { label: '노출 시작', icon: <Send className="w-3.5 h-3.5" />, critical: true },
    SCHEDULE: { label: '예약', icon: <BellRing className="w-3.5 h-3.5" />, critical: false },
    END: { label: '노출 종료', icon: <XCircle className="w-3.5 h-3.5" />, critical: false },
    ARCHIVE: { label: '보관', icon: <Archive className="w-3.5 h-3.5" />, critical: false },
  };

export const AdminNoticesTab: React.FC<{
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  requestReason: (request: ReasonPromptRequest) => void;
}> = ({ onError, onSuccess, requestReason }) => {
  const [rows, setRows] = useState<AdminNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDraft);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.notices({ limit: 50 });
      setRows(data.items);
    } catch (error) {
      onError(error instanceof Error ? error.message : '공지 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (notice: AdminNotice) => {
    setEditingId(notice.id);
    setShowForm(true);
    setForm({
      title: notice.title,
      content: notice.content,
      level: notice.level,
      priority: notice.priority,
      pinned: notice.pinned,
      pushEnabled: notice.pushEnabled,
      startsAt: toLocalInput(notice.startsAt),
      endsAt: notice.endsAt ? toLocalInput(notice.endsAt) : '',
    });
  };

  const submit = () => {
    if (form.title.trim().length < 2 || form.content.trim().length < 2) {
      onError('제목과 내용을 입력해 주세요.');
      return;
    }
    const payload: NoticeDraft = {
      title: form.title.trim(),
      content: form.content.trim(),
      level: form.level,
      priority: form.priority,
      pinned: form.pinned,
      pushEnabled: form.pushEnabled,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };
    requestReason({
      title: editingId ? `공지 수정 — ${payload.title}` : `공지 작성 — ${payload.title}`,
      description: '작성·수정 내역은 감사 로그에 남습니다. 노출은 별도로 시작해야 합니다.',
      confirmLabel: editingId ? '수정' : '작성',
      onSubmit: async (reason) => {
        try {
          if (editingId) await adminService.updateNotice(editingId, payload, reason);
          else await adminService.createNotice(payload, reason);
          onSuccess(editingId ? '공지를 수정했습니다.' : '공지를 작성했습니다.');
          setShowForm(false);
          setEditingId(null);
          setForm(emptyDraft());
          await load();
        } catch (error) {
          onError(error instanceof Error ? error.message : '저장에 실패했습니다.');
        }
      },
    });
  };

  const runAction = (notice: AdminNotice, action: NoticeAction) => {
    const meta = ACTION_META[action];
    requestReason({
      title: `${notice.title} — ${meta.label}`,
      description:
        action === 'PUBLISH'
          ? notice.pushEnabled
            ? '즉시 노출되며, 푸시 발송 준비(전체 사용자 알림 생성)가 함께 진행됩니다.'
            : '노출 시작 시각 이후 사용자에게 표시됩니다.'
          : undefined,
      critical: meta.critical,
      confirmLabel: meta.label,
      onSubmit: async (reason) => {
        try {
          const result = await adminService.runNoticeAction({
            noticeId: notice.id,
            action,
            reason,
          });
          onSuccess(
            result.notifiedUsers > 0
              ? `${meta.label} 완료 · 알림 ${result.notifiedUsers.toLocaleString()}건 생성`
              : `${meta.label} 완료`
          );
          await load();
        } catch (error) {
          onError(error instanceof Error ? error.message : `${meta.label}에 실패했습니다.`);
        }
      },
    });
  };

  const remove = (notice: AdminNotice) => {
    requestReason({
      title: `공지 삭제 — ${notice.title}`,
      description: '되돌릴 수 없습니다. 노출 이력만 감사 로그에 남습니다.',
      critical: false,
      confirmLabel: '삭제',
      onSubmit: async (reason) => {
        try {
          await adminService.deleteNotice(notice.id, reason);
          onSuccess('공지를 삭제했습니다.');
          await load();
        } catch (error) {
          onError(error instanceof Error ? error.message : '삭제에 실패했습니다.');
        }
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500">
          {loading ? '불러오는 중…' : `${rows.length}건`}
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
            onClick={() => {
              setEditingId(null);
              setForm(emptyDraft());
              setShowForm((v) => !v);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-[11px] font-extrabold hover:bg-cyan-400"
          >
            <Plus className="w-3.5 h-3.5" />
            공지 작성
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-black text-cyan-300">
            {editingId ? '공지 수정' : '새 공지'}
          </h4>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="공지 제목"
            maxLength={140}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-500"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="공지 내용"
            rows={4}
            maxLength={5000}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">구분</span>
              <select
                value={form.level}
                onChange={(e) =>
                  setForm((f) => ({ ...f, level: e.target.value as 'NORMAL' | 'URGENT' }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              >
                <option value="NORMAL">일반 공지</option>
                <option value="URGENT">긴급 공지</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">우선순위 (0~100)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">노출 시작</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-slate-400">노출 종료 (선택)</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
              />
              상단 고정
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={form.pushEnabled}
                onChange={(e) => setForm((f) => ({ ...f, pushEnabled: e.target.checked }))}
              />
              푸시 발송 준비 (노출 시작 시 전체 알림 생성)
            </label>
          </div>
          <button
            onClick={submit}
            className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-extrabold hover:bg-cyan-400"
          >
            {editingId ? '수정 (사유 입력)' : '작성 (사유 입력)'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((n) => (
          <div key={n.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {n.pinned && <Pin className="w-3 h-3 text-amber-400" />}
                  {n.level === 'URGENT' && (
                    <span className="px-1.5 py-0.5 rounded border border-rose-500/40 bg-rose-500/15 text-rose-300 text-[10px] font-black">
                      긴급
                    </span>
                  )}
                  <span className="text-xs font-bold text-white truncate">{n.title}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                      STATUS_STYLE[n.status] ?? STATUS_STYLE.DRAFT
                    }`}
                  >
                    {STATUS_LABEL[n.status] ?? n.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{n.content}</p>
                <p className="text-[10px] text-slate-600 mt-1">
                  우선순위 {n.priority} · {new Date(n.startsAt).toLocaleString()} ~{' '}
                  {n.endsAt ? new Date(n.endsAt).toLocaleString() : '무기한'}
                  {n.pushEnabled && (
                    <span className="text-cyan-400">
                      {' '}
                      · 푸시 {n.pushQueuedAt ? '발송 준비됨' : '대기'}
                    </span>
                  )}
                </p>
              </div>
              <Megaphone className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ACTION_META) as NoticeAction[]).map((action) => (
                <button
                  key={action}
                  onClick={() => runAction(n, action)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[10px] font-extrabold text-slate-300 hover:text-white hover:border-cyan-500/50"
                >
                  {ACTION_META[action].icon}
                  {ACTION_META[action].label}
                </button>
              ))}
              <button
                onClick={() => startEdit(n)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[10px] font-extrabold text-slate-300 hover:text-white"
              >
                수정
              </button>
              <button
                onClick={() => remove(n)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] font-extrabold text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </button>
            </div>
          </div>
        ))}
        {!rows.length && !loading && (
          <p className="text-[11px] text-slate-500 p-6 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            공지가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
};
