<?php
/**
 * 온오프빌더 업데이트 클라이언트 — 구버전 사이트 자동 설치 (bootstrap)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

if (!function_exists('icrm_update_bootstrap_files')) {
    function icrm_update_bootstrap_files()
    {
        return array(
            'lib/onoff-update.lib.php',
            'lib/onoff-builder-config.lib.php',
            'lib/icrm-update.lib.php',
            'lib/icrm-builder-deploy.lib.php',
            'lib/icrm-update-bootstrap.lib.php',
            'extend/icrm-update.extend.php',
            'icrm/update-pull.php',
            'plugin/icrm_update/admin/index.php',
            'plugin/icrm_update/admin/_panel.php',
            'plugin/icrm_update/admin/action.php',
            'css/icrm-update-panel.css',
            'data/onoff-builder.config.sample.php',
            'onoff-builder-install-check.php',
        );
    }
}

if (!function_exists('icrm_update_bootstrap_get_license_key')) {
    function icrm_update_bootstrap_get_license_key()
    {
        if (function_exists('onoff_builder_config_license_key')) {
            $key = onoff_builder_config_license_key();
            if ($key !== '') {
                return $key;
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
        if (function_exists('g5site_cfg')) {
            return trim(g5site_cfg('icrm_license_key', ''));
        }

        return '';
    }
}

if (!function_exists('icrm_update_bootstrap_site_domain')) {
    function icrm_update_bootstrap_site_domain()
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

if (!function_exists('icrm_update_bootstrap_api_base')) {
    function icrm_update_bootstrap_api_base()
    {
        $url = function_exists('onoff_builder_config_api_base_url')
            ? onoff_builder_config_api_base_url('g5_update_api_base_url', '')
            : '';
        if ($url === '' && function_exists('g5site_cfg')) {
            $url = trim(g5site_cfg('icrm_update_api_base_url', ''));
        }
        if ($url === '') {
            $url = 'https://icrm.co.kr/api/g5-update';
        }

        return rtrim($url, '/');
    }
}

if (!function_exists('icrm_update_bootstrap_api_post')) {
    function icrm_update_bootstrap_api_post($endpoint, array $payload)
    {
        $url = icrm_update_bootstrap_api_base() . '/' . ltrim((string) $endpoint, '/');
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, array(
                CURLOPT_POST           => true,
                CURLOPT_HTTPHEADER     => array('Content-Type: application/json'),
                CURLOPT_POSTFIELDS     => $body,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 90,
            ));
            $raw = curl_exec($ch);
            curl_close($ch);
            $decoded = json_decode((string) $raw, true);

            return is_array($decoded) ? $decoded : array('success' => false, 'message' => 'API 응답 오류');
        }

        $ctx = stream_context_create(array(
            'http' => array(
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\n",
                'content' => $body,
                'timeout' => 90,
            ),
        ));
        $raw = @file_get_contents($url, false, $ctx);
        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? $decoded : array('success' => false, 'message' => 'API 연결 실패');
    }
}

if (!function_exists('icrm_update_bootstrap_install')) {
    function icrm_update_bootstrap_install()
    {
        if (is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
            return array('success' => true, 'message' => 'already installed');
        }

        $lock = G5_DATA_PATH . '/icrm-update-bootstrap.lock';
        if (is_file($lock) && (time() - (int) filemtime($lock)) < 300) {
            return array('success' => false, 'message' => 'bootstrap 진행 중입니다. 잠시 후 다시 시도하세요.');
        }
        @touch($lock);

        $license = icrm_update_bootstrap_get_license_key();
        if ($license === '') {
            @unlink($lock);
            return array('success' => false, 'message' => '온오프빌더 라이선스가 없습니다.');
        }

        $manifest = icrm_update_bootstrap_api_post('manifest', array(
            'license_key' => $license,
            'domain'      => icrm_update_bootstrap_site_domain(),
            'bundle'      => 'icrm-full',
            'release_id'  => '',
        ));

        if (empty($manifest['success']) || empty($manifest['release_id'])) {
            @unlink($lock);
            return array(
                'success' => false,
                'message' => isset($manifest['message']) ? $manifest['message'] : 'manifest 조회 실패',
            );
        }

        $release_id = (string) $manifest['release_id'];
        $fileIndex = array();
        if (!empty($manifest['manifest']['files']) && is_array($manifest['manifest']['files'])) {
            $fileIndex = $manifest['manifest']['files'];
        }

        $installed = 0;
        foreach (icrm_update_bootstrap_files() as $relative) {
            $payload = array(
                'license_key' => $license,
                'domain'      => icrm_update_bootstrap_site_domain(),
                'release_id'  => $release_id,
                'path'        => $relative,
            );
            $resp = icrm_update_bootstrap_api_post('file', $payload);
            if (empty($resp['success']) || empty($resp['content_base64'])) {
                @unlink($lock);
                return array(
                    'success' => false,
                    'message' => '파일 다운로드 실패: ' . $relative,
                );
            }

            $content = base64_decode((string) $resp['content_base64'], true);
            if ($content === false) {
                @unlink($lock);
                return array('success' => false, 'message' => '파일 디코딩 실패: ' . $relative);
            }

            if (isset($fileIndex[$relative]['sha256'])) {
                $expected = strtolower((string) $fileIndex[$relative]['sha256']);
                if (!hash_equals($expected, hash('sha256', $content))) {
                    @unlink($lock);
                    return array('success' => false, 'message' => 'checksum 불일치: ' . $relative);
                }
            }

            $dest = G5_PATH . '/' . $relative;
            $dir = dirname($dest);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            file_put_contents($dest, $content, LOCK_EX);
            $installed++;
        }

        @unlink($lock);

        return array(
            'success'   => true,
            'message'   => '업데이트 클라이언트 설치 완료',
            'installed' => $installed,
            'release_id' => $release_id,
        );
    }
}
