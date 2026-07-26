# 콘텐츠 수집기 (그누보드 클라이언트)

URL 수집·AI 재생성은 **iCRM 중앙 API**에서 실행하고, 그누보드는 초안 수신·검토·게시판 발행만 담당합니다.

## 접속

- URL: `/plugin/content_collector/admin/index.php`
- 메뉴: 관리자 → 게시판관리 → **콘텐츠 수집**
- UI: 순위체크·자동댓글과 동일한 iCRM 스타일 독립 페이지

## 흐름

```text
[관리자] URL 수집 요청
    ↓ POST /api/content-collector/collect
[iCRM] 크롤링 · AI 재생성 · 포인트 차감
    ↓ POST /icrm/content-import.php
[그누보드] 초안함 저장 (status=review)
    ↓ 관리자 검토
[그누보드] 게시판 발행 → wr_seo_title · SEO 메타 · 순위 키워드 연결
```

## 그누보드 수신 API

### POST `/icrm/content-import.php`

인증: `X-ICRM-Token` 또는 `?token=` (`point-sync.php` 와 동일)

```json
{
  "license_key": "...",
  "domain": "example.com",
  "request_id": "content_import_20260605120000_abc",
  "icrm_job_id": "job_123",
  "source_url": "https://competitor.com/post",
  "source_hash": "sha256...",
  "source_title": "원문 제목",
  "bo_table": "blog",
  "mb_id": "admin",
  "ca_name": "",
  "subject": "재생성 제목",
  "content_html": "<p>...</p>",
  "seo": {
    "title": "",
    "description": "",
    "keywords": "",
    "faq": [{"q": "...", "a": "..."}]
  },
  "rank_keywords": ["키워드1", "키워드2"],
  "cost_krw": 500,
  "points_charged": 3000,
  "point_balance": 497000
}
```

성공 응답:

```json
{
  "ok": true,
  "ici_id": 12,
  "request_id": "content_import_...",
  "status": "review",
  "bo_table": "blog",
  "mb_id": "admin",
  "message": "콘텐츠 초안이 저장되었습니다."
}
```

- `source_hash` 미전송 시 `sha256(domain|source_url)` 자동 생성
- 동일 `source_hash` 중복 시 `duplicate: true` 반환 (rejected 제외)

## iCRM API (서버 구현 필요)

### POST `/api/content-collector/collect`

관리자 UI에서 URL 수집 요청 시 호출됩니다.

```json
{
  "license_key": "...",
  "domain": "example.com",
  "request_id": "content_collect_20260605120000_abc",
  "admin_mb_id": "admin",
  "billing_multiplier": 6,
  "source_url": "https://competitor.com/post",
  "bo_table": "blog",
  "mb_id": "admin",
  "callback_url": "https://example.com/icrm/content-import.php"
}
```

성공 응답 (비동기):

```json
{
  "success": true,
  "job_id": "job_123",
  "message": "수집·재생성 작업이 시작되었습니다.",
  "cost_krw": 0,
  "points_charged": 0
}
```

완료 후 iCRM은 `callback_url`로 재생성 결과를 POST합니다 (`content-import.php` 스펙).

## 그누보드 DB

- `{prefix}icrm_content_items` — 수집 초안 (review / published / rejected)
- `{prefix}icrm_content_jobs` — 그누보드 → iCRM 수집 요청 이력

## 설정 (`_site.config.php`)

| 키 | 설명 |
|---|---|
| `content_collector_builtin` | 모듈 사용 (기본 true) |
| `icrm_content_api_base_url` | iCRM API (기본 `https://icrm.co.kr/api/content-collector`) |
| `icrm_content_default_bo_table` | 기본 게시판 |
| `icrm_content_default_mb_id` | 기본 작성자 (비우면 cf_admin) |

라이선스·토큰·포인트는 SEO 메타 / iCRM 연동 설정과 공유합니다.

## 발행 시 처리

1. 그누보드 `write` 테이블 INSERT (html1)
2. `icrm_ensure_wr_seo_title()` slug 보정
3. `g5b_seo_meta_save('posts', ...)` SEO 메타 저장
4. `icrm_rank_save_target()` 순위체크 키워드 등록 (모듈 설치 시)
