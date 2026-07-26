# API

Base path: `/api` (동일 라우트가 `/api/v1` 에도 마운트)

대화형 문서: **http://localhost:4000/api/docs** (OpenAPI 3 / Swagger UI)  
스펙 파일: `server/openapi/openapi.json`

## 공통

- 성공: `{ "success": true, "data": ... }`
- 실패: `{ "success": false, "error": { "code", "message" } }`
- 인증: `Authorization: Bearer <accessToken>`
- Refresh: HTTP-only 쿠키 (`credentials: include`)
- Rate limit: 전역 분당 200
- Body limit: 128 KiB

## 주요 엔드포인트

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| GET | `/health` | Liveness | — |
| GET | `/health/ready` | DB+Redis readiness | — |
| GET | `/version` | 버전·APP_ENV | — |
| POST | `/auth/signup` | 회원가입 | — |
| POST | `/auth/login` | 로그인 | — |
| POST | `/auth/guest` | 게스트 | — |
| POST | `/auth/refresh` | 토큰 갱신 | cookie |
| POST | `/auth/logout` | 로그아웃 | optional |
| GET | `/auth/me` | 세션 | Bearer |
| GET/PATCH | `/users/me/*` | 프로필·설정 | Bearer |
| GET | `/wallet` | 잔액 | Bearer |
| GET | `/wallet/transactions` | 원장 | Bearer |
| GET | `/shop/*` | 상점 | 일부 공개 |
| POST | `/shop/purchase` | 구매 (멱등) | Bearer |
| GET/POST | `/tournaments/*` | 목록·참가·취소·대진 | 참가 시 Bearer |
| GET | `/watch/*` | 관전 목록/상세 | — |
| GET | `/rankings/*` | 랭킹 | — |
| GET/POST | `/missions/*` | 미션 | Bearer |
| GET | `/notices` | 공지 | — |
| * | `/admin/*` | 관리자 | ADMIN+ |

관리자·보안 세부: [ADMIN_GUIDE.md](./ADMIN_GUIDE.md), [SECURITY.md](./SECURITY.md)

실시간 매칭은 REST보다 Socket.IO — [SOCKET_EVENTS.md](./SOCKET_EVENTS.md)
