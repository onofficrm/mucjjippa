<?php
/**
 * iCRM — 그누보드(onoff-g5-base) 중앙 업데이트 라이브러리
 */
if (!function_exists('onoff_g5_update_init')) {
    function onoff_g5_update_init()
    {
        static $done = false;
        if ($done) {
            return;
        }
        $done = true;

        $extend_ai = defined('G5_EXTEND_PATH') ? G5_EXTEND_PATH . '/onoff_g5_site_ai.extend.php' : G5_EXTEND_DIR . '/onoff_g5_site_ai.extend.php';
        if (is_file($extend_ai)) {
            include_once $extend_ai;
        }
    }
}

if (!function_exists('onoff_g5_update_data_root')) {
    function onoff_g5_update_data_root()
    {
        return rtrim((string) G5_DATA_PATH, '/\\') . '/g5-update/current';
    }
}

if (!function_exists('onoff_g5_update_manifest_path')) {
    function onoff_g5_update_manifest_path()
    {
        return onoff_g5_update_data_root() . '/manifest.json';
    }
}

if (!function_exists('onoff_g5_update_files_root')) {
    function onoff_g5_update_files_root()
    {
        return onoff_g5_update_data_root() . '/files';
    }
}

if (!function_exists('onoff_g5_update_load_manifest')) {
    function onoff_g5_update_load_manifest()
    {
        $path = onoff_g5_update_manifest_path();
        if (!is_file($path)) {
            return null;
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? $decoded : null;
    }
}

if (!function_exists('onoff_g5_update_api_response')) {
    function onoff_g5_update_api_response(array $payload, $status = 200)
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code((int) $status);
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if (!function_exists('onoff_g5_update_validate_request')) {
    function onoff_g5_update_validate_request(array $params)
    {
        onoff_g5_update_init();

        if (!function_exists('onoff_g5_site_ai_validate_common')) {
            return array('ok' => false, 'payload' => array('success' => false, 'message' => 'license module unavailable'));
        }

        return onoff_g5_site_ai_validate_common($params);
    }
}

if (!function_exists('onoff_g5_update_sanitize_relative_path')) {
    function onoff_g5_update_sanitize_relative_path($path)
    {
        $path = ltrim(str_replace('\\', '/', (string) $path), '/');
        if ($path === '' || strpos($path, '..') !== false) {
            return '';
        }
        // macOS AppleDouble (._*) — manifest·배포에 포함되면 안 됨
        if (preg_match('#(^|/)\\._#', $path)) {
            return '';
        }
        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.htaccess') {
                continue;
            }
            if ($segment[0] === '.' && in_array($segment, array('.env', '.git', '.svn'), true)) {
                return '';
            }
        }

        return $path;
    }
}

if (!function_exists('onoff_g5_update_api_manifest')) {
    function onoff_g5_update_api_manifest(array $params)
    {
        $auth = onoff_g5_update_validate_request($params);
        if (empty($auth['ok'])) {
            return $auth['payload'];
        }

        $manifest = onoff_g5_update_load_manifest();
        if (!$manifest || empty($manifest['release_id']) || (string) $manifest['release_id'] === '0.0.0-placeholder') {
            return array('success' => false, 'message' => 'g5-update 릴리스가 아직 업로드되지 않았습니다.');
        }

        $localRelease = trim((string) ($params['release_id'] ?? ''));
        $remoteRelease = (string) $manifest['release_id'];
        $updateAvailable = ($localRelease === '' || $localRelease !== $remoteRelease);

        return array(
            'success'           => true,
            'release_id'        => $remoteRelease,
            'released_at'       => isset($manifest['released_at']) ? $manifest['released_at'] : '',
            'update_available'  => $updateAvailable,
            'bundle'            => trim((string) ($params['bundle'] ?? 'icrm-full')),
            'manifest'          => $manifest,
            'file_count'        => isset($manifest['files']) && is_array($manifest['files']) ? count($manifest['files']) : 0,
        );
    }
}

if (!function_exists('onoff_g5_update_api_file')) {
    function onoff_g5_update_api_file(array $params)
    {
        $auth = onoff_g5_update_validate_request($params);
        if (empty($auth['ok'])) {
            return $auth['payload'];
        }

        $manifest = onoff_g5_update_load_manifest();
        if (!$manifest || empty($manifest['release_id'])) {
            return array('success' => false, 'message' => 'g5-update 릴리스가 없습니다.');
        }

        $releaseId = trim((string) ($params['release_id'] ?? ''));
        if ($releaseId === '' || $releaseId !== (string) $manifest['release_id']) {
            return array('success' => false, 'message' => 'release_id 가 일치하지 않습니다.');
        }

        $rawPath = trim((string) ($params['path'] ?? ''));
        $relative = onoff_g5_update_sanitize_relative_path($rawPath);
        if ($relative === '') {
            $message = 'path 가 올바르지 않습니다.';
            if ($rawPath !== '') {
                $message .= ' (' . $rawPath . ')';
            }

            return array('success' => false, 'message' => $message);
        }

        $filesIndex = isset($manifest['files']) && is_array($manifest['files']) ? $manifest['files'] : array();
        if (!isset($filesIndex[$relative])) {
            return array('success' => false, 'message' => 'manifest 에 없는 파일입니다.');
        }

        $fullPath = onoff_g5_update_files_root() . '/' . $relative;
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
