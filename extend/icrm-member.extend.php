<?php
/**
 * iCRM 회원 포털 — 사이트 하단 진입 링크
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (!is_file(G5_LIB_PATH . '/icrm-member.lib.php')) {
    return;
}

include_once G5_LIB_PATH . '/icrm-member.lib.php';

if (!icrm_member_enabled()) {
    return;
}

if (!function_exists('icrm_member_site_nav')) {
    function icrm_member_site_nav()
    {
        if (defined('G5_IS_ADMIN') && G5_IS_ADMIN) {
            return;
        }
        if (!icrm_member_can_access()) {
            return;
        }

        $url = icrm_member_url('home');
        echo '<div class="icrm-member-site-nav" style="margin:0.75rem 0;padding:0.85rem 1rem;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;font-size:13px;line-height:1.5;text-align:center">';
        echo '<a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" style="display:inline-flex;align-items:center;gap:6px;color:#0f766e;font-weight:800;text-decoration:none;font-size:14px">';
        echo '<span style="display:inline-flex;width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;align-items:center;justify-content:center;font-size:11px;font-weight:900">iC</span>';
        echo 'iCRM 관리';
        echo '</a>';
        echo '<span style="display:block;margin-top:4px;color:#64748b;font-size:12px">디자인 배포 · 사이트 업데이트</span>';
        echo '</div>';
    }
}

if (function_exists('add_event')) {
    add_event('tail_sub', 'icrm_member_site_nav', 35, 0);
}
