<?php
/**
 * iCRM — 빌더 디자인 사이트별 배포 (builder-deploy API)
 */
if (!function_exists('onoff_g5_builder_deploy_init')) {
    function onoff_g5_builder_deploy_init()
    {
        static $done = false;
        if ($done) {
            return;
        }
        $done = true;

        $extend_update = defined('G5_EXTEND_PATH') ? G5_EXTEND_PATH . '/onoff_g5_update.extend.php' : G5_EXTEND_DIR . '/onoff_g5_update.extend.php';
        if (is_file($extend_update)) {
            include_once $extend_update;
        }
    }
}

if (!function_exists('onoff_g5_builder_deploy_sanitize_domain')) {
    function onoff_g5_builder_deploy_sanitize_domain($domain)
    {
        $domain = strtolower(trim((string) $domain));

        return preg_replace('/[^a-zA-Z0-9.\-:]/', '', $domain);
    }
}

if (!function_exists('onoff_g5_builder_deploy_data_root')) {
    function onoff_g5_builder_deploy_data_root()
    {
        return rtrim((string) G5_DATA_PATH, '/\\') . '/builder-deploy';
    }
}

if (!function_exists('onoff_g5_builder_deploy_site_root')) {
    function onoff_g5_builder_deploy_site_root($domain)
    {
        $domain = onoff_g5_builder_deploy_sanitize_domain($domain);
        if ($domain === '') {
            return '';
        }

        return onoff_g5_builder_deploy_data_root() . '/sites/' . $domain;
    }
}

if (!function_exists('onoff_g5_builder_deploy_current_pointer_path')) {
    function onoff_g5_builder_deploy_current_pointer_path($domain)
    {
        $root = onoff_g5_builder_deploy_site_root($domain);

        return $root !== '' ? $root . '/current.json' : '';
    }
}

if (!function_exists('onoff_g5_builder_deploy_read_current_release_id')) {
    function onoff_g5_builder_deploy_read_current_release_id($domain)
    {
        $path = onoff_g5_builder_deploy_current_pointer_path($domain);
        if ($path === '' || !is_file($path)) {
            return '';
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        if (!is_array($decoded)) {
            return '';
        }

        return trim((string) ($decoded['release_id'] ?? ''));
    }
}

if (!function_exists('onoff_g5_builder_deploy_release_root')) {
    function onoff_g5_builder_deploy_release_root($domain, $release_id)
    {
        $site_root = onoff_g5_builder_deploy_site_root($domain);
        $release_id = preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $release_id);
        if ($site_root === '' || $release_id === '') {
            return '';
        }

        return $site_root . '/releases/' . $release_id;
    }
}

if (!function_exists('onoff_g5_builder_deploy_manifest_path')) {
    function onoff_g5_builder_deploy_manifest_path($domain, $release_id)
    {
        $root = onoff_g5_builder_deploy_release_root($domain, $release_id);

        return $root !== '' ? $root . '/manifest.json' : '';
    }
}

if (!function_exists('onoff_g5_builder_deploy_files_root')) {
    function onoff_g5_builder_deploy_files_root($domain, $release_id)
    {
        $root = onoff_g5_builder_deploy_release_root($domain, $release_id);

        return $root !== '' ? $root . '/files' : '';
    }
}

if (!function_exists('onoff_g5_builder_deploy_load_manifest')) {
    function onoff_g5_builder_deploy_load_manifest($domain, $release_id = '')
    {
        if ($release_id === '') {
            $release_id = onoff_g5_builder_deploy_read_current_release_id($domain);
        }
        if ($release_id === '') {
            return null;
        }

        $path = onoff_g5_builder_deploy_manifest_path($domain, $release_id);
        if ($path === '' || !is_file($path)) {
            return null;
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? $decoded : null;
    }
}

if (!function_exists('onoff_g5_builder_deploy_validate_request')) {
    function onoff_g5_builder_deploy_validate_request(array $params)
    {
        onoff_g5_builder_deploy_init();

        if (!function_exists('onoff_g5_update_validate_request')) {
            return array('ok' => false, 'payload' => array('success' => false, 'message' => 'update module unavailable'));
        }

        $auth = onoff_g5_update_validate_request($params);
        if (empty($auth['ok'])) {
            return $auth;
        }

        $requestDomain = onoff_g5_builder_deploy_sanitize_domain($params['domain'] ?? '');
        $licenseDomain = onoff_g5_builder_deploy_sanitize_domain($auth['domain'] ?? ($params['domain'] ?? ''));
        if ($requestDomain === '' || $licenseDomain === '' || $requestDomain !== $licenseDomain) {
            return array('ok' => false, 'payload' => array('success' => false, 'message' => '도메인이 라이선스와 일치하지 않습니다.'));
        }

        $auth['domain'] = $requestDomain;

        return $auth;
    }
}

if (!function_exists('onoff_g5_builder_deploy_api_manifest')) {
    function onoff_g5_builder_deploy_api_manifest(array $params)
    {
        $auth = onoff_g5_builder_deploy_validate_request($params);
        if (empty($auth['ok'])) {
            return $auth['payload'];
        }

        $domain = $auth['domain'];
        $fetchRelease = trim((string) ($params['fetch_release_id'] ?? ''));
        if ($fetchRelease !== '') {
            $manifest = onoff_g5_builder_deploy_load_manifest($domain, $fetchRelease);
            if (!$manifest || empty($manifest['release_id'])) {
                return array('success' => false, 'message' => '요청한 릴리스를 찾을 수 없습니다.');
            }

            return array(
                'success'      => true,
                'release_id'   => (string) $manifest['release_id'],
                'released_at'  => isset($manifest['released_at']) ? $manifest['released_at'] : '',
                'project_id'   => isset($manifest['project_id']) ? (string) $manifest['project_id'] : '',
                'project_name' => isset($manifest['project_name']) ? (string) $manifest['project_name'] : '',
                'manifest'     => $manifest,
                'file_count'   => isset($manifest['files']) && is_array($manifest['files']) ? count($manifest['files']) : 0,
            );
        }

        $manifest = onoff_g5_builder_deploy_load_manifest($domain);
        if (!$manifest || empty($manifest['release_id'])) {
            return array('success' => false, 'message' => '빌더 디자인 릴리스가 아직 등록되지 않았습니다.');
        }

        $localRelease = trim((string) ($params['release_id'] ?? ''));
        $remoteRelease = (string) $manifest['release_id'];
        $updateAvailable = ($localRelease === '' || $localRelease !== $remoteRelease);

        return array(
            'success'          => true,
            'release_id'       => $remoteRelease,
            'released_at'      => isset($manifest['released_at']) ? $manifest['released_at'] : '',
            'update_available' => $updateAvailable,
            'bundle'           => 'builder-deploy',
            'project_id'       => isset($manifest['project_id']) ? (string) $manifest['project_id'] : '',
            'project_name'     => isset($manifest['project_name']) ? (string) $manifest['project_name'] : '',
            'manifest'         => $manifest,
            'file_count'       => isset($manifest['files']) && is_array($manifest['files']) ? count($manifest['files']) : 0,
        );
    }
}

if (!function_exists('onoff_g5_builder_deploy_api_file')) {
    function onoff_g5_builder_deploy_api_file(array $params)
    {
        $auth = onoff_g5_builder_deploy_validate_request($params);
        if (empty($auth['ok'])) {
            return $auth['payload'];
        }

        $domain = $auth['domain'];
        $releaseId = trim((string) ($params['release_id'] ?? ''));
        if ($releaseId === '') {
            return array('success' => false, 'message' => 'release_id 가 필요합니다.');
        }

        $manifest = onoff_g5_builder_deploy_load_manifest($domain, $releaseId);
        if (!$manifest || empty($manifest['release_id'])) {
            return array('success' => false, 'message' => '빌더 디자인 릴리스가 없습니다.');
        }

        if ($releaseId !== (string) $manifest['release_id']) {
            return array('success' => false, 'message' => 'release_id 가 일치하지 않습니다.');
        }

        if (!function_exists('onoff_g5_update_sanitize_relative_path')) {
            onoff_g5_builder_deploy_init();
        }

        $relative = function_exists('onoff_g5_update_sanitize_relative_path')
            ? onoff_g5_update_sanitize_relative_path($params['path'] ?? '')
            : '';
        if ($relative === '') {
            return array('success' => false, 'message' => 'path 가 올바르지 않습니다.');
        }

        $filesIndex = isset($manifest['files']) && is_array($manifest['files']) ? $manifest['files'] : array();
        if (!isset($filesIndex[$relative])) {
            return array('success' => false, 'message' => 'manifest 에 없는 파일입니다.');
        }

        $fullPath = onoff_g5_builder_deploy_files_root($domain, $releaseId) . '/' . $relative;
        if (!is_file($fullPath)) {
            return array('success' => false, 'message' => '파일이 서버에 없습니다.');
        }

        $content = file_get_contents($fullPath);
        $sha256 = hash('sha256', $content);
        $expected = isset($filesIndex[$relative]['sha256']) ? strtolower((string) $filesIndex[$relative]['sha256']) : '';
        if ($expected !== '' && !hash_equals($expected, $sha256)) {
            return array('success' => false, 'message' => '서버 파일 checksum 불일치');
        }

        return array(
            'success'        => true,
            'release_id'     => $releaseId,
            'path'           => $relative,
            'sha256'         => $sha256,
            'size'           => strlen($content),
            'content_base64' => base64_encode($content),
        );
    }
}

$pack_file = defined('G5_EXTEND_PATH') ? G5_EXTEND_PATH . '/onoff_g5_builder_deploy_pack.php' : G5_EXTEND_DIR . '/onoff_g5_builder_deploy_pack.php';
if (is_file($pack_file)) {
    include_once $pack_file;
}

if (!function_exists('onoff_g5_builder_deploy_api_publish')) {
    function onoff_g5_builder_deploy_api_publish(array $params)
    {
        $auth = onoff_g5_builder_deploy_validate_request($params);
        if (empty($auth['ok'])) {
            return $auth['payload'];
        }

        if (!function_exists('onoff_g5_builder_deploy_publish_from_zip')) {
            return array('success' => false, 'message' => 'pack module unavailable');
        }

        $domain = $auth['domain'];
        $projectId = onoff_g5_builder_deploy_pack_sanitize_project_id($params['project_id'] ?? '');
        $projectName = trim((string) ($params['project_name'] ?? ''));
        $releaseId = trim((string) ($params['release_id'] ?? ''));

        if ($projectId === '' || !preg_match('/^[a-z0-9][a-z0-9_-]*$/', $projectId)) {
            return array('success' => false, 'message' => 'project_id 가 올바르지 않습니다.');
        }
        if ($projectName === '') {
            $projectName = $projectId;
        }

        $zipPath = '';
        $tempZip = '';

        if (!empty($params['zip_base64'])) {
            $raw = base64_decode((string) $params['zip_base64'], true);
            if ($raw === false || $raw === '') {
                return array('success' => false, 'message' => 'zip_base64 가 올바르지 않습니다.');
            }
            if (strlen($raw) > 50 * 1024 * 1024) {
                return array('success' => false, 'message' => 'ZIP 파일이 너무 큽니다. (최대 50MB)');
            }
            $tempZip = sys_get_temp_dir() . '/builder-deploy-upload-' . getmypid() . '-' . time() . '.zip';
            if (file_put_contents($tempZip, $raw, LOCK_EX) === false) {
                return array('success' => false, 'message' => 'ZIP 저장 실패');
            }
            $zipPath = $tempZip;
        }

        if ($zipPath === '') {
            return array('success' => false, 'message' => 'zip_base64 가 필요합니다.');
        }

        $result = onoff_g5_builder_deploy_publish_from_zip($domain, $projectId, $projectName, $zipPath, $releaseId);

        if ($tempZip !== '' && is_file($tempZip)) {
            @unlink($tempZip);
        }

        return $result;
    }
}

if (!function_exists('onoff_g5_builder_deploy_api_build_source')) {
    function onoff_g5_builder_deploy_api_build_source(array $params)
    {
        $auth = onoff_g5_builder_deploy_validate_request($params);
        if (empty($auth['ok'])) {
            return $auth['payload'];
        }

        if (!is_file(G5_EXTEND_PATH . '/onoff_g5_builder_deploy_pack.php')) {
            return array('success' => false, 'message' => 'builder-deploy pack module unavailable');
        }
        include_once G5_EXTEND_PATH . '/onoff_g5_builder_deploy_pack.php';

        $zipPath = '';
        $tempZip = '';

        if (!empty($params['zip_base64'])) {
            $raw = base64_decode((string) $params['zip_base64'], true);
            if ($raw === false || $raw === '') {
                return array('success' => false, 'message' => 'zip_base64 가 올바르지 않습니다.');
            }
            if (strlen($raw) > 50 * 1024 * 1024) {
                return array('success' => false, 'message' => 'ZIP 파일이 너무 큽니다. (최대 50MB)');
            }
            $tempZip = sys_get_temp_dir() . '/builder-deploy-build-src-' . getmypid() . '-' . time() . '.zip';
            if (file_put_contents($tempZip, $raw, LOCK_EX) === false) {
                return array('success' => false, 'message' => 'ZIP 저장 실패');
            }
            $zipPath = $tempZip;
        }

        if ($zipPath === '') {
            return array('success' => false, 'message' => 'zip_base64 가 필요합니다.');
        }

        @set_time_limit(600);
        $result = onoff_g5_builder_deploy_build_source_from_zip($zipPath);

        if ($tempZip !== '' && is_file($tempZip)) {
            @unlink($tempZip);
        }

        return $result;
    }
}
