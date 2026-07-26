<?php
/**
 * 온오프빌더 업데이트 자동 동기화 — onoff-g5-base 내장
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('icrm_update_enabled', true)) {
    return;
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

if (is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
    include_once G5_LIB_PATH . '/seo-meta.lib.php';
}

if (!function_exists('icrm_update_admin_menu')) {
    function icrm_update_admin_menu($admin_menu)
    {
        if (defined('G5_PLUGIN_URL')) {
            $update_url = function_exists('icrm_update_admin_url')
                ? icrm_update_admin_url()
                : G5_PLUGIN_URL . '/icrm_update/admin/index.php';
            $admin_menu['menu100'][] = array(
                '100425',
                '온오프빌더 업데이트',
                $update_url,
                'icrm_update',
            );
        }

        return $admin_menu;
    }
}

if (function_exists('add_replace')) {
    add_replace('admin_menu', 'icrm_update_admin_menu', 24, 1);
}

if (!is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
    if (is_file(G5_LIB_PATH . '/icrm-update-bootstrap.lib.php')) {
        include_once G5_LIB_PATH . '/icrm-update-bootstrap.lib.php';
    }
    return;
}

if (is_file(G5_LIB_PATH . '/onoff-update.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-update.lib.php';
}

include_once G5_LIB_PATH . '/icrm-update.lib.php';

if (!function_exists('icrm_update_on_admin_common')) {
    function icrm_update_on_admin_common()
    {
        icrm_update_maybe_auto_sync();
    }
}

add_event('admin_common', 'icrm_update_on_admin_common', 10);

if (!function_exists('icrm_update_admin_flash_notice')) {
    function icrm_update_admin_flash_notice()
    {
        if (!function_exists('get_session')) {
            return;
        }

        $flash = get_session('icrm_update_flash');
        if (is_array($flash) && !empty($flash['release_id'])) {
            set_session('icrm_update_flash', '');

            $release = htmlspecialchars((string) $flash['release_id'], ENT_QUOTES, 'UTF-8');
            $count = isset($flash['changed']) ? (int) $flash['changed'] : 0;
            echo '<div class="local_ov01 local_ov" style="margin:8px 0;padding:10px 14px;background:#ecfdf5;border:1px solid #6ee7b7;">';
            echo '<strong>온오프빌더 업데이트 적용됨</strong> — release <code>' . $release . '</code>';
            if ($count > 0) {
                echo ' · 변경 ' . $count . '건';
            }
            echo '</div>';

            return;
        }

        global $member, $config, $is_admin;
        if (!$is_admin || !isset($member['mb_id'], $config['cf_admin']) || $member['mb_id'] !== $config['cf_admin']) {
            return;
        }
        if (!function_exists('icrm_update_check_status')) {
            return;
        }

        static $banner_checked = false;
        if ($banner_checked) {
            return;
        }
        $banner_checked = true;

        $status = icrm_update_check_status();
        if (empty($status['update_available']) || empty($status['ready'])) {
            return;
        }

        $url = icrm_update_admin_url();
        if ($url === '') {
            return;
        }

        $remote = htmlspecialchars((string) $status['remote_release'], ENT_QUOTES, 'UTF-8');
        echo '<div class="local_ov01 local_ov" style="margin:8px 0;padding:10px 14px;background:#fffbeb;border:1px solid #fcd34d;">';
        echo '<strong>온오프빌더 새 버전</strong> <code>' . $remote . '</code> ';
        echo '<a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" style="margin-left:8px;font-weight:600;">지금 업데이트 →</a>';
        echo '</div>';
    }
}

add_event('admin_head', 'icrm_update_admin_flash_notice', 20);
