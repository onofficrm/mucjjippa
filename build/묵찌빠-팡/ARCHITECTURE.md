# ARCHITECTURE

## 개요

```
┌─────────────┐     HTTPS/WS      ┌──────────────┐
│  Web (Vite  │ ◄──────────────► │  Server       │
│  / Nginx)   │   /api · socket  │  Fastify      │
└─────────────┘                  │  + Socket.IO  │
                                 └──────┬───────┘
                        ┌───────────────┼───────────────┐
                        ▼               ▼               ▼
                  PostgreSQL         Redis          (optional)
                  Prisma ORM      매칭 큐·캐시       Sentry
```

## 레이어

| 계층 | 위치 | 역할 |
|------|------|------|
| UI | `src/pages`, `src/components` | 화면·연출 (디자인 유지) |
| Orchestration | `src/context/GameContext.tsx` | 네비·세션·매칭/토너먼트 오케스트레이션 |
| Client services | `src/services/*` | HTTP/Socket 어댑터 |
| API | `server/src/routes/*` | REST |
| Realtime | `server/src/plugins/socket.ts`, `modules/match`, `modules/tournament` | 게임 권위 서버 |
| Domain | `server/src/modules/*` | 원장·판정·대진·보안 |
| Persistence | Prisma + PostgreSQL | 사용자·지갑·매치·토너먼트 |
| Cache/Queue | Redis | 매칭 큐 등 |

## 권위(Authority)

- **승패·포인트·티켓**는 서버가 결정한다. 클라이언트는 표시·입력만 담당.
- 지갑 변경은 `WalletTransaction` + `transactionKey` 멱등으로 중복 방지.
- 소켓 핸드셰이크에서 JWT 검증 + DB 상태 재확인.

## 환경

- `NODE_ENV`: Node 런타임 (`development` \| `test` \| `production`)
- `APP_ENV`: 배포 티어 (`development` \| `staging` \| `production`)
- 프론트 `VITE_APP_ENV` / `VITE_USE_MOCK` — 기본은 실서버 연결, 광고 등 일부만 Mock

## 프로세스 수명

1. `buildApp()` → 플러그인·라우트·Swagger
2. `listen` → Socket 플러그인 onReady
3. `SIGINT`/`SIGTERM` → `app.close()` → Redis/Prisma disconnect (graceful shutdown)

## 관련 문서

- [DATABASE.md](./DATABASE.md)
- [API.md](./API.md)
- [SOCKET_EVENTS.md](./SOCKET_EVENTS.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
