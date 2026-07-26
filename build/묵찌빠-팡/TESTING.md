# 테스트 실행 가이드 (13단계)

묵찌빠-팡은 **Vitest**(서버 단위·통합·동시성·API E2E)와 **Playwright**(UI E2E)로 자동 검증합니다.

## 사전 준비

```bash
# PostgreSQL · Redis 기동 후
cd server
cp .env.example .env   # 이미 있으면 생략
npm install
npx prisma migrate deploy
npx prisma db seed     # UI E2E 시드 계정(dorirang)용 — 선택
```

루트(프론트)에서도:

```bash
cd ..   # 프로젝트 루트
npm install
npx playwright install chromium
```

## 한 번에 실행

```bash
# 서버 테스트만 (단위 + 통합 + 동시성 + API E2E)
cd server && npm test

# 루트에서 서버 테스트
npm test

# Playwright UI E2E (프론트·서버 webServer 자동 기동)
npm run test:e2e

# 서버 테스트 + Playwright
npm run test:all
```

## 서버 테스트 분류

| 명령 | 내용 |
|------|------|
| `cd server && npm run test:unit` | 가위바위보·3선택·소수결·대진표·승자 전진·랭킹·원장 |
| `cd server && npm run test:integration` | 회원가입·로그인·지갑·매칭·토너먼트·상점·랭킹 |
| `cd server && npm run test:concurrency` | 중복 지급·중복 참가·중복 구매·이중 큐·중복 제출 |
| `cd server && npm run test:e2e` | 회원가입→10P 대전→포인트→토너먼트→랭킹 시나리오 |
| `cd server && npm test` | 위 전부 실행 |

### 단위 테스트 커버리지

- 가위바위보 승패 (`determineRpsWinner`)
- 3선택 판정 (`determineThreeChoiceWinner`)
- 포인트 차감·지급·중복 transaction key
- 티켓 차감·환불
- 소수결 판정 · 동률 재라운드
- 대진표 생성 · 승자 다음 경기 이동
- 랭킹 계산 (승률·토너먼트 점수·정렬)

### 통합 / 동시성

- 매칭 참가·취소·게임 완료·승리 보상
- 토너먼트 참가·취소(환불)·예선/본선/결승 시나리오(판정·대진·보상표)
- 상점 구매
- 동시 포인트 지급, finalizeMatch 중복, 토너먼트/상점 중복 요청, 같은 사용자 두 소켓 매칭, 선택 중복 제출

## Playwright UI E2E

```bash
npm run test:e2e
```

시나리오 (`e2e/auth-flow.spec.ts`):

1. 로그인 페이지 렌더
2. 회원가입 → 자동 로그인 → 메인 진입
3. 시드 계정(`dorirang` / `User1234!`) 로그인

환경변수:

- `E2E_BASE_URL` (기본 `http://127.0.0.1:3000`)
- `E2E_API_URL` (기본 `http://127.0.0.1:4000`)

이미 서버/프론트가 떠 있으면 `reuseExistingServer`로 재사용합니다.

### 트러블슈팅

- **macOS AppleDouble (`._*`)** — 외장 볼륨에서 Vitest/Playwright가 `._*.ts`를 테스트로 집어넣어 깨질 수 있습니다.  
  `find . -name '._*' -delete` 후 재실행하고, Playwright는 `testIgnore: **/._*` 를 사용합니다.
- **CORS** — Playwright는 `127.0.0.1`을 씁니다. `server/.env`의 `CORS_ORIGINS`에  
  `http://127.0.0.1:3000` 이 포함되어야 UI 로그인이 됩니다.
- **Vite 캐시** — 훅 export가 안 보이면 `rm -rf node_modules/.vite` 후 `npm run dev` 재시작.
- **결과물 경로** — 볼륨 권한 이슈를 피하려고 Playwright `outputDir` / HTML report는 `/tmp/mucjjippa-*` 를 사용합니다.

## 레거시 스모크 스크립트

기존 `server/scripts/*-e2e.ts`는 **실행 중인 서버**를 대상으로 하는 수동 스모크입니다.

```bash
cd server
npm run dev   # 다른 터미널
npx tsx scripts/match-e2e.ts
npx tsx scripts/tournament-e2e.ts
npx tsx scripts/admin-e2e.ts
```

## 완료 조건 체크

- [x] 핵심 단위 테스트 통과
- [x] API 통합 테스트 통과
- [x] 주요 E2E 통과 (Vitest API E2E + Playwright UI)
- [x] 중복 차감·지급 방지 테스트 통과
- [x] 테스트 실행 방법 문서 (본 파일)

## 디렉터리 구조

```
server/
  tests/
    unit/           # 순수 함수·원장
    integration/    # Fastify inject + Socket.IO
    concurrency/    # 동시성·멱등
    e2e/            # 풀 시나리오 (API)
    helpers/        # fixtures, http, socket
e2e/                # Playwright UI
playwright.config.ts
TESTING.md
```

## Docker에서의 테스트

Compose로 기동한 뒤 호스트에서:

```bash
cd server && npm test
# UI는 WEB_PORT 기준으로 Playwright baseURL 조정
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

운영 배포·백업은 [DEPLOYMENT.md](./DEPLOYMENT.md) 참고.
