<?php
/**
 * 온오프 그누보드 플랫폼 스킨 — 적용 · 상태
 * @onoff-platform-managed
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('onoff_platform_default_editor')) {
    function onoff_platform_default_editor()
    {
        return 'smarteditor2';
    }
}

if (!function_exists('onoff_platform_apply_board_editor_defaults')) {
    /**
     * 모든 게시판 DHTML 에디터 + smarteditor2 기본 적용
     *
     * @param bool $update_global_cf true면 기본환경설정 cf_editor도 smarteditor2로 맞춤
     * @return array{success:bool,editor:string,boards_updated:int}
     */
    function onoff_platform_apply_board_editor_defaults($update_global_cf = true)
    {
        global $g5, $config;

        $editor = onoff_platform_default_editor();
        $editor_esc = sql_real_escape_string($editor);

        sql_query(" update {$g5['board_table']}
                       set bo_use_dhtml_editor = '1',
                           bo_select_editor = '{$editor_esc}' ", false);

        $boards_updated = 0;
        if (function_exists('get_sql_affected_rows')) {
            $boards_updated = (int) get_sql_affected_rows();
        }

        if ($update_global_cf) {
            sql_query(" update {$g5['config_table']}
                           set cf_editor = '{$editor_esc}' ", false);
            $config['cf_editor'] = $editor;
        }

        return array(
            'success'         => true,
            'editor'          => $editor,
            'boards_updated'  => $boards_updated,
        );
    }
}

if (!function_exists('onoff_platform_maybe_apply_board_editor_defaults')) {
    /** 업데이트 후 1회 — 모든 게시판 에디터 기본값 적용 */
    function onoff_platform_maybe_apply_board_editor_defaults()
    {
        $flag = '';
        if (function_exists('g5site_cfg')) {
            $flag = trim(g5site_cfg('board_editor_defaults_applied_at', ''));
        }
        if ($flag !== '') {
            return array('skipped' => true, 'message' => 'already applied');
        }

        if (!function_exists('onoff_platform_apply_board_editor_defaults')) {
            return array('skipped' => true);
        }

        $result = onoff_platform_apply_board_editor_defaults(true);

        if (function_exists('onoff_platform_skin_write_site_config')) {
            onoff_platform_skin_write_site_config(array(
                'board_editor_defaults_applied_at' => date('Y-m-d H:i:s'),
            ));
        } elseif (function_exists('onoff_builder_set_site_config_key')) {
            onoff_builder_set_site_config_key('board_editor_defaults_applied_at', date('Y-m-d H:i:s'));
        }

        return $result;
    }
}

if (!function_exists('onoff_platform_skin_id_member')) {
    function onoff_platform_skin_id_member()
    {
        return 'onoff';
    }
}

if (!function_exists('onoff_platform_skin_id_outlogin')) {
    function onoff_platform_skin_id_outlogin()
    {
        return 'onoff';
    }
}

if (!function_exists('onoff_platform_skin_id_board_column')) {
    function onoff_platform_skin_id_board_column()
    {
        return 'onoff-column';
    }
}

if (!function_exists('onoff_platform_skin_board_map')) {
    /** @return array<string,string> template_key => skin_id */
    function onoff_platform_skin_board_map()
    {
        return array(
            'column'  => 'onoff-column',
            'faq'     => 'onoff-faq',
            'reviews' => 'onoff-reviews',
            'inquiry' => 'onoff-inquiry',
        );
    }
}

if (!function_exists('onoff_platform_skin_board_for_template')) {
    function onoff_platform_skin_board_for_template($template_key)
    {
        $template_key = preg_replace('/[^a-z_]/', '', (string) $template_key);
        $map = onoff_platform_skin_board_map();

        return isset($map[$template_key]) ? $map[$template_key] : onoff_platform_skin_id_board_column();
    }
}

if (!function_exists('onoff_platform_skin_all_boards_exist')) {
    function onoff_platform_skin_all_boards_exist()
    {
        foreach (array_unique(array_values(onoff_platform_skin_board_map())) as $skin_id) {
            if (!onoff_platform_skin_board_exists($skin_id)) {
                return false;
            }
        }

        return true;
    }
}

if (!function_exists('onoff_platform_skin_member_exists')) {
    function onoff_platform_skin_member_exists()
    {
        $id = onoff_platform_skin_id_member();

        return is_dir(G5_SKIN_PATH . '/member/' . $id)
            && is_dir(G5_MOBILE_PATH . '/skin/member/' . $id);
    }
}

if (!function_exists('onoff_platform_skin_outlogin_exists')) {
    function onoff_platform_skin_outlogin_exists()
    {
        $id = onoff_platform_skin_id_outlogin();

        return is_dir(G5_SKIN_PATH . '/outlogin/' . $id)
            && is_dir(G5_MOBILE_PATH . '/skin/outlogin/' . $id);
    }
}

if (!function_exists('onoff_platform_outlogin_skin_id')) {
    /** @return string outlogin skin dir or basic */
    function onoff_platform_outlogin_skin_id()
    {
        if (!function_exists('g5site_cfg')) {
            return 'basic';
        }
        if (trim(g5site_cfg('platform_member_skin', '')) !== onoff_platform_skin_id_member()) {
            return 'basic';
        }
        if (!onoff_platform_skin_outlogin_exists()) {
            return 'basic';
        }

        return onoff_platform_skin_id_outlogin();
    }
}

if (!function_exists('onoff_platform_outlogin_skin_for_page')) {
    /**
     * @param string $fallback theme/basic 등 페이지 기본 아웃로그인 스킨
     */
    function onoff_platform_outlogin_skin_for_page($fallback = 'basic')
    {
        $platform = onoff_platform_outlogin_skin_id();

        return ($platform !== 'basic') ? $platform : $fallback;
    }
}

if (!function_exists('onoff_platform_skin_is_active')) {
    function onoff_platform_skin_is_active()
    {
        global $config;

        $member_skin = onoff_platform_skin_id_member();
        if (function_exists('g5site_cfg') && trim(g5site_cfg('platform_member_skin', '')) === $member_skin) {
            return true;
        }

        return isset($config['cf_member_skin'], $config['cf_mobile_member_skin'])
            && (string) $config['cf_member_skin'] === $member_skin
            && (string) $config['cf_mobile_member_skin'] === $member_skin;
    }
}

if (!function_exists('onoff_platform_normalize_hex')) {
    function onoff_platform_normalize_hex($hex)
    {
        $hex = trim((string) $hex);
        if (!preg_match('/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/', $hex, $m)) {
            return '';
        }
        if (strlen($m[1]) === 3) {
            $h = $m[1];

            return '#' . strtoupper($h[0] . $h[0] . $h[1] . $h[1] . $h[2] . $h[2]);
        }

        return '#' . strtoupper($m[1]);
    }
}

if (!function_exists('onoff_platform_hex_darken')) {
    function onoff_platform_hex_darken($hex, $ratio = 0.12)
    {
        $hex = onoff_platform_normalize_hex($hex);
        if ($hex === '') {
            return '';
        }
        $ratio = max(0, min(1, (float) $ratio));
        $r = hexdec(substr($hex, 1, 2));
        $g = hexdec(substr($hex, 3, 2));
        $b = hexdec(substr($hex, 5, 2));
        $r = max(0, min(255, (int) round($r * (1 - $ratio))));
        $g = max(0, min(255, (int) round($g * (1 - $ratio))));
        $b = max(0, min(255, (int) round($b * (1 - $ratio))));

        return sprintf('#%02X%02X%02X', $r, $g, $b);
    }
}

if (!function_exists('onoff_platform_brand_css_vars')) {
    /** @return string CSS custom properties (no wrapper) */
    function onoff_platform_brand_css_vars()
    {
        if (!function_exists('g5site_cfg') || !onoff_platform_skin_is_active()) {
            return '';
        }

        $primary = onoff_platform_normalize_hex(g5site_cfg('primary_color', ''));
        if ($primary === '') {
            return '';
        }

        $hover = onoff_platform_hex_darken($primary, 0.12);
        $secondary = onoff_platform_normalize_hex(g5site_cfg('secondary_color', ''));
        $vars = '--color-primary:' . $primary . ';'
            . '--onoff-accent:' . $primary . ';'
            . '--icrm-member-accent:' . $primary . ';'
            . '--onoff-accent-hover:' . ($hover !== '' ? $hover : '#0f766e') . ';'
            . '--onoff-accent-soft:color-mix(in srgb, ' . $primary . ' 12%, white);';

        if ($secondary !== '') {
            $vars .= '--color-secondary:' . $secondary . ';--color-muted:' . $secondary . ';';
        }

        return $vars;
    }
}

if (!function_exists('onoff_platform_skin_enqueue_assets')) {
    function onoff_platform_skin_enqueue_assets()
    {
        if (!function_exists('add_stylesheet') || !onoff_platform_skin_is_active()) {
            return;
        }

        $brand = onoff_platform_brand_css_vars();
        if ($brand !== '') {
            add_stylesheet('<style>:root{' . $brand . '}</style>', -5);
        }
    }
}

if (!function_exists('onoff_platform_skin_board_exists')) {
    function onoff_platform_skin_board_exists($skin_id = '')
    {
        $skin_id = preg_replace('/[^a-z0-9_-]/', '', $skin_id !== '' ? $skin_id : onoff_platform_skin_id_board_column());

        return is_dir(G5_SKIN_PATH . '/board/' . $skin_id)
            && is_dir(G5_MOBILE_PATH . '/skin/board/' . $skin_id);
    }
}

if (!function_exists('onoff_platform_skin_get_status')) {
    function onoff_platform_skin_get_status()
    {
        global $config;

        $member_skin = onoff_platform_skin_id_member();
        $board_skin = onoff_platform_skin_id_board_column();
        $member_applied = isset($config['cf_member_skin']) && (string) $config['cf_member_skin'] === $member_skin;
        $mobile_applied = isset($config['cf_mobile_member_skin']) && (string) $config['cf_mobile_member_skin'] === $member_skin;

        if (function_exists('g5site_cfg')) {
            $cfg_member = trim(g5site_cfg('platform_member_skin', ''));
            if ($cfg_member === $member_skin) {
                $member_applied = true;
                $mobile_applied = true;
            }
        }

        $board_count = 0;
        $board_templates = array();
        if (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
            if (function_exists('icrm_member_board_templates')) {
                foreach (icrm_member_board_templates() as $tpl_key => $tpl) {
                    $skin_id = isset($tpl['skin']) ? (string) $tpl['skin'] : onoff_platform_skin_board_for_template($tpl_key);
                    $board_templates[$tpl_key] = array(
                        'label'   => isset($tpl['label']) ? (string) $tpl['label'] : $tpl_key,
                        'skin'    => $skin_id,
                        'exists'  => onoff_platform_skin_board_exists($skin_id),
                    );
                }
            }
            if (function_exists('icrm_member_board_list_for_design')) {
                $board_count = count(icrm_member_board_list_for_design());
            } elseif (function_exists('icrm_member_board_read_log')) {
                foreach (icrm_member_board_read_log() as $row) {
                    if (!is_array($row) || empty($row['bo_table'])) {
                        continue;
                    }
                    $board_count++;
                }
            }
        }

        return array(
            'ready'            => onoff_platform_skin_member_exists() && onoff_platform_skin_all_boards_exist() && onoff_platform_skin_outlogin_exists(),
            'member_skin'      => $member_skin,
            'board_skin'       => $board_skin,
            'board_templates'  => $board_templates,
            'member_applied'   => $member_applied && $mobile_applied,
            'member_files_ok'  => onoff_platform_skin_member_exists(),
            'mobile_member_ok' => is_dir(G5_MOBILE_PATH . '/skin/member/' . $member_skin),
            'outlogin_skin'    => onoff_platform_skin_id_outlogin(),
            'outlogin_files_ok'=> onoff_platform_skin_outlogin_exists(),
            'board_files_ok'   => onoff_platform_skin_all_boards_exist(),
            'board_log_count'  => $board_count,
            'login_url'        => defined('G5_BBS_URL') ? G5_BBS_URL . '/login.php' : '/bbs/login.php',
            'register_url'     => defined('G5_BBS_URL') ? G5_BBS_URL . '/register.php' : '/bbs/register.php',
            'applied_at'       => function_exists('g5site_cfg') ? trim(g5site_cfg('platform_skin_applied_at', '')) : '',
            'theme_ready'      => onoff_platform_skin_is_active(),
            'brand_color'      => function_exists('g5site_cfg') ? trim(g5site_cfg('primary_color', '')) : '',
        );
    }
}

if (!function_exists('onoff_platform_skin_can_apply')) {
    function onoff_platform_skin_can_apply()
    {
        global $is_admin;

        return $is_admin === 'super';
    }
}

if (!function_exists('onoff_platform_skin_write_site_config')) {
    function onoff_platform_skin_write_site_config(array $pairs)
    {
        $path = G5_PATH . '/_site.config.php';
        if (!is_file($path) || !is_writable($path)) {
            return false;
        }

        $contents = (string) file_get_contents($path);
        foreach ($pairs as $key => $value) {
            $key = preg_replace('/[^a-z0-9_]/', '', (string) $key);
            if ($key === '') {
                continue;
            }
            $line = "    '" . $key . "' => '" . str_replace("'", "\\'", (string) $value) . "',";
            $pattern = "/'" . preg_quote($key, '/') . "'\\s*=>/";
            if (preg_match($pattern, $contents)) {
                $contents = preg_replace(
                    "/\\s*'" . preg_quote($key, '/') . "'\\s*=>[^,\\n]*,/",
                    "\n" . $line,
                    $contents,
                    1
                );
            } else {
                $marker = "\n);\n\n/**";
                if (strpos($contents, $marker) !== false) {
                    $block = "\n    /* onoff-platform-skin */\n" . $line . "\n";
                    $contents = str_replace($marker, $block . $marker, $contents);
                }
            }
        }

        return file_put_contents($path, $contents, LOCK_EX) !== false;
    }
}

if (!function_exists('onoff_platform_skin_apply')) {
    /**
     * 플랫폼 기본 스킨 적용 (회원 스킨 + 템플릿별 게시판 스킨)
     *
     * @param array $options apply_boards(bool)
     * @return array
     */
    function onoff_platform_skin_apply(array $options = array())
    {
        global $g5, $config;

        if (!onoff_platform_skin_can_apply()) {
            return array('success' => false, 'message' => '플랫폼 스킨 적용은 최고관리자만 할 수 있습니다.');
        }

        if (!onoff_platform_skin_member_exists() || !onoff_platform_skin_all_boards_exist() || !onoff_platform_skin_outlogin_exists()) {
            return array('success' => false, 'message' => '플랫폼 스킨 파일이 없습니다. iCRM 업데이트를 먼저 적용하세요.');
        }

        $member_skin = onoff_platform_skin_id_member();
        $member_esc = sql_real_escape_string($member_skin);

        sql_query(" update {$g5['config_table']}
                       set cf_member_skin = '{$member_esc}',
                           cf_mobile_member_skin = '{$member_esc}' ", false);

        $config['cf_member_skin'] = $member_skin;
        $config['cf_mobile_member_skin'] = $member_skin;

        $boards_updated = 0;
        $board_skin_summary = array();
        if (!isset($options['apply_boards']) || !empty($options['apply_boards'])) {
            if (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
                include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
            }
            $design_boards = function_exists('icrm_member_board_list_for_design')
                ? icrm_member_board_list_for_design()
                : array();
            foreach ($design_boards as $board_row) {
                if (empty($board_row['bo_table'])) {
                    continue;
                }
                $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $board_row['bo_table']));
                if ($bo_table === '') {
                    continue;
                }
                $template_key = isset($board_row['template']) ? (string) $board_row['template'] : 'column';
                if (function_exists('icrm_member_board_fetch') && function_exists('icrm_member_board_guess_template')) {
                    $db_row = icrm_member_board_fetch($bo_table);
                    if (!empty($db_row)) {
                        $template_key = icrm_member_board_guess_template(array_merge($board_row, $db_row));
                    }
                }
                $board_skin = onoff_platform_skin_board_for_template($template_key);
                if (function_exists('icrm_member_board_resolve_skin')) {
                    $board_skin = icrm_member_board_resolve_skin($board_skin);
                }
                $board_esc = sql_real_escape_string($board_skin);
                sql_query(" update {$g5['board_table']}
                               set bo_skin = '{$board_esc}',
                                   bo_mobile_skin = '{$board_esc}'
                             where bo_table = '" . sql_real_escape_string($bo_table) . "' ", false);
                $boards_updated++;
                $board_skin_summary[$template_key] = $board_skin;
            }
        }

        $editor_result = onoff_platform_apply_board_editor_defaults(true);

        onoff_platform_skin_write_site_config(array(
            'platform_member_skin'       => $member_skin,
            'platform_outlogin_skin'     => onoff_platform_skin_id_outlogin(),
            'platform_board_skin_column' => onoff_platform_skin_id_board_column(),
            'platform_skin_applied_at'   => date('Y-m-d H:i:s'),
            'board_editor_defaults_applied_at' => date('Y-m-d H:i:s'),
        ));

        return array(
            'success'         => true,
            'message'         => '플랫폼 스킨이 적용되었습니다.',
            'member_skin'     => $member_skin,
            'board_skin'      => onoff_platform_skin_id_board_column(),
            'board_skins'     => $board_skin_summary,
            'boards_updated'  => $boards_updated,
            'editor'          => isset($editor_result['editor']) ? $editor_result['editor'] : onoff_platform_default_editor(),
            'login_url'       => defined('G5_BBS_URL') ? G5_BBS_URL . '/login.php' : '/bbs/login.php',
        );
    }
}

if (!function_exists('onoff_platform_skin_override_paths')) {
    /**
     * common.php 스킨 경로 직후 — _site.config platform_member_skin 반영
     */
    function onoff_platform_skin_override_paths()
    {
        global $config, $member_skin_path, $member_skin_url;

        if (!function_exists('g5site_cfg')) {
            return;
        }

        $skin = trim(g5site_cfg('platform_member_skin', ''));
        if ($skin === '' || !is_dir(G5_SKIN_PATH . '/member/' . preg_replace('/[^a-z0-9_-]/', '', $skin))) {
            return;
        }

        if (function_exists('get_skin_path') && function_exists('get_skin_url')) {
            $member_skin_path = get_skin_path('member', $skin);
            $member_skin_url = get_skin_url('member', $skin);
        }
    }
}
