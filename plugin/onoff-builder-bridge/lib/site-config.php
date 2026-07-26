<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('onoff_builder_site_config_path')) {
    function onoff_builder_site_config_path()
    {
        return defined('G5_PATH') ? G5_PATH . '/_site.config.php' : '';
    }
}

if (!function_exists('onoff_builder_runtime_config_path')) {
    function onoff_builder_runtime_config_path()
    {
        return defined('ONOFF_BUILDER_DATA_PATH') ? ONOFF_BUILDER_DATA_PATH . '/runtime-config.json' : '';
    }
}

if (!function_exists('onoff_builder_read_runtime_config')) {
    function onoff_builder_read_runtime_config()
    {
        $path = onoff_builder_runtime_config_path();
        if ($path === '' || !is_file($path)) {
            return array();
        }

        $json = file_get_contents($path);
        $data = json_decode((string) $json, true);

        return is_array($data) ? $data : array();
    }
}

if (!function_exists('onoff_builder_set_runtime_config_key')) {
    function onoff_builder_set_runtime_config_key($key, $value)
    {
        $path = onoff_builder_runtime_config_path();
        if ($path === '') {
            return false;
        }
        if (!is_dir(dirname($path)) && !@mkdir(dirname($path), 0755, true)) {
            return false;
        }

        $key = preg_replace('/[^a-z0-9_]/', '', (string) $key);
        if ($key === '') {
            return false;
        }

        $data = onoff_builder_read_runtime_config();
        $data[$key] = (string) $value;

        return file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX) !== false;
    }
}

if (!function_exists('onoff_builder_set_site_config_key')) {
    /**
     * _site.config.php 의 $site_config 키 값 갱신
     *
     * @param string $key
     * @param string $value
     * @return bool
     */
    function onoff_builder_set_site_config_key($key, $value)
    {
        $path = onoff_builder_site_config_path();
        if ($path === '' || !is_file($path) || !is_writable($path)) {
            return false;
        }

        $key = preg_replace('/[^a-z0-9_]/', '', (string) $key);
        if ($key === '') {
            return false;
        }

        $contents = file_get_contents($path);
        if ($contents === false) {
            return false;
        }

        $escaped = str_replace(array('\\', "'"), array('\\\\', "\\'"), (string) $value);
        $line = "    '{$key}'" . str_repeat(' ', max(1, 28 - strlen($key))) . "=> '{$escaped}',";

        $pattern = "/^[ \t]*'{$key}'[ \t]*=>[ \t]*.*,$/m";
        if (preg_match($pattern, $contents)) {
            $next = preg_replace($pattern, $line, $contents, 1);
        } else {
            $marker = "\n);\n\n/**";
            if (strpos($contents, $marker) !== false) {
                $insert = "\n    /* onoff-builder-bridge */\n    {$line}\n";
                $next = str_replace($marker, $insert . $marker, $contents);
            } else {
                $pos = strrpos($contents, "\n);");
                if ($pos === false) {
                    return false;
                }
                $insert = "\n    /* onoff-builder-bridge */\n    {$line}\n";
                $next = substr($contents, 0, $pos) . $insert . substr($contents, $pos);
            }
        }

        if ($next === null || $next === $contents) {
            return false;
        }

        return file_put_contents($path, $next, LOCK_EX) !== false;
    }
}

if (!function_exists('onoff_builder_set_home_bridge_id')) {
    function onoff_builder_set_home_bridge_id($project_id)
    {
        $project_id = onoff_builder_sanitize_project_id($project_id);
        if ($project_id !== '' && !onoff_builder_project_exists($project_id)) {
            return false;
        }

        if (onoff_builder_set_site_config_key('home_builder_bridge_id', $project_id)) {
            return true;
        }

        return onoff_builder_set_runtime_config_key('home_builder_bridge_id', $project_id);
    }
}
