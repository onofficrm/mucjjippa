# iCRM AI 포인트 과금 (그누보드 연동)

## 원칙

- **iCRM 잔액 ↔ 그누보드 최고관리자(`cf_admin`) `mb_point` 1:1 연동**
- 포인트 **충전·조정**은 iCRM에서만 (고객 사이트에서 임의 충전 불가)
- AI API **성공 시에만** 포인트 차감 (실패·포인트 부족 = 0P)
- 고객 사이트가 보낸 포인트 값은 **신뢰하지 않음** — iCRM 서버가 `cost_krw` 기준으로 계산

## 과금 정책 (6배)

| 항목 | 값 |
|------|-----|
| 실제 OpenAI API 원가 | `cost_krw` (iCRM 서버 계산) |
| 고객 차감 포인트 | `ceil(cost_krw × 6)` |
| 예시 | 원가 10,000원 → **60,000P** 차감 |

배수는 `_site.config.php` → `icrm_point_cost_multiplier` (기본 `6`)

## 그누보드 구현 (`lib/icrm-point.lib.php`)

| 기능 | 설명 |
|------|------|
| `icrm_point_sync_to_balance()` | iCRM 잔액 → 최고관리자 포인트 1:1 맞춤 |
| `icrm_point_deduct()` | API 성공 후 포인트 차감 (`insert_point`) |
| `icrm_point_apply_api_response()` | iCRM JSON 응답 처리 (SEO·자동댓글 공통) |
| `icrm_point_fetch_balance_from_icrm()` | iCRM 조회 후 동기화 |
| `g5_icrm_point_usage` | 사용 내역 테이블 |

**전제:** 그누보드 **포인트 사용** (`cf_use_point`) ON

## iCRM → 그누보드 포인트 충전 API

iCRM에서 사이트에 포인트를 지급할 때:

```http
POST https://{고객도메인}/icrm/point-sync.php
X-ICRM-Token: {사이트 secret}
Content-Type: application/json

{ "point_balance": 500000, "reason": "월 충전" }
```

응답:

```json
{
  "ok": true,
  "admin_mb_id": "admin",
  "point_balance": 500000,
  "balance_before": 0,
  "balance_after": 500000
}
```

## iCRM 중앙 API (AI generate) — 요청 추가 필드

```json
{
  "license_key": "...",
  "domain": "example.com",
  "request_id": "seo_meta_draft_20260405120000_abc",
  "admin_mb_id": "admin",
  "billing_multiplier": 6
}
```

## iCRM 중앙 API — 성공 응답

```json
{
  "success": true,
  "comment": "생성된 댓글",
  "model": "gpt-4o-mini",
  "prompt_tokens": 100,
  "output_tokens": 30,
  "total_tokens": 130,
  "cost_krw": 10000,
  "points_charged": 60000,
  "point_balance": 440000,
  "message": "success"
}
```

- `points_charged` = iCRM 서버가 `cost_krw × 6` 으로 계산 (클라이언트 값 무시)
- `point_balance` = 차감 후 iCRM 잔액 → 그누보드가 1:1 동기화

## 포인트 부족

```json
{
  "success": false,
  "status": "point_insufficient",
  "message": "포인트가 부족합니다.",
  "points_charged": 0,
  "point_balance": 1200
}
```

## iCRM 잔액 조회 API

```http
POST https://icrm.co.kr/api/site/point-balance
{ "license_key": "...", "domain": "example.com", "admin_mb_id": "admin" }
```

```json
{ "success": true, "point_balance": 500000 }
```

## 그누보드 → iCRM 충전 신청 API

그누보드 관리자 `SEO 메타 > iCRM 연동 > iCRM 포인트 충전 신청`에서 호출합니다.
이 단계에서는 그누보드 포인트를 직접 올리지 않습니다. iCRM 관리자가 승인한 뒤 고객 사이트
`/icrm/point-sync.php`를 호출해야 실제 포인트가 사용 가능합니다.

```http
POST https://icrm.co.kr/api/site/point-charge-request
Content-Type: application/json

{
  "license_key": "...",
  "domain": "example.com",
  "request_id": "point_charge_20260605125500_abcd",
  "admin_mb_id": "admin",
  "amount_krw": 50000,
  "requested_points": 50000,
  "depositor": "홍길동",
  "memo": "세금계산서 요청",
  "callback_url": "https://example.com/icrm/point-sync.php"
}
```

iCRM 응답:

```json
{
  "success": true,
  "status": "pending",
  "message": "충전 신청이 접수되었습니다. 승인 후 반영됩니다."
}
```

iCRM 승인 시:

```http
POST {callback_url}
X-ICRM-Token: {사이트 secret}

{ "point_balance": 550000, "reason": "iCRM 포인트 충전 승인" }
```

## 적용 모듈

- `plugin/auto_comment/` — iCRM 댓글 AI
- `lib/seo-meta.lib.php` — SEO·GEO·초안·FAQ·ALT AI
- 관리자: SEO 메타 > iCRM 연동 · 자동댓글 > AI 사용기록

## iCRM 서버 개발 체크리스트

- [ ] 사이트별 `point_balance` · `admin_mb_id` (cf_admin) 1:1 매핑
- [ ] generate 성공 시 `cost_krw` 계산 → `points_charged = ceil(cost_krw × 6)`
- [ ] `request_id` 중복 차감 방지
- [ ] `point-charge-request` 접수·승인 UI
- [ ] 충전 승인 시 고객 `/icrm/point-sync.php` 호출 또는 고객 관리자 「포인트 동기화」
