<?php
/**
 * 자동댓글 플러그인 — onoff-g5-base 내장 연동
 *
 * plugin/auto_comment/ 가 있으면 extend 로드 시 DB·이벤트를 자동 준비합니다.
 * 별도로 extend 파일을 복사하거나 /plugin/auto_comment/install.php 를 실행할 필요 없습니다.
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH.'/_site.config.php')) {
    include_once G5_PATH.'/_site.config.php';
}

if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('auto_comment_builtin', true)) {
    return;
}

$auto_comment_lib = G5_PLUGIN_PATH.'/auto_comment/auto_comment.lib.php';
if (!is_file($auto_comment_lib)) {
    return;
}

include_once $auto_comment_lib;

if (is_file(G5_LIB_PATH.'/icrm-point.lib.php')) {
    include_once G5_LIB_PATH.'/icrm-point.lib.php';
}

if (function_exists('auto_comment_bootstrap')) {
    auto_comment_bootstrap();
}

if (!function_exists('auto_comment_is_installed') || !auto_comment_is_installed()) {
    return;
}

if (function_exists('add_event') && function_exists('auto_comment_schedule_for_post')) {
    add_event('write_update_after', 'auto_comment_schedule_for_post', 20, 3);
}

if (function_exists('add_event') && function_exists('auto_comment_maybe_run_worker')) {
    add_event('common_header', 'auto_comment_maybe_run_worker', 99, 0);
}

if (function_exists('add_event') && function_exists('auto_comment_maybe_sync_bot_points')) {
    add_event('common_header', 'auto_comment_maybe_sync_bot_points', 100, 0);
}

if (function_exists('add_event') && function_exists('auto_comment_track_post_view')) {
    add_event('tail_sub', 'auto_comment_track_post_view', 20, 0);
}

if (function_exists('add_replace')) {
    add_replace('admin_menu', 'auto_comment_admin_menu', 20, 1);
}

if (function_exists('add_event') && function_exists('auto_comment_ensure_board_config')) {
    add_event('admin_board_form_update', 'auto_comment_on_admin_board_form_update', 20, 2);
}

function auto_comment_on_admin_board_form_update($bo_table, $w)
{
    if ($w !== '') {
        return;
    }

    auto_comment_ensure_board_config($bo_table);
}

function auto_comment_admin_menu($admin_menu)
{
    if (function_exists('g5site_cfg_bool') && g5site_cfg_bool('icrm_hub_enabled', true)
        && defined('G5_PLUGIN_PATH') && is_file(G5_PLUGIN_PATH . '/icrm_hub/admin/index.php')) {
        return $admin_menu;
    }

    if (defined('G5_PLUGIN_URL')) {
        $admin_menu['menu200'][] = array('200910', '자동댓글 관리', G5_PLUGIN_URL.'/auto_comment/admin/index.php', 'auto_comment');
    }

    return $admin_menu;
}
