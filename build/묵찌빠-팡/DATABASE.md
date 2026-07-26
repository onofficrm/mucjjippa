# DATABASE

## 스택

- PostgreSQL 16 (권장)
- Prisma ORM (`server/prisma/schema.prisma`)
- 마이그레이션: `server/prisma/migrations/`

## 주요 도메인

| 영역 | 모델 예시 |
|------|-----------|
| 계정 | `User`, `UserSettings`, refresh 세션 |
| 지갑 | `Wallet`, `WalletTransaction` (멱등 `transactionKey`) |
| 매치 | `Match`, 라운드/선택 기록 |
| 토너먼트 | `Tournament`, 참가·대진·보상 |
| 상점 | `ShopItem`, 인벤토리 |
| 운영 | `Notice`, `AuditLog`, `FraudSignal` |

## 명령

```bash
cd server
npx prisma migrate deploy    # 운영/CI
npx prisma migrate dev       # 로컬 스키마 변경
npx prisma generate
npm run db:seed:catalog      # 아바타·칭호·상점·관리자만
npm run db:seed:demo         # + 데모 유저·토너먼트·매치
npm run db:setup             # deploy + seed(기본 demo)
```

## Seed 분리

| `SEED_MODE` | 내용 | 권장 |
|-------------|------|------|
| `catalog` | 카탈로그 + admin/superadmin | staging/production 초기화 |
| `demo` | catalog + dorirang·user01~30·토너먼트 등 | development |

프로덕션에서는 `RUN_SEED=false` 기본. 최초 1회만 `SEED_MODE=catalog RUN_SEED=true` 로 기동 가능.

## 백업

[`DEPLOYMENT.md`](./DEPLOYMENT.md) 및 `deploy/scripts/backup-db.sh` 참고.

## 주의

- 잔액은 **원장 트랜잭션**으로만 변경. 화면에서 직접 계산·저장하지 않음.
- `migrate reset` 은 데이터 삭제 — 운영에서 금지.
