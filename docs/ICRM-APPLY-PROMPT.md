# iCRM 프로젝트 적용 프롬프트 (복사용)

아래 블록을 **Cursor 새 채트**에 그대로 붙여넣으세요.  
대상 프로젝트: `onoffcrm_v1` (iCRM 서버) + 고객 그누보드 사이트.

**최종 점검일:** 2026-06-09  
**현재 중앙 릴리스:** `2026.06.08.21` (icrm-full, 197 files)

---

## 진단 요약 — “최신이 2026.06.05.9로 나옴”

| 구분 | 상태 |
|------|------|
| icrm.co.kr 중앙 `data/g5-update/current` | **2026.06.08.21** (2026-06-09 rsync 배포 완료) |
| headnerve / ansojang 로컬 사이트 | **2026.06.05.9** (아직 pull 안 함) |
| 화면에 둘 다 `.05.9` + “최신” | 중앙이 `.05.9`일 때 찍은 스크린샷이거나, **상태 새로고침 전** |

**원인:** GitHub Actions `deploy.yml`은 `git pull`만 하고 **`data/g5-update/`는 자동 갱신하지 않음**.  
publish 후 **`onoff-update-deploy-icrm.sh --upload`** 로 별도 rsync 필요.

**지금 API 검증 (headnerve 라이선스):**
```bash
curl -s -X POST https://icrm.co.kr/api/g5-update/manifest \
  -H 'Content-Type: application/json' \
  -d '{"license_key":"HEADNERVE_LICENSE","domain":"headnerve.iwinv.net","bundle":"icrm-full","release_id":"2026.06.05.9"}'
# 기대: release_id 2026.06.08.21, update_available true
```

**고객 사이트 조치:** 환경설정 → iCRM 업데이트 → **「다시 확인 · 업데이트」** → `2026.06.08.21` pull

---

## 프롬프트 ① — iCRM 서버(onoffcrm_v1) 운영 반영

```text
onoff-builder-bridge / onoffcrm_v1 기준으로 iCRM 운영 서버(icrm.co.kr)에
미반영 변경을 적용해 주세요.

## 소스 (개발 PC)
- 빌더: /Volumes/onoff/cursor/onoff-builder-bridge
- iCRM 로컬: /Volumes/onoff/cursor/onoffcrm_v1
- 중앙 릴리스: 2026.06.08.21

## 이번에 icrm.co.kr에 반영해야 할 것 (git push만으로는 부족)

### A. g5-update 중앙 릴리스 (필수 — 고객 사이트 “최신 버전”의 기준)
cd /Volumes/onoff/cursor/onoff-builder-bridge
export ICRM_SSH="root@115.68.230.52"
export ICRM_REMOTE="/var/www/onoffcrm"
export RSYNC_RSH="ssh -i ~/.ssh/onoff_server_ed25519"
./setup/tools/onoff-update-deploy-icrm.sh --pack-only --upload

검증:
curl -s https://icrm.co.kr/data/g5-update/current/manifest.json | grep release_id
# → "release_id": "2026.06.08.21"

### B. onoffcrm_v1 PHP 소스 (git → Actions)
onoffcrm_v1에서 커밋·푸시할 항목:
1. extend/onoff_g5_site_ai.extend.php
   - 포인트 push 동기화 시 icrm_member 잔액 사용 (site_pool 0P 버그 수정)
2. theme/rb.basic/onoff_head.php
   - 메뉴명 「댓글프로그램관리」→「그누보드 AI API 관리」
3. (선택) onoff_ajax_naver_rank.php Google bulk rank stripslashes fix

git push origin main → GitHub Actions deploy (/var/www/onoffcrm)

### C. DB 운영 데이터 (수동)
ansojang.iwinv.net 고객 사이트:
- g5_comment_program_sites.icrm_member_mb_id = 'qudakwkd1' (500,000P 회원 연동)
- 확인: point-balance API가 balance_source icrm_member, point_balance 500000 반환

## iCRM 서버 API 경로 (루트 = /var/www/onoffcrm)
- api/g5-update/manifest/ · file/
- api/site/point-balance/ · point-charge-request/
- api/builder-deploy/manifest/ · file/ · publish/
- extend/onoff_g5_update.extend.php
- extend/onoff_g5_site_ai.extend.php
- data/g5-update/current/

## 주의
- data/g5-update/ 는 git deploy와 별도 rsync 필수
- extend 파일 권한 644, api·data 755 (www-data 읽기)
- find api extend -name '._*' -delete
```

---

## 프롬프트 ② — 고객 그누보드 사이트 적용 (headnerve · ansojang)

```text
고객 그누보드 사이트를 iCRM 중앙 릴리스 2026.06.08.21로 올려 주세요.
중앙 API는 이미 .21인데, 사이트 로컬이 .05.9라 “최신”으로 잘못 보였던 상태입니다.

## 대상
- headnerve.iwinv.net  (로컬: /Volumes/onoff/cursor/headnerve)
- ansojang.iwinv.net

## 방법 A — 관리자 UI (운영 중, 권장)
1. 최고관리자 로그인
2. 환경설정 → iCRM 업데이트 (또는 iCRM 회원 포털 → 사이트 업데이트)
3. 「상태 새로고침」 → iCRM 최신 버전이 2026.06.08.21 인지 확인
4. 「다시 확인 · 업데이트」 또는 「지금 업데이트」 실행
5. 이 사이트 버전 = 2026.06.08.21 확인

## 방법 B — 로컬 apply + git push (headnerve)
cd /Volumes/onoff/cursor/onoff-builder-bridge
php setup/tools/onoff-update-apply.php /Volumes/onoff/cursor/headnerve \
  --bundle=icrm-full --release=2026.06.08.21

cd /Volumes/onoff/cursor/headnerve
git add -A && git reset _backup/ .onoff-update-state.json '**/._*'
git commit -m "feat: iCRM 2026.06.08.21 — 포인트 동기화·업데이트 패널 개선"
git push origin main

## 적용 후 포인트 동기화 (ansojang 등)
1. icrm.co.kr 그누보드 AI API 관리 → 고객 사이트 → icrm_member_mb_id 확인
2. 그누보드 SEO 관리 → iCRM 포인트 동기화 (또는 iCRM 허브 → 포인트)
3. admin 회원 포인트가 iCRM 잔액과 일치하는지 확인
4. SEO AI 버튼 테스트 — “포인트가 부족합니다” 사라져야 함

## _site.config.php 확인
'icrm_update_api_base_url'  => 'https://icrm.co.kr/api/g5-update',
'icrm_point_api_base_url'    => 'https://icrm.co.kr/api/site',
'icrm_update_auto_sync'     => true,
```

---

## 프롬프트 ③ — onoffcrm_v1 코드베이스 동기화

```text
onoff-builder-bridge 최신 dist를 onoffcrm_v1 로컬과 맞추고,
운영(icrm.co.kr)에 반영해 주세요.

## 동기화
/Volumes/onoff/cursor/onoff-builder-bridge/setup/onoff-update/dist/icrm-production/
  → /Volumes/onoff/cursor/onoffcrm_v1/

또는:
cd /Volumes/onoff/cursor/onoff-builder-bridge
php setup/tools/onoff-update-publish.php --release=2026.06.08.22
# (새 릴리스 필요 시) → 자동으로 ../onoffcrm_v1/data/g5-update/current 갱신

## onoffcrm_v1에 남아 있는 미커밋 핵심
- extend/onoff_g5_site_ai.extend.php  (포인트 sync → icrm_member 잔액)
- theme/rb.basic/onoff_head.php       (메뉴명 변경)
- data/g5-update/current/             (로컬 .21, 운영은 rsync로 이미 반영)

## 개선 제안 (선택)
deploy.yml에 g5-update rsync 스텝 추가 검토:
- publish 후 secrets 기반 ./setup/tools/onoff-update-deploy-icrm.sh --upload
- 또는 deploy 후 curl로 manifest release_id 검증 step
```

---

## 릴리스 이력 (2026.06.08.x)

| Release | 내용 |
|---------|------|
| .19 | g5-update API JSON 파싱 (redirect·decode) |
| .20 | `.htaccess` path allow (g5-update file API) |
| .21 | 플랫폼 스킨·회원 포털·icrm-point 자동 sync 개선 등 (197 files) |

## 패키지 버전 (.21 기준)

| 패키지 | 버전 |
|--------|------|
| icrm-core | 1.4.10 |
| icrm-point | 1.0.8 |
| icrm-update | 1.1.0 |
| icrm-member | 1.0.14 |
| seo-meta | 1.4.6 |
| builder-bridge | 0.8.2 |

---

## 한 줄 요약

1. **중앙 버전 오류** → icrm.co.kr `data/g5-update/current` rsync (`--upload`) — **완료 시 .21**
2. **고객 사이트 “최신” 오표시** → 사이트 로컬이 옛날 버전; **pull 하면 해결**
3. **포인트 불일치** → `icrm_member_mb_id` 연동 + 그누보드 포인트 동기화
4. **iCRM PHP** → onoffcrm_v1 커밋·푸시 (extend·메뉴명)
