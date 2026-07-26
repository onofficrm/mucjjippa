<?php
/**
 * iCRM 콘텐츠 수집기 — extend
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('content_collector_builtin', true)) {
    return;
}

if (is_file(G5_LIB_PATH . '/icrm.lib.php')) {
    include_once G5_LIB_PATH . '/icrm.lib.php';
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

if (!is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
    return;
}

include_once G5_LIB_PATH . '/icrm-content.lib.php';

if (function_exists('icrm_content_bootstrap')) {
    icrm_content_bootstrap();
}

if (!function_exists('icrm_content_admin_menu')) {
    function icrm_content_admin_menu($admin_menu)
    {
        return $admin_menu;
    }
}

if (function_exists('add_replace')) {
    add_replace('admin_menu', 'icrm_content_admin_menu', 26, 1);
}
