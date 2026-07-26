<?php
/**
 * 온오프빌더 공통 API 설정
 *
 * 실제 운영 키는 data/onoff-builder.config.php 한 파일에서 관리합니다.
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('onoff_builder_config_path')) {
    function onoff_builder_config_path()
    {
        return G5_DATA_PATH . '/onoff-builder.config.php';
    }
}

if (!function_exists('onoff_builder_config_load')) {
    function onoff_builder_config_load()
    {
        static $cfg = null;
        if ($cfg !== null) {
            return $cfg;
        }

        $cfg = array(
            'license_key' => '',
            'g5_update_api_base_url' => 'https://icrm.co.kr/api/g5-update',
            'builder_deploy_api_base_url' => 'https://icrm.co.kr/api/builder-deploy',
            'auto_comment_api_base_url' => 'https://icrm.co.kr/api/auto-comment',
            'seo_meta_api_base_url' => 'https://icrm.co.kr/api/seo-meta',
            'point_api_base_url' => 'https://icrm.co.kr/api/site',
            'rank_api_base_url' => 'https://icrm.co.kr/api/rank-check',
            'content_api_base_url' => 'https://icrm.co.kr/api/content-collector',
            'gemini_api_key' => '',
            'gemini_model' => 'gemini-2.0-flash-lite',
        );

        $path = onoff_builder_config_path();
        if (is_file($path)) {
            include $path;
            $map = array(
                'ONOFF_BUILDER_LICENSE_KEY' => 'license_key',
                'ONOFF_BUILDER_G5_UPDATE_API_BASE_URL' => 'g5_update_api_base_url',
                'ONOFF_BUILDER_DEPLOY_API_BASE_URL' => 'builder_deploy_api_base_url',
                'ONOFF_BUILDER_AUTO_COMMENT_API_BASE_URL' => 'auto_comment_api_base_url',
                'ONOFF_BUILDER_SEO_META_API_BASE_URL' => 'seo_meta_api_base_url',
                'ONOFF_BUILDER_POINT_API_BASE_URL' => 'point_api_base_url',
                'ONOFF_BUILDER_RANK_API_BASE_URL' => 'rank_api_base_url',
                'ONOFF_BUILDER_CONTENT_API_BASE_URL' => 'content_api_base_url',
                'ONOFF_BUILDER_GEMINI_API_KEY' => 'gemini_api_key',
                'ONOFF_BUILDER_GEMINI_MODEL' => 'gemini_model',
            );
            foreach ($map as $const => $key) {
                if (defined($const)) {
                    $value = trim((string) constant($const));
                    if ($value !== '') {
                        $cfg[$key] = $value;
                    }
                }
            }
        }

        return $cfg;
    }
}

if (!function_exists('onoff_builder_config_get')) {
    function onoff_builder_config_get($key, $default = '')
    {
        $cfg = onoff_builder_config_load();
        if (!array_key_exists($key, $cfg)) {
            return (string) $default;
        }
        $value = trim((string) $cfg[$key]);
        return $value !== '' ? $value : (string) $default;
    }
}

if (!function_exists('onoff_builder_config_license_key')) {
    function onoff_builder_config_license_key()
    {
        return onoff_builder_config_get('license_key', '');
    }
}

if (!function_exists('onoff_builder_config_api_base_url')) {
    function onoff_builder_config_api_base_url($name, $default = '')
    {
        return rtrim(onoff_builder_config_get($name, $default), '/');
    }
}

if (!function_exists('onoff_builder_config_save')) {
    function onoff_builder_config_save(array $values)
    {
        $cfg = onoff_builder_config_load();
        foreach ($values as $key => $value) {
            if (!array_key_exists($key, $cfg)) {
                continue;
            }
            $cfg[$key] = trim((string) $value);
        }

        $path = onoff_builder_config_path();
        $php = "<?php\nif (!defined('_GNUBOARD_')) exit;\n"
            . "define('ONOFF_BUILDER_LICENSE_KEY', " . var_export($cfg['license_key'], true) . ");\n"
            . "define('ONOFF_BUILDER_G5_UPDATE_API_BASE_URL', " . var_export($cfg['g5_update_api_base_url'], true) . ");\n"
            . "define('ONOFF_BUILDER_DEPLOY_API_BASE_URL', " . var_export($cfg['builder_deploy_api_base_url'], true) . ");\n"
            . "define('ONOFF_BUILDER_AUTO_COMMENT_API_BASE_URL', " . var_export($cfg['auto_comment_api_base_url'], true) . ");\n"
            . "define('ONOFF_BUILDER_SEO_META_API_BASE_URL', " . var_export($cfg['seo_meta_api_base_url'], true) . ");\n"
            . "define('ONOFF_BUILDER_POINT_API_BASE_URL', " . var_export($cfg['point_api_base_url'], true) . ");\n"
            . "define('ONOFF_BUILDER_RANK_API_BASE_URL', " . var_export($cfg['rank_api_base_url'], true) . ");\n"
            . "define('ONOFF_BUILDER_CONTENT_API_BASE_URL', " . var_export($cfg['content_api_base_url'], true) . ");\n"
            . "define('ONOFF_BUILDER_GEMINI_API_KEY', " . var_export($cfg['gemini_api_key'], true) . ");\n"
            . "define('ONOFF_BUILDER_GEMINI_MODEL', " . var_export($cfg['gemini_model'], true) . ");\n";

        if (@file_put_contents($path, $php, LOCK_EX) === false) {
            return false;
        }
        if (defined('G5_FILE_PERMISSION')) {
            @chmod($path, G5_FILE_PERMISSION);
        }

        return true;
    }
}
