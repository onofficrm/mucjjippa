<?php
/**
 * 온오프빌더 중앙 g5-update API — 그누보드 클라이언트 (pull · 자동 동기화)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

define('ICRM_UPDATE_VERSION', '1.0.0');

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

if (!function_exists('icrm_update_get_api_base_url')) {
function icrm_update_get_api_base_url()
{
    if (function_exists('onoff_builder_config_api_base_url')) {
        $url = onoff_builder_config_api_base_url('g5_update_api_base_url', '');
        if ($url !== '') {
            return $url;
        }
    }

    if (is_file(G5_DATA_PATH . '/icrm-update.config.php')) {
        include_once G5_DATA_PATH . '/icrm-update.config.php';
        if (defined('ICRM_UPDATE_API_BASE_URL')) {
            $url = trim((string) ICRM_UPDATE_API_BASE_URL);
            if ($url !== '') {
                return rtrim($url, '/');
            }
        }
    }

    $url = function_exists('g5site_cfg') ? trim(g5site_cfg('icrm_update_api_base_url', '')) : '';
        if ($url === '') {
            $url = 'https://icrm.co.kr/api/g5-update';
        }

        return rtrim($url, '/');
    }
}

if (!function_exists('icrm_update_get_license_key')) {
function icrm_update_get_license_key()
{
    if (function_exists('onoff_builder_config_license_key')) {
        $key = onoff_builder_config_license_key();
        if ($key !== '') {
            return $key;
        }
    }

    if (is_file(G5_DATA_PATH . '/icrm-update.config.php')) {
        include_once G5_DATA_PATH . '/icrm-update.config.php';
        if (defined('ICRM_UPDATE_LICENSE_KEY')) {
            $key = trim((string) ICRM_UPDATE_LICENSE_KEY);
            if ($key !== '') {
                return $key;
            }
        }
    }

    if (function_exists('icrm_point_get_license_key')) {
        $key = trim(icrm_point_get_license_key());
        if ($key !== '') {
            return $key;
        }
    }
    if (function_exists('g5b_seo_meta_get_license_key')) {
        $key = trim(g5b_seo_meta_get_license_key());
        if ($key !== '') {
            return $key;
        }
    }
    if (function_exists('auto_comment_get_setting')) {
        $key = trim(auto_comment_get_setting('icrm_license_key', ''));
        if ($key !== '') {
            return $key;
        }
    }
    if (function_exists('g5site_cfg')) {
        return trim(g5site_cfg('icrm_license_key', ''));
    }

    return '';
}
}

if (!function_exists('icrm_update_site_domain')) {
    function icrm_update_site_domain()
    {
        if (!empty($_SERVER['HTTP_HOST'])) {
            $host = strtolower(preg_replace('/[^a-zA-Z0-9.\-:]/', '', (string) $_SERVER['HTTP_HOST']));
            if ($host !== '') {
                return $host;
            }
        }

        if (function_exists('g5b_seo_meta_site_domain')) {
            return g5b_seo_meta_site_domain();
        }
        if (defined('G5_URL') && G5_URL) {
            $host = parse_url(G5_URL, PHP_URL_HOST);
            if ($host) {
                return strtolower($host);
            }
        }

        return '';
    }
}

if (!function_exists('icrm_update_is_enabled')) {
    function icrm_update_is_enabled()
    {
        if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('icrm_update_enabled', true)) {
            return false;
        }

        return icrm_update_get_license_key() !== '';
    }
}

if (!function_exists('icrm_update_get_bundle')) {
    function icrm_update_get_bundle()
    {
        $bundle = function_exists('g5site_cfg') ? trim(g5site_cfg('icrm_update_bundle', 'icrm-full')) : 'icrm-full';

        return $bundle !== '' ? $bundle : 'icrm-full';
    }
}

if (!function_exists('icrm_update_check_interval_hours')) {
    function icrm_update_check_interval_hours()
    {
        $hours = function_exists('g5site_cfg') ? (int) g5site_cfg('icrm_update_check_hours', '24') : 24;

        return max(1, $hours);
    }
}

if (!function_exists('icrm_update_last_check_file')) {
    function icrm_update_last_check_file()
    {
        return G5_DATA_PATH . '/icrm-update-last-check.txt';
    }
}

if (!function_exists('icrm_api_normalize_json_body')) {
    function icrm_api_normalize_json_body($raw)
    {
        $raw = (string) $raw;
        if (substr($raw, 0, 3) === "\xEF\xBB\xBF") {
            $raw = substr($raw, 3);
        }

        return trim($raw);
    }
}

if (!function_exists('icrm_api_decode_json_response')) {
    function icrm_api_decode_json_response($raw, $http_code = 0)
    {
        $raw = icrm_api_normalize_json_body($raw);
        if ($raw === '') {
            return array(
                'success' => false,
                'message' => 'API 응답이 비어 있습니다' . ($http_code > 0 ? ' (HTTP ' . $http_code . ')' : '') . ' — 호스팅 아웃바운드 HTTPS·라이선스·URL을 확인하세요.',
                'http_code' => $http_code,
            );
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded) && preg_match('/\{[\s\S]*\}/', $raw, $matches)) {
            $decoded = json_decode($matches[0], true);
        }
        if (is_array($decoded)) {
            $decoded['http_code'] = $http_code;

            return $decoded;
        }

        $preview = preg_replace('/\s+/', ' ', trim(strip_tags($raw)));
        if (function_exists('mb_substr')) {
            $preview = mb_substr($preview, 0, 120, 'UTF-8');
        } else {
            $preview = substr($preview, 0, 120);
        }

        $message = 'API 응답 파싱 실패';
        if ($http_code > 0) {
            $message .= ' (HTTP ' . $http_code . ')';
        }
        if ($preview !== '') {
            $message .= ': ' . $preview;
        } else {
            $message .= ' — icrm.co.kr HTTPS 연결·라이선스·API URL을 확인하세요';
        }

        return array(
            'success'   => false,
            'message'   => $message,
            'http_code' => $http_code,
        );
    }
}

if (!function_exists('icrm_api_post_json')) {
    function icrm_api_post_json($url, array $payload, $timeout = 120)
    {
        $url = trim((string) $url);
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, array(
                CURLOPT_POST            => true,
                CURLOPT_HTTPHEADER      => array('Content-Type: application/json', 'Accept: application/json'),
                CURLOPT_POSTFIELDS      => $body,
                CURLOPT_RETURNTRANSFER  => true,
                CURLOPT_FOLLOWLOCATION  => true,
                CURLOPT_MAXREDIRS       => 3,
                CURLOPT_TIMEOUT         => (int) $timeout,
                CURLOPT_CONNECTTIMEOUT  => 15,
            ));
            $raw = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);

            if ($raw === false) {
                return array(
                    'success'   => false,
                    'message'   => 'API 연결 실패: ' . ($err !== '' ? $err : 'curl error'),
                    'http_code' => 0,
                );
            }

            return icrm_api_decode_json_response($raw, $code);
        }

        $ctx = stream_context_create(array(
            'http' => array(
                'method'          => 'POST',
                'header'          => "Content-Type: application/json\r\nAccept: application/json\r\n",
                'content'         => $body,
                'timeout'         => (int) $timeout,
                'follow_location' => 1,
                'max_redirects'   => 3,
            ),
        ));
        $raw = @file_get_contents($url, false, $ctx);
        if ($raw === false) {
            return array('success' => false, 'message' => 'API 연결 실패', 'http_code' => 0);
        }

        $http_code = 0;
        $headers = function_exists('http_get_last_response_headers') ? http_get_last_response_headers() : array();
        if (isset($headers[0]) && preg_match('/\s(\d{3})\s/', (string) $headers[0], $m)) {
            $http_code = (int) $m[1];
        }

        return icrm_api_decode_json_response($raw, $http_code);
    }
}

if (!function_exists('icrm_update_api_post_json')) {
    function icrm_update_api_post_json($endpoint, array $payload)
    {
        $url = icrm_update_get_api_base_url() . '/' . ltrim((string) $endpoint, '/');

        return icrm_api_post_json($url, $payload);
    }
}

if (!function_exists('icrm_update_fetch_manifest')) {
    function icrm_update_fetch_manifest($release_id = '')
    {
        if (!function_exists('onoff_update_read_state') && is_file(G5_LIB_PATH . '/onoff-update.lib.php')) {
            include_once G5_LIB_PATH . '/onoff-update.lib.php';
        }

        $state = function_exists('onoff_update_read_state') ? onoff_update_read_state(G5_PATH) : array();
        if ($release_id === '' && !empty($state['release_id'])) {
            $release_id = (string) $state['release_id'];
        }

        return icrm_update_api_post_json('manifest', array(
            'license_key' => icrm_update_get_license_key(),
            'domain'        => icrm_update_site_domain(),
            'bundle'        => icrm_update_get_bundle(),
            'release_id'    => $release_id,
        ));
    }
}

if (!function_exists('icrm_update_download_file')) {
    function icrm_update_download_file($release_id, $relative, $expected_sha256 = '')
    {
        $relative = ltrim(str_replace('\\', '/', (string) $relative), '/');
        if ($relative === '' || strpos($relative, '..') !== false) {
            return array('success' => false, 'message' => 'invalid path');
        }

        $resp = icrm_update_api_post_json('file', array(
            'license_key' => icrm_update_get_license_key(),
            'domain'        => icrm_update_site_domain(),
            'release_id'    => (string) $release_id,
            'path'          => $relative,
        ));

        if (empty($resp['success'])) {
            return $resp;
        }

        $content = null;
        if (!empty($resp['content_base64'])) {
            $content = base64_decode((string) $resp['content_base64'], true);
        } elseif (isset($resp['content']) && is_string($resp['content'])) {
            $content = $resp['content'];
        }

        if ($content === false || $content === null) {
            return array('success' => false, 'message' => '파일 내용이 비어 있습니다.');
        }

        $sha = hash('sha256', $content);
        $expected = $expected_sha256 !== '' ? strtolower((string) $expected_sha256) : '';
        if ($expected !== '' && !hash_equals($expected, $sha)) {
            return array('success' => false, 'message' => '파일 checksum 불일치: ' . $relative);
        }

        return array(
            'success' => true,
            'content' => $content,
            'sha256'  => $sha,
            'path'    => $relative,
        );
    }
}

if (!function_exists('icrm_update_admin_url')) {
    function icrm_update_admin_url()
    {
        if (is_file(G5_LIB_PATH . '/icrm-member.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-member.lib.php';
        }
        if (function_exists('icrm_member_enabled') && icrm_member_enabled() && function_exists('icrm_member_url')) {
            return icrm_member_url('update');
        }

        return defined('G5_PLUGIN_URL') ? G5_PLUGIN_URL . '/icrm_update/admin/index.php' : '';
    }
}

if (!function_exists('icrm_update_check_status')) {
    function icrm_update_check_status()
    {
        $license_ok = icrm_update_get_license_key() !== '';
        $state = array();
        if (is_file(G5_LIB_PATH . '/onoff-update.lib.php')) {
            include_once G5_LIB_PATH . '/onoff-update.lib.php';
            $state = onoff_update_read_state(G5_PATH);
        }

        $local = isset($state['release_id']) ? (string) $state['release_id'] : '';

        if (!$license_ok) {
            return array(
                'ready'            => false,
                'license_ok'       => false,
                'local_release'    => $local,
                'remote_release'   => '',
                'update_available' => false,
                'message'          => '온오프빌더 라이선스를 설정하세요.',
            );
        }

        if (!is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
            return array(
                'ready'            => false,
                'license_ok'       => true,
                'local_release'    => $local,
                'remote_release'   => '',
                'update_available' => false,
                'message'          => '업데이트 모듈 설치 중…',
            );
        }

        $resp = icrm_update_fetch_manifest($local);
        if (empty($resp['success'])) {
            return array(
                'ready'            => false,
                'license_ok'       => true,
                'local_release'    => $local,
                'remote_release'   => '',
                'update_available' => false,
                'message'          => isset($resp['message']) ? (string) $resp['message'] : '온오프빌더 연결 실패',
            );
        }

        $remote = isset($resp['release_id']) ? (string) $resp['release_id'] : '';

        return array(
            'ready'            => true,
            'license_ok'       => true,
            'local_release'    => $local,
            'remote_release'   => $remote,
            'update_available' => !empty($resp['update_available']),
            'released_at'      => isset($resp['released_at']) ? (string) $resp['released_at'] : '',
            'message'          => !empty($resp['update_available']) ? '새 버전이 있습니다.' : '최신 버전입니다.',
        );
    }
}

if (!function_exists('icrm_update_collect_file_paths')) {
    function icrm_update_collect_file_paths(array $packages)
    {
        $paths = array();
        foreach ($packages as $package) {
            foreach ($package['files'] as $relative) {
                $relative = ltrim(str_replace('\\', '/', (string) $relative), '/');
                if ($relative !== '') {
                    $paths[$relative] = true;
                }
            }
        }

        return array_keys($paths);
    }
}

if (!function_exists('icrm_update_pull')) {
    /**
     * 온오프빌더에서 최신 릴리스를 받아 적용
     *
     * @param bool $dryRun
     * @param string|null $bundle
     * @return array
     */
    function icrm_update_pull($dryRun = false, $bundle = null)
    {
        if (!is_file(G5_LIB_PATH . '/onoff-update.lib.php')) {
            return array('success' => false, 'message' => 'onoff-update.lib.php 가 없습니다.');
        }
        include_once G5_LIB_PATH . '/onoff-update.lib.php';

        if (!icrm_update_is_enabled()) {
            return array('success' => false, 'message' => '온오프빌더 라이선스가 설정되지 않았습니다.');
        }

        $manifestResp = icrm_update_fetch_manifest();
        if (empty($manifestResp['success'])) {
            return $manifestResp;
        }

        if (empty($manifestResp['update_available'])) {
            return array(
                'success'          => true,
                'message'          => '이미 최신 릴리스입니다.',
                'update_available' => false,
                'release_id'       => isset($manifestResp['release_id']) ? $manifestResp['release_id'] : '',
            );
        }

        $manifest = isset($manifestResp['manifest']) && is_array($manifestResp['manifest'])
            ? $manifestResp['manifest']
            : array();
        $release_id = isset($manifestResp['release_id']) ? (string) $manifestResp['release_id'] : '';
        if ($release_id === '' && !empty($manifest['release_id'])) {
            $release_id = (string) $manifest['release_id'];
        }

        $bundleName = $bundle !== null && $bundle !== '' ? $bundle : icrm_update_get_bundle();
        $bundles = isset($manifest['bundles']) && is_array($manifest['bundles']) ? $manifest['bundles'] : array();
        if (!isset($bundles[$bundleName]['packages']) || !is_array($bundles[$bundleName]['packages'])) {
            return array('success' => false, 'message' => '번들을 찾을 수 없습니다: ' . $bundleName);
        }

        try {
            $packages = onoff_update_resolve_packages_from_manifest($manifest, $bundles[$bundleName]['packages']);
        } catch (RuntimeException $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }

        $fileIndex = isset($manifest['files']) && is_array($manifest['files']) ? $manifest['files'] : array();
        $paths = icrm_update_collect_file_paths($packages);

        $tempRoot = G5_DATA_PATH . '/cache/icrm-update-' . preg_replace('/[^a-zA-Z0-9._-]/', '', $release_id);
        if (!$dryRun && is_dir($tempRoot)) {
            icrm_update_remove_dir($tempRoot);
        }
        if (!$dryRun) {
            @mkdir($tempRoot, 0755, true);
        }

        $downloaded = 0;
        foreach ($paths as $relative) {
            $expected = '';
            if (isset($fileIndex[$relative]['sha256'])) {
                $expected = (string) $fileIndex[$relative]['sha256'];
            }

            if ($dryRun) {
                $downloaded++;
                continue;
            }

            $fileResp = icrm_update_download_file($release_id, $relative, $expected);
            if (empty($fileResp['success'])) {
                icrm_update_remove_dir($tempRoot);
                if ($relative !== '' && empty($fileResp['path'])) {
                    $fileResp['path'] = $relative;
                }
                if ($relative !== '' && isset($fileResp['message']) && stripos((string) $fileResp['message'], $relative) === false) {
                    $fileResp['message'] .= ' — ' . $relative;
                }

                return $fileResp;
            }

            $dest = $tempRoot . '/' . $relative;
            $dir = dirname($dest);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            file_put_contents($dest, $fileResp['content'], LOCK_EX);
            $downloaded++;
        }

        $applier = new OnoffUpdateApplier($tempRoot, G5_PATH, $dryRun);
        $applier->applyPackages($packages);

        if (!$dryRun) {
            $applier->writeState($packages, array(
                'source'     => 'icrm',
                'release_id' => $release_id,
            ));
            icrm_update_remove_dir($tempRoot);
            @file_put_contents(icrm_update_last_check_file(), (string) time(), LOCK_EX);

            if (function_exists('icrm_member_board_maybe_apply_defaults_after_update')) {
                icrm_member_board_maybe_apply_defaults_after_update();
            }
            if (is_file(G5_LIB_PATH . '/onoff-platform-skin.lib.php')) {
                include_once G5_LIB_PATH . '/onoff-platform-skin.lib.php';
                if (function_exists('onoff_platform_maybe_apply_board_editor_defaults')) {
                    onoff_platform_maybe_apply_board_editor_defaults();
                }
            } elseif (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
                include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
                if (function_exists('icrm_member_board_maybe_apply_defaults_after_update')) {
                    icrm_member_board_maybe_apply_defaults_after_update();
                }
            }
            if (is_file(G5_PLUGIN_PATH . '/auto_comment/auto_comment.lib.php')) {
                include_once G5_PLUGIN_PATH . '/auto_comment/auto_comment.lib.php';
                if (function_exists('auto_comment_bootstrap')) {
                    auto_comment_bootstrap();
                }
                if (function_exists('auto_comment_seed_board_configs')) {
                    auto_comment_seed_board_configs(false);
                }
            }
        }

        return array(
            'success'          => true,
            'message'          => $dryRun ? 'dry-run 완료' : '업데이트 적용 완료',
            'update_available' => true,
            'release_id'       => $release_id,
            'bundle'           => $bundleName,
            'files_downloaded' => $downloaded,
            'changed'          => $applier->getChanged(),
            'skipped'          => $applier->getSkipped(),
            'backup'           => $dryRun ? '' : $applier->getBackupRoot(),
        );
    }
}

if (!function_exists('icrm_update_remove_dir')) {
    function icrm_update_remove_dir($dir)
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        if (!is_array($items)) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                icrm_update_remove_dir($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}

if (!function_exists('icrm_update_should_check_now')) {
    function icrm_update_should_check_now()
    {
        $file = icrm_update_last_check_file();
        if (!is_file($file)) {
            return true;
        }

        $last = (int) trim((string) file_get_contents($file));
        $interval = icrm_update_check_interval_hours() * 3600;

        return (time() - $last) >= $interval;
    }
}

if (!function_exists('icrm_update_maybe_auto_sync')) {
    function icrm_update_maybe_auto_sync()
    {
        if (!icrm_update_is_enabled()) {
            return;
        }
        if (!function_exists('g5site_cfg_bool') || !g5site_cfg_bool('icrm_update_auto_sync', true)) {
            return;
        }
        if (!icrm_update_should_check_now()) {
            return;
        }

        global $member, $config, $is_admin;
        if (!$is_admin || !isset($member['mb_id'], $config['cf_admin'])) {
            return;
        }
        if ($member['mb_id'] !== $config['cf_admin']) {
            return;
        }

        @file_put_contents(icrm_update_last_check_file(), (string) time(), LOCK_EX);

        $result = icrm_update_pull(false);
        if (!empty($result['success']) && !empty($result['update_available'])) {
            set_session('icrm_update_flash', array(
                'release_id' => isset($result['release_id']) ? $result['release_id'] : '',
                'changed'    => count(isset($result['changed']) ? $result['changed'] : array()),
            ));
        }
    }
}
