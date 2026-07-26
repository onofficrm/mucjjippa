<?php
/**
 * iCRM final_url 연동 — onoff-g5-base 내장
 *
 * - 글 저장 후 wr_seo_title 확정 (write_update_after)
 * - /icrm/final-url.php API (사이트별 G5_URL·토큰 자동)
 * - 별도 install 없음. 최초 접속 시 data/icrm.config.php 토큰 자동 생성 가능
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH.'/_site.config.php')) {
    include_once G5_PATH.'/_site.config.php';
}

if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('icrm_builtin', true)) {
    return;
}

if (!is_file(G5_LIB_PATH.'/icrm.lib.php')) {
    return;
}

include_once G5_LIB_PATH.'/icrm.lib.php';

if (is_file(G5_LIB_PATH.'/icrm-point.lib.php')) {
    include_once G5_LIB_PATH.'/icrm-point.lib.php';
}

if (function_exists('icrm_bootstrap')) {
    icrm_bootstrap();
}

if (!function_exists('icrm_on_write_update_after')) {
    function icrm_on_write_update_after($board, $wr_id, $w, $qstr, $redirect_url)
    {
        if (!is_array($board) || empty($board['bo_table']) || !(int) $wr_id) {
            return;
        }

        if (function_exists('icrm_ensure_wr_seo_title')) {
            icrm_ensure_wr_seo_title($board['bo_table'], (int) $wr_id);
        }
    }
}

if (!function_exists('icrm_on_common_header')) {
    function icrm_on_common_header()
    {
        if (function_exists('icrm_ensure_wr_seo_title_on_view')) {
            icrm_ensure_wr_seo_title_on_view();
        }
        if (function_exists('icrm_enqueue_board_assets')) {
            icrm_enqueue_board_assets();
        }
    }
}

if (function_exists('add_replace')) {
    add_replace('board_content_head', 'icrm_board_content_head_css', 5, 2);
    add_replace('board_mobile_content_head', 'icrm_board_content_head_css', 5, 2);
    add_replace('html_purifier_result', 'icrm_html_purifier_result', 10, 3);
}

if (function_exists('add_event')) {
    add_event('write_update_after', 'icrm_on_write_update_after', 10, 5);
    add_event('common_header', 'icrm_on_common_header', 5, 0);
    add_event('html_purifier_config', 'icrm_html_purifier_config', 10, 2);
    add_event('admin_common', 'icrm_maybe_bootstrap_update_client', 5, 0);
    add_event('admin_common', 'icrm_point_on_admin_auto_sync', 12, 0);
}

if (!function_exists('icrm_point_on_admin_auto_sync')) {
    function icrm_point_on_admin_auto_sync()
    {
        if (function_exists('icrm_point_maybe_auto_sync')) {
            icrm_point_maybe_auto_sync();
        }
    }
}

if (!function_exists('icrm_maybe_bootstrap_update_client')) {
    function icrm_maybe_bootstrap_update_client()
    {
        global $is_admin, $member, $config;

        if (!$is_admin || !isset($member['mb_id'], $config['cf_admin'])) {
            return;
        }
        if ($member['mb_id'] !== $config['cf_admin']) {
            return;
        }
        if (is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
            return;
        }

        static $tried = false;
        if ($tried) {
            return;
        }
        $tried = true;

        if (is_file(G5_LIB_PATH . '/icrm-update-bootstrap.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-update-bootstrap.lib.php';
            icrm_update_bootstrap_install();
            return;
        }

        icrm_emergency_install_update_client();
    }
}

if (!function_exists('icrm_emergency_install_update_client')) {
    /**
     * 구버전 사이트 — bootstrap 파일 없을 때 iCRM에서 업데이트 클라이언트 자동 설치
     */
    function icrm_emergency_install_update_client()
    {
        $license = function_exists('g5site_cfg') ? trim(g5site_cfg('icrm_license_key', '')) : '';
        if ($license === '' && function_exists('g5b_seo_meta_get_license_key')) {
            if (is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
                include_once G5_LIB_PATH . '/seo-meta.lib.php';
            }
            $license = trim(g5b_seo_meta_get_license_key());
        }
        if ($license === '') {
            return;
        }

        $api = function_exists('g5site_cfg') ? trim(g5site_cfg('icrm_update_api_base_url', 'https://icrm.co.kr/api/g5-update')) : 'https://icrm.co.kr/api/g5-update';
        $api = rtrim($api, '/');
        $domain = !empty($_SERVER['HTTP_HOST'])
            ? strtolower(preg_replace('/[^a-zA-Z0-9.\-:]/', '', (string) $_SERVER['HTTP_HOST']))
            : (defined('G5_URL') ? (string) parse_url(G5_URL, PHP_URL_HOST) : '');

        $post = function ($endpoint, array $payload) use ($api) {
            $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
            if (function_exists('curl_init')) {
                $ch = curl_init($api . '/' . ltrim($endpoint, '/'));
                curl_setopt_array($ch, array(
                    CURLOPT_POST => true,
                    CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
                    CURLOPT_POSTFIELDS => $body,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 90,
                ));
                $raw = curl_exec($ch);
                curl_close($ch);
            } else {
                $ctx = stream_context_create(array('http' => array(
                    'method' => 'POST',
                    'header' => "Content-Type: application/json\r\n",
                    'content' => $body,
                    'timeout' => 90,
                )));
                $raw = @file_get_contents($api . '/' . ltrim($endpoint, '/'), false, $ctx);
            }
            $decoded = json_decode((string) $raw, true);

            return is_array($decoded) ? $decoded : array();
        };

        $manifest = $post('manifest', array(
            'license_key' => $license,
            'domain'      => strtolower($domain),
            'bundle'      => 'icrm-full',
            'release_id'  => '',
        ));
        if (empty($manifest['success']) || empty($manifest['release_id'])) {
            return;
        }

        $release_id = (string) $manifest['release_id'];
        $files = array(
            'lib/onoff-update.lib.php',
            'lib/icrm-update.lib.php',
            'lib/icrm-update-bootstrap.lib.php',
            'extend/icrm-update.extend.php',
            'icrm/update-pull.php',
            'plugin/icrm_update/admin/index.php',
            'plugin/icrm_update/admin/action.php',
        );

        foreach ($files as $relative) {
            $resp = $post('file', array(
                'license_key' => $license,
                'domain'      => strtolower($domain),
                'release_id'  => $release_id,
                'path'        => $relative,
            ));
            if (empty($resp['success']) || empty($resp['content_base64'])) {
                return;
            }
            $content = base64_decode((string) $resp['content_base64'], true);
            if ($content === false) {
                return;
            }
            $dest = G5_PATH . '/' . $relative;
            $dir = dirname($dest);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            file_put_contents($dest, $content, LOCK_EX);
        }
    }
}

if (!is_file((defined('G5_EXTEND_PATH') ? G5_EXTEND_PATH : G5_PATH . '/extend') . '/icrm-update.extend.php')
    && function_exists('add_replace')
    && (!function_exists('g5site_cfg_bool') || g5site_cfg_bool('icrm_update_enabled', true))) {
    add_replace('admin_menu', 'icrm_extend_admin_update_menu', 23, 1);
}

if (!function_exists('icrm_extend_admin_update_menu')) {
    function icrm_extend_admin_update_menu($admin_menu)
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
