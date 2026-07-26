<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('onoff_builder_is_admin')) {
    function onoff_builder_is_admin()
    {
        global $is_admin;

        return $is_admin === 'super';
    }
}

if (!function_exists('onoff_builder_require_admin')) {
    function onoff_builder_require_admin($redirect = '')
    {
        if (onoff_builder_is_admin()) {
            return;
        }

        if ($redirect === '') {
            $redirect = defined('G5_URL') ? G5_URL : '/';
        }

        onoff_builder_alert('최고관리자만 접근할 수 있습니다.', $redirect);
    }
}

if (!function_exists('onoff_builder_member_deploy_enabled')) {
    function onoff_builder_member_deploy_enabled()
    {
        if (function_exists('g5site_cfg_bool')) {
            return g5site_cfg_bool('builder_deploy_member_enabled', true);
        }

        return true;
    }
}

if (!function_exists('onoff_builder_member_deploy_min_level')) {
    function onoff_builder_member_deploy_min_level()
    {
        if (function_exists('g5site_cfg')) {
            $lv = g5site_cfg('builder_deploy_min_level', '2');
            if ($lv !== '' && is_numeric($lv)) {
                return max(1, (int) $lv);
            }
        }

        return 2;
    }
}

if (!function_exists('onoff_builder_is_deploy_user')) {
    /**
     * 홈페이지 디자인 배포 권한 (최고관리자 또는 일반회원)
     */
    function onoff_builder_is_deploy_user()
    {
        global $is_admin, $is_member, $member;

        if ($is_admin === 'super') {
            return true;
        }

        if (!onoff_builder_member_deploy_enabled()) {
            return false;
        }

        if (empty($is_member) || empty($member['mb_id'])) {
            return false;
        }

        $level = isset($member['mb_level']) ? (int) $member['mb_level'] : 0;

        return $level >= onoff_builder_member_deploy_min_level();
    }
}

if (!function_exists('onoff_builder_require_deploy_user')) {
    function onoff_builder_require_deploy_user($redirect = '')
    {
        global $is_member;

        if (onoff_builder_is_deploy_user()) {
            return;
        }

        if (empty($is_member)) {
            $back = function_exists('onoff_builder_member_portal_url')
                ? onoff_builder_member_portal_url()
                : onoff_builder_member_url();
            $login = defined('G5_BBS_URL') ? G5_BBS_URL . '/login.php' : '/bbs/login.php';
            $login .= '?url=' . urlencode($back);
            if (function_exists('goto_url')) {
                goto_url($login);
            }
            header('Location: ' . $login);
            exit;
        }

        if (function_exists('onoff_builder_member_portal_redirect')) {
            onoff_builder_member_portal_redirect('홈페이지 디자인 배포 권한이 없습니다. 사이트 관리자에게 문의하세요.');
        }

        if ($redirect === '') {
            $redirect = defined('G5_URL') ? G5_URL : '/';
        }

        onoff_builder_alert('홈페이지 디자인 배포 권한이 없습니다. 사이트 관리자에게 문의하세요.', $redirect);
    }
}

if (!function_exists('onoff_builder_member_url')) {
    function onoff_builder_member_url($file = '')
    {
        $file = ltrim((string) $file, '/');

        return ONOFF_BUILDER_URL . '/member/' . $file;
    }
}

if (!function_exists('onoff_builder_member_portal_url')) {
    /**
     * iCRM 회원 포털 디자인 탭 URL (없으면 standalone member URL)
     */
    function onoff_builder_member_portal_url($msg = '')
    {
        if (function_exists('icrm_member_enabled') && icrm_member_enabled() && is_file(G5_PLUGIN_PATH . '/icrm_member/index.php')) {
            if (is_file(G5_LIB_PATH . '/icrm-member.lib.php')) {
                include_once G5_LIB_PATH . '/icrm-member.lib.php';
            }
            if (function_exists('icrm_member_url')) {
                $url = icrm_member_url('design');
                if ($msg !== '') {
                    $url .= (strpos($url, '?') !== false ? '&' : '?') . 'msg=' . urlencode($msg);
                }

                return $url;
            }
        }

        return onoff_builder_member_url($msg !== '' ? '?msg=' . urlencode($msg) : '');
    }
}

if (!function_exists('onoff_builder_member_portal_redirect')) {
    function onoff_builder_member_portal_redirect($msg)
    {
        $url = onoff_builder_member_portal_url($msg);
        if (function_exists('goto_url')) {
            goto_url($url);
        }
        header('Location: ' . $url);
        exit;
    }
}

if (!function_exists('onoff_builder_require_post')) {
    function onoff_builder_require_post()
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            if (function_exists('onoff_builder_member_portal_redirect')) {
                onoff_builder_member_portal_redirect('잘못된 요청입니다.');
            }
            onoff_builder_alert('잘못된 요청입니다.');
        }
    }
}

if (!function_exists('onoff_builder_alert')) {
    function onoff_builder_alert($msg, $url = '')
    {
        if (function_exists('alert')) {
            alert($msg, $url);
        }

        header('Content-Type: text/html; charset=utf-8');
        echo '<script>alert(' . json_encode($msg, JSON_UNESCAPED_UNICODE) . ');';
        if ($url !== '') {
            echo 'location.href=' . json_encode($url) . ';';
        } else {
            echo 'history.back();';
        }
        echo '</script>';
        exit;
    }
}

if (!function_exists('onoff_builder_admin_url')) {
    function onoff_builder_admin_url($file = '')
    {
        $file = ltrim((string) $file, '/');

        return ONOFF_BUILDER_URL . '/admin/' . $file;
    }
}

if (!function_exists('onoff_builder_escape')) {
    function onoff_builder_escape($value)
    {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('onoff_builder_ensure_dir')) {
    function onoff_builder_ensure_dir($dir)
    {
        if (is_dir($dir)) {
            return true;
        }

        return @mkdir($dir, 0755, true);
    }
}

/** @deprecated onoff_builder_sanitize_project_id 사용 */
if (!function_exists('onoff_builder_sanitize_id')) {
    function onoff_builder_sanitize_id($id)
    {
        return onoff_builder_sanitize_project_id($id);
    }
}

if (!function_exists('onoff_builder_imports_json_path')) {
    function onoff_builder_imports_json_path()
    {
        return defined('ONOFF_BUILDER_IMPORTS_JSON') ? ONOFF_BUILDER_IMPORTS_JSON : ONOFF_BUILDER_DATA_PATH . '/imports.json';
    }
}

if (!function_exists('onoff_builder_migrate_legacy_imports')) {
    function onoff_builder_migrate_legacy_imports()
    {
        static $done = false;
        if ($done) {
            return;
        }
        $done = true;

        $legacy_dir = ONOFF_BUILDER_DATA_PATH . '/imports';
        if (!is_dir($legacy_dir)) {
            return;
        }

        $path = onoff_builder_imports_json_path();
        if (is_file($path)) {
            $raw = @file_get_contents($path);
            $existing = $raw ? json_decode($raw, true) : null;
            if (is_array($existing) && count($existing) > 0) {
                return;
            }
        }

        $items = array();
        foreach (glob($legacy_dir . '/*.json') ?: array() as $file) {
            $raw = @file_get_contents($file);
            $row = $raw ? json_decode($raw, true) : null;
            if (!is_array($row) || empty($row['id'])) {
                continue;
            }
            $id = onoff_builder_sanitize_project_id($row['id']);
            if ($id === '') {
                continue;
            }
            $entry = 'index.html';
            if (!empty($row['entry'])) {
                $entry = $row['entry'];
            } elseif (!empty($row['entry_file'])) {
                $entry = $row['entry_file'];
            }
            $items[] = array(
                'id'         => $id,
                'name'       => isset($row['name']) ? $row['name'] : $id,
                'path'       => $id,
                'entry'      => $entry,
                'created_at' => isset($row['created_at']) ? $row['created_at'] : date('Y-m-d H:i:s'),
            );
        }

        if ($items !== array()) {
            onoff_builder_save_imports($items);
        }
    }
}

if (!function_exists('onoff_builder_get_imports')) {
    function onoff_builder_get_imports()
    {
        onoff_builder_migrate_legacy_imports();

        $path = onoff_builder_imports_json_path();
        if (!is_file($path)) {
            return array();
        }

        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return array();
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return array();
        }

        $out = array();
        foreach ($data as $row) {
            if (is_array($row) && !empty($row['id'])) {
                $out[] = $row;
            }
        }

        usort($out, function ($a, $b) {
            $ta = isset($a['created_at']) ? $a['created_at'] : '';
            $tb = isset($b['created_at']) ? $b['created_at'] : '';

            return strcmp($tb, $ta);
        });

        return $out;
    }
}

if (!function_exists('onoff_builder_save_imports')) {
    function onoff_builder_save_imports($items)
    {
        if (!is_array($items)) {
            return false;
        }

        if (!onoff_builder_ensure_dir(ONOFF_BUILDER_DATA_PATH)) {
            return false;
        }

        $normalized = array();
        foreach ($items as $row) {
            if (!is_array($row) || empty($row['id'])) {
                continue;
            }
            $id = onoff_builder_sanitize_project_id($row['id']);
            if ($id === '') {
                continue;
            }

            $item = array(
                'id'         => $id,
                'name'       => isset($row['name']) && $row['name'] !== '' ? $row['name'] : $id,
                'path'       => isset($row['path']) && $row['path'] !== '' ? $row['path'] : $id,
                'created_at' => isset($row['created_at']) && $row['created_at'] !== '' ? $row['created_at'] : date('Y-m-d H:i:s'),
            );

            if (!empty($row['needs_build'])) {
                $item['needs_build'] = true;
                $item['entry'] = array_key_exists('entry', $row) ? (string) $row['entry'] : '';
            } else {
                $item['entry'] = isset($row['entry']) && $row['entry'] !== '' ? (string) $row['entry'] : 'index.html';
            }

            if (!empty($row['builder_source'])) {
                $item['builder_source'] = true;
            }

            $normalized[] = $item;
        }

        $json = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($json === false) {
            return false;
        }

        return @file_put_contents(onoff_builder_imports_json_path(), $json, LOCK_EX) !== false;
    }
}

if (!function_exists('onoff_builder_get_import')) {
    function onoff_builder_get_import($id)
    {
        if (!onoff_builder_validate_project_id($id)) {
            return null;
        }

        $id = onoff_builder_sanitize_project_id($id);
        foreach (onoff_builder_get_imports() as $row) {
            if (isset($row['id']) && $row['id'] === $id) {
                return $row;
            }
        }

        return null;
    }
}

if (!function_exists('onoff_builder_has_import')) {
    function onoff_builder_has_import($id)
    {
        return onoff_builder_get_import($id) !== null;
    }
}

if (!function_exists('onoff_builder_add_import')) {
    function onoff_builder_add_import($data)
    {
        if (!is_array($data) || empty($data['id']) || !onoff_builder_validate_project_id($data['id'])) {
            return false;
        }

        $id = onoff_builder_sanitize_project_id($data['id']);
        $items = onoff_builder_get_imports();
        $found = false;

        foreach ($items as $idx => $row) {
            if (isset($row['id']) && $row['id'] === $id) {
                $items[$idx] = onoff_builder_merge_import_row($id, $row, $data);
                $found = true;
                break;
            }
        }

        if (!$found) {
            $items[] = onoff_builder_merge_import_row($id, array(), $data);
        }

        return onoff_builder_save_imports($items);
    }
}

if (!function_exists('onoff_builder_merge_import_row')) {
    function onoff_builder_merge_import_row($id, array $existing, array $data)
    {
        $row = array(
            'id'         => $id,
            'name'       => isset($data['name']) && $data['name'] !== '' ? $data['name'] : $id,
            'path'       => isset($data['path']) && $data['path'] !== '' ? $data['path'] : $id,
            'entry'      => array_key_exists('entry', $data) ? (string) $data['entry'] : (isset($existing['entry']) ? (string) $existing['entry'] : 'index.html'),
            'created_at' => isset($existing['created_at']) ? $existing['created_at'] : date('Y-m-d H:i:s'),
        );

        if (array_key_exists('needs_build', $data)) {
            $row['needs_build'] = !empty($data['needs_build']);
        } elseif (isset($existing['needs_build'])) {
            $row['needs_build'] = !empty($existing['needs_build']);
        }

        if (array_key_exists('builder_source', $data)) {
            $row['builder_source'] = !empty($data['builder_source']);
        } elseif (isset($existing['builder_source'])) {
            $row['builder_source'] = !empty($existing['builder_source']);
        }

        return $row;
    }
}

if (!function_exists('onoff_builder_remove_import_meta')) {
    function onoff_builder_remove_import_meta($id)
    {
        if (!onoff_builder_validate_project_id($id)) {
            return false;
        }

        $id = onoff_builder_sanitize_project_id($id);
        $items = onoff_builder_get_imports();
        $had = false;
        $next = array();

        foreach ($items as $row) {
            if (isset($row['id']) && $row['id'] === $id) {
                $had = true;
                continue;
            }
            $next[] = $row;
        }

        if (!$had) {
            return true;
        }

        return onoff_builder_save_imports($next);
    }
}

if (!function_exists('onoff_builder_is_path_under_imports')) {
    function onoff_builder_is_path_under_imports($path)
    {
        if ($path === '' || !is_dir(ONOFF_BUILDER_IMPORTS_PATH)) {
            return false;
        }

        $real_path = realpath($path);
        $real_base = realpath(ONOFF_BUILDER_IMPORTS_PATH);
        if ($real_path === false || $real_base === false) {
            return false;
        }

        $base_prefix = rtrim($real_base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

        return $real_path === $real_base || strpos($real_path, $base_prefix) === 0;
    }
}

if (!function_exists('onoff_builder_remove_project_dir')) {
    function onoff_builder_remove_project_dir($project_id)
    {
        if (!onoff_builder_validate_project_id($project_id)) {
            return false;
        }

        $id = onoff_builder_sanitize_project_id($project_id);
        $dir = onoff_builder_project_dir($id);
        if ($dir === '' || !is_dir($dir)) {
            return true;
        }

        if (!onoff_builder_is_path_under_imports($dir)) {
            return false;
        }

        $real_dir = realpath($dir);
        if ($real_dir === false || !onoff_builder_is_path_under_imports($real_dir)) {
            return false;
        }

        return onoff_builder_remove_dir($real_dir);
    }
}

if (!function_exists('onoff_builder_remove_legacy_import_meta_file')) {
    function onoff_builder_remove_legacy_import_meta_file($project_id)
    {
        $id = onoff_builder_sanitize_project_id($project_id);
        if ($id === '') {
            return;
        }

        $legacy = ONOFF_BUILDER_DATA_PATH . '/imports/' . $id . '.json';
        if (!is_file($legacy)) {
            return;
        }

        $legacy_real = realpath($legacy);
        $legacy_dir_real = realpath(ONOFF_BUILDER_DATA_PATH . '/imports');
        if ($legacy_real !== false && $legacy_dir_real !== false) {
            $prefix = rtrim($legacy_dir_real, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
            if (strpos($legacy_real, $prefix) === 0) {
                @unlink($legacy_real);
            }
        }
    }
}

if (!function_exists('onoff_builder_delete_import')) {
    /**
     * 프로젝트 폴더 + imports.json 메타 삭제
     *
     * @return array{ok:bool,message:string}
     */
    function onoff_builder_delete_import($project_id)
    {
        if (!onoff_builder_validate_project_id($project_id)) {
            return array('ok' => false, 'message' => '유효하지 않은 프로젝트 ID입니다.');
        }

        $id = onoff_builder_sanitize_project_id($project_id);
        if ($id !== strtolower(trim((string) $project_id))) {
            return array('ok' => false, 'message' => '유효하지 않은 프로젝트 ID입니다.');
        }

        $meta = onoff_builder_get_import($id);
        $dir = onoff_builder_project_dir($id);
        $has_meta = $meta !== null;
        $has_dir = ($dir !== '' && is_dir($dir));

        if (!$has_meta && !$has_dir) {
            return array('ok' => false, 'message' => '등록된 프로젝트를 찾을 수 없습니다.');
        }

        if ($has_dir && !onoff_builder_remove_project_dir($id)) {
            return array(
                'ok'      => false,
                'message' => '프로젝트 파일 삭제에 실패했습니다. 서버 폴더 권한을 확인한 뒤 다시 시도해 주세요.',
            );
        }

        if ($has_meta && !onoff_builder_remove_import_meta($id)) {
            return array(
                'ok'      => false,
                'message' => '프로젝트 정보 삭제에 실패했습니다. 다시 시도해 주세요.',
            );
        }

        onoff_builder_remove_legacy_import_meta_file($id);

        return array('ok' => true, 'message' => '프로젝트가 삭제되었습니다.');
    }
}

if (!function_exists('onoff_builder_page_url')) {
    function onoff_builder_page_url($project_id)
    {
        $id = onoff_builder_sanitize_project_id($project_id);
        if ($id === '') {
            return '';
        }

        return ONOFF_BUILDER_URL . '/page.php?id=' . rawurlencode($id);
    }
}

if (!function_exists('onoff_builder_render_page_error')) {
    function onoff_builder_render_page_error($message, $title = '페이지 안내')
    {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">';
        echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
        echo '<title>' . onoff_builder_escape($title) . '</title>';
        echo '<style>body{font-family:"Malgun Gothic",sans-serif;margin:2rem;color:#334155;background:#f8fafc}';
        echo '.box{max-width:32rem;padding:1.25rem;background:#fff;border:1px solid #e2e8f0;border-radius:8px}</style>';
        echo '</head><body><div class="box"><h1>' . onoff_builder_escape($title) . '</h1>';
        echo '<p>' . onoff_builder_escape($message) . '</p></div></body></html>';
        exit;
    }
}

if (!function_exists('onoff_builder_get_import_base_url')) {
    /**
     * entry HTML 기준 디렉터리 URL (끝에 / 포함)
     * 예: entry=dist/index.html → .../imports/{id}/dist/
     */
    function onoff_builder_get_import_base_url($id, $entry_path = 'index.html')
    {
        $id = onoff_builder_sanitize_project_id($id);
        if ($id === '') {
            return '';
        }

        $entry_path = str_replace('\\', '/', (string) $entry_path);
        $subdir = dirname($entry_path);
        if ($subdir === '.' || $subdir === '/') {
            $subdir = '';
        }

        $url = rtrim(ONOFF_BUILDER_IMPORTS_URL, '/') . '/' . $id;
        if ($subdir !== '') {
            $parts = explode('/', $subdir);
            foreach ($parts as $part) {
                if ($part === '' || $part === '.') {
                    continue;
                }
                $url .= '/' . rawurlencode($part);
            }
        }

        return rtrim($url, '/') . '/';
    }
}

if (!function_exists('onoff_builder_get_import_root_assets_url')) {
    /** 프로젝트 루트 기준 /assets/ 절대경로 보정용 */
    function onoff_builder_get_import_root_assets_url($id)
    {
        $id = onoff_builder_sanitize_project_id($id);
        if ($id === '') {
            return '';
        }

        return rtrim(ONOFF_BUILDER_IMPORTS_URL, '/') . '/' . $id . '/assets/';
    }
}

if (!function_exists('onoff_builder_remove_base_tags')) {
    function onoff_builder_remove_base_tags($html)
    {
        return preg_replace('#<base\b[^>]*>\s*#i', '', $html);
    }
}

if (!function_exists('onoff_builder_rewrite_asset_paths')) {
    function onoff_builder_rewrite_asset_paths($html, $project_id, $entry_path = 'index.html')
    {
        $id = onoff_builder_sanitize_project_id($project_id);
        if ($id === '') {
            return $html;
        }

        $root_assets = onoff_builder_get_import_root_assets_url($id);
        $entry_assets = onoff_builder_get_import_base_url($id, $entry_path) . 'assets/';

        $patterns = array(
            '#\ssrc=(["\'])/assets/#i'   => ' src=$1' . $root_assets,
            '#\shref=(["\'])/assets/#i'  => ' href=$1' . $root_assets,
            '#\ssrc=(["\'])\./assets/#i' => ' src=$1' . $entry_assets,
            '#\shref=(["\'])\./assets/#i' => ' href=$1' . $entry_assets,
            '#\ssrc=(["\'])assets/#i'    => ' src=$1' . $entry_assets,
            '#\shref=(["\'])assets/#i'   => ' href=$1' . $entry_assets,
        );

        foreach ($patterns as $pattern => $replacement) {
            $html = preg_replace($pattern, $replacement, $html);
        }

        return $html;
    }
}

if (!function_exists('onoff_builder_resolve_import_index_file')) {
    function onoff_builder_resolve_import_index_file($id, $entry_path)
    {
        $id = onoff_builder_sanitize_project_id($id);
        if ($id === '') {
            return '';
        }

        $entry_path = str_replace('\\', '/', (string) $entry_path);
        if ($entry_path === '' || strpos($entry_path, '..') !== false || $entry_path[0] === '/') {
            return '';
        }

        $project_dir = onoff_builder_project_dir($id);
        if ($project_dir === '' || !is_dir($project_dir)) {
            return '';
        }

        $index_file = $project_dir . '/' . $entry_path;
        $real_dir = realpath($project_dir);
        $real_index = realpath($index_file);

        if ($real_dir === false || $real_index === false || !is_file($real_index)) {
            return '';
        }

        if (strpos($real_index, $real_dir . DIRECTORY_SEPARATOR) !== 0 && $real_index !== $real_dir) {
            return '';
        }

        return $real_index;
    }
}

if (!function_exists('onoff_builder_render_import_page')) {
    function onoff_builder_render_import_page($id)
    {
        $raw_id = trim((string) $id);
        if ($raw_id === '') {
            onoff_builder_render_page_error('page.php?id=프로젝트ID 형태로 접근해 주세요.');
        }

        if (!onoff_builder_validate_project_id($raw_id)) {
            onoff_builder_render_page_error('유효하지 않은 프로젝트 ID입니다.');
        }

        $id = onoff_builder_sanitize_project_id($raw_id);
        $meta = onoff_builder_get_import($id);
        if (!$meta) {
            onoff_builder_render_page_error('등록되지 않은 프로젝트입니다. 관리자 화면에서 업로드 여부를 확인해 주세요.');
        }

        $entry = function_exists('onoff_builder_resolve_import_entry')
            ? onoff_builder_resolve_import_entry($id, $meta)
            : (isset($meta['entry']) && $meta['entry'] !== '' ? $meta['entry'] : 'index.html');
        if ($entry === '') {
            $message = function_exists('onoff_builder_vite_source_message')
                ? onoff_builder_vite_source_message()
                : '빌드가 필요한 프로젝트입니다. 디자인 화면에서 [배포하고 바로 적용]을 실행해 주세요.';
            onoff_builder_render_page_error($message);
        }

        $index_file = onoff_builder_resolve_import_index_file($id, $entry);
        if ($index_file === '') {
            onoff_builder_render_page_error('index.html 파일을 찾을 수 없습니다. ZIP을 다시 업로드해 주세요.');
        }

        $html = @file_get_contents($index_file);
        if ($html === false || $html === '') {
            onoff_builder_render_page_error('HTML 파일을 읽을 수 없습니다.');
        }

        if (function_exists('onoff_builder_is_vite_dev_index_html') && onoff_builder_is_vite_dev_index_html($html)) {
            onoff_builder_render_page_error(onoff_builder_vite_source_message());
        }

        $html = onoff_builder_remove_base_tags($html);
        $html = onoff_builder_rewrite_asset_paths($html, $id, $entry);

        header('Content-Type: text/html; charset=utf-8');
        echo $html;
        exit;
    }
}

if (!function_exists('onoff_builder_stub_message')) {
    function onoff_builder_stub_message($title, $message)
    {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
        echo '<title>' . onoff_builder_escape($title) . '</title>';
        echo '<link rel="stylesheet" href="' . onoff_builder_escape(ONOFF_BUILDER_ASSETS_URL . '/css/admin.css') . '">';
        echo '</head><body class="onoff-builder-admin"><main class="onoff-builder-admin__main"><div class="onoff-builder-admin__inner">';
        echo '<h1>' . onoff_builder_escape($title) . '</h1><p>' . onoff_builder_escape($message) . '</p>';
        echo '<p><a class="onoff-builder-admin__btn" href="' . onoff_builder_escape(onoff_builder_admin_url()) . '">관리 홈</a></p>';
        echo '</div></main></body></html>';
        exit;
    }
}
