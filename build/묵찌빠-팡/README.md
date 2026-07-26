# 묵찌빠 팡

실시간 가위바위보(묵찌빠) 대전·토너먼트 웹 게임입니다.  
Vite + React 프론트엔드와 Fastify + Prisma + PostgreSQL + Redis 백엔드로 구성됩니다.

## 빠른 시작 (로컬)

```bash
# 1) DB·Redis 준비 후 서버
cd server
cp .env.example .env   # DATABASE_URL 수정
npm install
npx prisma migrate deploy
npm run db:seed:demo
npm run dev            # http://localhost:4000

# 2) 프론트 (다른 터미널)
cd ..
cp .env.example .env
npm install
npm run dev            # http://localhost:3000
```

헬스: `curl http://localhost:4000/api/health`  
OpenAPI: http://localhost:4000/api/docs

## Docker Compose

```bash
cp deploy/env/development.env.example .env.docker
docker compose --env-file .env.docker up --build
# web http://localhost:3000  ·  API http://localhost:4000
```

스테이징/프로덕션 오버라이드: [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## 문서 인덱스

| 문서 | 내용 |
|------|------|
| [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) | 현황·기능 분석 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 시스템 구조 |
| [DATABASE.md](./DATABASE.md) | DB·마이그레이션·시드 |
| [API.md](./API.md) | REST API 요약 |
| [SOCKET_EVENTS.md](./SOCKET_EVENTS.md) | Socket.IO 이벤트 |
| [SECURITY.md](./SECURITY.md) | 보안 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 배포·백업·복구 |
| [TESTING.md](./TESTING.md) | 테스트 실행 |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | 관리자센터 |
| [server/README.md](./server/README.md) | 서버 상세 |

## 환경 구분

| APP_ENV | 용도 | Seed | OpenAPI |
|---------|------|------|---------|
| `development` | 로컬 | `demo` 권장 | 노출 |
| `staging` | 검증 | `catalog` | 노출 |
| `production` | 운영 | 기본 미실행 | 비노출 |

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 프론트 개발 서버 |
| `npm run build` | 프론트 프로덕션 빌드 |
| `npm test` | 서버 Vitest |
| `npm run test:e2e` | Playwright UI |
| `npm run test:all` | 서버 + Playwright |
| `npm run docker:up` | Compose 개발 기동 |

앱 내 개발 현황: 로그인 후 `/development-status` (또는 설정·개발 패널에서 진입).
