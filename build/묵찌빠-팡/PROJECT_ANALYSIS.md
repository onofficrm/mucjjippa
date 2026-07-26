# 묵찌빠 팡 — PROJECT_ANALYSIS

| 항목 | 내용 |
|------|------|
| 대상 | `build/묵찌빠-팡` |
| 갱신 | **2026-07-26 (14단계 배포 준비)** |
| 목적 | 기능·연동·Mock·운영 현황 기준선 |
| 검증 | 서버 Vitest 42 · Playwright 3 · Docker Compose 구성 · OpenAPI `/api/docs` |

> 1단계 당시의 상세 UI 인벤토리는 아래에 보존합니다.  
> **현재 상태 요약은 [개발 현황 페이지](./src/pages/DevelopmentStatusPage.tsx) 및 [README.md](./README.md)를 우선하세요.**

## 14단계 요약 (현재)

| 구분 | 상태 |
|------|------|
| 인증·지갑·1:1·전략·토너먼트·랭킹·상점·관리자 | **실서버 연결 완료** |
| 광고 보상·PG 결제·소셜 OAuth | **Mock / 추후** |
| 테스트 | Vitest + Playwright ([TESTING.md](./TESTING.md)) |
| 배포 | Docker Compose web/server/postgres/redis ([DEPLOYMENT.md](./DEPLOYMENT.md)) |

---

## 1단계 기준선 (보존)

| 항목 | 내용 |
|------|------|
| 대상 | `build/묵찌빠-팡` (Google AI Studio → Cursor) |
| 작성일 | 2026-07-26 |
| 목적 | 백엔드 연동 전 기준선 확정 (디자인·기존 기능 유지) |
| 검증 | `npm run lint` ✅ · `npm run build` ✅ · `npm run dev` ✅ (http://localhost:3000) |

---

## 1. 사용 기술

| 구분 | 기술 | 비고 |
|------|------|------|
| UI | React 19 + TypeScript | `strict` 미사용 (`tsconfig` 느슨함) |
| 빌드 | Vite 6 | `vite build` / port **3000** |
| 라우팅 | **없음** (react-router 미사용) | `GameContext.currentPage` + `PageType` switch |
| 상태관리 | React Context (`GameContext`) | 전역 단일 Provider |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite`) | `src/index.css` |
| 애니메이션 | motion (`motion/react` 가능, 페이지별 CSS/타이머 연출 다수) | |
| 아이콘 | lucide-react | |
| 오디오 | `src/utils/audio.ts` Web Audio 합성 | |
| 미사용 의존성 | `@google/genai`, `express`, `dotenv` | `src/`에서 import 없음 |

실행:

```bash
cd build/묵찌빠-팡
npm install
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm run build    # dist/
```

배포 연동(그누보드): `plugin/onoff-builder-bridge/imports/mucjjippa-pang/` + `_site.config.php`의 `home_builder_bridge_id = mucjjippa-pang`.

---

## 2. 프로젝트 구조

```
build/묵찌빠-팡/
├── index.html
├── package.json
├── vite.config.ts          # alias `@` → 프로젝트 루트
├── tsconfig.json
├── .env.example
├── src/
│   ├── main.tsx
│   ├── App.tsx             # PageRenderer + MainLayout
│   ├── index.css
│   ├── types.ts            # PageType, UserProfile, Match, Tournament…
│   ├── context/
│   │   └── GameContext.tsx # 네비·유저·매칭·판정·포인트·토너먼트 (핵심 ~988 LOC)
│   ├── data/
│   │   └── mockData.ts     # 유저/방/토너먼트/랭킹/상점/대진표 (~1318 LOC)
│   ├── pages/              # 24개 화면
│   ├── components/         # 헤더·네비·모달·카드·토너먼트 UI
│   ├── services/           # Mock 서비스 인터페이스 (현재 UI에서 미호출)
│   └── utils/audio.ts
└── dist/                   # 빌드 산출물 (gitignore)
```

소스 규모: 약 **~12,800 LOC** (TS/TSX).

---

## 3. 페이지 목록

라우팅은 URL path가 아니라 `navigateTo(PageType)`입니다.  
`/#/dev-test` / `#/development-status` 해시만 초기 페이지 진입에 사용됩니다.

| 요구 화면 | 현재 PageType / 파일 | 상태 |
|-----------|----------------------|------|
| 시작 | 없음 (홈으로 바로 진입) | **별도 Splash 없음** |
| 로그인 | 없음 | **페이지 없음** (`authService.login`만 존재, UI 미연결) |
| 회원가입 | 없음 | **페이지 없음** |
| 메인 로비 | `home` → `HomePage` | UI Mock 완료 |
| 대전방 선택 | `versus_rooms` → `VersusRoomsPage` | 10/100/300/VIP 방 |
| 매칭 대기 | `matchmaking_wait` → `MatchmakingWaitPage` | 3초 타이머 Mock |
| 일반 1:1 | `versus_game` → `VersusGamePage` | 클라이언트 판정 |
| 300P 전략 | 동일 `versus_game` (`room_300p` / stake 300) | 3슬롯 프리셋 UI |
| 게임 결과 | `game_result` → `GameResultPage` | Mock |
| 토너먼트 목록 | `tournament_lobby` → `TournamentLobbyPage` | Mock |
| 토너먼트 상세 | `TournamentDetailModal` | 모달 (별도 페이지 아님) |
| 대기실 | `tournament_wait` → `TournamentWaitPage` | Mock |
| 예선·본선·결승 | `tournament_game` → `TournamentGamePage` | 한 페이지 내 단계 UI |
| 대진표 | `tournament_bracket` → `TournamentBracketPage` | Mock 데이터 |
| 토너먼트 결과 | `TournamentGamePage` 내 우승/탈락 카드 | 별도 PageType 없음 |
| 관전 | `spectate` → `SpectatePage` | Socket `WATCH_*` + 데모 폴백 |
| 랭킹 | `ranking` → `RankingPage` | `/api/rankings/*` |
| 통계 | `game_stats` → `GameStatsPage` | `/api/users/me/stats` |
| 칭호 | `title` → `TitlePage` | 서버 자동 해제 + 장착 |
| 내 정보 | `my_profile` → `MyProfilePage` | 서버 프로필 |
| 포인트 내역 | `point_history` → `PointHistoryPage` | `/api/wallet/transactions` |
| 아바타 | `avatar` → `AvatarPage` | 서버 상점 |
| 포인트 획득 | `point_topup` / `ad_detail` | 미션 서버 + 광고 Mock |
| 아이템 상점 | `item_shop` (+ `point_exchange`) | 서버 상점 |
| 설정 | `settings` → `SettingsPage` | 서버 설정 |
| 관리자센터 | `admin_center` → `AdminCenterPage` | `/api/admin/*` (ADMIN/SUPER_ADMIN) |
| 개발 현황 | `development_status` | 문서형 UI |
| 개발 테스트 | `dev_test` | 시나리오 강제 전환 |

**관리자센터:** `/admin` · `/admin-demo` → `AdminCenterPage`. JWT+DB 이중 권한 검사. 일반 사용자 차단. 모든 변경은 사유·재확인·감사 로그 필수.

---

## 4. 주요 컴포넌트

| 영역 | 파일 | 역할 |
|------|------|------|
| 셸 | `AppHeader`, `DesktopSidebar`, `MobileBottomNavigation` | 공통 레이아웃·네비 |
| 로비 | `UserSummaryCard`, `GameModeCard`, `VersusCardsSection`, `MainTournamentCard`, `LiveGameFeed`, `NoticeTicker` | 홈 구성 |
| 모달 | `RewardModal`, `ConfirmModal`, `InsufficientPointsModal`, `ShareResultModal`, `TournamentDetailModal` | 전역/로컬 모달 |
| 피드백 | `LoadingOverlay`, `ToastContainer`, `AudioCaptionToast`, `TutorialOverlay` | UX |
| 토너먼트 | `TournamentCountdown` | 카운트다운 |
| 뱃지 | `PointBadge`, `TicketBadge`, `RankingCard`, `AvatarCard` | 표시 |

---

## 5. 상태관리 방식

- **단일 `GameProvider`**: 페이지 전환, 유저 프로필, 매칭/대전, 토너먼트 참가, 포인트 로그, 모달, 사운드/접근성 설정.
- **서비스 레이어 미연결**: `src/services/*`는 Mock 클래스로 존재하나 **pages/components/GameContext에서 import·호출하지 않음**.
- **실동작은 Context 내부**: 입장료 차감, RPS 판정, 승리 보상(`stake * 1.9`), 티켓 차감/환불이 모두 클라이언트에서 처리.

---

## 6. 현재 Mock 기능

| 기능 | 구현 위치 | 방식 |
|------|-----------|------|
| 유저·랭킹·상점·대진표 데이터 | `mockData.ts` | 하드코딩 |
| 매칭 | `GameContext.startMatchmaking` | 3초 후 랜덤 상대 |
| 1:1 / 300P 판정 | `GameContext.playRPSRound` | `Math.random` 상대 손 + 클라 승패 |
| 포인트/티켓 | Context + localStorage | 클라 잔액 변경 |
| 포인트 원장 | `pointLogs` → `rps_point_history` | 브라우저만 |
| 토너먼트 참가 | `registerTournament` | 티켓 클라 차감 |
| 토너먼트 예선~결승 | `TournamentGamePage` | UI 시뮬레이션 |
| 관전 | `SpectatePage` + `watchService` | 실경기 스트림 / 데모 |
| 광고/충전/상점 | Context `claimAdReward` / `topUpPoints` / `buyShopItem` | 즉시 반영 |
| 인증 | `authService` (미사용) | 닉네임만 변경 가능 스텁 |

localStorage 키:

- `rps_user_profile`
- `rps_point_history`
- `rps_registered_tournaments`
- `rps_tutorial_seen`
- `rps_settings`

---

## 7. 실제 서버 연결이 필요한 기능

1. **인증** (로그인/회원가입/세션/JWT) — UI 페이지도 아직 없음  
2. **매칭 큐 + 실시간 1:1** (WebSocket)  
3. **서버 authoritative RPS 판정·락** (클라 손만 제출)  
4. **포인트/티켓 원장·잔액** (중복 요청 방지, idempotency key)  
5. **토너먼트 스케줄·예선 집계·대진표·진출**  
6. **관전 채널·리액션** — Stage 9 완료 (실경기 스트림, 패 비공개, 데모 폴백, 이모티콘 리액션)  
7. **상점·광고·PG 검증**  
8. **랭킹 집계**

준비된 규격만: `src/services/websocketTypes.ts` (`WSEventType` 14종).

---

## 8. 위험 요소

| 심각도 | 항목 | 설명 |
|--------|------|------|
| P0 | 클라 판정·보상 | `playRPSRound` / `stake * 1.9`가 클라이언트에서 실행 — 치팅 가능 |
| P0 | 클라 잔액 | 포인트/티켓을 localStorage에 저장·변조 가능 |
| P1 | 서비스 레이어 사각지대 | services 존재하나 Context가 직접 로직 보유 → 교체 시 이중 구현 위험 |
| P1 | 인증 UI 부재 | DevelopmentStatus는 “로그인 UI 완료”로 기술하나 실제 Login/Signup 페이지 없음 |
| P2 | 미사용 npm 패키지 | `@google/genai`, `express`, `dotenv` 번들/의존성 노이즈 |
| P2 | 단일 청크 ~522KB | code-split 없음 |
| P3 | tsconfig 느슨 | `strict` 미사용으로 잠재 타입 버그 은닉 |

---

## 9. 중복 코드

- RPS 승패 판정: `GameContext.playRPSRound` vs `matchService.evaluateRPS` (서비스 미사용)
- 지갑 로직: Context `addTransaction` / `topUpPoints` vs `walletService` (미연결)
- 토너먼트 등록: Context vs `tournamentService.registerTournament`
- DevelopmentStatus의 “서비스 레이어 완성” 서술과 실제 import 그래프 불일치

---

## 10. 우선 수정 항목 (다음 단계용 — 이번 단계 미구현)

1. Context 게임/지갑 로직을 **서비스 인터페이스 경유**로 옮기기 (UI 유지)  
2. `Api*` 구현체 + `VITE_API_BASE_URL` / `VITE_WS_URL` 연결 골격  
3. 서버 판정·원장 도입 전 **idempotency / requestId** 클라이언트 계약 정의  
4. 로그인·회원가입 페이지가 기획에 필수면 **기존 디자인 톤으로 추가** (현재 없음)  
5. 미사용 의존성 정리 (빌드 영향 확인 후)

---

## 11. 권장 백엔드 구조

```
api/ (REST)
  POST /auth/login|register|refresh
  GET  /me
  GET  /rooms
  POST /matches/queue  { roomId, clientRequestId }
  POST /matches/:id/cancel
  GET  /tournaments
  POST /tournaments/:id/register|cancel
  GET  /wallet /wallet/ledger
  POST /shop/purchase  { itemId, clientRequestId }
  GET  /rankings

ws/
  auth handshake (JWT)
  match.*, round.*, tournament.*, wallet.updated
```

원칙: **게임 결과·포인트는 서버만 결정**. 클라는 choice 제출 + UI 미러링.

---

## 12. 권장 DB 구조 (요약)

| 테이블 | 역할 |
|--------|------|
| `users` | 계정·닉네임·아바타·칭호 |
| `wallets` | points/tickets 잔액 (서버 단일 소스) |
| `ledger_entries` | 모든 포인트/티켓 변동 (request_id UNIQUE) |
| `game_rooms` | 방 메타 (entry_fee, reward_rules) |
| `matches` / `match_rounds` | 매치·라운드·서버 판정 |
| `tournaments` / `tournament_entries` / `brackets` | 토너먼트 |
| `shop_items` / `inventory` | 상점·보유 아이템 |
| `sessions` / `refresh_tokens` | 인증 |

---

## 13. 권장 WebSocket 구조

기존 `WSEventType`을 유지·확장:

- Match: `MATCH_SEARCH_STARTED` → `MATCH_FOUND` → `ROUND_STARTED` → `CHOICE_LOCKED` → `ROUND_RESULT` → `MATCH_FINISHED`
- Tournament: `TOURNAMENT_STARTED` → `QUALIFIER_RESULT` → `BRACKET_UPDATED` → `TOURNAMENT_FINISHED`
- Wallet: `WALLET_UPDATED` (서버 잔액 푸시)

클라 제출: `{ matchId, round, choice, clientRequestId }`만. 승패·포인트 payload는 **서버 → 클라**.

---

## 14. 실행·오류 점검 결과 (1단계)

| 검사 | 결과 |
|------|------|
| `npm run lint` (`tsc --noEmit`) | 오류 0 |
| `npm run build` | 성공 (chunk size warning만) |
| `npm run dev` | 기동 성공, `/` HTTP 200 |
| 깨진 import / 누락 패키지 | 없음 |
| 브라우저 콘솔 | 자동화 E2E 미실행 — 개발 서버 HTML 로드 정상. 수동 확인 권장 |
| TypeScript | 통과 (strict 아님) |

---

## 15. 디자인 보호 (이번·이후 공통)

변경 금지(오류 수정 외):

- 주요 페이지 UI, 애니메이션, 아바타 표현  
- 가위바위보 연출(슬롯릴·쇼다운), 토너먼트 대진표  
- 반응형 레이아웃(헤더/사이드/하단 네비)

이번 1단계에서는 **문서·환경변수 예시만** 추가하고 UI/게임 로직은 수정하지 않음.

---

## 16. 2단계 반영 결과 (구조 정리 · Mock 서비스 분리)

### 폴더 구조 (현재)

```
src/
  api/        공통 API 클라이언트 + Mock 어댑터 (client, config, apiError, mockAdapter)
  components/ 공통 UI (변경 없음)
  context/    GameContext — 화면 전환·모달·효과음 오케스트레이션만 담당
  data/       mockData.ts (고정 픽스처, 기존 위치 유지)
  hooks/      useCountdown, useMatchmaking, useGameRound, useTournamentState,
              useWallet, useSound, usePersistentState
  layouts/    MainLayout, PageRenderer (App.tsx에서 분리)
  mocks/      Mock 진입점 배럴 + matchEngine / tournamentEngine (가짜 서버)
  pages/      화면 (변경 없음, 오류 수정만)
  services/   authService, userService, walletService, matchService, tournamentService,
              rankingService, watchService, shopService, rewardService, notificationService
  stores/     walletStore(잔액·원장 단일 출처), tournamentStore, createStore
  types/      도메인별 타입 분리 (ui, user, wallet, match, tournament, ranking, shop,
              engagement, api, socket)
  utils/      audio.ts
```

`features/` 디렉터리는 만들지 않았다. 화면이 라우터 없이 `GameContext.currentPage`로 전환되는 구조라
페이지를 도메인별로 옮기면 이득 없이 회귀 위험만 커진다. 대신 **책임 분리는 services/stores/hooks로 달성**했다.

### 포인트 처리 규칙 (2단계 확정)

- 잔액의 단일 출처는 `stores/walletStore` 이며, 변경 진입점은 `walletService.debit/credit` 뿐이다.
- 모든 변경은 `transactionId`를 필수로 받고, 같은 ID는 두 번 반영되지 않는다(중복 차감·중복 지급 차단).
- 매치 보상은 `match_payout_{matchId}`, 매칭 환불은 `match_refund_{ticketId}`로 매치·대기표당 1회만 처리된다.
- 화면(컴포넌트)에는 포인트 증감 코드가 남아 있지 않다. 개발용 프리셋도 `setDevBalance` → `walletService`를 경유한다.

### 1단계 보고 정정

1단계에서 "TypeScript 오류 없음"으로 보고했으나, 실제로는 `@types/react`·`@types/react-dom`이 없어
React 관련 값이 모두 `any`로 처리되며 타입 검사가 사실상 비활성 상태였다.
2단계에서 두 패키지를 추가한 뒤 드러난 16건(컨텍스트 계약 누락 등)을 모두 수정했으며, 현재 `tsc --noEmit`는 0건이다.
`strict: true`는 UI 파일 광범위 수정이 필요해 3단계 이후 과제로 남긴다.

---

## 17. 3단계 반영 결과 (백엔드 기본 서버 · DB)

### 기술 선택

- **Fastify + TypeScript + Zod + Prisma + PostgreSQL + Redis + Socket.IO + JWT 준비**
- NestJS 대신 Fastify: 프론트 service 계층과 맞물리는 얇은 HTTP 서버가 적합. 부트스트랩·미들웨어가 단순.
- 모노레포(`apps/web`)로 프론트를 옮기지 않고 **`server/` 폴더 추가** — 빌더 브릿지·FTP 배포 경로 유지.

### 서버 위치

```
build/묵찌빠-팡/
  src/          # 기존 프론트 (Mock 유지, 미연결)
  server/       # 신규 백엔드
    prisma/     # schema + migrations + seed
    src/        # Fastify app
    README.md
    .env.example
```

### 완료 확인

| 항목 | 결과 |
|------|------|
| `prisma migrate deploy` | 성공 (init + wallet CHECK) |
| `npm run db:seed` | 성공 (admin + Dorirang + user01~30 등) |
| `npm run dev` | `:4000` 기동 |
| `GET /api/health` | 200 ok |
| `GET /api/health/ready` | DB·Redis ok |
| `GET /api/version` | 0.1.0 |
| 음수 잔액 CHECK | 위반 시 차단 확인 |
| 프론트 로그인·실시간 게임 연결 | **하지 않음** (다음 단계) |

실행 방법은 `server/README.md` 참고.

---

## 18. 4단계 반영 결과 (실제 회원가입·로그인·프로필)

### 인증

- Access JWT (Bearer, sessionStorage) + Refresh HTTP-only cookie (`rps_refresh_token`, path `/api/auth`)
- bcrypt 비밀번호, refresh 회전·재사용 감지 시 전체 폐기
- Redis 로그인 실패 잠금 + signup/login rate limit
- 정지(`SUSPENDED`)·탈퇴(`DELETED`) 로그인 거부
- 게스트: DB 유저 없음, access JWT만, refresh 없음

### API

`POST /api/auth/{signup,login,refresh,logout,guest}` · `GET /api/auth/me`  
`GET|PATCH /api/users/me` · `GET /api/users/me/profile` · `GET|PATCH /api/users/me/settings`

### 프론트

- `LoginPage` / `SignupPage` (기존 다크·시안 UI)
- `authService` + `apiClient` 401→refresh 1회 재시도
- 부트스트랩으로 새로고침 후 세션 유지; refresh 실패 시 로그인
- 게스트: 상점·토너먼트 등 보호 페이지 차단, 연습/데모 가능
- 하이브리드: 인증/유저 HTTP, 게임·상점 Mock (`VITE_USE_MOCK` 미지정)
- `legacyMockLogin` 제거(개발 경고 후 throw)

### 완료 확인

| 항목 | 결과 |
|------|------|
| 회원가입·로그인·me·settings | curl E2E 성공 |
| refresh cookie 회전 | 성공 |
| 잘못된 비밀번호 | `UNAUTHORIZED` |
| 로그아웃 후 refresh | 실패 |
| 게스트 | `guest: true`, DB 미생성 |
| 프론트 `tsc` / `build` | 통과 |

데모: `dorirang` / `User1234!`

---

## 19. 5단계 반영 결과 (지갑 원장 · 상점 서버 연결)

### 서버 원칙

- 포인트·티켓 임의 `credit/debit` API를 클라이언트에 공개하지 않음
- 모든 잔액 변경은 `applyWalletMutation` + Prisma DB transaction
- `Wallet.version` 낙관적 락, DB 음수 CHECK, `transactionKey` UNIQUE
- 거래 사유 enum: 매치·토너먼트·미션·광고·상점·티켓 교환·관리자 지급/차감
- 관리자 변경은 JWT `ADMIN` 확인 후 `AuditLog` 기록

### API

`GET /api/wallet` · `GET /api/wallet/transactions` · `POST /api/wallet/exchange-ticket`  
`POST /api/admin/wallet/{credit,debit}`  
`GET /api/shop/items` · `POST /api/shop/purchase`  
`GET /api/users/me/inventory` · `POST /api/users/me/equip`  
`POST /api/dev/rewards/claim` (개발 환경 전용, 서버 고정 금액)

### 프론트

- 로그인/새로고침 시 지갑·원장을 DB에서 동기화
- 헤더·포인트 내역·상점·쿠폰·아바타·칭호가 서버 응답 사용
- 상점 구매 후 서버 확정 잔액과 인벤토리 재조회
- 광고/무료 보상은 실제 SDK 대신 개발 전용 멱등 endpoint 사용
- Mock 매치·토너먼트는 실제 지갑을 임의 변경하지 않음

### E2E 확인

| 검증 | 결과 |
|------|------|
| 관리자 동일 key 지급 2회 | 1회만 반영 (`duplicated=true`) |
| 티켓 교환 동일 key 2회 | 포인트·티켓 각각 1회만 반영 |
| 상점 구매 동일 key 2회 | 1회만 차감·지급 |
| 아바타 구매 후 장착 | 인벤토리·프로필 반영 |
| 개발 보상 2회 | 당일 1회만 지급 |
| 잔액 초과 차감 | HTTP 409, 잔액 불변 |
| 원장 key | 전부 UNIQUE |

---

## 20. 6단계 반영 결과 (실시간 1:1 매칭 · 일반 게임)

### 서버

- Socket.IO + JWT 핸드셰이크 (`auth.token`)
- 큐: 10P / 100P / 300P 분리, 동일 계정 중복 등록 금지
- 실력(레벨) 우선 매칭 + 대기시간 확대
- 상대 확정 시점에 `Match` 생성 + `match-entry:{matchId}:{userId}` 참가비 차감
- 선택 5초·서버 시각·마지막 제출·타임아웃 자동 선택
- `determineRpsWinner` 순수 함수 판정, 상대 패는 `ROUND_RESULT` 전까지 미전송
- 무승부: 추가 차감 없이 같은 매치에서 다음 라운드
- 완료: Match·승자 보상(`match-reward:...`)·원장·wins/losses 통계를 단일 트랜잭션
- 재접속 유예 `policy.disconnectGraceMs`, 정책 파일 분리

### 프론트

- `socket.io-client` + `gameSocket`
- Mock 타이머/상대 선택 제거 → `MATCH_FOUND` / `ROUND_*` / `MATCH_FINISHED`
- 대전방 목록 `GET /matches/rooms`
- 게스트·VIP 고액 방은 실시간 매칭에서 제외(10/100/300만)

### E2E

| 검증 | 결과 |
|------|------|
| 두 클라이언트 매칭 | OK |
| rock vs scissors 판정 | win/loss 정상 |
| 승리 20P 지급 (10P 방) | OK, transactionKey 멱등 |
| 큐 취소 (확정 전) | refunded=false |
| 무승부 → round 2 | OK |
| 프론트/서버 build | 통과 |

---

## 21. 7단계 반영 결과 (300P 3선택 전략 대전)

### 판정 규칙 (프로토타입 유지 + 명문화)

프로토타입은 "가위·바위·보를 순서대로 3개 선택 / 3회 결과로 승패 판정" 문구만 있고
실제 3×3 비교 코드는 없었습니다. 순번별 판정은 프로토타입의 클래식 가위바위보를 그대로 쓰고,
집계 규칙을 서버에 명문화했습니다.

1. 같은 순번끼리 비교 (1번↔1번, 2번↔2번, 3번↔3번), 순서 보존
2. 각 순번 승패는 클래식 가위바위보 (`determineRpsWinner` 재사용)
3. 3회 중 승수가 많은 쪽이 매치 승자 (같은 패는 무승부로 승수 미반영)
4. 승수가 같으면 매치 무승부 → 추가 참가비 없이 새 세트
5. 규칙 교체: `STRATEGY_RULES` + `StrategyAggregation` / `StrategyTiebreak` enum
   (`MOST_ROUND_WINS` ↔ `FIRST_TO_TWO`, `REMATCH` ↔ `LAST_ROUND_WINS`)

`npm run check:strategy` 15개 케이스로 규칙·예외를 문서화했습니다.

### 서버

- `strategy.ts` 순수 판정 `determineThreeChoiceWinner` + `validateChoices`
- `strategy-runtime.ts` — 일반 라운드 루프와 상태·타이머·이벤트 완전 분리 (300P 큐만 분기)
- 정확히 3개 / `ROCK`·`PAPER`·`SCISSORS`만 허용, 그 외 `INVALID_CHOICES`
- 마감 전까지 재제출 가능, 마감 후 `LOCKED` 로 거부
- 미제출·부족분은 마감 시 서버 자동 입력 (`yourChoicesAutoFilled`)
- 선택 배열은 서버 메모리 보관, 상대에게는 커밋 해시(SHA-256 일부)만 전달
- 1→2→3 순번별 공개 후 `STRATEGY_MATCH_RESULT`
- 완료는 기존 `finalizeMatch` 단일 트랜잭션 재사용 → 중복 지급 없음
- 정책: `MATCH_POLICY.strategy` (제출 10초, 공개 간격 1.2초, 무승부 재대결 2.5초)

### 프론트

- `useStrategyRound` 훅 신설 — `useGameRound`(일반전)와 상태 분리
- 300P 화면의 로컬 카운트다운·5초 타이머·랜덤 상대 패 제거 → `STRATEGY_*` 이벤트 구동
- 슬롯 3개가 채워지면 순서 그대로 자동 제출, "지금 확정" 버튼도 제공
- 순번별 공개를 슬롯 카드(내 패 / 상대 패 / 승·패·무)에 반영
- 보상 표시를 서버 정산값(`rewardPoints`)으로 통일

### E2E (`server/scripts/strategy-e2e.ts`)

| 검증 | 결과 |
|------|------|
| 2개 제출 / 유효하지 않은 값 | `INVALID_CHOICES` 거부 |
| 제출 순서 유지 | 공개 순번과 제출 순서 일치 |
| 상대 선택 사전 노출 | 없음 (해시만) |
| 확정 후 수정 | `LOCKED` 거부 |
| 라운드별 공개 | 1,2,3 순서 |
| 2승 1패 판정·정산 | 승자 +600P / 패자 -300P 일치 |
| 중복 제출·중복 지급 | 잔액 불변 |
| 같은 패 3개 → 무승부 | 참가비 재차감 없이 2세트 |
| 미제출 → 서버 자동 입력 | 3개 자동 채움 |
| 일반 `ROUND_STARTED` 누출 | 없음 (상태 분리) |
| DB 기록 | 세트당 라운드 3건 저장 |


---

## 22. 8단계 반영 결과 (토너먼트 서버 · 대진표)

### 범위
- 초보자 max 32 / 정규 max 128 / 256+ COMING SOON(MEGA 비활성)
- 예선 소수결 → 본선 1:1 → 준결승·결승·3·4위 3판 2승

### 서버
- API: list/detail/join/cancel/participants/bracket/result (+ register 별칭)
- 참가·취소 단일 트랜잭션 + `tournamentId_userId` UNIQUE + 티켓 원장 멱등 키(재참가 attempt)
- 상태 머신 + Redis/DB 스케줄러, 재시작 `recoverTournaments`
- 인원 미달 `POSTPONED` + 티켓 자동 환불(설정 가능)
- `determineMinorityPass` / `buildBracketPlan` 순수 함수 + 단위 테스트
- 보상표 `tournament_rewards`, 지급 key `tournament-reward:{id}:{userId}:{rank}`

### 프론트
- 로비·대기실·대진표 Mock 제거 → 실제 API/Socket
- 예선 선택을 `QUALIFIER_CHOICE_SUBMIT` 으로 서버 집계
- `VITE_USE_MOCK` 미지정 시 tournaments 실서버

### E2E
| 검증 | 결과 |
|------|------|
| 참가 티켓 차감 | OK |
| 중복 참가 | ALREADY_REGISTERED, 잔액 불변 |
| 취소 환불 | OK |
| 중복 환불 | NOT_REGISTERED, 잔액 불변 |
| 단위(소수결·대진표) | OK |
| 프론트/서버 tsc | 통과 |
