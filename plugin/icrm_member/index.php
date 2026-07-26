<?php
require_once __DIR__ . '/../../common.php';

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}
if (is_file(G5_LIB_PATH . '/icrm-member.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-member.lib.php';
}

if (!function_exists('icrm_member_enabled') || !icrm_member_enabled()) {
    if (function_exists('alert')) {
        alert('온오프빌더 메뉴가 비활성화되어 있습니다.', G5_URL);
    }
    exit;
}

if (is_file(G5_LIB_PATH . '/icrm-admin-shell.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-admin-shell.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-member.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-member.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
}

$m = isset($_GET['m']) ? preg_replace('/[^a-z_]/', '', $_GET['m']) : 'home';

if (in_array($m, array('boards', 'publish', 'setup'), true)) {
    header('Location: ' . icrm_member_url('home'), true, 302);
    exit;
}

$modules = icrm_member_modules();
if (!isset($modules[$m])) {
    $m = 'home';
}

icrm_member_require($m);

define('ICRM_MEMBER_ACTIVE', true);

icrm_member_shell_begin($m);

switch ($m) {
    case 'design':
        include __DIR__ . '/views/design.php';
        break;
    case 'boards':
        include __DIR__ . '/views/boards.php';
        break;
    case 'publish':
        include __DIR__ . '/views/publish.php';
        break;
    case 'update':
        include __DIR__ . '/views/update.php';
        break;
    case 'points':
        include __DIR__ . '/views/points.php';
        break;
    case 'report':
        include __DIR__ . '/views/report.php';
        break;
    case 'home':
    default:
        include __DIR__ . '/views/home.php';
        break;
}

icrm_member_shell_end();
