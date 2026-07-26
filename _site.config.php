<?php
/**
 * 사이트 공통 설정 (새 프로젝트마다 이 파일만 우선 수정)
 * 경로: /_site.config.php
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

$site_config = array(
    'site_name'           => '샘플 사이트',
    'site_desc'           => '빌더 디자인 적용이 쉬운 그누보드 베이스 템플릿',
    'company_name'        => '회사명',
    'ceo_name'            => '대표자명',
    'business_no'         => '000-00-00000',
    'phone'               => '010-0000-0000',
    'kakao_url'           => '#',
    'email'               => 'help@example.com',
    'address'             => '주소를 입력하세요',
    'primary_color'       => '#2563eb',
    'secondary_color'     => '#64748b',
    'logo_path'           => '/img/logo/logo.svg',
    'og_image'            => '/img/common/og-image.jpg',
    /* SEO (components/seo-meta.php) */
    'seo_title'           => '',
    'seo_description'     => '',
    'main_keyword'        => '',
    'sub_keywords'        => '',
    'robots'              => 'index,follow',
    'consultation_text'   => '상담문의',
    'footer_desc'         => '고객의 성장을 돕는 웹사이트 제작 베이스입니다.',
    /* 문의 폼 → inquiry 게시판 (proc/inquiry-submit.php) */
    'inquiry_bo_table'        => 'inquiry',
    'inquiry_notify_enabled'  => true,
    'inquiry_notify_email'    => 'admin@example.com',  /* 운영 시 실제 수신 주소로 변경 */
    'inquiry_notify_name'     => '관리자',
    /* 텔레그램 알림 — 운영 시 토큰·채팅 ID 입력 후 enabled true */
    'inquiry_notify_telegram_enabled'  => false,
    'inquiry_notify_telegram_bot_token' => '',
    'inquiry_notify_telegram_chat_id'   => '',
    /* 웹훅 알림 (Slack/Discord 등) — 추후 확장 */
    'inquiry_notify_webhook_enabled' => false,
    'inquiry_notify_webhook_url'     => '',
    /* 문의 접수 완료 페이지 (상대 경로) */
    'inquiry_thanks_url'      => '/page/inquiry-thanks.php',
    /* 전환·방문 추적 ID — 비우면 출력 안 함 */
    'gtm_id'              => '',
    'ga4_id'              => '',
    'meta_pixel_id'       => '',
    'naver_analytics_id'  => '',
    'kakao_pixel_id'      => '',
    /* 선택 항목 (비워 두면 기본값 사용) */
    'fax'                 => '',
    'sales_no'            => '',
    'privacy_manager'     => '',
    'kakao_map_key'       => '',
    'kakao_map_lat'       => '37.5665',
    'kakao_map_lng'       => '126.9780',
    /* Google Maps — 내 주변 찾기 (components/maps, page/map-locator.php) */
    'google_maps_api_key'       => '',
    'map_default_lat'           => '10.3157',
    'map_default_lng'           => '123.8854',
    'map_default_zoom'          => 13,
    'map_use_current_location'  => true,
    'map_default_radius_km'     => 5,
    'map_unit'                  => 'km',
    'map_placeholder_title'     => 'Google Maps API 키가 설정되지 않았습니다.',
    'map_placeholder_desc'      => '_site.config.php에서 google_maps_api_key 값을 입력하면 지도가 표시됩니다.',
    /* iCRM final_url (lib/icrm.lib.php, /icrm/final-url.php) — 사이트 복사마다 토큰만 다름, 도메인은 G5_URL 자동 */
    'icrm_builtin'              => true,
    'icrm_site_base_url'        => '',  /* 비우면 G5_DOMAIN/G5_URL. CDN 등 예외 시만 https://고객도메인 */
    'icrm_secret_token'         => '',  /* 비우면 data/icrm.config.php(자동 생성) 사용 */
    'icrm_allowed_ips'          => '',  /* iCRM 서버 IP, 쉼표 구분 (token 대신 가능) */
    'icrm_css_only_when_markup' => false, /* true: 본문에 icrm-* 있을 때만 icrm-template.css 로드 */
    /* 자동댓글 (plugin/auto_comment + extend/auto_comment.extend.php) — false 시 비활성 */
    'auto_comment_builtin'      => true,
    /* RSS · sitemap · robots (lib/seo-feed.lib.php, rss.php, sitemap.php) */
    'seo_feed_enabled'          => true,
    'sitemap_static_pages'      => '',  /* 비우면 /page/*.php 자동 (제외 목록 제외) */
    'sitemap_exclude_pages'     => '',  /* 추가 제외 경로, 쉼표 구분 */
    'sitemap_exclude_boards'    => 'inquiry',  /* 문의 게시판 등 sitemap/RSS 제외 */
    'sitemap_max_posts_per_board' => '500',
    'sitemap_rss_item_limit'    => '50',
    /* SEO 메타 수동·AI (lib/seo-meta.lib.php, extend/seo-meta.extend.php) — iCRM 중앙 API */
    'seo_meta_builtin'          => true,
    'g5b_seo_post_faq_visible'  => true,  /* 글보기 SEO FAQ 아코디언 (Schema와 동일 데이터) */
    'icrm_license_key'          => '',  /* 권장: data/onoff-builder.config.php 의 ONOFF_BUILDER_LICENSE_KEY */
    'icrm_seo_api_base_url'     => 'https://icrm.co.kr/api/seo-meta',
    /* iCRM AI 포인트 — 로그인 회원 mb_point 기준, API 과금 = 실제 원가×배수 */
    'icrm_point_billing_enabled' => true,
    'icrm_point_cost_multiplier' => '5',
    'icrm_point_api_base_url'    => 'https://icrm.co.kr/api/site',
    'icrm_point_auto_sync'       => false,
    'icrm_point_sync_hours'      => '1',
    /* 게시글 검색 순위 (lib/icrm-rank.lib.php, plugin/rank_check/) — iCRM 중앙 API */
    'rank_check_builtin'         => true,
    'icrm_rank_api_base_url'     => 'https://icrm.co.kr/api/rank-check',
    /* 콘텐츠 수집기 (lib/icrm-content.lib.php, plugin/content_collector/) — iCRM 중앙 API */
    'content_collector_builtin'      => true,
    'icrm_content_api_base_url'      => 'https://icrm.co.kr/api/content-collector',
    'icrm_content_default_bo_table'  => '',  /* 수집 초안 기본 게시판 */
    'icrm_content_default_mb_id'     => '',  /* 기본 작성자 (비우면 cf_admin) */
    /* iCRM 중앙 g5-update (lib/icrm-update.lib.php) — 빌더 publish → iCRM → 사이트 자동 pull */
    'icrm_update_enabled'       => true,
    'icrm_update_api_base_url'  => 'https://icrm.co.kr/api/g5-update',
    'icrm_update_bundle'        => 'icrm-full',
    'icrm_update_auto_sync'     => true,
    'icrm_update_check_hours'   => '24',
    'icrm_hub_enabled'          => true,
    'icrm_hub_geo_button'       => true,
    /* onoff-builder-bridge — 루트 / 를 빌더 페이지로 (project_id) */
    'home_builder_bridge_id'    => '',
);

/**
 * 설정값 조회 (없거나 비어 있으면 $default)
 *
 * @param string $key
 * @param string $default
 * @return string
 */
if (!function_exists('g5site_cfg')) {
    function g5site_cfg($key, $default = '')
    {
        global $site_config;

        if (!isset($site_config) || !is_array($site_config)) {
            return (string) $default;
        }

        if (!array_key_exists($key, $site_config)) {
            return (string) $default;
        }

        $val = $site_config[$key];

        if ($val === null || $val === false) {
            return (string) $default;
        }

        if (is_string($val)) {
            $val = trim($val);
            return $val !== '' ? $val : (string) $default;
        }

        if (is_bool($val)) {
            return $val ? '1' : '';
        }

        return (string) $val;
    }
}

/**
 * bool 설정값 (true/false/1/0/off)
 *
 * @param string $key
 * @param bool   $default
 * @return bool
 */
if (!function_exists('g5site_cfg_bool')) {
    function g5site_cfg_bool($key, $default = false)
    {
        global $site_config;

        if (!isset($site_config) || !is_array($site_config) || !array_key_exists($key, $site_config)) {
            return (bool) $default;
        }

        $val = $site_config[$key];

        if ($val === true || $val === 1 || $val === '1' || $val === 'on' || $val === 'true') {
            return true;
        }
        if ($val === false || $val === 0 || $val === '0' || $val === 'off' || $val === 'false') {
            return false;
        }

        return (bool) $default;
    }
}

/**
 * URL 또는 사이트 루트 기준 경로
 *
 * @param string $key site_config 키 (logo_path, og_image 등)
 * @param string $default
 * @return string
 */
if (!function_exists('g5site_cfg_url')) {
    function g5site_cfg_url($key, $default = '')
    {
        $path = g5site_cfg($key, $default);

        if ($path === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        if (!defined('G5_URL')) {
            return $path;
        }

        if ($path[0] === '/') {
            return G5_URL . $path;
        }

        return G5_URL . '/' . $path;
    }
}

/**
 * 전화번호 → tel: 링크
 *
 * @param string $phone
 * @return string
 */
if (!function_exists('g5site_tel_link')) {
    function g5site_tel_link($phone = '')
    {
        if ($phone === '') {
            $phone = g5site_cfg('phone', '');
        }

        $digits = preg_replace('/[^0-9+]/', '', $phone);

        return $digits !== '' ? 'tel:' . $digits : '#';
    }
}
