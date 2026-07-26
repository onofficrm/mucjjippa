<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('onoff_builder_get_home_bridge_id')) {
    function onoff_builder_get_home_bridge_id()
    {
        $id = '';
        if (function_exists('g5site_cfg')) {
            $id = onoff_builder_sanitize_project_id(g5site_cfg('home_builder_bridge_id', ''));
        }

        if ($id === '' && function_exists('onoff_builder_read_runtime_config')) {
            $runtime = onoff_builder_read_runtime_config();
            $id = isset($runtime['home_builder_bridge_id'])
                ? onoff_builder_sanitize_project_id($runtime['home_builder_bridge_id'])
                : '';
        }

        return $id;
    }
}

if (!function_exists('onoff_builder_home_enabled')) {
    function onoff_builder_home_enabled()
    {
        if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('onoff_builder_bridge_enabled', true)) {
            return false;
        }

        $id = onoff_builder_get_home_bridge_id();

        return $id !== '' && onoff_builder_project_exists($id);
    }
}

if (!function_exists('onoff_builder_maybe_render_home')) {
    /**
     * index.php 에서 호출 — 홈(/)을 빌더 페이지로 출력
     *
     * @return bool 렌더 후 종료해야 하면 true
     */
    function onoff_builder_maybe_render_home()
    {
        if (!onoff_builder_home_enabled()) {
            return false;
        }

        if (defined('G5_IS_MOBILE') && G5_IS_MOBILE) {
            return false;
        }

        $id = onoff_builder_get_home_bridge_id();
        onoff_builder_render_import_page($id);

        return true;
    }
}
