<?php
/**
 * onoff-builder-bridge — 일반회원 셀프 배포 메뉴
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (is_file(G5_LIB_PATH . '/icrm-member.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-member.lib.php';
    if (function_exists('icrm_member_enabled') && icrm_member_enabled() && is_file(G5_PLUGIN_PATH . '/icrm_member/index.php')) {
        return;
    }
}

if (!is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
    return;
}

include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';

if (!function_exists('onoff_builder_member_deploy_enabled') || !onoff_builder_member_deploy_enabled()) {
    return;
}

if (!function_exists('onoff_builder_member_menu_link')) {
    function onoff_builder_member_menu_link()
    {
        global $is_member;

        if (empty($is_member) || !function_exists('onoff_builder_is_deploy_user') || !onoff_builder_is_deploy_user()) {
            return;
        }

        $url = onoff_builder_member_url();
        echo '<div class="onoff-builder-member-nav" style="margin:0.75rem 0;padding:0.65rem 0.85rem;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;font-size:13px">';
        echo '<a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" style="color:#065f46;font-weight:700;text-decoration:none">홈페이지 디자인 배포</a>';
        echo ' <span style="color:#64748b">— ZIP 업로드 후 바로 적용</span>';
        echo '</div>';
    }
}

if (function_exists('add_event')) {
    add_event('tail_sub', 'onoff_builder_member_menu_link', 40, 0);
}
