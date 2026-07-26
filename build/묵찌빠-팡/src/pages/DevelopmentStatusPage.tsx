import React from 'react';
import { useGame } from '../context/GameContext';
import {
  FileText,
  CheckCircle2,
  Clock,
  Server,
  AlertTriangle,
  ArrowLeft,
  Wrench,
  ShieldCheck,
  Cpu,
  Layers,
  Zap,
  FlaskConical,
  Rocket,
} from 'lucide-react';

type StatusKind =
  | 'done'
  | 'live'
  | 'mock'
  | 'test'
  | 'ops'
  | 'later';

const STATUS_META: Record<
  StatusKind,
  { label: string; className: string }
> = {
  done: { label: '완료', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  live: { label: '실서버 연결', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' },
  mock: { label: 'Mock 유지', className: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  test: { label: '테스트 필요', className: 'bg-violet-500/15 text-violet-300 border-violet-500/40' },
  ops: { label: '운영 전 필수', className: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
  later: { label: '추후 개발', className: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
};

function Badge({ kind }: { kind: StatusKind }) {
  const meta = STATUS_META[kind];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

const FEATURE_ROWS: Array<{
  module: string;
  items: string;
  status: StatusKind[];
  note: string;
}> = [
  {
    module: '인증·회원',
    items: '회원가입 / 로그인 / 게스트 / refresh / 프로필·설정',
    status: ['done', 'live'],
    note: 'OAuth·소셜 로그인은 추후',
  },
  {
    module: '1:1 대전',
    items: '10P·100P 매칭, 서버 판정, 포인트 원장 반영',
    status: ['done', 'live'],
    note: 'Socket.IO MATCH_*',
  },
  {
    module: '300P 전략전',
    items: '3선택 제출·서버 판정·연출',
    status: ['done', 'live'],
    note: 'STRATEGY_* 이벤트',
  },
  {
    module: '토너먼트',
    items: '참가·취소·예선·본선·대진·보상',
    status: ['done', 'live'],
    note: '스케줄러·대규모 동시성은 부하 테스트 권장',
  },
  {
    module: '관전',
    items: '라이브 목록·구독·리액션·마스킹 중계',
    status: ['done', 'live', 'test'],
    note: '고부하 채널 분리 추후',
  },
  {
    module: '포인트·상점',
    items: '지갑 조회·원장·상점 구매(멱등)',
    status: ['done', 'live'],
    note: 'PG 결제는 Mock/미연동',
  },
  {
    module: '광고·무료충전',
    items: '광고 시청 보상 UI',
    status: ['mock', 'later'],
    note: 'AdMob/SDK 검증 없음',
  },
  {
    module: '랭킹·미션',
    items: '주간/승률/연승/토너먼트 랭킹, 미션 진행',
    status: ['done', 'live'],
    note: '',
  },
  {
    module: '관리자센터',
    items: '유저·토너먼트·공지·모니터·보안·2FA 등록',
    status: ['done', 'live', 'ops'],
    note: '2FA 로그인 강제는 추후',
  },
  {
    module: '배포·인프라',
    items: 'Docker Compose, migrate, seed 분리, health, 로그',
    status: ['done', 'ops'],
    note: 'HTTPS·백업 크론은 운영 환경에서 설정',
  },
];

const CHECKLIST: Array<{ label: string; ok: boolean; detail: string }> = [
  { label: '개발 서버 실행', ok: true, detail: 'Vite :3000 · Fastify :4000' },
  { label: 'production build', ok: true, detail: '프론트 vite build · 서버 tsc' },
  { label: 'migration', ok: true, detail: 'prisma migrate deploy' },
  { label: 'seed 분리', ok: true, detail: 'SEED_MODE=catalog|demo' },
  { label: '로그인', ok: true, detail: '실 API + Playwright E2E' },
  { label: '실제 1:1 대전', ok: true, detail: 'Socket 매칭·원장 보상' },
  { label: '토너먼트 참가', ok: true, detail: '참가/취소/환불 통합·동시성 테스트' },
  { label: '포인트 원장', ok: true, detail: 'transactionKey 멱등' },
  { label: '관리자센터', ok: true, detail: 'ADMIN 역할 API' },
  { label: '모바일 반응형', ok: true, detail: '기존 레이아웃 유지' },
  { label: '자동 테스트', ok: true, detail: 'Vitest 42 · Playwright 3' },
];

export const DevelopmentStatusPage: React.FC = () => {
  const { navigateTo, goBack } = useGame();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black text-cyan-300 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              개발 현황 (/development-status) — 14단계
            </h1>
            <p className="text-[11px] text-slate-400">
              실서버 연동·테스트·배포 준비 반영 (2026-07-26)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigateTo('dev_test')}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1 shadow-md shadow-amber-500/20"
        >
          <Wrench className="w-3.5 h-3.5" />
          개발자 검수 패널
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">핵심 기능</div>
            <div className="text-lg font-black text-emerald-300">실서버 연동 완료</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">Mock 잔여</div>
            <div className="text-lg font-black text-amber-300">광고·PG 등</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">배포</div>
            <div className="text-lg font-black text-cyan-300">Docker Compose 준비</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-black text-cyan-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          1. 기능 매트릭스
        </h2>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {(Object.keys(STATUS_META) as StatusKind[]).map((k) => (
            <Badge key={k} kind={k} />
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950">
                <th className="p-2.5 rounded-tl-xl">모듈</th>
                <th className="p-2.5">범위</th>
                <th className="p-2.5">상태</th>
                <th className="p-2.5 rounded-tr-xl">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {FEATURE_ROWS.map((row) => (
                <tr key={row.module}>
                  <td className="p-2.5 font-bold text-amber-300 whitespace-nowrap">{row.module}</td>
                  <td className="p-2.5">{row.items}</td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {row.status.map((s) => (
                        <Badge key={s} kind={s} />
                      ))}
                    </div>
                  </td>
                  <td className="p-2.5 text-slate-400">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-black text-emerald-400 flex items-center gap-2">
          <FlaskConical className="w-4 h-4" />
          2. 최종 검수 체크리스트
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {CHECKLIST.map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5"
            >
              {item.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-slate-100">{item.label}</div>
                <div className="text-[11px] text-slate-400">{item.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-black text-purple-300 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          3. 테스트·품질
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 space-y-1.5">
            <h3 className="font-extrabold text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              자동 테스트 (13단계)
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              <li>Vitest 단위·통합·동시성·API E2E — 42 passed</li>
              <li>Playwright UI — 로그인/회원가입/시드 계정</li>
              <li>중복 지급·참가·구매·선택 제출 방지</li>
            </ul>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30 space-y-1.5">
            <h3 className="font-extrabold text-cyan-300 flex items-center gap-1">
              <Zap className="w-4 h-4" />
              수정·개선된 이슈
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              <li>401 부트스트랩이 회원가입 화면을 덮던 레이스</li>
              <li>CORS 127.0.0.1 / AppleDouble `._*` 테스트 간섭</li>
              <li>원장 transactionKey · 매치 finalize 멱등</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-black text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          4. Mock · 제한 · 운영 전 필수
        </h2>
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
          <p className="font-extrabold text-amber-300 text-[11px]">아직 Mock / 미연동</p>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li>광고 SDK·보상 검증 (UI 시뮬레이션)</li>
            <li>실 PG 결제</li>
            <li>소셜 OAuth</li>
            <li>관리자 로그인 2FA 강제</li>
          </ul>
          <p className="font-extrabold text-rose-300 text-[11px] pt-2 border-t border-slate-800">
            운영 전 필수
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li>JWT·DB 비밀번호 교체, CORS·HTTPS</li>
            <li>데모 시드 계정 정리, `SEED_MODE=catalog`</li>
            <li>백업 크론·복구 드릴, Sentry DSN</li>
            <li>상세: <code className="text-cyan-300">DEPLOYMENT.md</code></li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
        <h2 className="text-xs font-black text-slate-200 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-cyan-400" />
          5. 문서·다음 우선순위
        </h2>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          README · ARCHITECTURE · DATABASE · API · SOCKET_EVENTS · SECURITY · DEPLOYMENT ·
          TESTING · ADMIN_GUIDE · OpenAPI <code className="text-cyan-300">/api/docs</code>
        </p>
        <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1">
          <li>PG·광고 SDK 실연동</li>
          <li>관리자 2FA 로그인 강제</li>
          <li>Socket 수평 확장 (Redis adapter)</li>
          <li>관전 채널 고부하 분리</li>
        </ol>
      </div>
    </div>
  );
};
