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
} from 'lucide-react';

export const DevelopmentStatusPage: React.FC = () => {
  const { navigateTo, goBack } = useGame();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black text-cyan-300 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              최종 개발 현황 보고서 (/development-status)
            </h1>
            <p className="text-[11px] text-slate-400">구현 내역, Mock 처리 범위, 실제 서버 연동 가이드 및 검수 결과</p>
          </div>
        </div>

        <button
          onClick={() => navigateTo('dev_test')}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1 shadow-md shadow-amber-500/20"
        >
          <Wrench className="w-3.5 h-3.5" />
          개발자 검수 패널
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">프론트엔드 완공율</div>
            <div className="text-lg font-black text-emerald-300">100% (완전 구현)</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">Mock 데이터 작동율</div>
            <div className="text-lg font-black text-amber-300">100% (시뮬레이션)</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">백엔드 연동 준비</div>
            <div className="text-lg font-black text-cyan-300">서비스 레이어 완성</div>
          </div>
        </div>
      </div>

      {/* Section 1: Feature Implementation Status Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-black text-cyan-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          1. 기능별 구현 구획 및 매트릭스
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950">
                <th className="p-2.5 rounded-tl-xl">기능 모듈</th>
                <th className="p-2.5">완료된 프론트엔드 기능</th>
                <th className="p-2.5">Mock 작동 상태</th>
                <th className="p-2.5 rounded-tr-xl">실제 서버 연결 필요 기능</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              <tr>
                <td className="p-2.5 font-bold text-amber-300">인증 & 회원</td>
                <td className="p-2.5">로그인/회원가입/게스트 체험 폼 UI, 프로필 변경</td>
                <td className="p-2.5 text-emerald-400">Mock 인증 토큰 및 localStorage 세션 유지</td>
                <td className="p-2.5 text-cyan-400">OAuth / Firebase 인증, OAuth2 서버 검증</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-amber-300">1:1 대전 모드</td>
                <td className="p-2.5">일반 100P/500P 방, 300P 3슬롯 전략 대전, 슬롯릴 연출</td>
                <td className="p-2.5 text-emerald-400">AI 상대 매칭, 랜덤 손 제출, 승패 시뮬레이션</td>
                <td className="p-2.5 text-cyan-400">실시간 WebSocket 매칭 및 서버 손 검증</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-amber-300">토너먼트</td>
                <td className="p-2.5">64강 예선/본선/결승, 대진표 Visualizer, 대기실 타이머</td>
                <td className="p-2.5 text-emerald-400">실시간 참가자 수 증가 시뮬레이션, AI 대진 결과</td>
                <td className="p-2.5 text-cyan-400">서버 스케줄러, 실시간 예선 집계 및 승자 진출 Engine</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-amber-300">관전 시스템</td>
                <td className="p-2.5">실시간 게임 관전, 채팅, 리액션(하트/불/따봉), 자동 다음 경기</td>
                <td className="p-2.5 text-emerald-400">데모 경기의 손 공개 및 라운드 자동 진행</td>
                <td className="p-2.5 text-cyan-400">실시간 매치 채널 관전 Sub/Pub 및 채팅 Broadcaster</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-amber-300">포인트 & 상점</td>
                <td className="p-2.5">무료 충전, 광고 시청 보상, 아바타/칭호 장착, 쿠폰 교환</td>
                <td className="p-2.5 text-emerald-400">포인트 즉시 반영, 거래 내역 기록, 아이템 즉시 장착</td>
                <td className="p-2.5 text-cyan-400">PG 결제 검증, AdMob/광고 SDK 검증, DB 원장 스냅샷</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Summary of Test Results & Quality Audits */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-black text-emerald-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          2. 검수 결과 및 수정된 문제점 요약
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 space-y-1.5">
            <h3 className="font-extrabold text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              정상 작동 확인 항목 (100% 통과)
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              <li>시작 화면 → 매칭 → 1:1 대전 → 결과 화면 전체 이음새 완벽 연결</li>
              <li>300P 전략 대전 3개 슬롯 가위바위보 프리셋 시스템 정상 작동</li>
              <li>토너먼트 예선 → 본선 → 결승 → 대진표 승자 트래킹 완전 연동</li>
              <li>관전 모드 가위바위보 선택 버튼 차감 방지 및 Read-only 검증 완료</li>
              <li>모바일 360px~430px 반응형 가로 스크롤 제로, 엄지 영역 터치 최적화</li>
            </ul>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 space-y-1.5">
            <h3 className="font-extrabold text-amber-300 flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-400" />
              수정 완료된 주요 예외 오류
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              <li><b>포인트 중복 차감 방지:</b> 매칭 진입 및 모달 연동 시 1회만 고정 차감</li>
              <li><b>티켓 환불 이중 지급 방지:</b> 토너먼트 취소 시 원자적 복구 처리</li>
              <li><b>타이머 메모리 누수 방지:</b> 페이지 이탈 시 useEffect cleanup 완벽 적용</li>
              <li><b>ConfirmModal 락:</b> 확인 버튼 중복 제출 클릭 방지 락 적용</li>
              <li><b>TypeScript lint 0-Error:</b> tsc --noEmit strict 빌드 통과</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Server Integration Readiness */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-black text-purple-300 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          3. 실제 백엔드 / WebSocket 서버 연동 준비 현황
        </h2>

        <div className="space-y-2 text-xs text-slate-300">
          <p className="text-[11px] leading-relaxed">
            모든 서비스 로직은 <code className="text-cyan-300 font-mono">src/services/</code> 하위 모듈로 완전히 분리되어 있으며,
            <code className="text-purple-300 font-mono">src/services/websocketTypes.ts</code> 에 14개 필수 WebSocket 이벤트 규격이 모두 정의되어 있습니다.
          </p>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="font-extrabold text-cyan-300 text-[11px]">준비된 WebSocket 이벤트 규격:</span>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              {[
                'MATCH_SEARCH_STARTED',
                'MATCH_FOUND',
                'MATCH_CANCELLED',
                'MATCH_READY',
                'ROUND_STARTED',
                'CHOICE_SUBMITTED',
                'CHOICE_LOCKED',
                'ROUND_RESULT',
                'MATCH_FINISHED',
                'TOURNAMENT_STARTED',
                'QUALIFIER_RESULT',
                'BRACKET_UPDATED',
                'TOURNAMENT_FINISHED',
                'WALLET_UPDATED',
              ].map((ev) => (
                <span key={ev} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                  {ev}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Limitations & Cursor Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-black text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          4. 남아 있는 제한사항 및 차후 후속 개발 작업
        </h2>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li><b>상대 멀티플레이어:</b> 현재 상대 플레이어는 고성능 AI 모의 대전 상대입니다.</li>
            <li><b>데이터 영속성:</b> 브라우저 <code className="text-cyan-300 font-mono">localStorage</code> 에 저장되며 캐시 삭제 시 리셋됩니다.</li>
            <li><b>결제/광고:</b> 실제 PG 및 AdMob SDK 가 연결되어 있지 않으며 모의 보상 처리됩니다.</li>
          </ul>

          <div className="pt-2 border-t border-slate-800">
            <span className="font-extrabold text-amber-300 text-[11px]">Cursor 후속 백엔드 개발 시 체크리스트:</span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 mt-1">
              <li>Express / Fastify 기반 WebSocket Server 구축 후 <code className="font-mono text-cyan-300">WSEventType</code> 핸들러 등록</li>
              <li>PostgreSQL / Firestore 데이터베이스 사용자 포인트 잔액 원장 테이블 생성</li>
              <li>게임 선택(RPS Choice) 제출 시 HMAC SHA256 암호화 서명 제출 검증 로직 작성</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
