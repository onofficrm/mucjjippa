# 묵찌빠 팡 — Backend Server

Fastify + Prisma + PostgreSQL + Redis 기반 API 서버입니다.

프론트엔드(Vite/React)는 기존 위치에 그대로 두고, 이 `server/` 폴더만 추가했습니다.
(빌더 브릿지·FTP 배포 경로를 깨지 않기 위해 모노레포 `apps/web` 이동은 하지 않았습니다.)

## 기술 선택 이유

| 선택 | 이유 |
|------|------|
| **Fastify** (NestJS 대신) | 프론트가 이미 얇은 service 계층을 가지고 있어, DI 컨테이너보다 가벼운 HTTP 레이어가 자연스러움. TypeScript·Zod와 궁합이 좋음. |
| **PostgreSQL + Prisma** | 요청 사양과 일치. 외래키·unique·enum·마이그레이션을 스키마로 관리. |
| **Redis** | 이후 매칭 큐·세션·레이트리밋용. 3단계에서는 health 연결 확인만. |
| **Socket.IO** | 프론트 Stage2 `SocketEvent` 계약과 맞추기 쉬움. 3단계에서는 ping만 허용, 게임 이벤트는 미연결. |
| **Zod** | 환경변수·요청 검증. class-validator보다 설정이 단순. |
| **JWT (`@fastify/jwt`)** | Access token (Bearer). Refresh는 HTTP-only cookie + DB 회전. |

## 사전 요구사항

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### macOS (Homebrew) 예시

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
createdb mucjjippa
```

## 설치 · 실행

```bash
cd server
cp .env.example .env
# DATABASE_URL 의 사용자명을 로컬 Postgres 롤에 맞게 수정
# 예: postgresql://YOUR_USER@localhost:5432/mucjjippa?schema=public

npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

서버 기본 주소: `http://localhost:4000`

## API

### Health

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/health` | 생존 확인 |
| GET | `/api/health/ready` | DB + Redis 준비 상태 |
| GET | `/api/version` | 서버·API 버전 |

### Auth (4단계)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` | 회원가입 (중복 검증·필수 동의·bcrypt) |
| POST | `/api/auth/login` | 로그인 (실패 카운트·정지/탈퇴 차단) |
| POST | `/api/auth/refresh` | refresh cookie → access 재발급 (회전) |
| POST | `/api/auth/logout` | 세션 종료 · refresh 폐기 |
| POST | `/api/auth/guest` | 게스트 JWT (DB 유저 없음, refresh 없음) |
| GET | `/api/auth/me` | 현재 세션 프로필 |

### Users (보호)

| Method | Path | 설명 |
|--------|------|------|
| GET/PATCH | `/api/users/me` | 프로필 조회·수정 |
| GET | `/api/users/me/profile` | 프로필 상세 |
| GET/PATCH | `/api/users/me/settings` | 설정 조회·저장 |

### Wallet · Shop (5단계)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/wallet` | DB 확정 포인트·티켓 잔액 |
| GET | `/api/wallet/transactions` | 통화별 원장 (cursor pagination) |
| POST | `/api/wallet/exchange-ticket` | 포인트→티켓 원자적 교환 |
| POST | `/api/admin/wallet/credit` | 관리자 지급 + 감사 로그 |
| POST | `/api/admin/wallet/debit` | 관리자 차감 + 감사 로그 |
| GET | `/api/shop/items` | 활성 상품 + 보유 상태 |
| POST | `/api/shop/purchase` | 차감·원장·인벤토리를 단일 DB transaction 처리 |
| GET | `/api/users/me/inventory` | 실제 인벤토리 |
| POST | `/api/users/me/equip` | 보유 아바타·칭호 장착 |
| POST | `/api/dev/rewards/claim` | 개발 환경 전용 고정 보상 (일 1회 멱등) |

### Match realtime (6단계)

Socket.IO (`/socket.io`) + JWT `handshake.auth.token`

| 이벤트 (C→S / S→C) | 설명 |
|--------------------|------|
| `MATCH_QUEUE_JOIN` | 10/100/300P 큐 등록 |
| `MATCH_QUEUE_LEAVE` | 확정 전 취소 (참가비 미차감) |
| `MATCH_FOUND` | 상대 확정 + DB Match + 양쪽 참가비 차감 |
| `MATCH_READY` / `ROUND_STARTED` | 라운드 시작 (선택 5초, 서버 시각) |
| `CHOICE_SUBMIT` / `CHOICE_ACCEPTED` / `CHOICE_LOCKED` | 선택 (상대 패 미공개) |
| `ROUND_RESULT` | 공개 후 결과 (무승부면 같은 매치 재대결) |
| `MATCH_FINISHED` | 승자 보상·통계·원장 원자 처리 |
| `MATCH_RESUMED` | 재접속 복구 |

정책 파일: `src/modules/match/policy.ts`  
순수 판정: `determineRpsWinner` (`src/modules/match/rps.ts`)

### 관전 (9단계)

| Method / Event | 설명 |
|----------------|------|
| GET `/api/watch/live` | 진행 중 경기 목록 (+ 없을 때 데모) |
| GET `/api/watch/matches/:matchId` | 단일 관전 스냅샷 |
| GET `/api/watch/tournaments/:tournamentId` | 토너먼트 관전 목록 |
| `WATCH_SUBSCRIBE` / `WATCH_UNSUBSCRIBE` | `watch:match:{id}` room 입장·퇴장 (관전자 수) |
| `WATCH_STATE` / `WATCH_COUNTDOWN` / `WATCH_CHOICE_STATUS` | 상태·카운트다운·선택 완료 여부 (패 비공개) |
| `WATCH_REVEAL` / `WATCH_ROUND_RESULT` / `WATCH_MATCH_FINISHED` | 결과 공개 이후에만 패·승패 |
| `WATCH_REACTION` | 이모티콘만, 사용자당 초당 제한 |
| `WATCH_CHOICE_SUBMIT` | 항상 거부 (관전자 선택 불가) |

- 로그인 유저: 실경기 관전 / 게스트: 공개 데모(`matchId=demo`)만
- 실제 경기가 없을 때만 API·UI가 데모 경기를 노출 (라벨: **데모 경기**, **실제 사용자 경기 아님**)

### 랭킹·통계·칭호·미션 (10단계)

| Method | 설명 |
|--------|------|
| GET `/api/rankings/weekly` | 주간 승수 랭킹 (최소 게임·동점·페이지·내 순위) |
| GET `/api/rankings/monthly` | 월간 |
| GET `/api/rankings/win-rate` | 승률 |
| GET `/api/rankings/streak` | 연승 |
| GET `/api/rankings/tournament` | 토너먼트 성적 |
| GET `/api/rankings/around-me` | 내 주변 순위 |
| GET `/api/users/me/stats` | 상세 통계 (손 횟수·연패·토너먼트 기록 등) |
| GET `/api/missions` | 일일/주간 미션 진행 |
| POST `/api/missions/:id/claim` | 보상 수령 (`mission-reward:...` 멱등) |
| POST `/api/titles/claim` | **거부** — 칭호는 서버 자동 해제만 |

경기 종료·토너먼트 참가/순위·구매·관전 시 통계·미션·칭호가 서버에서 갱신됩니다.

### 관리자센터 (11단계)

ADMIN / SUPER_ADMIN 만 접근. 모든 변경은 **사유 필수** + **감사 로그**(관리자·시간·IP·작업·대상·변경 전/후·사유).
중요 작업은 재확인 문구 `CONFIRM` 필수. 강제 종료·취소·영구 정지는 **SUPER_ADMIN** 전용.

| Method | 설명 |
|--------|------|
| GET `/api/admin/me` | 관리자 권한 확인 |
| GET `/api/admin/dashboard` | 접속·대기·진행중·오늘 집계·제재·최근 감사 |
| GET `/api/admin/users` | 사용자 검색 |
| GET `/api/admin/users/:id` | 상세 (거래·게임·토너먼트·로그인·감사) |
| POST `/api/admin/users/:id/status` | 이용 정지 / 해제 / 영구 정지 |
| POST `/api/admin/users/:id/wallet` | 포인트·티켓 지급/회수 |
| GET/POST/PATCH `/api/admin/tournaments*` | 토너먼트 생성·수정·상태 전환·보상표 |
| GET/POST/PATCH `/api/admin/notices*` | 공지 작성·노출·긴급·푸시 준비 |
| GET `/api/admin/monitor/live` | 진행 중 매치 (선택값 결과 전 마스킹) |
| GET `/api/admin/monitor/errors` | 오류 로그 |
| GET `/api/admin/monitor/duplicates` | 중복 거래 탐지 |
| GET `/api/admin/audit-logs` | 감사 로그 |
| GET `/api/notices` | 공개 노출 중 공지 (티커) |

프론트: `/admin` · `/admin-demo` → `AdminCenterPage`. 일반 사용자는 서버에서 차단됩니다.
모니터링 API에는 **선택 변경 엔드포인트가 없습니다.**

### 보안·부정 이용 방지 (12단계)

전체 검수 결과와 방어 매핑은 프로젝트 루트 [`SECURITY.md`](../SECURITY.md) 참고.
부정 이용은 **차단이 아닌 로그·경고 중심** — `FraudSignal` 기록 후 관리자 검토.

| Method | 설명 |
|--------|------|
| GET `/api/admin/security/signals` | 부정 이용 신호 목록 (status/type/severity 필터, OPEN·CRITICAL 카운트) |
| POST `/api/admin/security/scan` | 배치 스캔 (동일 IP 다계정·비정상 승률·포인트 증가·보상 반복·상대 반복 매칭) |
| POST `/api/admin/security/signals/:id/review` | 신호 검토(REVIEWING/RESOLVED/IGNORED, 사유 필수) |
| GET `/api/admin/2fa/status` | 관리자 2FA 상태 |
| POST `/api/admin/2fa/enroll` · `/confirm` · `/disable` | TOTP 등록·확정·해제 (준비 단계) |

추가 하드닝: Fastify `bodyLimit` 128KiB, Helmet CSP `default-src 'none'` + prod HSTS,
소켓 핸드셰이크에서 정지/차단 계정 DB 재검증, 실시간 rapid-choice·반복 접속 종료 신호 기록.

### 300P 3선택 전략 대전 (7단계)

300P 큐는 일반 라운드 루프를 타지 않고 전략 런타임(`strategy-runtime.ts`)으로 분기합니다.
같은 소켓·같은 큐를 쓰지만 상태·타이머·이벤트는 완전히 분리됩니다.

| 이벤트 (C→S / S→C) | 설명 |
|--------------------|------|
| `STRATEGY_ROUND_STARTED` | 세트 시작 (`choiceCount: 3`, 서버 시각 `endsAt`) |
| `STRATEGY_CHOICES_SUBMIT` (C→S) | 순서 그대로 3개 제출. 마감 전이면 재제출 가능 |
| `STRATEGY_CHOICES_SUBMITTED` | 제출자에게만 수락 응답 + 커밋 해시 |
| `STRATEGY_OPPONENT_SUBMITTED` | 상대에게는 "제출했다"는 사실과 해시만 전달 |
| `STRATEGY_CHOICES_LOCKED` | 양쪽 확정. 내 선택 + 상대 커밋 해시만 (상대 패 미공개) |
| `STRATEGY_REVEAL_STARTED` / `STRATEGY_ROUND_REVEALED` | 1→2→3번 순번별 공개 |
| `STRATEGY_MATCH_RESULT` | 서버 최종 판정. 무승부면 참가비 없이 새 세트 |

- 선택 배열은 서버 메모리에만 보관하며 소켓으로 나가는 값은 본인 선택과 상대 커밋 해시(SHA-256 일부)뿐입니다.
- 정확히 3개 · `ROCK`/`PAPER`/`SCISSORS`만 허용하고, 미제출·부족분은 마감 시 서버가 자동 입력합니다.
- 판정: `determineThreeChoiceWinner` (`src/modules/match/strategy.ts`) — 같은 순번끼리 비교하고
  3회 중 승수가 많은 쪽이 승자, 승수가 같으면 매치 무승부입니다.
  집계·동점 규칙은 `STRATEGY_RULES` (`StrategyAggregation` / `StrategyTiebreak` enum)로 교체할 수 있습니다.
- 규칙과 예외는 `npm run check:strategy` 테스트에 문서화되어 있습니다.

클라이언트가 임의 금액을 보내는 일반 `credit`/`debit` API는 제공하지 않습니다.
모든 변경은 서버가 금액과 거래 사유를 결정하고, `transactionKey` UNIQUE 및
`Wallet.version` 낙관적 락으로 중복·동시 요청을 방어합니다.

### Tournament (8단계)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/tournaments` | 목록 (MEGA/256+ COMING SOON) |
| GET | `/api/tournaments/:id` | 상세 |
| POST | `/api/tournaments/:id/join` | 참가 (티켓 차감·원장·참가자, `/register` 별칭) |
| POST | `/api/tournaments/:id/cancel` | 시작 전 취소·환불 |
| GET | `/api/tournaments/:id/participants` | 참가자 |
| GET | `/api/tournaments/:id/bracket` | 대진표 |
| GET | `/api/tournaments/:id/result` | 최종 순위·보상 |

상태: `DRAFT → REGISTRATION → READY → QUALIFIER → BRACKET → SEMIFINAL → FINAL → COMPLETED`  
(+ `CANCELLED` / `POSTPONED`)

- 초보자 max 32 / 정규 max 128 / 256+ 비활성
- 예선: 소수결 (`determineMinorityPass`), 동률 재라운드, 본선 목표 인원까지 반복
- 본선: 랜덤 시드·부전승·승자 진출, 준결승·결승·3·4위 3판 2승
- 보상: `tournament_rewards` 테이블, key `tournament-reward:{id}:{userId}:{rank}`
- 스케줄러: DB `nextTransitionAt` + Redis ZSET, 재시작 시 `recoverTournaments`
- 인원 미달: `POSTPONED` + 초기 정책 티켓 자동 환불

Socket: `TOURNAMENT_SUBSCRIBE`, `TOURNAMENT_UPDATED`, `PARTICIPANT_JOINED`, `TOURNAMENT_COUNTDOWN`,
`TOURNAMENT_STARTED`, `QUALIFIER_*`, `BRACKET_*`, `TOURNAMENT_MATCH_READY`, `PLAYER_ELIMINATED`,
`FINAL_STARTED`, `TOURNAMENT_COMPLETED`

**토큰 정책**

- Access: 응답 body JWT (`Authorization: Bearer`), 짧은 만료
- Refresh: HTTP-only cookie `rps_refresh_token` (path `/api/auth`), DB 저장·회전·재사용 감지 시 전체 폐기
- 비밀번호: bcrypt
- Rate limit: signup/login 엔드포인트별 제한 + Redis 로그인 실패 잠금

예시:

```bash
# 로그인 (쿠키 jar에 refresh 저장)
curl -s -c /tmp/rps.txt -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"loginId":"dorirang","password":"User1234!"}'

# refresh
curl -s -b /tmp/rps.txt -c /tmp/rps.txt -X POST http://localhost:4000/api/auth/refresh
```

## Prisma Studio (데이터 확인)

```bash
cd server
npx prisma studio
# 기본 http://localhost:5555
```

## Seed 데모 계정

| 구분 | loginId | password |
|------|---------|----------|
| 관리자 | `admin` | `Admin1234!` (`.env`의 `SEED_ADMIN_PASSWORD`) |
| 최고관리자 | `superadmin` | 동일 (`SUPER_ADMIN` — 강제 종료·취소) |
| 데모 유저 | `dorirang` | `User1234!` |
| 유저 30명 | `user01` ~ `user30` | `User1234!` |

추가로 생성되는 데이터:

- 기본 아바타 10종, 칭호 8종
- 상점 상품 7종
- 데모 토너먼트 3개 (+ 참가자 12명)
- 랭킹용 완료 매치 40건
- Dorirang 알림·원장 샘플

## DB 안전성

- 외래키 / unique / 복합 index / enum
- `Wallet.version` 낙관적 락
- `WalletTransaction.transactionKey` UNIQUE → 중복 지급·차감 방지
- `TournamentParticipant (tournamentId, userId)` UNIQUE
- `wallets.point_balance >= 0`, `ticket_balance >= 0` CHECK
- User soft delete: `status=DELETED` + `deletedAt`
- Catalog soft archive: `status=ARCHIVED`
- `RefreshToken` 해시 저장 · 회전 · 재사용 감지

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 빌드·실행 |
| `npm test` | Vitest 전체 (단위·통합·동시성·E2E) |
| `npm run test:unit` | 단위 테스트만 |
| `npm run test:integration` | API·소켓 통합 |
| `npm run test:concurrency` | 중복 요청·동시성 |
| `npm run test:e2e` | API 풀 시나리오 |
| `npm run db:setup` | migrate + seed |
| `npm run db:seed:catalog` | 카탈로그만 (운영 초기화) |
| `npm run db:seed:demo` | 데모 유저 포함 |

상세 실행 방법은 프로젝트 루트 [`TESTING.md`](../TESTING.md) · 배포는 [`DEPLOYMENT.md`](../DEPLOYMENT.md) 참고.

OpenAPI UI: `http://localhost:4000/api/docs` (`APP_ENV=production` 에서는 기본 비노출)

```bash
npm run lint           # tsc --noEmit
npm run check          # 레거시 판정 스모크 (rps + 3선택 + 토너먼트)
npm run prisma:studio  # Prisma Studio
npm run db:seed        # seed 재실행 (SEED_MODE 환경변수)
npm run db:reset       # migrate reset + seed (개발 전용)
```

## 아직 하지 않은 것 (다음 단계)

- 실제 광고 SDK 검증 (현재 `/api/dev/rewards/claim`만 사용)
- 실 PG 결제
- 관리자 로그인 2FA 강제
- VIP/고액 방 실시간 매칭 확장
- 실제 푸시(FCM/APNs) 발송 — 현재는 공지 노출 시 in-app 알림 생성·`pushQueuedAt` 기록까지
- Socket 수평 확장 (Redis adapter)
- 토너먼트 본선 UI의 단판 선택 화면을 `TOURNAMENT_MATCH_READY` 와 더 깊게 동기화

프론트 기본은 하이브리드: 인증·유저·지갑·상점·1:1·전략·토너먼트·관전·랭킹·미션·관리자센터는 실제 API/Socket.
