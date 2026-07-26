<?php
/**
 * SEO 메타 수동·AI 설정 — onoff-g5-base 내장
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('seo_meta_builtin', true)) {
    return;
}

if (!is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
    return;
}

if (is_file(G5_LIB_PATH . '/icrm.lib.php')) {
    include_once G5_LIB_PATH . '/icrm.lib.php';
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

include_once G5_LIB_PATH . '/seo-meta.lib.php';

if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
    include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
}

if (is_file(G5_LIB_PATH . '/seo-feed.lib.php')) {
    include_once G5_LIB_PATH . '/seo-feed.lib.php';
}

if (!function_exists('g5b_seo_meta_on_pre_head')) {
    function g5b_seo_meta_on_pre_head()
    {
        g5b_seo_meta_apply_context();
    }
}

if (!function_exists('g5b_seo_meta_on_head_sub_before')) {
    function g5b_seo_meta_on_head_sub_before()
    {
        g5b_seo_meta_apply_context();
        g5b_seo_meta_ensure_seo_init();
    }
}

if (!function_exists('g5b_seo_meta_admin_menu')) {
    function g5b_seo_meta_admin_menu($admin_menu)
    {
        return $admin_menu;
    }
}

if (!function_exists('g5b_seo_meta_admin_menu_legacy')) {
    /** @deprecated icrm_hub 통합 메뉴 사용 */
    function g5b_seo_meta_admin_menu_legacy($admin_menu)
    {
        if (defined('G5_PLUGIN_URL')) {
            $admin_menu['menu300'][] = array('300830', 'SEO 메타 관리', G5_PLUGIN_URL . '/seo_meta/admin/index.php', 'g5b_seo_meta');
        }

        return $admin_menu;
    }
}

if (function_exists('add_event')) {
    add_event('pre_head', 'g5b_seo_meta_on_pre_head', 5, 0);
    add_event('head_sub_before', 'g5b_seo_meta_on_head_sub_before', 5, 0);
    add_event('write_update_after', 'g5b_seo_meta_on_write_update_after', 10, 5);
}

if (function_exists('add_replace')) {
    add_replace('admin_menu', 'g5b_seo_meta_admin_menu', 20, 1);
    add_replace('html_process_add_meta', 'g5b_seo_meta_append_faq_jsonld', 20, 1);
}
