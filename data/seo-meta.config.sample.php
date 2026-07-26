<?php
/**
 * iCRM SEO API 연동 (사이트마다 1회 복사)
 *
 * cp data/seo-meta.config.sample.php data/seo-meta.config.php
 *
 * 또는 관리자 → SEO 메타 관리 → iCRM 연동에서 저장하면 자동 생성됩니다.
 * Git·고객 전달 ZIP에 data/seo-meta.config.php(라이선스 키)는 넣지 마세요.
 *
 * 자동댓글 모듈에 iCRM 라이선스가 이미 있으면 공유 사용 가능합니다.
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

define('G5B_SEO_ICRM_LICENSE_KEY', '');
define('G5B_SEO_ICRM_API_BASE_URL', 'https://icrm.co.kr/api/seo-meta');
