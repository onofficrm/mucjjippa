<?php
/**
 * 온오프 플랫폼 스킨 — common.php 경로 보정
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (!is_file(G5_LIB_PATH . '/onoff-platform-skin.lib.php')) {
    return;
}

include_once G5_LIB_PATH . '/onoff-platform-skin.lib.php';

if (!function_exists('onoff_platform_skin_on_common_header')) {
    function onoff_platform_skin_on_common_header()
    {
        if (function_exists('onoff_platform_skin_override_paths')) {
            onoff_platform_skin_override_paths();
        }
        if (function_exists('onoff_platform_skin_enqueue_assets')) {
            onoff_platform_skin_enqueue_assets();
        }
    }
}

if (function_exists('add_event')) {
    add_event('common_header', 'onoff_platform_skin_on_common_header', 5, 0);
}
