import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

export interface ReasonPromptRequest {
  title: string;
  description?: string;
  /** 중요 작업 — 재확인 문구 입력 요구 */
  critical?: boolean;
  confirmLabel?: string;
  onSubmit: (reason: string) => Promise<void> | void;
}

const MIN_REASON = 4;

/**
 * 관리자 작업 사유 입력 모달.
 * 모든 변경 작업은 이 모달을 거쳐 사유를 남긴다(서버도 사유 없으면 거부).
 */
export const ReasonPrompt: React.FC<{
  request: ReasonPromptRequest | null;
  confirmPhrase: string;
  onClose: () => void;
}> = ({ request, confirmPhrase, onClose }) => {
  const [reason, setReason] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReason('');
    setPhrase('');
    setBusy(false);
  }, [request]);

  if (!request) return null;

  const reasonOk = reason.trim().length >= MIN_REASON;
  const phraseOk = !request.critical || phrase.trim() === confirmPhrase;
  const canSubmit = reasonOk && phraseOk && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await request.onSubmit(reason.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {request.critical ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="text-sm font-black text-white">{request.title}</h3>
              {request.description && (
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {request.description}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300">
            변경 사유 <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={255}
            placeholder={`감사 로그에 기록됩니다. ${MIN_REASON}자 이상 입력해 주세요.`}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-cyan-500 outline-none resize-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{reasonOk ? '입력 완료' : `${MIN_REASON}자 이상`}</span>
            <span>{reason.length}/255</span>
          </div>
        </div>

        {request.critical && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-rose-300">
              중요 작업 재확인 — <code className="text-white">{confirmPhrase}</code> 입력
            </label>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={confirmPhrase}
              className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-rose-400 outline-none"
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-slate-800 text-slate-300 hover:text-white"
          >
            취소
          </button>
          <button
            onClick={() => void submit()}
            disabled={!canSubmit}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              canSubmit
                ? request.critical
                  ? 'bg-rose-500 text-white hover:bg-rose-400'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {busy ? '처리 중…' : (request.confirmLabel ?? '실행')}
          </button>
        </div>
      </div>
    </div>
  );
};
