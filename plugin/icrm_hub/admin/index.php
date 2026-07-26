<?php
if (!defined('G5_IS_ADMIN')) {
    define('G5_IS_ADMIN', true);
}
require_once __DIR__ . '/../../../common.php';

if ($is_admin !== 'super') {
    alert('최고관리자만 접근 가능합니다.', G5_URL);
}

require_once G5_LIB_PATH . '/icrm-admin-shell.lib.php';

if (is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
    include_once G5_LIB_PATH . '/seo-meta.lib.php';
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

$m = isset($_GET['m']) ? preg_replace('/[^a-z_]/', '', $_GET['m']) : 'home';
$modules = icrm_admin_modules();
if (!isset($modules[$m])) {
    $m = 'home';
}

define('ICRM_HUB_ACTIVE', true);
define('ICRM_HUB_INNER', true);

icrm_admin_shell_begin($m);

switch ($m) {
    case 'home':
        include __DIR__ . '/views/dashboard.php';
        break;
    case 'publish':
        include __DIR__ . '/views/content-publish.php';
        break;
    case 'content':
        include G5_PLUGIN_PATH . '/content_collector/admin/index.php';
        break;
    case 'comment':
        if (is_file(G5_PLUGIN_PATH . '/auto_comment/auto_comment.lib.php')
            && is_file(G5_PLUGIN_PATH . '/auto_comment/admin/index.php')) {
            include G5_PLUGIN_PATH . '/auto_comment/admin/index.php';
        } else {
            echo '<div class="icrm-module-body"><p class="icc-muted">자동댓글 모듈이 설치되어 있지 않습니다. 환경설정 → iCRM 업데이트에서 최신 버전을 적용하세요.</p></div>';
        }
        break;
    case 'seo':
        include G5_PLUGIN_PATH . '/seo_meta/admin/index.php';
        break;
    case 'points':
        include __DIR__ . '/views/points.php';
        break;
    case 'rank':
    default:
        include G5_PLUGIN_PATH . '/rank_check/admin/index.php';
        break;
}

icrm_admin_shell_end();
