# SECURITY.md — 묵찌빠-팡 보안·부정 이용 방지·운영 안정화

> **14단계 보강**: 배포 시 `APP_ENV=production` · 강한 JWT/DB 비밀 · `EXPOSE_API_DOCS=false` · HTTPS · 백업.  
> 상세 운영 절차는 [DEPLOYMENT.md](./DEPLOYMENT.md), 관리자 2FA는 [ADMIN_GUIDE.md](./ADMIN_GUIDE.md).

이 문서는 서비스 전체를 보안 관점에서 검수한 결과와 각 위협에 대한 방어 구현 위치를 정리합니다.

> **초기 운영 정책**: 부정 이용 탐지는 **차단이 아닌 로그·관리자 경고 중심**으로 동작합니다.
> 신호(`FraudSignal`)를 기록해 관리자가 검토하며, 자동 제재는 후속 단계에서 도입합니다.

상태 표기: ✅ 구현 · 🟡 부분/준비 · ⛔ 미구현(후속)

---

## 1. 인증 보안

| 항목 | 상태 | 구현 위치 / 설명 |
|---|---|---|
| 비밀번호 해시 | ✅ | bcrypt, cost=12. `server/src/lib/auth.ts` (`hashPassword`/`verifyPassword`). 비밀번호는 평문 저장·로깅 금지, 8~72자 정책(`auth/schemas.ts`). |
| JWT 만료 | ✅ | access 15분, refresh 7일. `config/env.ts`(`JWT_ACCESS_EXPIRES_IN`), `plugins/jwt.ts`. 페이로드는 식별 클레임만 포함(`lib/auth.ts` `AccessTokenPayload`). |
| refresh token 회전 | ✅ | 불투명 랜덤 48바이트, DB에는 SHA-256 해시만 저장. 회전 시 이전 토큰 `revokedAt`+`replacedById`. `modules/auth/service.ts` `rotateRefreshToken`. 쿠키는 httpOnly·prod에서 secure·`sameSite=lax`·`path=/api/auth`. |
| 탈취 토큰 폐기 | ✅ | 이미 폐기된(재사용된) refresh 토큰 제시 시 **해당 사용자의 모든 활성 토큰 폐기**(재사용 감지). `logout-all`도 제공. |
| 로그인 rate limit | ✅ | 2중: 라우트 한도(login 20/15m, signup 10/15m, guest 30/15m, `routes/auth.ts`) + Redis 기반 `(loginId, ip)` 실패 5회/15분 429(`modules/auth/login-guard.ts`, Redis 장애 시 fail-open). |
| 관리자 2단계 인증 | 🟡 준비 | RFC 6238 TOTP를 외부 의존성 없이 구현(`modules/security/twofactor.ts`). enroll→confirm→verify→disable + `otpauth://` URI. DB: `users.two_factor_enabled/two_factor_secret`. 로그인 강제 적용은 후속(현재 `verifyTotp`는 미설정 계정은 통과). API: `/api/admin/2fa/*`. |
| 민감 API 권한 검사 | ✅ | `lib/access.ts` `requireUser`/`requireAdminContext`/`requireSuperAdmin`. 관리자는 **JWT role + DB role + status=ACTIVE + deletedAt** 이중 검사(위조·만료 토큰 방어). 모든 `/admin/*`은 `app.authenticate` preHandler + `adminActor`. |

---

## 2. 게임 보안

| 항목 | 상태 | 구현 위치 / 설명 |
|---|---|---|
| 서버 시간 기준 | ✅ | 모든 마감(`endsAt`)은 서버 `Date.now()`로 계산. 1:1 `match/runtime.ts`, 전략 `strategy-runtime.ts`, 토너먼트 `tournament/engine.ts`. 클라이언트가 시간을 제공하지 않음. |
| 선택 유효성 검사 | ✅ | `match/rps.ts` `fromClientChoice`(ROCK/PAPER/SCISSORS만 허용, 그 외 거부). 토너먼트/전략 동일 검증. |
| 시간 종료 후 제출 차단 | ✅ | 상태(`CHOOSING`) + `Date.now() > endsAt` 이중 가드. 만료 시 서버가 랜덤 자동 입력 후 판정. `runtime.ts` `submitChoice`. |
| 중복 제출 방지 | ✅ | 라운드별 `choiceLocked`/세트별 `locked`. 잠금 후 재제출 거부. (잠금 전 마지막 제출 채택은 의도된 동작 — 상대 패 미노출이라 이득 없음.) |
| 재생 공격 방지 | ✅(권위 판정) / 🟡(commit-reveal) | 서버가 선택을 메모리에 보관하고 잠금 후 변경 불가하여 재생·조작 불가. 전략 대전 `commitHash`는 연출용(암호학적 검증 아님) — 진정한 provable-fairness는 후속. |
| 상대 패 사전 노출 방지 | ✅ | 라운드 시작/`CHOICE_LOCKED`/재접속 복구/관리자 모니터/관전 스냅샷 모두 공개 전 상대 선택 마스킹. 공개는 `ROUND_RESULT`에서만. `runtime.ts`, `engine.ts`, `watch/handlers.ts`. |
| 클라이언트 결과 무시 | ✅ | 승패는 순수 서버 함수 `determineRpsWinner`로만 결정. 보상은 서버 결정 승자에게만 지급(`match/service.ts` `finalizeMatch`). |
| 임의 포인트 요청 차단 | ✅ | "잔액 지정" 클라 엔드포인트 없음. 잔액 변경은 고정가 교환/게임 보상(서버)/관리자(감사)/dev(개발 전용, `isDev` 게이트)뿐. |
| Socket 사용자 인증 | ✅ | 핸드셰이크에서 access JWT 검증. 실계정은 **DB status 재확인**(정지/차단/삭제 계정은 유효 토큰이어도 거부). 게스트는 관전만. `plugins/socket.ts`. |
| Socket room 권한 확인 | ✅/🟡 | 매치 룸은 서버가 페어링 시에만 join(임의 join 이벤트 없음), 제출은 참가자 검증(`FORBIDDEN`). 관전은 공개+마스킹, 스펙테이터 제출 거부. 토너먼트 구독은 멤버십 미검사(공개 브로드캐스트·마스킹이라 저위험). |

**부정 이용 로깅(게임)**: 지나치게 빠른 선택(`< 250ms`)은 `RAPID_CHOICE` 신호, 반복 접속 종료(30분 5회)는 `REPEATED_DISCONNECT` 신호로 기록. `runtime.ts` → `modules/security/fraud.ts`.

---

## 3. 포인트 보안

| 항목 | 상태 | 구현 위치 / 설명 |
|---|---|---|
| DB transaction | ✅ | 잔액 이동은 **Serializable** 트랜잭션 + 직렬화/유니크 충돌 재시도. `modules/wallet/service.ts` `runWalletTransaction`. 매치·상점·토너먼트·dev·관리자 경로 모두 적용. |
| transaction key | ✅ | `WalletTransaction.transactionKey` UNIQUE + `applyWalletMutation`이 기존 키 발견 시 멱등 반환. 결정적 키(예: `match-reward:{matchId}:{winnerId}`). `lib/wallet.ts`. |
| 잔액 음수 방지 | ✅ | 앱 레이어(`balanceAfter < 0` 거부 + `wallet.version` 낙관적 락) + DB CHECK 제약(`point_balance>=0` 등, `20260726081100_wallet_balance_checks`). |
| 중복 보상 차단 | ✅ | (1) transactionKey 멱등 (2) 매치 상태 `COMPLETED` 재확인·조건부 `updateMany`로 중복 지급 방지. |
| 관리자 작업 감사 로그 | ✅ | 잔액/상태/토너먼트/공지/보안 변경 시 `AuditLog` 기록: 관리자·시간·IP·UA·작업·대상·변경 전/후·사유. `modules/admin/audit.ts` `writeAudit`. |
| 비정상 거래 탐지 | ✅ | (1) 중복 거래 리포트 `modules/admin/monitoring.ts` `detectDuplicateTransactions` (2) 배치 스캔의 비정상 포인트 증가/보상 반복(§4). |

---

## 4. 부정 이용 탐지 (로그·경고 중심)

`modules/security/fraud.ts` + `FraudSignal` 모델(`type`/`severity`/`status`/`dedupeKey`/`hitCount`/`context`).
`dedupeKey`로 동일 신호는 한 행에 누적(스팸 방지). 관리자 검토: `OPEN → REVIEWING/RESOLVED/IGNORED`.

| 신호 | 방식 | 임계 (정책 `security/policy.ts`) |
|---|---|---|
| 지나치게 빠른 선택 `RAPID_CHOICE` | 실시간(게임) | 라운드 시작 후 `< 250ms` 제출, 하루 누적 |
| 반복 접속 종료 `REPEATED_DISCONNECT` | 실시간(게임) | 30분 내 5회 |
| 특정 상대 반복 매칭 `SAME_OPPONENT_REMATCH` | 배치 스캔 | 1시간 내 동일 페어 4회 초과 |
| 다계정/동일 IP 다수 계정 `MULTI_ACCOUNT_SAME_IP` | 배치 스캔 | 24시간 내 동일 IP distinct 계정 ≥4 (`refresh_tokens.ip_address`) |
| 비정상 승률 `ABNORMAL_WINRATE` | 배치 스캔 | 20판 이상 & 승률 ≥90% (≥97% CRITICAL) |
| 비정상 포인트 증가 `ABNORMAL_POINT_GAIN` | 배치 스캔 | 1시간 내 POINT 순증가 임계 초과 |
| 보상 반복 요청 `REPEATED_REWARD` | 배치 스캔 | 1시간 내 동일 reference로 3회 초과 지급 |

- 배치 스캔 실행: `POST /api/admin/security/scan` (감사 로그 남김, 차단 없음).
- 신호 조회: `GET /api/admin/security/signals` (status/type/severity/userId 필터, OPEN·CRITICAL 카운트 포함).
- 대시보드 `fraud.open`/`fraud.critical`에 미검토 신호 수 노출.
- 배치 스캔의 원시 SQL은 전부 Prisma tagged-template 바인딩 파라미터 사용(주입 불가).

---

## 5. API 보안

| 항목 | 상태 | 구현 위치 / 설명 |
|---|---|---|
| Zod 입력 검증 | ✅ | 모든 변경 라우트가 body/query를 Zod로 파싱. env도 부팅 시 Zod 검증. `ZodError`→400 `VALIDATION_ERROR`(`plugins/error-handler.ts`). |
| SQL injection 방지 | ✅ | Prisma 쿼리빌더 + 원시 SQL은 tagged-template 바인딩만 사용. `$queryRawUnsafe`/`$executeRawUnsafe` 미사용. |
| XSS 방지 | ✅(API)/🟡(FE) | 서버는 JSON API로 HTML 미렌더. Helmet CSP `default-src 'none'` 적용(§Helmet). 공지/알림 텍스트의 클라 렌더링 시 이스케이프는 프런트 책임. |
| CORS 제한 | ✅ | `CORS_ORIGIN` 화이트리스트(콤마 구분), `credentials:true`, 명시적 methods/headers. 와일드카드 미사용. Socket.IO도 동일. `app.ts`. |
| Helmet | ✅ | 전역 적용. API 전용 최소 CSP(`default-src/frame-ancestors/base-uri 'none'`), prod에서 HSTS 활성. `app.ts`. |
| request body 크기 제한 | ✅ | Fastify `bodyLimit: 128KiB`(기본 1MiB에서 축소). 과대 페이로드 DoS 축소. `app.ts`. |
| rate limit | ✅ | 전역 200/분 + 라우트별 재정의(auth/wallet/shop/mission/watch/tournament/admin/dev). |
| 민감 오류 메시지 숨김 | ✅ | prod에서 5xx는 `Internal server error`로 마스킹, 스택은 클라 미노출(dev만 로그). `AppError`만 의도된 코드/메시지 반환. `plugins/error-handler.ts`. |

---

## 6. 완료 조건 점검

- [x] **주요 API 권한 검사** — `requireUser`/`requireAdminContext`/`requireSuperAdmin`, `/admin/*` 이중 검사, 소켓 DB 상태 재확인.
- [x] **모든 입력 검증** — 라우트 Zod + env Zod + 소켓 페이로드 유효성.
- [x] **포인트 조작 차단** — Serializable tx + transactionKey 멱등 + 음수 방지(앱/DB) + 임의 잔액 API 없음.
- [x] **게임 결과 조작 차단** — 서버 권위 판정, 클라 결과 무시, 상대 패 마스킹, 시간 종료 후 제출 차단.
- [x] **중복 요청 방어** — transactionKey 멱등, 매치 상태 재확인, choiceLocked, rate limit, refresh 재사용 감지.
- [x] **보안 문서 작성** — 본 문서(SECURITY.md).

---

## 7. 남은 위험 / 후속 과제

- 관리자 2FA는 **준비 단계** — 로그인 강제 적용은 후속(현재 enroll/verify 인프라만 완비).
- 부정 이용은 **탐지·경고만**, 자동 제재 없음(정책상 의도).
- 전략 대전 commit-reveal은 연출용 — 진정한 provable-fairness 미구현.
- rate limit/login-guard가 인메모리/Redis fail-open — 다중 인스턴스 배포 시 Redis 공유 스토어 권장.
- `trustProxy=true` — 신뢰 가능한 프록시(HTTPS 종단) 뒤 배포 전제. 미신뢰 노출 시 `X-Forwarded-For` 위조로 IP 기반 통제 우회 가능.
- seed 기본 비밀번호(`Admin1234!`/`User1234!`)는 개발용 — 운영에서는 반드시 `SEED_*_PASSWORD` 오버라이드.
- 토너먼트 구독 멤버십 미검사(저위험, 공개·마스킹).

---

## 8. 운영 체크리스트 (배포 전)

1. `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` 32자 이상 랜덤값으로 설정.
2. `CORS_ORIGIN`을 실제 프런트 도메인으로 제한.
3. `SEED_ADMIN_PASSWORD`/`SEED_USER_PASSWORD` 강력한 값으로 오버라이드(또는 운영 seed 비활성).
4. HTTPS 종단 프록시 뒤 배포(HSTS·secure 쿠키 유효화).
5. Redis 가용성 확보(로그인 가드·rate limit 신뢰성).
6. 관리자 계정 2FA enroll 완료.
7. `POST /admin/security/scan` 주기 실행(크론/스케줄러) 검토.
