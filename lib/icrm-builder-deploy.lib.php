<?php
/**
 * iCRM builder-deploy API — 그누보드 클라이언트 (빌더 디자인 pull)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

define('ICRM_BUILDER_DEPLOY_VERSION', '1.1.1');
define('ICRM_BUILDER_DEPLOY_PREVIEW_ID', 'preview-tmp');

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

if (!function_exists('icrm_builder_deploy_normalize_api_base_url')) {
    function icrm_builder_deploy_normalize_api_base_url($url)
    {
        $url = rtrim(trim((string) $url), '/');
        if ($url === '') {
            return '';
        }

        foreach (array('/manifest', '/file', '/publish', '/build-source') as $suffix) {
            if (substr($url, -strlen($suffix)) === $suffix) {
                $url = substr($url, 0, -strlen($suffix));
                break;
            }
        }

        return rtrim($url, '/');
    }
}

if (!function_exists('icrm_builder_deploy_get_api_base_url')) {
    function icrm_builder_deploy_get_api_base_url()
    {
        if (function_exists('onoff_builder_config_api_base_url')) {
            $url = icrm_builder_deploy_normalize_api_base_url(onoff_builder_config_api_base_url('builder_deploy_api_base_url', ''));
            if ($url !== '') {
                return $url;
            }
        }

        if (function_exists('g5site_cfg')) {
            $url = icrm_builder_deploy_normalize_api_base_url(g5site_cfg('icrm_builder_deploy_api_base_url', ''));
            if ($url !== '') {
                return $url;
            }
        }

        return 'https://icrm.co.kr/api/builder-deploy';
    }
}

if (!function_exists('icrm_builder_deploy_api_unavailable')) {
    function icrm_builder_deploy_api_unavailable(array $resp)
    {
        $code = isset($resp['http_code']) ? (int) $resp['http_code'] : 0;
        if ($code === 404 || $code === 502 || $code === 503) {
            return true;
        }

        $message = isset($resp['message']) ? (string) $resp['message'] : '';

        return (bool) preg_match('/API 응답 파싱 실패|API 연결 실패|File not found/i', $message);
    }
}

if (!function_exists('icrm_builder_deploy_local_project_ready')) {
    function icrm_builder_deploy_local_project_ready($project_id)
    {
        if (!is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            return false;
        }

        include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';

        if (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id)) {
            return false;
        }

        $project_id = onoff_builder_sanitize_project_id($project_id);
        if (function_exists('onoff_builder_sync_import_build_flags')) {
            onoff_builder_sync_import_build_flags($project_id);
        }

        $import = onoff_builder_get_import($project_id);
        if (onoff_builder_project_needs_build($project_id, is_array($import) ? $import : array())) {
            return false;
        }

        $dir = onoff_builder_project_dir($project_id);
        if ($dir === '' || !is_dir($dir)) {
            return false;
        }

        $entry = is_array($import) && !empty($import['entry']) ? (string) $import['entry'] : 'index.html';
        if (is_file($dir . '/' . $entry)) {
            return true;
        }

        foreach (array('index.html', 'dist/index.html') as $fallback) {
            if (is_file($dir . '/' . $fallback)) {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('icrm_builder_deploy_apply_local_project')) {
    /**
     * iCRM 중앙 API 없이 로컬 imports 프로젝트를 홈에 연결·적용
     *
     * @param string $project_id
     * @param string $project_name
     * @return array
     */
    function icrm_builder_deploy_apply_local_project($project_id, $project_name = '')
    {
        if (!icrm_builder_deploy_local_project_ready($project_id)) {
            return array('success' => false, 'message' => '로컬에 적용 가능한 빌드된 디자인이 없습니다.');
        }

        include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';

        $project_id = onoff_builder_sanitize_project_id($project_id);
        $import = onoff_builder_get_import($project_id);
        if ($project_name === '' && is_array($import) && !empty($import['name'])) {
            $project_name = (string) $import['name'];
        }
        if ($project_name === '') {
            $project_name = $project_id;
        }

        $entry = is_array($import) && !empty($import['entry']) ? (string) $import['entry'] : 'index.html';
        $dir = onoff_builder_project_dir($project_id);
        if (!is_file($dir . '/' . $entry)) {
            foreach (array('dist/index.html', 'index.html') as $fallback) {
                if (is_file($dir . '/' . $fallback)) {
                    $entry = $fallback;
                    break;
                }
            }
        }

        if (!onoff_builder_add_import(array(
            'id'             => $project_id,
            'name'           => $project_name,
            'path'           => $project_id,
            'entry'          => $entry,
            'needs_build'    => false,
            'builder_source' => false,
        ))) {
            return array('success' => false, 'message' => '프로젝트 정보 저장에 실패했습니다.');
        }

        if (is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/lib/site-config.php')) {
            include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/lib/site-config.php';
            if (function_exists('onoff_builder_set_home_bridge_id')) {
                if (!onoff_builder_set_home_bridge_id($project_id)) {
                    return array(
                        'success' => false,
                        'message' => '디자인은 준비됐지만 홈 연결 설정 저장에 실패했습니다. data 폴더 쓰기 권한을 확인해 주세요.',
                    );
                }
            }
        }

        $prev = icrm_builder_deploy_read_state();
        icrm_builder_deploy_write_state(array(
            'source'       => 'local',
            'project_id'   => $project_id,
            'project_name' => $project_name,
            'release_id'   => isset($prev['release_id']) ? (string) $prev['release_id'] : '',
            'history'      => isset($prev['history']) && is_array($prev['history']) ? $prev['history'] : array(),
        ));

        $page_url = defined('G5_PLUGIN_URL')
            ? G5_PLUGIN_URL . '/onoff-builder-bridge/page.php?id=' . rawurlencode($project_id)
            : '';

        return array(
            'success'    => true,
            'message'    => '로컬 디자인을 사이트에 적용했습니다.',
            'local_only' => true,
            'project_id' => $project_id,
            'page_url'   => $page_url,
            'home_url'   => icrm_builder_deploy_home_url(),
        );
    }
}

if (!function_exists('icrm_builder_deploy_state_file')) {
    function icrm_builder_deploy_state_file()
    {
        return G5_PATH . '/.onoff-builder-deploy-state.json';
    }
}

if (!function_exists('icrm_builder_deploy_read_state')) {
    function icrm_builder_deploy_read_state()
    {
        $file = icrm_builder_deploy_state_file();
        if (!is_file($file)) {
            return array();
        }

        $decoded = json_decode((string) file_get_contents($file), true);

        return is_array($decoded) ? $decoded : array();
    }
}

if (!function_exists('icrm_builder_deploy_write_state')) {
    function icrm_builder_deploy_write_state(array $state)
    {
        $existing = icrm_builder_deploy_read_state();
        if (!isset($state['history']) && !empty($existing['history']) && is_array($existing['history'])) {
            $state['history'] = $existing['history'];
        }

        $state['updated_at'] = date('c');
        file_put_contents(
            icrm_builder_deploy_state_file(),
            json_encode($state, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            LOCK_EX
        );
    }
}

if (!function_exists('icrm_builder_deploy_reset')) {
    function icrm_builder_deploy_reset()
    {
        if (!function_exists('onoff_builder_set_home_bridge_id') && is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';
        }

        if (function_exists('onoff_builder_set_home_bridge_id') && !onoff_builder_set_home_bridge_id('')) {
            return array(
                'success' => false,
                'message' => '홈 연결 초기화에 실패했습니다. _site.config.php 또는 플러그인 data 폴더 쓰기 권한을 확인해 주세요.',
            );
        }

        $prev = icrm_builder_deploy_read_state();
        icrm_builder_deploy_write_state(array(
            'source'       => 'reset',
            'project_id'   => '',
            'project_name' => '',
            'release_id'   => '',
            'history'      => isset($prev['history']) && is_array($prev['history']) ? $prev['history'] : array(),
            'reset_at'     => date('c'),
        ));

        return array(
            'success'  => true,
            'message'  => '사이트 적용 상태를 초기화했습니다. 업로드한 디자인 파일은 삭제되지 않습니다.',
            'home_url' => icrm_builder_deploy_home_url(),
        );
    }
}

if (!function_exists('icrm_builder_deploy_get_history')) {
    function icrm_builder_deploy_get_history()
    {
        $state = icrm_builder_deploy_read_state();
        $history = isset($state['history']) && is_array($state['history']) ? $state['history'] : array();

        return $history;
    }
}

if (!function_exists('icrm_builder_deploy_append_history_entry')) {
    function icrm_builder_deploy_append_history_entry(array $entry)
    {
        $state = icrm_builder_deploy_read_state();
        $history = isset($state['history']) && is_array($state['history']) ? $state['history'] : array();
        array_unshift($history, $entry);

        $seen = array();
        $deduped = array();
        foreach ($history as $row) {
            if (!is_array($row) || empty($row['release_id'])) {
                continue;
            }
            $rid = (string) $row['release_id'];
            if (isset($seen[$rid])) {
                continue;
            }
            $seen[$rid] = true;
            $deduped[] = $row;
        }

        return array_slice($deduped, 0, 10);
    }
}

if (!function_exists('icrm_builder_deploy_fetch_release_manifest')) {
    function icrm_builder_deploy_fetch_release_manifest($release_id)
    {
        $release_id = preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $release_id);
        if ($release_id === '') {
            return array('success' => false, 'message' => 'release_id 가 필요합니다.');
        }

        return icrm_builder_deploy_api_post_json('manifest', array(
            'license_key'      => icrm_builder_deploy_get_license_key(),
            'domain'           => icrm_builder_deploy_site_domain(),
            'fetch_release_id' => $release_id,
        ));
    }
}

if (!function_exists('icrm_builder_deploy_home_url')) {
    function icrm_builder_deploy_home_url()
    {
        if (!function_exists('onoff_builder_home_enabled') && is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';
        }

        if (function_exists('onoff_builder_home_enabled') && onoff_builder_home_enabled() && defined('G5_URL')) {
            return G5_URL . '/';
        }

        return '';
    }
}

if (!function_exists('icrm_builder_deploy_auto_home_enabled')) {
    function icrm_builder_deploy_auto_home_enabled()
    {
        if (function_exists('g5site_cfg_bool')) {
            return g5site_cfg_bool('builder_deploy_auto_home', true);
        }

        return true;
    }
}

if (!function_exists('icrm_builder_deploy_set_home_project')) {
    function icrm_builder_deploy_set_home_project($project_id)
    {
        $project_id = preg_replace('/[^a-z0-9_-]/i', '', (string) $project_id);
        if ($project_id === '' || !icrm_builder_deploy_auto_home_enabled()) {
            return true;
        }

        $bootstrap = G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';
        if (!is_file($bootstrap)) {
            return false;
        }
        include_once $bootstrap;

        if (!function_exists('onoff_builder_project_exists') || !onoff_builder_project_exists($project_id)) {
            return false;
        }
        if (function_exists('onoff_builder_set_home_bridge_id')) {
            return onoff_builder_set_home_bridge_id($project_id);
        }

        return false;
    }
}

if (!function_exists('icrm_builder_deploy_repair_home_project')) {
    function icrm_builder_deploy_repair_home_project(array $state)
    {
        if (empty($state['project_id']) || !icrm_builder_deploy_auto_home_enabled()) {
            return;
        }

        $project_id = (string) $state['project_id'];
        if (!function_exists('onoff_builder_home_enabled') && is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';
        }

        if (function_exists('onoff_builder_home_enabled') && onoff_builder_home_enabled()) {
            return;
        }

        icrm_builder_deploy_set_home_project($project_id);
    }
}

if (!function_exists('icrm_builder_deploy_preview_admin_url')) {
    function icrm_builder_deploy_preview_admin_url($release_id = '')
    {
        if (!defined('G5_PLUGIN_URL')) {
            return '';
        }

        $url = G5_PLUGIN_URL . '/onoff-builder-bridge/preview-deploy.php';
        $release_id = preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $release_id);
        if ($release_id !== '') {
            $url .= '?release_id=' . rawurlencode($release_id);
        }

        return $url;
    }
}

if (!function_exists('icrm_builder_deploy_api_post_json')) {
    function icrm_builder_deploy_api_post_json($endpoint, array $payload, $timeout = 120)
    {
        if (!function_exists('icrm_api_post_json') && is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-update.lib.php';
        }

        $url = icrm_builder_deploy_get_api_base_url() . '/' . ltrim((string) $endpoint, '/');
        if (function_exists('icrm_api_post_json')) {
            return icrm_api_post_json($url, $payload, (int) $timeout);
        }

        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $ctx = stream_context_create(array(
            'http' => array(
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\nAccept: application/json\r\n",
                'content' => $body,
                'timeout' => (int) $timeout,
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

        if (function_exists('icrm_api_decode_json_response')) {
            return icrm_api_decode_json_response($raw, $http_code);
        }

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            return array('success' => false, 'message' => 'API 응답 파싱 실패', 'http_code' => 0);
        }

        return $decoded;
    }
}

if (!function_exists('icrm_builder_deploy_site_domain')) {
    function icrm_builder_deploy_site_domain()
    {
        if (function_exists('icrm_update_site_domain')) {
            return icrm_update_site_domain();
        }

        return '';
    }
}

if (!function_exists('icrm_builder_deploy_get_license_key')) {
    function icrm_builder_deploy_get_license_key()
    {
        if (function_exists('icrm_update_get_license_key')) {
            return icrm_update_get_license_key();
        }

        return '';
    }
}

if (!function_exists('icrm_builder_deploy_fetch_manifest')) {
    function icrm_builder_deploy_fetch_manifest($release_id = '')
    {
        $state = icrm_builder_deploy_read_state();
        if ($release_id === '' && !empty($state['release_id'])) {
            $release_id = (string) $state['release_id'];
        }

        return icrm_builder_deploy_api_post_json('manifest', array(
            'license_key' => icrm_builder_deploy_get_license_key(),
            'domain'      => icrm_builder_deploy_site_domain(),
            'release_id'  => $release_id,
        ));
    }
}

if (!function_exists('icrm_builder_deploy_download_file')) {
    function icrm_builder_deploy_download_file($release_id, $relative, $expected_sha256 = '')
    {
        $relative = ltrim(str_replace('\\', '/', (string) $relative), '/');
        if ($relative === '' || strpos($relative, '..') !== false) {
            return array('success' => false, 'message' => 'invalid path');
        }

        $resp = icrm_builder_deploy_api_post_json('file', array(
            'license_key' => icrm_builder_deploy_get_license_key(),
            'domain'      => icrm_builder_deploy_site_domain(),
            'release_id'  => (string) $release_id,
            'path'        => $relative,
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

if (!function_exists('icrm_builder_deploy_merge_import_meta')) {
    function icrm_builder_deploy_merge_import_meta(array $manifest)
    {
        $project_id = isset($manifest['project_id']) ? trim((string) $manifest['project_id']) : '';
        if ($project_id === '') {
            return false;
        }

        $bootstrap = G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';
        if (!is_file($bootstrap)) {
            return false;
        }

        include_once $bootstrap;

        if (!function_exists('onoff_builder_add_import')) {
            return false;
        }

        return onoff_builder_add_import(array(
            'id'    => $project_id,
            'name'  => isset($manifest['project_name']) && $manifest['project_name'] !== ''
                ? (string) $manifest['project_name']
                : $project_id,
            'path'  => $project_id,
            'entry' => isset($manifest['project_entry']) && $manifest['project_entry'] !== ''
                ? (string) $manifest['project_entry']
                : 'index.html',
        ));
    }
}

if (!function_exists('icrm_builder_deploy_check_status')) {
    function icrm_builder_deploy_check_status()
    {
        $license_ok = icrm_builder_deploy_get_license_key() !== '';
        $state = icrm_builder_deploy_read_state();
        icrm_builder_deploy_repair_home_project($state);
        $state = icrm_builder_deploy_read_state();
        $local = isset($state['release_id']) ? (string) $state['release_id'] : '';

        if (!$license_ok) {
            return array(
                'ready'            => false,
                'license_ok'       => false,
                'local_release'    => $local,
                'remote_release'   => '',
                'update_available' => false,
                'project_id'       => isset($state['project_id']) ? (string) $state['project_id'] : '',
                'project_name'     => isset($state['project_name']) ? (string) $state['project_name'] : '',
                'message'          => 'iCRM 라이선스를 설정하세요.',
            );
        }

        if (!is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            return array(
                'ready'            => false,
                'license_ok'       => true,
                'local_release'    => $local,
                'remote_release'   => '',
                'update_available' => false,
                'project_id'       => '',
                'project_name'     => '',
                'message'          => 'onoff-builder-bridge 플러그인이 없습니다. 먼저 기능 업데이트를 적용하세요.',
            );
        }

        $resp = icrm_builder_deploy_fetch_manifest($local);
        if (empty($resp['success'])) {
            $central_error = isset($resp['message']) ? (string) $resp['message'] : 'iCRM 연결 실패';
            $state_project_id = isset($state['project_id']) ? (string) $state['project_id'] : '';
            $state_project_name = isset($state['project_name']) ? (string) $state['project_name'] : '';
            $page_url = ($state_project_id !== '' && defined('G5_PLUGIN_URL'))
                ? G5_PLUGIN_URL . '/onoff-builder-bridge/page.php?id=' . rawurlencode($state_project_id)
                : '';

            return array(
                'ready'            => true,
                'license_ok'       => true,
                'local_release'    => $local,
                'remote_release'   => '',
                'update_available' => false,
                'project_id'       => $state_project_id,
                'project_name'     => $state_project_name,
                'page_url'         => $page_url,
                'preview_url'      => '',
                'home_url'         => icrm_builder_deploy_home_url(),
                'history'          => icrm_builder_deploy_get_history(),
                'central_error'    => $central_error,
                'message'          => 'iCRM 중앙 서버와 연결되지 않았습니다. 업로드된 로컬 디자인은 [배포하고 바로 적용]으로 적용할 수 있습니다.',
            );
        }

        $remote = isset($resp['release_id']) ? (string) $resp['release_id'] : '';
        $project_id = isset($resp['project_id']) ? (string) $resp['project_id'] : '';
        $page_url = ($project_id !== '' && defined('G5_PLUGIN_URL'))
            ? G5_PLUGIN_URL . '/onoff-builder-bridge/page.php?id=' . rawurlencode($project_id)
            : '';

        return array(
            'ready'            => true,
            'license_ok'       => true,
            'local_release'    => $local,
            'remote_release'   => $remote,
            'update_available' => !empty($resp['update_available']),
            'released_at'      => isset($resp['released_at']) ? (string) $resp['released_at'] : '',
            'project_id'       => $project_id,
            'project_name'     => isset($resp['project_name']) ? (string) $resp['project_name'] : '',
            'page_url'         => $page_url,
            'preview_url'      => ($remote !== '') ? icrm_builder_deploy_preview_admin_url($remote) : '',
            'home_url'         => icrm_builder_deploy_home_url(),
            'history'          => icrm_builder_deploy_get_history(),
            'message'          => !empty($resp['update_available']) ? '새 빌더 디자인이 있습니다.' : '최신 빌더 디자인입니다.',
        );
    }
}

if (!function_exists('icrm_builder_deploy_apply_release')) {
    /**
     * iCRM 특정 릴리스를 받아 적용 (pull · rollback · preview staging 공용)
     *
     * @param string $release_id
     * @param bool $dryRun
     * @param bool $recordHistory
     * @return array
     */
    function icrm_builder_deploy_apply_release($release_id, $dryRun = false, $recordHistory = true)
    {
        if (!is_file(G5_LIB_PATH . '/onoff-update.lib.php')) {
            return array('success' => false, 'message' => 'onoff-update.lib.php 가 없습니다.');
        }
        include_once G5_LIB_PATH . '/onoff-update.lib.php';

        if (icrm_builder_deploy_get_license_key() === '') {
            return array('success' => false, 'message' => 'iCRM 라이선스가 설정되지 않았습니다.');
        }

        if (!is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            return array('success' => false, 'message' => 'onoff-builder-bridge 플러그인이 없습니다.');
        }

        $release_id = preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $release_id);
        if ($release_id === '') {
            return array('success' => false, 'message' => 'release_id 가 필요합니다.');
        }

        $manifestResp = icrm_builder_deploy_fetch_release_manifest($release_id);
        if (empty($manifestResp['success'])) {
            return $manifestResp;
        }

        $manifest = isset($manifestResp['manifest']) && is_array($manifestResp['manifest'])
            ? $manifestResp['manifest']
            : array();

        $bundleName = 'builder-deploy';
        $bundles = isset($manifest['bundles']) && is_array($manifest['bundles']) ? $manifest['bundles'] : array();
        if (!isset($bundles[$bundleName]['packages']) || !is_array($bundles[$bundleName]['packages'])) {
            return array('success' => false, 'message' => '빌더 배포 번들을 찾을 수 없습니다.');
        }

        try {
            $packages = onoff_update_resolve_packages_from_manifest($manifest, $bundles[$bundleName]['packages']);
        } catch (RuntimeException $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }

        $fileIndex = isset($manifest['files']) && is_array($manifest['files']) ? $manifest['files'] : array();
        $paths = function_exists('icrm_update_collect_file_paths')
            ? icrm_update_collect_file_paths($packages)
            : array();

        $tempRoot = G5_DATA_PATH . '/cache/icrm-builder-deploy-' . preg_replace('/[^a-zA-Z0-9._-]/', '', $release_id);
        if (!$dryRun && is_dir($tempRoot)) {
            icrm_builder_deploy_remove_dir($tempRoot);
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

            $fileResp = icrm_builder_deploy_download_file($release_id, $relative, $expected);
            if (empty($fileResp['success'])) {
                icrm_builder_deploy_remove_dir($tempRoot);
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

        $targetRoot = G5_PATH;
        $applier = new OnoffUpdateApplier($tempRoot, $targetRoot, $dryRun);
        $applier->applyPackages($packages);

        if (!$dryRun) {
            icrm_builder_deploy_merge_import_meta($manifest);

            $prev = icrm_builder_deploy_read_state();
            $history = isset($prev['history']) && is_array($prev['history']) ? $prev['history'] : array();
            if ($recordHistory && !empty($prev['release_id']) && (string) $prev['release_id'] !== $release_id) {
                $history = icrm_builder_deploy_append_history_entry(array(
                    'release_id'   => (string) $prev['release_id'],
                    'project_id'   => isset($prev['project_id']) ? (string) $prev['project_id'] : '',
                    'project_name' => isset($prev['project_name']) ? (string) $prev['project_name'] : '',
                    'applied_at'   => isset($prev['updated_at']) ? (string) $prev['updated_at'] : date('c'),
                ));
            }

            icrm_builder_deploy_write_state(array(
                'source'       => 'icrm',
                'release_id'   => $release_id,
                'project_id'   => isset($manifest['project_id']) ? (string) $manifest['project_id'] : '',
                'project_name' => isset($manifest['project_name']) ? (string) $manifest['project_name'] : '',
                'history'      => $history,
            ));

            $applied_project_id = isset($manifest['project_id']) ? (string) $manifest['project_id'] : '';
            if ($applied_project_id !== '' && !icrm_builder_deploy_set_home_project($applied_project_id)) {
                icrm_builder_deploy_remove_dir($tempRoot);

                return array(
                    'success'    => false,
                    'message'    => '빌더 디자인 파일은 적용됐지만 홈 연결 설정 저장에 실패했습니다. _site.config.php 또는 plugin/onoff-builder-bridge/data 권한을 확인해 주세요.',
                    'release_id' => $release_id,
                    'project_id' => $applied_project_id,
                );
            }
            icrm_builder_deploy_remove_dir($tempRoot);
        }

        $project_id = isset($manifest['project_id']) ? (string) $manifest['project_id'] : '';
        $page_url = ($project_id !== '' && defined('G5_PLUGIN_URL'))
            ? G5_PLUGIN_URL . '/onoff-builder-bridge/page.php?id=' . rawurlencode($project_id)
            : '';

        return array(
            'success'          => true,
            'message'          => $dryRun ? 'dry-run 완료' : '빌더 디자인 적용 완료',
            'update_available' => true,
            'release_id'       => $release_id,
            'bundle'           => $bundleName,
            'files_downloaded' => $downloaded,
            'changed'          => $applier->getChanged(),
            'skipped'          => $applier->getSkipped(),
            'backup'           => $dryRun ? '' : $applier->getBackupRoot(),
            'page_url'         => $page_url,
            'home_url'         => icrm_builder_deploy_home_url(),
        );
    }
}

if (!function_exists('icrm_builder_deploy_download_release_files')) {
    function icrm_builder_deploy_download_release_files($release_id)
    {
        if (is_file(G5_LIB_PATH . '/onoff-update.lib.php')) {
            include_once G5_LIB_PATH . '/onoff-update.lib.php';
        }
        if (is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-update.lib.php';
        }

        $release_id = preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $release_id);
        if ($release_id === '') {
            return array('success' => false, 'message' => 'release_id 가 필요합니다.');
        }

        $manifestResp = icrm_builder_deploy_fetch_release_manifest($release_id);
        if (empty($manifestResp['success'])) {
            return $manifestResp;
        }

        $manifest = isset($manifestResp['manifest']) && is_array($manifestResp['manifest']) ? $manifestResp['manifest'] : array();
        $bundles = isset($manifest['bundles']) && is_array($manifest['bundles']) ? $manifest['bundles'] : array();
        if (!isset($bundles['builder-deploy']['packages']) || !is_array($bundles['builder-deploy']['packages'])) {
            return array('success' => false, 'message' => '빌더 배포 번들을 찾을 수 없습니다.');
        }

        try {
            $packages = onoff_update_resolve_packages_from_manifest($manifest, $bundles['builder-deploy']['packages']);
        } catch (RuntimeException $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }

        $fileIndex = isset($manifest['files']) && is_array($manifest['files']) ? $manifest['files'] : array();
        $paths = icrm_update_collect_file_paths($packages);

        $tempRoot = G5_DATA_PATH . '/cache/icrm-builder-preview-' . preg_replace('/[^a-zA-Z0-9._-]/', '', $release_id);
        if (is_dir($tempRoot)) {
            icrm_builder_deploy_remove_dir($tempRoot);
        }
        @mkdir($tempRoot, 0755, true);

        foreach ($paths as $relative) {
            $expected = isset($fileIndex[$relative]['sha256']) ? (string) $fileIndex[$relative]['sha256'] : '';
            $fileResp = icrm_builder_deploy_download_file($release_id, $relative, $expected);
            if (empty($fileResp['success'])) {
                icrm_builder_deploy_remove_dir($tempRoot);
                return $fileResp;
            }
            $dest = $tempRoot . '/' . $relative;
            $dir = dirname($dest);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            file_put_contents($dest, $fileResp['content'], LOCK_EX);
        }

        return array(
            'success'    => true,
            'temp_root'  => $tempRoot,
            'manifest'   => $manifest,
            'release_id' => $release_id,
        );
    }
}

if (!function_exists('icrm_builder_deploy_stage_preview_release')) {
    function icrm_builder_deploy_stage_preview_release($release_id = '')
    {
        if ($release_id === '') {
            $manifestResp = icrm_builder_deploy_fetch_manifest();
            if (empty($manifestResp['success']) || empty($manifestResp['release_id'])) {
                return array('success' => false, 'message' => '미리볼 릴리스가 없습니다.');
            }
            $release_id = (string) $manifestResp['release_id'];
        }

        $download = icrm_builder_deploy_download_release_files($release_id);
        if (empty($download['success'])) {
            return $download;
        }

        include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';

        $manifest = $download['manifest'];
        $tempRoot = $download['temp_root'];
        $project_id = isset($manifest['project_id']) ? onoff_builder_sanitize_project_id($manifest['project_id']) : '';
        if ($project_id === '') {
            icrm_builder_deploy_remove_dir($tempRoot);
            return array('success' => false, 'message' => '프로젝트 ID를 확인할 수 없습니다.');
        }

        $src = $tempRoot . '/plugin/onoff-builder-bridge/imports/' . $project_id;
        $preview_id = ICRM_BUILDER_DEPLOY_PREVIEW_ID;
        $dst = onoff_builder_project_dir($preview_id);
        if (!is_dir($src)) {
            icrm_builder_deploy_remove_dir($tempRoot);
            return array('success' => false, 'message' => '릴리스 파일을 찾을 수 없습니다.');
        }

        if ($dst !== '' && is_dir($dst)) {
            onoff_builder_remove_dir($dst);
        }
        if (!is_dir(dirname($dst))) {
            @mkdir(dirname($dst), 0755, true);
        }

        icrm_builder_deploy_copy_dir($src, $dst);
        icrm_builder_deploy_remove_dir($tempRoot);

        onoff_builder_add_import(array(
            'id'    => $preview_id,
            'name'  => '[미리보기] ' . (isset($manifest['project_name']) ? $manifest['project_name'] : $project_id),
            'path'  => $preview_id,
            'entry' => isset($manifest['project_entry']) ? $manifest['project_entry'] : 'index.html',
        ));

        $page_url = defined('G5_PLUGIN_URL')
            ? G5_PLUGIN_URL . '/onoff-builder-bridge/page.php?id=' . rawurlencode($preview_id)
            : '';

        return array(
            'success'    => true,
            'message'    => '미리보기 준비 완료',
            'release_id' => $release_id,
            'page_url'   => $page_url,
        );
    }
}

if (!function_exists('icrm_builder_deploy_copy_dir')) {
    function icrm_builder_deploy_copy_dir($src, $dst)
    {
        if (!is_dir($src)) {
            return false;
        }
        if (!is_dir($dst) && !@mkdir($dst, 0755, true)) {
            return false;
        }

        foreach (scandir($src) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $from = $src . '/' . $item;
            $to = $dst . '/' . $item;
            if (is_dir($from)) {
                icrm_builder_deploy_copy_dir($from, $to);
            } else {
                @copy($from, $to);
            }
        }

        return true;
    }
}

if (!function_exists('icrm_builder_deploy_rollback')) {
    function icrm_builder_deploy_rollback($release_id = '')
    {
        if ($release_id === '') {
            $history = icrm_builder_deploy_get_history();
            if ($history === array() || empty($history[0]['release_id'])) {
                return array('success' => false, 'message' => '복구할 이전 릴리스가 없습니다.');
            }
            $release_id = (string) $history[0]['release_id'];
        }

        $state = icrm_builder_deploy_read_state();
        if (!empty($state['release_id']) && (string) $state['release_id'] === (string) $release_id) {
            return array('success' => false, 'message' => '이미 해당 릴리스가 적용되어 있습니다.');
        }

        return icrm_builder_deploy_apply_release($release_id, false, true);
    }
}

if (!function_exists('icrm_builder_deploy_pull')) {
    /**
     * iCRM에서 빌더 디자인 릴리스를 받아 적용
     *
     * @param bool $dryRun
     * @return array
     */
    function icrm_builder_deploy_pull($dryRun = false)
    {
        $manifestResp = icrm_builder_deploy_fetch_manifest();
        if (empty($manifestResp['success'])) {
            return $manifestResp;
        }

        if (empty($manifestResp['update_available'])) {
            return array(
                'success'          => true,
                'message'          => '이미 최신 빌더 디자인입니다.',
                'update_available' => false,
                'release_id'       => isset($manifestResp['release_id']) ? $manifestResp['release_id'] : '',
            );
        }

        $release_id = isset($manifestResp['release_id']) ? (string) $manifestResp['release_id'] : '';
        if ($release_id === '') {
            return array('success' => false, 'message' => 'release_id 가 없습니다.');
        }

        return icrm_builder_deploy_apply_release($release_id, $dryRun, true);
    }
}

if (!function_exists('icrm_builder_deploy_remove_dir')) {
    function icrm_builder_deploy_remove_dir($dir)
    {
        if (!is_dir($dir)) {
            return;
        }

        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                icrm_builder_deploy_remove_dir($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}

if (!function_exists('icrm_builder_deploy_publish_project')) {
    /**
     * 로컬 프로젝트를 iCRM builder-deploy 릴리스로 등록
     *
     * @param string $project_id
     * @param string $project_name
     * @param string $domain 비우면 현재 사이트 도메인
     * @return array
     */
    function icrm_builder_deploy_publish_project($project_id, $project_name = '', $domain = '')
    {
        if (icrm_builder_deploy_get_license_key() === '') {
            return array('success' => false, 'message' => 'iCRM 라이선스가 설정되지 않았습니다.');
        }

        if (!is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            return array('success' => false, 'message' => 'onoff-builder-bridge 플러그인이 없습니다.');
        }

        include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';

        if (!onoff_builder_project_exists($project_id)) {
            return array('success' => false, 'message' => '프로젝트를 찾을 수 없습니다.');
        }

        $import = onoff_builder_get_import($project_id);
        if (is_array($import) && !empty($import['needs_build'])) {
            return array('success' => false, 'message' => '빌드가 필요한 프로젝트입니다. [iCRM에서 빌드]를 실행하거나 dist ZIP을 업로드해 주세요.');
        }

        if (is_array($import) && function_exists('onoff_builder_is_vite_source_project')) {
            $dir = onoff_builder_project_dir($project_id);
            if ($dir !== '' && onoff_builder_is_vite_source_project($dir)) {
                $entry = !empty($import['entry']) ? (string) $import['entry'] : '';
                if ($entry === '' || $entry === 'index.html') {
                    return array('success' => false, 'message' => '빌드가 필요한 원본 프로젝트입니다. [iCRM에서 빌드]를 실행하거나 dist ZIP을 업로드해 주세요.');
                }
            }
        }

        if ($project_name === '' && is_array($import) && !empty($import['name'])) {
            $project_name = (string) $import['name'];
        }
        if ($project_name === '') {
            $project_name = $project_id;
        }

        if ($domain === '') {
            $domain = icrm_builder_deploy_site_domain();
        }
        if ($domain === '') {
            return array('success' => false, 'message' => '배포 대상 도메인을 확인할 수 없습니다.');
        }

        $zip = onoff_builder_zip_project_dir($project_id);
        if (empty($zip['ok']) || empty($zip['path'])) {
            return array('success' => false, 'message' => isset($zip['message']) ? $zip['message'] : 'ZIP 생성 실패');
        }

        $zipPath = $zip['path'];
        $raw = file_get_contents($zipPath);
        @unlink($zipPath);

        if ($raw === false || $raw === '') {
            return array('success' => false, 'message' => 'ZIP 읽기 실패');
        }

        if (strlen($raw) > 50 * 1024 * 1024) {
            return array('success' => false, 'message' => '프로젝트가 너무 큽니다. (최대 50MB)');
        }

        $resp = icrm_builder_deploy_api_post_json('publish', array(
            'license_key'  => icrm_builder_deploy_get_license_key(),
            'domain'       => $domain,
            'project_id'   => onoff_builder_sanitize_project_id($project_id),
            'project_name' => $project_name,
            'zip_base64'   => base64_encode($raw),
        ));

        if (empty($resp['success'])) {
            return $resp;
        }

        $page_url = defined('G5_PLUGIN_URL')
            ? G5_PLUGIN_URL . '/onoff-builder-bridge/page.php?id=' . rawurlencode(onoff_builder_sanitize_project_id($project_id))
            : '';

        $resp['page_url'] = $page_url;
        $resp['apply_admin_url'] = function_exists('icrm_update_admin_url') ? icrm_update_admin_url() : '';

        return $resp;
    }
}

if (!function_exists('icrm_builder_deploy_publish_and_apply')) {
    /**
     * iCRM 등록 후 사이트에 즉시 적용 (일반회원 원클릭 배포)
     *
     * @param string $project_id
     * @param string $project_name
     * @param array  $options (reserved)
     * @return array
     */
    function icrm_builder_deploy_publish_and_apply($project_id, $project_name = '', array $options = array())
    {
        if (!is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            return array('success' => false, 'message' => 'onoff-builder-bridge 플러그인이 없습니다.');
        }
        include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';

        if (function_exists('onoff_builder_sync_import_build_flags')) {
            onoff_builder_sync_import_build_flags($project_id);
        }

        $import = onoff_builder_get_import($project_id);
        $needs_build = onoff_builder_project_needs_build($project_id, is_array($import) ? $import : array());

        if ($needs_build) {
            if (!function_exists('icrm_builder_deploy_build_source_project')) {
                if (!icrm_builder_deploy_local_project_ready($project_id)) {
                    return array('success' => false, 'message' => '빌드 모듈이 없습니다.');
                }
            } else {
                $build = icrm_builder_deploy_build_source_project($project_id);
                if (empty($build['success'])) {
                    if (icrm_builder_deploy_local_project_ready($project_id)) {
                        if (function_exists('onoff_builder_sync_import_build_flags')) {
                            onoff_builder_sync_import_build_flags($project_id);
                        }
                    } else {
                        $build['message'] = isset($build['message']) ? (string) $build['message'] : 'iCRM 빌드 실패';

                        return $build;
                    }
                }
            }
        }

        $publish = icrm_builder_deploy_publish_project($project_id, $project_name);
        if (empty($publish['success'])) {
            if (icrm_builder_deploy_api_unavailable($publish)
                && icrm_builder_deploy_local_project_ready($project_id)) {
                $local = icrm_builder_deploy_apply_local_project($project_id, $project_name);
                if (!empty($local['success'])) {
                    $local['message'] = 'iCRM 중앙 배포는 연결되지 않았지만, 업로드된 로컬 디자인을 사이트에 적용했습니다.';
                    if (!empty($publish['message'])) {
                        $local['central_error'] = (string) $publish['message'];
                    }
                }

                return $local;
            }

            return $publish;
        }

        $release_id = isset($publish['release_id']) ? preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $publish['release_id']) : '';
        if ($release_id !== '') {
            $pull = icrm_builder_deploy_apply_release($release_id, false, true);
        } else {
            $pull = icrm_builder_deploy_pull(false);
        }

        if (empty($pull['success'])) {
            if (icrm_builder_deploy_local_project_ready($project_id)) {
                $local = icrm_builder_deploy_apply_local_project($project_id, $project_name);
                if (!empty($local['success'])) {
                    $local['published'] = true;
                    $local['published_release_id'] = $release_id;
                    $local['message'] = 'iCRM에서 릴리스를 받지 못했지만, 업로드된 로컬 디자인을 사이트에 적용했습니다.';
                    if (!empty($pull['message'])) {
                        $local['central_error'] = (string) $pull['message'];
                    }

                    return $local;
                }
            }

            $pull['published'] = true;
            $pull['published_release_id'] = $release_id;

            return $pull;
        }

        if (!empty($pull['local_only'])) {
            return $pull;
        }

        if (is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/lib/site-config.php')) {
            include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/lib/site-config.php';
            if (function_exists('onoff_builder_set_home_bridge_id')) {
                if (!onoff_builder_set_home_bridge_id($project_id)) {
                    return array(
                        'success' => false,
                        'message' => '디자인은 적용됐지만 홈 연결 설정 저장에 실패했습니다. data 폴더 쓰기 권한을 확인해 주세요.',
                        'published' => true,
                        'published_release_id' => isset($publish['release_id']) ? (string) $publish['release_id'] : '',
                    );
                }
            }
        }

        $pull['published'] = true;
        $pull['published_release_id'] = isset($publish['release_id']) ? (string) $publish['release_id'] : '';
        $pull['message'] = '디자인 배포 및 적용이 완료되었습니다.';
        $pull['home_url'] = icrm_builder_deploy_home_url();

        return $pull;
    }
}

if (!function_exists('icrm_builder_deploy_build_source_project')) {
    /**
     * iCRM 서버에서 Vite 원본 빌드 후 dist를 사이트 imports에 적용
     *
     * @param string $project_id
     * @return array
     */
    function icrm_builder_deploy_build_source_project($project_id)
    {
        if (icrm_builder_deploy_get_license_key() === '') {
            return array('success' => false, 'message' => 'iCRM 라이선스가 설정되지 않았습니다.');
        }

        if (!is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
            return array('success' => false, 'message' => 'onoff-builder-bridge 플러그인이 없습니다.');
        }

        include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';

        if (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id)) {
            return array('success' => false, 'message' => '프로젝트를 찾을 수 없습니다.');
        }

        $project_id = onoff_builder_sanitize_project_id($project_id);
        onoff_builder_sync_import_build_flags($project_id);
        $import = onoff_builder_get_import($project_id);

        if (!onoff_builder_project_needs_build($project_id, is_array($import) ? $import : array())) {
            return array('success' => false, 'message' => '빌드가 필요한 원본 프로젝트가 아닙니다.');
        }

        $zip = onoff_builder_zip_project_dir($project_id);
        if (empty($zip['ok']) || empty($zip['path'])) {
            return array('success' => false, 'message' => isset($zip['message']) ? $zip['message'] : 'ZIP 생성 실패');
        }

        $zipPath = $zip['path'];
        $raw = file_get_contents($zipPath);
        @unlink($zipPath);

        if ($raw === false || $raw === '') {
            return array('success' => false, 'message' => 'ZIP 읽기 실패');
        }

        if (strlen($raw) > 50 * 1024 * 1024) {
            return array('success' => false, 'message' => '프로젝트가 너무 큽니다. (최대 50MB)');
        }

        $domain = icrm_builder_deploy_site_domain();
        if ($domain === '') {
            return array('success' => false, 'message' => '배포 대상 도메인을 확인할 수 없습니다.');
        }

        $resp = icrm_builder_deploy_api_post_json('build-source', array(
            'license_key' => icrm_builder_deploy_get_license_key(),
            'domain'      => $domain,
            'project_id'  => $project_id,
            'zip_base64'  => base64_encode($raw),
        ), 600);

        if (empty($resp['success']) || empty($resp['zip_base64'])) {
            return array(
                'success' => false,
                'message' => isset($resp['message']) ? (string) $resp['message'] : 'iCRM 빌드 실패',
            );
        }

        $distRaw = base64_decode((string) $resp['zip_base64'], true);
        if ($distRaw === false || $distRaw === '') {
            return array('success' => false, 'message' => '빌드 결과 ZIP을 읽을 수 없습니다.');
        }

        $distZip = sys_get_temp_dir() . '/onoff-builder-dist-' . $project_id . '-' . time() . '.zip';
        if (file_put_contents($distZip, $distRaw, LOCK_EX) === false) {
            return array('success' => false, 'message' => '빌드 결과 저장 실패');
        }

        $apply = onoff_builder_replace_project_from_zip($project_id, $distZip);
        @unlink($distZip);

        if (empty($apply['ok'])) {
            return array('success' => false, 'message' => isset($apply['message']) ? $apply['message'] : '빌드 결과 적용 실패');
        }

        $project_name = !empty($import['name']) ? (string) $import['name'] : $project_id;
        if (!onoff_builder_add_import(array(
            'id'             => $project_id,
            'name'           => $project_name,
            'path'           => $project_id,
            'entry'          => isset($apply['entry']) ? (string) $apply['entry'] : 'index.html',
            'needs_build'    => false,
            'builder_source' => false,
        ))) {
            return array('success' => false, 'message' => '프로젝트 정보 저장 실패');
        }

        return array(
            'success'  => true,
            'message'  => 'iCRM에서 빌드가 완료되었습니다. [배포하고 바로 적용]을 눌러 주세요.',
            'entry'    => isset($apply['entry']) ? (string) $apply['entry'] : 'index.html',
            'page_url' => defined('G5_PLUGIN_URL')
                ? G5_PLUGIN_URL . '/onoff-builder-bridge/page.php?id=' . rawurlencode($project_id)
                : '',
        );
    }
}
