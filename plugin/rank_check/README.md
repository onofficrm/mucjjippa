# 게시글 순위체크 (그누보드 클라이언트)

네이버·구글 검색 순위는 **iCRM 중앙 API**에서 수집하고, 그누보드는 결과 표시·키워드 관리만 담당합니다.

## 접속

- URL: `/plugin/rank_check/admin/index.php`
- 메뉴: 관리자 → 게시판관리 → **게시글 순위**
- UI: 그누보드 기본 admin.skin 미사용 (자동댓글·iCRM 스타일 독립 페이지)

## iCRM API (서버 구현 필요)

### POST `/api/rank-check/check`

```json
{
  "license_key": "...",
  "domain": "example.com",
  "request_id": "rank_check_check_20260605120000_abc",
  "admin_mb_id": "admin",
  "billing_multiplier": 6,
  "engines": ["naver", "google"],
  "items": [
    {
      "bo_table": "blog",
      "wr_id": 123,
      "url": "https://example.com/blog/post-slug/",
      "keywords": ["강남 임플란트", "임플란트 비용"],
      "engines": ["naver", "google"]
    }
  ]
}
```

성공 응답:

```json
{
  "success": true,
  "results": [
    {
      "bo_table": "blog",
      "wr_id": 123,
      "keyword": "강남 임플란트",
      "engine": "naver",
      "rank": 7,
      "rank_prev": 10,
      "matched_url": "https://example.com/blog/post-slug/",
      "status": "found",
      "checked_at": "2026-06-05 12:00:00"
    }
  ],
  "cost_krw": 120,
  "points_charged": 720,
  "point_balance": 499280
}
```

- `rank`: 1~100, 0 = 100위 밖/미노출
- `status`: `found` | `not_found` | `url_mismatch` | `error`
- 과금: `points_charged = ceil(cost_krw × billing_multiplier)`

포인트 부족:

```json
{
  "success": false,
  "status": "point_insufficient",
  "message": "포인트가 부족합니다.",
  "points_charged": 0,
  "point_balance": 500
}
```

## 그누보드 DB

- `{prefix}icrm_rank_targets` — 게시글별 키워드·URL
- `{prefix}icrm_rank_results` — 키워드×엔진별 순위 이력
- `{prefix}icrm_rank_checks` — API 호출 로그

## 설정 (`_site.config.php`)

```php
'rank_check_builtin'     => true,
'icrm_rank_api_base_url' => 'https://icrm.co.kr/api/rank-check',
```

라이선스 키는 SEO 메타 / 자동댓글과 공유 (`icrm_license_key`).
