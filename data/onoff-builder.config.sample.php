<?php
/**
 * 온오프빌더 공통 API 설정 파일
 *
 * 사용 방법:
 * 1. 이 파일을 data/onoff-builder.config.php 로 복사합니다.
 * 2. 아래 라이선스/API 키 값을 입력합니다.
 * 3. 이 파일 하나로 자동댓글, SEO 메타, 사이트 업데이트, 디자인 배포가 같은 키를 사용합니다.
 *
 * 주의: 실제 키가 들어간 data/onoff-builder.config.php 는 외부에 공유하지 마세요.
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

/** 온오프빌더 라이선스 키 (자동댓글/SEO/업데이트/빌더배포 공통) */
define('ONOFF_BUILDER_LICENSE_KEY', '');

/** 중앙 API URL들: 특별한 경우가 아니면 기본값 그대로 둡니다. */
define('ONOFF_BUILDER_G5_UPDATE_API_BASE_URL', 'https://icrm.co.kr/api/g5-update');
define('ONOFF_BUILDER_DEPLOY_API_BASE_URL', 'https://icrm.co.kr/api/builder-deploy');
define('ONOFF_BUILDER_AUTO_COMMENT_API_BASE_URL', 'https://icrm.co.kr/api/auto-comment');
define('ONOFF_BUILDER_SEO_META_API_BASE_URL', 'https://icrm.co.kr/api/seo-meta');
define('ONOFF_BUILDER_POINT_API_BASE_URL', 'https://icrm.co.kr/api/site');
define('ONOFF_BUILDER_RANK_API_BASE_URL', 'https://icrm.co.kr/api/rank-check');
define('ONOFF_BUILDER_CONTENT_API_BASE_URL', 'https://icrm.co.kr/api/content-collector');

/**
 * 직접 Gemini 모드를 쓸 때만 입력합니다.
 * 기본 자동댓글은 온오프빌더 중앙 AI API를 사용하므로 비워도 됩니다.
 */
define('ONOFF_BUILDER_GEMINI_API_KEY', '');
define('ONOFF_BUILDER_GEMINI_MODEL', 'gemini-2.0-flash-lite');
