# ADMIN_GUIDE

## 접근

1. 관리자 계정으로 로그인 (`admin` / 시드 비밀번호 — **운영에서는 즉시 변경**)
2. 설정 또는 개발 패널 → **관리자센터** (`admin_center`)
3. API는 `/api/admin/*` — `ADMIN` 또는 `SUPER_ADMIN` 역할 필요

시드 계정 (demo seed):

| loginId | role | 비고 |
|---------|------|------|
| `admin` | ADMIN | 일반 운영 |
| `superadmin` | SUPER_ADMIN | 강제 조치·특별 권한 |

## 탭 개요

| 영역 | 기능 |
|------|------|
| 대시보드 | 유저·매치·토너먼트·부정신호 요약 |
| 사용자 | 목록·상태 변경(정지 등)·지갑 조정 |
| 토너먼트 | 생성·수정·상태 액션·보상 설정 |
| 공지 | 작성·게시·긴급/고정 |
| 모니터 | 라이브·오류·중복 감지 |
| 감사 로그 | 관리자 행위 추적 |
| 보안 | FraudSignal 목록·스캔·리뷰, 2FA 등록 |

## 2FA

1. 보안 탭에서 enroll → OTP 시크릿/URI 확인
2. Authenticator 앱에 등록 후 confirm
3. 현재는 **등록·검증 API 준비**, 로그인 강제 연동은 후속 작업

## 주의

- 지갑 credit/debit 는 원장에 기록됩니다. 사유(`reason`)를 남기세요.
- 데모 시드 공지·유저는 운영 전에 정리하세요.
- production 에서 Swagger(`/api/docs`) 비노출을 확인하세요.

세부 보안 정책: [SECURITY.md](./SECURITY.md)
