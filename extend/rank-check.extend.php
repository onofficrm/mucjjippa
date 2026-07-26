<?php
/**
 * iCRM 게시글 순위체크 — extend
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('rank_check_builtin', true)) {
    return;
}

if (is_file(G5_LIB_PATH . '/icrm.lib.php')) {
    include_once G5_LIB_PATH . '/icrm.lib.php';
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

if (!is_file(G5_LIB_PATH . '/icrm-rank.lib.php')) {
    return;
}

include_once G5_LIB_PATH . '/icrm-rank.lib.php';

if (function_exists('icrm_rank_bootstrap')) {
    icrm_rank_bootstrap();
}

if (!function_exists('icrm_rank_admin_menu')) {
    function icrm_rank_admin_menu($admin_menu)
    {
        return $admin_menu;
    }
}

if (function_exists('add_replace')) {
    add_replace('admin_menu', 'icrm_rank_admin_menu', 25, 1);
}
