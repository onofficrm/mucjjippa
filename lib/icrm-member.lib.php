<?php
/**
 * 온오프빌더 회원 포털 — 권한 · 모듈 · 셸
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('icrm_member_enabled')) {
    function icrm_member_enabled()
    {
        if (function_exists('g5site_cfg_bool')) {
            return g5site_cfg_bool('icrm_member_enabled', true);
        }

        return true;
    }
}

if (!function_exists('icrm_member_min_level')) {
    function icrm_member_min_level()
    {
        if (function_exists('g5site_cfg')) {
            $lv = g5site_cfg('icrm_member_min_level', '2');
            if ($lv !== '' && is_numeric($lv)) {
                return max(1, (int) $lv);
            }
        }

        return 2;
    }
}

if (!function_exists('icrm_member_board_min_level')) {
    function icrm_member_board_min_level()
    {
        if (function_exists('g5site_cfg')) {
            $lv = g5site_cfg('icrm_member_board_min_level', '5');
            if ($lv !== '' && is_numeric($lv)) {
                return max(1, (int) $lv);
            }
        }

        return 5;
    }
}

if (!function_exists('icrm_member_board_max_per_month')) {
    function icrm_member_board_max_per_month()
    {
        if (function_exists('g5site_cfg')) {
            $n = g5site_cfg('icrm_member_board_max_per_month', '3');
            if ($n !== '' && is_numeric($n)) {
                return max(1, (int) $n);
            }
        }

        return 3;
    }
}

if (!function_exists('icrm_member_is_logged_in')) {
    function icrm_member_is_logged_in()
    {
        global $is_member, $member;

        return !empty($is_member) && !empty($member['mb_id']);
    }
}

if (!function_exists('icrm_member_current_level')) {
    function icrm_member_current_level()
    {
        global $member;

        return isset($member['mb_level']) ? (int) $member['mb_level'] : 0;
    }
}

if (!function_exists('icrm_member_can_access')) {
    function icrm_member_can_access()
    {
        global $is_admin;

        if ($is_admin === 'super') {
            return true;
        }
        if (!icrm_member_enabled()) {
            return false;
        }
        if (!icrm_member_is_logged_in()) {
            return false;
        }

        return icrm_member_current_level() >= icrm_member_min_level();
    }
}

if (!function_exists('icrm_member_can_design')) {
    function icrm_member_can_design()
    {
        if (!icrm_member_can_access()) {
            return false;
        }
        if (function_exists('onoff_builder_is_deploy_user')) {
            return onoff_builder_is_deploy_user();
        }

        return icrm_member_can_access();
    }
}

if (!function_exists('icrm_member_can_publish')) {
    function icrm_member_can_publish()
    {
        if (!icrm_member_can_access()) {
            return false;
        }
        if (function_exists('icrm_admin_shell_license_ok')) {
            return icrm_admin_shell_license_ok();
        }

        return true;
    }
}

if (!function_exists('icrm_member_can_boards')) {
    function icrm_member_can_boards()
    {
        global $is_admin;

        if ($is_admin === 'super') {
            return true;
        }
        if (!icrm_member_can_access()) {
            return false;
        }

        return icrm_member_current_level() >= icrm_member_board_min_level();
    }
}

if (!function_exists('icrm_member_can_setup')) {
    function icrm_member_can_setup()
    {
        return icrm_member_can_design();
    }
}

if (!function_exists('icrm_member_can_update')) {
    function icrm_member_can_update()
    {
        global $is_admin;

        return $is_admin === 'super';
    }
}

if (!function_exists('icrm_member_can_module')) {
    function icrm_member_can_module($module)
    {
        $module = preg_replace('/[^a-z_]/', '', (string) $module);

        switch ($module) {
            case 'home':
                return icrm_member_can_access();
            case 'setup':
                return icrm_member_can_setup();
            case 'design':
            case 'board_design':
                return icrm_member_can_design();
            case 'publish':
            case 'boards':
                return false;
            case 'points':
            case 'report':
                return icrm_member_can_access();
            case 'update':
                return icrm_member_can_update();
            default:
                return false;
        }
    }
}

if (!function_exists('icrm_member_module_lock_reason')) {
    function icrm_member_module_lock_reason($module)
    {
        $module = preg_replace('/[^a-z_]/', '', (string) $module);

        switch ($module) {
            case 'design':
            case 'board_design':
                if (!icrm_member_is_logged_in()) {
                    return '로그인이 필요합니다.';
                }
                if (function_exists('onoff_builder_member_deploy_enabled') && !onoff_builder_member_deploy_enabled()) {
                    return '디자인 배포가 비활성화되어 있습니다.';
                }

                return '레벨 ' . (function_exists('onoff_builder_member_deploy_min_level') ? onoff_builder_member_deploy_min_level() : 2) . ' 이상 필요';
            case 'boards':
            case 'publish':
                return '온오프빌더에서는 디자인 배포만 이용합니다';
            case 'update':
                return '관리자 전용';
            default:
                return '이용 권한이 없습니다.';
        }
    }
}

if (!function_exists('icrm_member_denied_exit')) {
    function icrm_member_denied_exit($message)
    {
        $message = trim(strip_tags((string) $message));
        if ($message === '') {
            $message = '이 메뉴를 사용할 권한이 없습니다.';
        }

        $home_url = icrm_member_url('home');
        $tokens_css = defined('G5_URL') ? G5_URL . '/css/icrm-design-tokens.css' : '';
        $shell_css = defined('G5_URL') ? G5_URL . '/css/icrm-member-shell.css' : '';

        header('Content-Type: text/html; charset=utf-8');
        header('HTTP/1.1 403 Forbidden');
        ?>
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>온오프빌더 · 이용 제한</title>
<?php if ($tokens_css !== '') { ?><link rel="stylesheet" href="<?php echo icrm_member_h($tokens_css); ?>"><?php } ?>
<?php if ($shell_css !== '') { ?><link rel="stylesheet" href="<?php echo icrm_member_h($shell_css); ?>"><?php } ?>
</head>
<body class="icrm-app icrm-member-app" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f7f8fa">
<div style="max-width:420px;width:100%;padding:28px 24px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;text-align:center">
    <p style="margin:0 0 8px;font-size:15px;font-weight:800">이용할 수 없습니다</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#64748b"><?php echo icrm_member_h($message); ?></p>
    <a class="icc-btn icc-btn--primary" href="<?php echo icrm_member_h($home_url); ?>" style="display:inline-flex">온오프빌더로 돌아가기</a>
</div>
</body>
</html>
        <?php
        exit;
    }
}

if (!function_exists('icrm_member_json_exit')) {
    function icrm_member_json_exit($ok, $error = '', $extra = array())
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }

        $payload = array('ok' => (bool) $ok);
        if ($error !== '') {
            $payload['error'] = (string) $error;
        }
        if (is_array($extra) && $extra !== array()) {
            $payload = array_merge($payload, $extra);
        }

        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if (!function_exists('icrm_member_require_json')) {
    /**
     * action.php 등 AJAX — HTML 리다이렉트 대신 JSON 반환
     */
    function icrm_member_require_json($module = 'home')
    {
        global $is_member;

        if (icrm_member_can_module($module)) {
            return;
        }

        if (empty($is_member)) {
            icrm_member_json_exit(false, '로그인이 필요합니다. 페이지를 새로고침한 뒤 다시 로그인해 주세요.');
        }

        $msg = icrm_member_module_lock_reason($module);
        if ($msg === '이용 권한이 없습니다.') {
            $msg = '이 메뉴를 사용할 권한이 없습니다.';
        }

        icrm_member_json_exit(false, $msg);
    }
}

if (!function_exists('icrm_member_require')) {
    function icrm_member_require($module = 'home')
    {
        global $is_member;

        if (icrm_member_can_module($module)) {
            return;
        }

        if (empty($is_member)) {
            $back = icrm_member_url(isset($_GET['m']) ? array('m' => $_GET['m']) : array());
            $login = defined('G5_BBS_URL') ? G5_BBS_URL . '/login.php' : '/bbs/login.php';
            $login .= '?url=' . urlencode($back);
            if (function_exists('goto_url')) {
                goto_url($login);
            }
            header('Location: ' . $login);
            exit;
        }

        $msg = icrm_member_module_lock_reason($module);
        if ($msg === '이용 권한이 없습니다.') {
            $msg = '이 메뉴를 사용할 권한이 없습니다.';
        }

        icrm_member_denied_exit($msg);
    }
}

if (!function_exists('icrm_member_base')) {
    function icrm_member_base()
    {
        return defined('G5_PLUGIN_URL') ? G5_PLUGIN_URL . '/icrm_member/index.php' : '/plugin/icrm_member/index.php';
    }
}

if (!function_exists('icrm_member_url')) {
    function icrm_member_url($module_or_params = 'home', array $params = array())
    {
        if (is_array($module_or_params)) {
            $params = $module_or_params;
            $module = isset($params['m']) ? (string) $params['m'] : 'home';
        } else {
            $module = preg_replace('/[^a-z_]/', '', (string) $module_or_params);
            if ($module === '') {
                $module = 'home';
            }
            $params['m'] = $module;
        }

        return icrm_member_base() . '?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }
}

if (!function_exists('icrm_member_action_url')) {
    function icrm_member_action_url()
    {
        return defined('G5_PLUGIN_URL')
            ? G5_PLUGIN_URL . '/icrm_member/action.php'
            : '/plugin/icrm_member/action.php';
    }
}

if (!function_exists('icrm_member_modules')) {
    function icrm_member_modules()
    {
        return array(
            'home'   => array('label' => '대시보드', 'icon' => 'home', 'desc' => '현재 상태 확인', 'group' => ''),
            'design' => array('label' => '디자인 배포', 'icon' => 'design', 'desc' => 'ZIP 업로드 후 바로 적용', 'group' => ''),
            'points' => array('label' => '포인트', 'icon' => 'points', 'desc' => '충전·사용료 확인', 'group' => ''),
            'report' => array('label' => '월간 리포트', 'icon' => 'report', 'desc' => '방문·게시글·AI·순위 요약', 'group' => ''),
            'update' => array('label' => '사이트 업데이트', 'icon' => 'update', 'desc' => '기능 업데이트', 'group' => ''),
        );
    }
}

if (!function_exists('icrm_member_render_sidebar_nav')) {
    function icrm_member_render_sidebar_nav($active_module)
    {
        $active_module = preg_replace('/[^a-z_]/', '', (string) $active_module);
        $modules = icrm_member_modules();
        $last_group = null;
        $printed_menu_label = false;

        foreach ($modules as $key => $item) {
            if ($key === 'update' && !icrm_member_can_access()) {
                continue;
            }

            $group = isset($item['group']) ? (string) $item['group'] : '';
            if ($group === '' && !$printed_menu_label) {
                echo '<div class="icrm-sidebar__label">메뉴</div>';
                $printed_menu_label = true;
            } elseif ($group !== '' && $group !== $last_group) {
                echo '<div class="icrm-sidebar__label">' . icrm_member_h($group) . '</div>';
                $last_group = $group;
            }

            $can = icrm_member_can_module($key);
            $class = ($key === $active_module) ? ' is-active' : '';
            $icon = icrm_member_shell_icon($item['icon']);

            if ($can) {
                ?>
        <a href="<?php echo icrm_member_h(icrm_member_url($key)); ?>" class="icrm-sidebar__link<?php echo $class; ?>">
            <span class="icrm-sidebar__icon" aria-hidden="true"><?php echo $icon; ?></span>
            <span class="icrm-sidebar__link-text"><?php echo icrm_member_h($item['label']); ?></span>
        </a>
                <?php
                continue;
            }

            $lock_reason = icrm_member_module_lock_reason($key);
            ?>
        <span class="icrm-sidebar__link is-locked<?php echo $class; ?>" title="<?php echo icrm_member_h($lock_reason); ?>">
            <span class="icrm-sidebar__icon" aria-hidden="true"><?php echo $icon; ?></span>
            <span class="icrm-sidebar__link-text"><?php echo icrm_member_h($item['label']); ?></span>
            <span class="icrm-sidebar__lock" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>
        </span>
            <?php
        }
    }
}

if (!function_exists('icrm_member_h')) {
    function icrm_member_h($str)
    {
        return htmlspecialchars((string) $str, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('icrm_member_onboarding_published_count')) {
    function icrm_member_onboarding_published_count($mb_id = '')
    {
        global $member;

        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }
        $mb_id = preg_replace('/[^a-z0-9_]/i', '', trim((string) $mb_id));
        if ($mb_id === '') {
            return 0;
        }

        if (!is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
            return 0;
        }

        include_once G5_LIB_PATH . '/icrm-content.lib.php';
        if (!function_exists('icrm_content_bootstrap') || !function_exists('icrm_content_table')) {
            return 0;
        }

        icrm_content_bootstrap();
        icrm_content_ensure_tables();

        $row = sql_fetch(" select count(*) as cnt
                           from " . icrm_content_table('items') . "
                           where status = 'published'
                             and mb_id = '" . sql_real_escape_string($mb_id) . "' ");

        return isset($row['cnt']) ? (int) $row['cnt'] : 0;
    }
}

if (!function_exists('icrm_member_onboarding_checklist')) {
    /**
     * 회원 포털 온보딩 단계 (업데이트 → 디자인 → 플랫폼 스킨)
     *
     * @return array steps, done_count, total_count, complete, next_step_id, progress_pct
     */
    function icrm_member_onboarding_checklist($mb_id = '')
    {
        global $member;

        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }

        $update_status = array(
            'license_ok'       => false,
            'local_release'    => '',
            'remote_release'   => '',
            'update_available' => false,
            'message'          => '',
        );
        if (is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-update.lib.php';
            if (function_exists('icrm_update_check_status')) {
                $update_status = icrm_update_check_status();
            }
        }

        $builder_history = array();
        $builder_state = array();
        $builder_status = array();
        if (is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';
            if (function_exists('icrm_builder_deploy_get_history')) {
                $builder_history = icrm_builder_deploy_get_history();
            }
            if (function_exists('icrm_builder_deploy_read_state')) {
                $builder_state = icrm_builder_deploy_read_state();
            }
            if (function_exists('icrm_builder_deploy_check_status')) {
                $builder_status = icrm_builder_deploy_check_status();
            }
        }

        $platform_status = array();
        if (is_file(G5_LIB_PATH . '/onoff-platform-skin.lib.php')) {
            include_once G5_LIB_PATH . '/onoff-platform-skin.lib.php';
            if (function_exists('onoff_platform_skin_get_status')) {
                $platform_status = onoff_platform_skin_get_status();
            }
        }

        $update_done = !empty($update_status['license_ok'])
            && (string) ($update_status['local_release'] ?? '') !== ''
            && empty($update_status['update_available']);

        $design_done = false;
        if ($builder_history !== array()) {
            $design_done = true;
        } elseif (!empty($builder_state['release_id'])) {
            $design_done = true;
        } elseif (function_exists('onoff_builder_home_enabled') && onoff_builder_home_enabled()) {
            $design_done = true;
        }

        $platform_done = false;
        if (function_exists('onoff_platform_skin_is_active') && onoff_platform_skin_is_active()) {
            $platform_done = true;
        } elseif (!empty($platform_status['applied_at'])) {
            $platform_done = true;
        } elseif (!empty($platform_status['member_applied'])) {
            $platform_done = true;
        }

        $local_release = (string) ($update_status['local_release'] ?? '');
        $remote_release = (string) ($update_status['remote_release'] ?? '');

        $update_status_text = '';
        if (empty($update_status['license_ok'])) {
            $update_status_text = '온오프빌더 라이선스 설정 필요';
        } elseif (empty($update_status['ready']) && !empty($update_status['message'])) {
            $update_status_text = (string) $update_status['message'];
        } elseif ($local_release === '') {
            $update_status_text = '아직 업데이트 기록 없음';
        } elseif (!empty($update_status['update_available'])) {
            $update_status_text = '새 버전 ' . ($remote_release !== '' ? $remote_release : '') . ' 적용 가능';
        } else {
            $update_status_text = '최신 버전' . ($local_release !== '' ? ' (' . $local_release . ')' : '');
        }

        $design_status_text = $design_done
            ? '홈 디자인 배포 완료'
            : ((function_exists('onoff_builder_get_imports') && onoff_builder_get_imports() !== array())
                ? 'ZIP 업로드됨 · 배포 적용 필요'
                : 'dist ZIP 업로드 후 배포');

        $platform_status_text = $platform_done
            ? '플랫폼 스킨 적용됨'
            : (!empty($platform_status['ready']) ? '적용 대기' : '스킨 파일 설치 후 적용');

        $definitions = array(
            array(
                'id'          => 'update',
                'label'       => '사이트 업데이트',
                'desc'        => '온오프빌더 기능 파일을 최신 상태로 맞춥니다.',
                'applicable'  => icrm_member_can_update(),
                'done'        => $update_done,
                'url'         => icrm_member_url('update'),
                'status_text' => $update_status_text,
            ),
            array(
                'id'          => 'design',
                'label'       => '디자인 배포',
                'desc'        => '빌더 ZIP을 업로드하고 사이트 첫 화면에 바로 적용합니다.',
                'applicable'  => icrm_member_can_design(),
                'done'        => $design_done,
                'url'         => icrm_member_url('design'),
                'status_text' => $design_status_text,
            ),
        );

        $steps = array();
        foreach ($definitions as $def) {
            if (empty($def['applicable'])) {
                continue;
            }
            $def['current'] = false;
            $steps[] = $def;
        }

        $done_count = 0;
        $next_step_id = null;
        foreach ($steps as $idx => $step) {
            if (!empty($step['done'])) {
                $done_count++;
                continue;
            }
            if ($next_step_id === null) {
                $next_step_id = $step['id'];
                $steps[$idx]['current'] = true;
            }
        }

        $total_count = count($steps);
        $complete = ($total_count > 0 && $done_count >= $total_count);
        $progress_pct = $total_count > 0 ? (int) round(($done_count / $total_count) * 100) : 100;

        return array(
            'steps'         => $steps,
            'done_count'    => $done_count,
            'total_count'   => $total_count,
            'complete'      => $complete,
            'next_step_id'  => $next_step_id,
            'progress_pct'  => $progress_pct,
        );
    }
}

if (!function_exists('icrm_member_shell_icon')) {
    function icrm_member_shell_icon($name)
    {
        $icons = array(
            'home'    => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
            'setup'   => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><path d="M3 14h18v7H3z"/></svg>',
            'design'  => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>',
            'publish' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
            'boards'  => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
            'points'  => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
            'report'  => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4"/><path d="M12 15V8"/><path d="M16 15v-2"/></svg>',
            'update'  => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
        );

        return isset($icons[$name]) ? $icons[$name] : $icons['home'];
    }
}

if (!function_exists('icrm_member_shell_begin')) {
    function icrm_member_shell_begin($active_module)
    {
        global $member;

        $active_module = preg_replace('/[^a-z_]/', '', (string) $active_module);
        $modules = icrm_member_modules();
        if (!isset($modules[$active_module])) {
            $active_module = 'home';
        }

        $point_summary = function_exists('icrm_admin_shell_point_summary') ? icrm_admin_shell_point_summary() : '';
        $license_ok = function_exists('icrm_admin_shell_license_ok') ? icrm_admin_shell_license_ok() : false;
        $active_label = $modules[$active_module]['label'];
        $tokens_css = G5_URL . '/css/icrm-design-tokens.css';
        $shell_css = G5_URL . '/css/icrm-member-shell.css';
        ?>
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>온오프빌더 · <?php echo icrm_member_h($active_label); ?></title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="<?php echo icrm_member_h($tokens_css); ?>">
<link rel="stylesheet" href="<?php echo icrm_member_h(G5_URL . '/css/icrm-module-quiet.css'); ?>">
<link rel="stylesheet" href="<?php echo icrm_member_h($shell_css); ?>">
</head>
<body class="icrm-app icrm-member-app">
<div class="icrm-sidebar-backdrop" id="icrm_member_sidebar_backdrop" hidden></div>
<div class="icrm-app__layout">
<aside class="icrm-sidebar" id="icrm_member_sidebar" aria-label="회원 메뉴">
    <div class="icrm-sidebar__brand">
        <a href="<?php echo icrm_member_h(icrm_member_url('home')); ?>" class="icrm-sidebar__brand-link">
            <span class="icrm-sidebar__logo">ON</span>
            <div class="icrm-sidebar__title-wrap">
                <span class="icrm-sidebar__title">온오프빌더</span>
                <span class="icrm-sidebar__sub">홈페이지 관리</span>
            </div>
        </a>
    </div>
    <nav class="icrm-sidebar__nav">
        <?php icrm_member_render_sidebar_nav($active_module); ?>
    </nav>
    <div class="icrm-sidebar__foot">
        <div class="icrm-sidebar__status">
            <span class="icrm-sidebar__dot<?php echo $license_ok ? ' is-on' : ''; ?>"></span>
            온오프빌더 <?php echo $license_ok ? '연동됨' : '미설정'; ?>
        </div>
    </div>
</aside>
<div class="icrm-main">
<header class="icrm-topbar">
    <div class="icrm-topbar__left">
        <button type="button" class="icrm-topbar__menu-btn" id="icrm_member_menu_toggle" aria-label="메뉴">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <h1 class="icrm-topbar__title"><?php echo icrm_member_h($active_label); ?></h1>
    </div>
    <div class="icrm-topbar__right">
        <?php if ($point_summary !== '') { ?>
        <span class="icrm-topbar__points"><?php echo icrm_member_h($point_summary); ?></span>
        <?php } ?>
        <?php if (!empty($member['mb_nick'])) { ?>
        <span class="icrm-topbar__user"><?php echo icrm_member_h($member['mb_nick']); ?></span>
        <?php } ?>
        <div class="icrm-topbar__links">
            <a href="<?php echo icrm_member_h(G5_URL); ?>" target="_blank" rel="noopener">사이트 보기</a>
            <?php if (defined('G5_BBS_URL')) { ?>
            <a href="<?php echo icrm_member_h(G5_BBS_URL . '/logout.php'); ?>">로그아웃</a>
            <?php } ?>
        </div>
    </div>
</header>
<main class="icrm-content">
<div class="icrm-module-body">
        <?php
    }
}

if (!function_exists('icrm_member_shell_end')) {
    function icrm_member_shell_end()
    {
        ?>
</div>
</main>
</div>
</div>
<script>
(function() {
    var sidebar = document.getElementById('icrm_member_sidebar');
    var backdrop = document.getElementById('icrm_member_sidebar_backdrop');
    var toggle = document.getElementById('icrm_member_menu_toggle');
    if (!sidebar || !toggle) return;
    function openSidebar() {
        sidebar.classList.add('is-open');
        if (backdrop) { backdrop.hidden = false; backdrop.classList.add('is-visible'); }
    }
    function closeSidebar() {
        sidebar.classList.remove('is-open');
        if (backdrop) { backdrop.classList.remove('is-visible'); backdrop.hidden = true; }
    }
    toggle.addEventListener('click', function() {
        sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
    });
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
})();
</script>
</body>
</html>
        <?php
    }
}
