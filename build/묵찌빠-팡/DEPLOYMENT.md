# DEPLOYMENT

## 서버 권장 사양

| 구분 | 최소 | 권장 (초기 운영) |
|------|------|------------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB+ SSD |
| OS | Ubuntu 22.04 / Docker | 동일 |
| DB | PostgreSQL 16 | 별도 인스턴스 권장 |
| Cache | Redis 7 | AOF 또는 managed Redis |

동시 매칭·토너먼트 규모가 커지면 API 서버와 DB를 분리하고 Redis를 managed로 이전합니다.

## 환경 분리

| 티어 | Compose | Seed | Docs |
|------|---------|------|------|
| development | `docker-compose.yml` + `deploy/env/development.env.example` | demo | ON |
| staging | + `docker-compose.prod.yml` + staging env | catalog | ON |
| production | + prod.yml + production env | 기본 OFF | OFF |

`NODE_ENV`와 `APP_ENV`를 함께 설정합니다. 스테이징은 `NODE_ENV=production`, `APP_ENV=staging` 조합을 권장합니다.

## Docker 배포

```bash
# 개발
cp deploy/env/development.env.example .env.docker
# 비밀값 수정 후
docker compose --env-file .env.docker up --build -d

# 스테이징
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --env-file deploy/env/staging.env.example up --build -d

# 프로덕션 (비밀은 실파일/.env로 — 예시 파일을 그대로 쓰지 말 것)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --env-file .env.production up --build -d
```

서비스: **web** (Nginx) · **server** (Fastify) · **postgres** · **redis**

엔트리포인트가 `prisma migrate deploy` 후 서버를 기동합니다.  
최초 카탈로그 시드: `RUN_SEED=true SEED_MODE=catalog`

## 수동 빌드 (Docker 없이)

```bash
# 서버
cd server && npm ci && npx prisma generate && npm run build
npx prisma migrate deploy
NODE_ENV=production APP_ENV=production node dist/index.js

# 프론트
cd .. && npm ci
VITE_USE_MOCK=false VITE_API_BASE_URL=https://api.example.com/api npm run build
# dist/ → CDN 또는 Nginx
```

## Health / Graceful shutdown

- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready` (DB+Redis)
- SIGTERM/SIGINT → Fastify close → Redis/Prisma disconnect

로드밸런서는 readiness가 503이면 트래픽을 빼세요.

## 로그

- 기본: stdout (JSON in non-dev)
- `LOG_DIR` 설정 시 `server.log` 파일 추가 (`docker` 볼륨 `server_logs`)
- 수집: Docker/journald → Loki/CloudWatch 등 (운영 선택)

## 오류 추적

- `SENTRY_DSN` 설정 + (선택) `npm i @sentry/node`
- DSN만 있으면 초기화 시도, 패키지 없으면 경고 후 계속 기동

## 백업 정책

| 항목 | 정책 |
|------|------|
| 대상 | PostgreSQL 전체 (`pg_dump`) |
| 주기 | 최소 매일 1회 (운영), 토너먼트 전후 추가 권장 |
| 보관 | 14일 로컬 + 주 1회 오프사이트(오브젝트 스토리지) |
| Redis | AOF 켜둠. 유실 시 매칭 큐만 영향 — DB가 원장 소스 |
| 검증 | 월 1회 staging에 restore 드릴 |

```bash
chmod +x deploy/scripts/*.sh
./deploy/scripts/backup-db.sh
./deploy/scripts/restore-db.sh deploy/backup/mucjjippa_YYYYMMDD_HHMMSS.sql.gz
```

## 장애 복구

1. **API 다운**: `docker compose ps` → server 로그 → `/api/health/ready`  
   재기동: `docker compose restart server`
2. **DB 연결 실패**: postgres health · `DATABASE_URL` · disk full
3. **데이터 손상/실수**: 최근 `pg_dump` 복구 → migrate 상태 확인 → server 재기동
4. **Redis 장애**: 매칭 불가. Redis 복구 후 server 재기동. 지갑·이력은 DB에 유지
5. **배포 롤백**: 이전 이미지 태그로 `compose up` + 필요 시 DB 백업 복구

## 운영 전 필수

- [ ] 강한 JWT 시크릿·DB 비밀번호 교체
- [ ] `CORS_ORIGIN`을 실제 도메인만 허용
- [ ] HTTPS 종료(리버스 프록시)
- [ ] `SEED_MODE=catalog`, 데모 계정 비밀번호 변경 또는 삭제
- [ ] 백업 크론 등록·복구 드릴
- [ ] Sentry(또는 동등) DSN
- [ ] 관리자 2FA 등록 (`ADMIN_GUIDE.md`)
- [ ] `EXPOSE_API_DOCS=false` (production)

## 다음 개발 우선순위 (제안)

1. PG/광고 SDK 실연동
2. 관전·채팅 고부하 채널 분리
3. 관리자 로그인 2FA 강제
4. 수평 확장(Socket sticky / Redis adapter)
5. CDN·이미지 최적화
