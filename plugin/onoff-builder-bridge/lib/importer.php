<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('onoff_builder_validate_project_id')) {
    function onoff_builder_validate_project_id($id)
    {
        $id = trim((string) $id);
        if ($id === '') {
            return false;
        }
        if (strlen($id) < 2 || strlen($id) > 50) {
            return false;
        }
        if (!preg_match('/^[a-z0-9][a-z0-9_-]*$/', $id)) {
            return false;
        }
        if (strpos($id, '..') !== false) {
            return false;
        }

        return true;
    }
}

if (!function_exists('onoff_builder_sanitize_project_id')) {
    function onoff_builder_sanitize_project_id($id)
    {
        $id = strtolower(trim((string) $id));
        $id = preg_replace('/[^a-z0-9_-]/', '', $id);
        $id = preg_replace('/^-+/', '', $id);

        return substr($id, 0, 50);
    }
}

if (!function_exists('onoff_builder_project_dir')) {
    function onoff_builder_project_dir($project_id)
    {
        $id = onoff_builder_sanitize_project_id($project_id);
        if ($id === '') {
            return '';
        }

        return ONOFF_BUILDER_IMPORTS_PATH . '/' . $id;
    }
}

if (!function_exists('onoff_builder_project_exists')) {
    function onoff_builder_project_exists($project_id)
    {
        if (onoff_builder_has_import($project_id)) {
            return true;
        }

        $dir = onoff_builder_project_dir($project_id);
        if ($dir === '' || !is_dir($dir)) {
            return false;
        }

        $items = @scandir($dir);
        if (!is_array($items)) {
            return false;
        }

        foreach ($items as $item) {
            if ($item !== '.' && $item !== '..') {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('onoff_builder_remove_dir')) {
    function onoff_builder_remove_dir($dir)
    {
        if (!is_dir($dir)) {
            return true;
        }

        $items = @scandir($dir);
        if (!is_array($items)) {
            return false;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                if (!onoff_builder_remove_dir($path)) {
                    return false;
                }
            } else {
                if (!@unlink($path)) {
                    return false;
                }
            }
        }

        return @rmdir($dir);
    }
}

if (!function_exists('onoff_builder_is_vite_source_project')) {
    function onoff_builder_is_vite_source_project($project_dir)
    {
        if (!is_dir($project_dir)) {
            return false;
        }

        if (!is_file($project_dir . '/package.json')) {
            return false;
        }
        if (!is_dir($project_dir . '/src')) {
            return false;
        }
        if (!is_file($project_dir . '/vite.config.ts')) {
            return false;
        }

        return is_file($project_dir . '/src/App.tsx')
            || is_file($project_dir . '/src/App.jsx')
            || is_file($project_dir . '/src/main.tsx')
            || is_file($project_dir . '/src/main.jsx');
    }
}

if (!function_exists('onoff_builder_vite_source_message')) {
    function onoff_builder_vite_source_message()
    {
        return '빌더 원본 프로젝트입니다. 디자인 화면에서 [iCRM에서 빌드] 또는 [배포하고 바로 적용]을 실행해 주세요.';
    }
}

if (!function_exists('onoff_builder_is_vite_dev_index_html')) {
    function onoff_builder_is_vite_dev_index_html($html)
    {
        if (!is_string($html) || $html === '') {
            return false;
        }

        return (bool) preg_match('#\ssrc=(["\'])/src/#', $html);
    }
}

if (!function_exists('onoff_builder_resolve_import_entry')) {
    /**
     * imports 메타·디스크 상태로 실제 렌더할 entry 경로 결정
     *
     * @return string 빈 문자열이면 렌더 불가(빌드 필요 등)
     */
    function onoff_builder_resolve_import_entry($project_id, array $meta = null)
    {
        if (!onoff_builder_validate_project_id($project_id)) {
            return '';
        }

        $project_id = onoff_builder_sanitize_project_id($project_id);
        if (!is_array($meta)) {
            $meta = onoff_builder_get_import($project_id);
        }
        if (!is_array($meta)) {
            return '';
        }

        if (function_exists('onoff_builder_sync_import_build_flags')) {
            onoff_builder_sync_import_build_flags($project_id);
            $meta = onoff_builder_get_import($project_id);
        }

        if (function_exists('onoff_builder_project_needs_build')
            && onoff_builder_project_needs_build($project_id, $meta)) {
            return '';
        }

        $entry = isset($meta['entry']) && $meta['entry'] !== '' ? (string) $meta['entry'] : 'index.html';
        $dir = onoff_builder_project_dir($project_id);
        if ($dir === '' || !is_dir($dir)) {
            return '';
        }

        if ($entry === 'index.html' && is_file($dir . '/dist/index.html')) {
            $root_html = @file_get_contents($dir . '/index.html');
            if ($root_html !== false && onoff_builder_is_vite_dev_index_html($root_html)) {
                return 'dist/index.html';
            }
        }

        if (onoff_builder_resolve_import_index_file($project_id, $entry) === '') {
            if ($entry !== 'dist/index.html' && is_file($dir . '/dist/index.html')) {
                return 'dist/index.html';
            }

            return '';
        }

        $index_file = onoff_builder_resolve_import_index_file($project_id, $entry);
        if ($index_file !== '') {
            $html = @file_get_contents($index_file);
            if ($html !== false && onoff_builder_is_vite_dev_index_html($html)) {
                if (is_file($dir . '/dist/index.html')) {
                    return 'dist/index.html';
                }

                return '';
            }
        }

        return $entry;
    }
}

if (!function_exists('onoff_builder_project_needs_build')) {
    /**
     * imports 메타 + 디스크 상태로 빌드 필요 여부 판단
     */
    function onoff_builder_project_needs_build($project_id, array $import = null)
    {
        if (!onoff_builder_validate_project_id($project_id)) {
            return false;
        }

        $project_id = onoff_builder_sanitize_project_id($project_id);
        if (!is_array($import)) {
            $import = onoff_builder_get_import($project_id);
        }

        if (is_array($import) && !empty($import['needs_build'])) {
            return true;
        }

        $dir = onoff_builder_project_dir($project_id);
        if ($dir === '' || !is_dir($dir) || !onoff_builder_is_vite_source_project($dir)) {
            return false;
        }

        if (is_file($dir . '/dist/index.html')) {
            return false;
        }

        $entry = is_array($import) && array_key_exists('entry', $import)
            ? (string) $import['entry']
            : 'index.html';

        return ($entry === '' || $entry === 'index.html');
    }
}

if (!function_exists('onoff_builder_sync_import_build_flags')) {
    /**
     * 디스크 상태와 imports.json needs_build 불일치 시 메타 보정
     */
    function onoff_builder_sync_import_build_flags($project_id)
    {
        if (!onoff_builder_validate_project_id($project_id)) {
            return false;
        }

        $project_id = onoff_builder_sanitize_project_id($project_id);
        $import = onoff_builder_get_import($project_id);
        if (!is_array($import)) {
            return false;
        }

        $needs = onoff_builder_project_needs_build($project_id, $import);
        $has_flag = !empty($import['needs_build']);

        if ($needs === $has_flag) {
            return true;
        }

        return onoff_builder_add_import(array(
            'id'             => $project_id,
            'name'           => isset($import['name']) ? (string) $import['name'] : $project_id,
            'path'           => isset($import['path']) ? (string) $import['path'] : $project_id,
            'entry'          => $needs ? '' : (isset($import['entry']) ? (string) $import['entry'] : 'index.html'),
            'needs_build'    => $needs,
            'builder_source' => $needs || !empty($import['builder_source']),
        ));
    }
}

if (!function_exists('onoff_builder_move_dir_contents')) {
    function onoff_builder_move_dir_contents($from, $to)
    {
        $from = rtrim(str_replace('\\', '/', (string) $from), '/');
        $to = rtrim(str_replace('\\', '/', (string) $to), '/');
        if ($from === '' || $to === '' || !is_dir($from)) {
            return false;
        }
        if (!is_dir($to) && !onoff_builder_ensure_dir($to)) {
            return false;
        }

        $items = @scandir($from);
        if (!is_array($items)) {
            return false;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $src = $from . '/' . $item;
            $dst = $to . '/' . $item;
            if (is_dir($src)) {
                if (!onoff_builder_move_dir_contents($src, $dst)) {
                    return false;
                }
                @rmdir($src);
            } else {
                if (is_file($dst)) {
                    @unlink($dst);
                }
                if (!@rename($src, $dst)) {
                    return false;
                }
            }
        }

        return true;
    }
}

if (!function_exists('onoff_builder_unwrap_single_root_dir')) {
    /**
     * ZIP 루트에 폴더 하나만 있으면 내용을 상위로 올림 (빌더 다운로드 ZIP 형식)
     */
    function onoff_builder_unwrap_single_root_dir($project_dir)
    {
        if (!is_dir($project_dir)) {
            return false;
        }

        $items = array();
        foreach (@scandir($project_dir) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $items[] = $item;
        }

        if (count($items) !== 1) {
            return false;
        }

        $only = $items[0];
        $subdir = $project_dir . '/' . $only;
        if (!is_dir($subdir)) {
            return false;
        }

        $temp = $project_dir . '/.obb-unwrap-' . getmypid();
        if (!@rename($subdir, $temp)) {
            return false;
        }
        if (!onoff_builder_move_dir_contents($temp, $project_dir)) {
            @rename($temp, $subdir);
            return false;
        }
        @rmdir($temp);

        return true;
    }
}

if (!function_exists('onoff_builder_normalize_uploaded_project')) {
    /**
     * 업로드 ZIP 정규화 후 배포 가능 여부 판단
     *
     * @return array{status:string,entry:string,needs_build:bool,builder_source:bool}
     */
    function onoff_builder_normalize_uploaded_project($project_dir)
    {
        for ($i = 0; $i < 3; $i++) {
            if (!onoff_builder_unwrap_single_root_dir($project_dir)) {
                break;
            }
        }

        if (onoff_builder_is_vite_source_project($project_dir)) {
            if (is_file($project_dir . '/dist/index.html')) {
                return array(
                    'status'         => 'ready',
                    'entry'          => 'dist/index.html',
                    'needs_build'    => false,
                    'builder_source' => true,
                );
            }

            return array(
                'status'         => 'needs_build',
                'entry'          => '',
                'needs_build'    => true,
                'builder_source' => true,
            );
        }

        $entry = onoff_builder_find_index_html($project_dir);
        if ($entry !== '') {
            return array(
                'status'         => 'ready',
                'entry'          => $entry,
                'needs_build'    => false,
                'builder_source' => false,
            );
        }

        if (onoff_builder_is_vite_source_project($project_dir)) {
            return array(
                'status'         => 'needs_build',
                'entry'          => '',
                'needs_build'    => true,
                'builder_source' => true,
            );
        }

        return array(
            'status'         => 'invalid',
            'entry'          => '',
            'needs_build'    => false,
            'builder_source' => false,
        );
    }
}

if (!function_exists('onoff_builder_find_index_html')) {
    /**
     * index.html 상대 경로 반환 (없으면 빈 문자열)
     */
    function onoff_builder_find_index_html($project_dir)
    {
        if (!is_dir($project_dir)) {
            return '';
        }

        if (is_file($project_dir . '/index.html')) {
            return 'index.html';
        }

        if (is_file($project_dir . '/dist/index.html')) {
            return 'dist/index.html';
        }

        $candidates = array();
        $items = @scandir($project_dir);
        if (!is_array($items)) {
            return '';
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $level1 = $project_dir . '/' . $item;
            if (!is_dir($level1)) {
                continue;
            }

            if (is_file($level1 . '/index.html')) {
                $candidates[] = $item . '/index.html';
            }

            if (is_file($level1 . '/dist/index.html')) {
                $candidates[] = $item . '/dist/index.html';
            }

            $sub = @scandir($level1);
            if (!is_array($sub)) {
                continue;
            }
            foreach ($sub as $subitem) {
                if ($subitem === '.' || $subitem === '..') {
                    continue;
                }
                $level2 = $level1 . '/' . $subitem;
                if (is_dir($level2) && is_file($level2 . '/index.html')) {
                    $candidates[] = $item . '/' . $subitem . '/index.html';
                }
            }
        }

        $candidates = array_values(array_unique($candidates));
        if ($candidates === array()) {
            return '';
        }

        foreach ($candidates as $rel) {
            if ($rel === 'dist/index.html' || substr($rel, -15) === '/dist/index.html') {
                return $rel;
            }
        }

        if (count($candidates) === 1) {
            return $candidates[0];
        }

        return '';
    }
}

if (!function_exists('onoff_builder_zip_blocked_entry')) {
    function onoff_builder_zip_blocked_entry($name)
    {
        $name = str_replace('\\', '/', (string) $name);
        $lower = strtolower($name);

        foreach (explode('/', $lower) as $part) {
            if ($part === '' || $part === '.' || $part === '..') {
                continue;
            }
            if (in_array($part, array('node_modules', '.git', 'vendor'), true)) {
                return true;
            }
        }

        $base = basename($lower);

        if (in_array($base, array('.htaccess', 'web.config', '.env'), true)) {
            return true;
        }
        if (preg_match('/\.php\d*$/i', $base)) {
            return true;
        }
        if (preg_match('/\.(phtml|phar|cgi|pl|asp|aspx|jsp)$/i', $base)) {
            return true;
        }

        return false;
    }
}

if (!function_exists('onoff_builder_extract_zip')) {
    function onoff_builder_extract_zip($zip_path, $dest_dir)
    {
        if (!class_exists('ZipArchive')) {
            return array('ok' => false, 'message' => 'PHP ZipArchive 확장이 필요합니다.');
        }

        $zip = new ZipArchive();
        if ($zip->open($zip_path) !== true) {
            return array('ok' => false, 'message' => 'ZIP 파일을 열 수 없습니다.');
        }

        $dest_real = realpath($dest_dir);
        if ($dest_real === false) {
            if (!onoff_builder_ensure_dir($dest_dir)) {
                $zip->close();
                return array('ok' => false, 'message' => '저장 폴더를 만들 수 없습니다.');
            }
            $dest_real = realpath($dest_dir);
        }
        if ($dest_real === false) {
            $zip->close();
            return array('ok' => false, 'message' => '저장 경로를 확인할 수 없습니다.');
        }

        $dest_real = rtrim($dest_real, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if ($name === false || $name === '') {
                continue;
            }

            $name = str_replace('\\', '/', $name);
            if (strpos($name, "\0") !== false) {
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP에 허용되지 않는 경로가 포함되어 있습니다.');
            }

            if (onoff_builder_zip_blocked_entry($name)) {
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP에 허용되지 않는 파일이 포함되어 있습니다. (' . basename($name) . ')');
            }

            if (strpos($name, '../') !== false || strpos($name, '/..') !== false || strpos($name, '..\\') !== false) {
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP에 허용되지 않는 경로가 포함되어 있습니다.');
            }

            $target = $dest_real . $name;
            $target_dir = realpath(dirname($target));
            if ($target_dir === false) {
                $parent = dirname($target);
                if (!onoff_builder_ensure_dir($parent)) {
                    $zip->close();
                    return array('ok' => false, 'message' => 'ZIP 압축 해제 중 폴더 생성에 실패했습니다.');
                }
                $target_dir = realpath($parent);
            }
            if ($target_dir === false || strpos($target_dir . DIRECTORY_SEPARATOR, $dest_real) !== 0) {
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP 경로가 안전하지 않습니다 (Zip Slip).');
            }

            if (substr($name, -1) === '/') {
                if (!is_dir($target) && !@mkdir($target, 0755, true)) {
                    $zip->close();
                    return array('ok' => false, 'message' => 'ZIP 압축 해제 중 폴더 생성에 실패했습니다.');
                }
                continue;
            }

            $stream = $zip->getStream($name);
            if ($stream === false) {
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP 파일 읽기에 실패했습니다.');
            }

            $dir = dirname($target);
            if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
                fclose($stream);
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP 압축 해제 중 폴더 생성에 실패했습니다.');
            }

            $out = @fopen($target, 'wb');
            if ($out === false) {
                fclose($stream);
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP 압축 해제 중 파일 저장에 실패했습니다.');
            }

            while (!feof($stream)) {
                $chunk = fread($stream, 8192);
                if ($chunk === false) {
                    break;
                }
                fwrite($out, $chunk);
            }
            fclose($stream);
            fclose($out);
        }

        $zip->close();

        return array('ok' => true, 'message' => '');
    }
}

if (!function_exists('onoff_builder_handle_zip_upload')) {
    function onoff_builder_handle_zip_upload($project_id, $project_name, $file, array $options = array())
    {
        $dist_only = !empty($options['dist_only']);
        if (!onoff_builder_validate_project_id($project_id)) {
            return array('ok' => false, 'message' => '프로젝트 ID는 영문 소문자, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있습니다.');
        }

        $project_id = onoff_builder_sanitize_project_id($project_id);
        $project_name = trim((string) $project_name);
        if ($project_name === '') {
            $project_name = $project_id;
        }

        if (!is_array($file) || empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return array('ok' => false, 'message' => 'ZIP 파일을 선택해주세요.');
        }

        if (!empty($file['error']) && (int) $file['error'] !== UPLOAD_ERR_OK) {
            return array('ok' => false, 'message' => '파일 업로드 중 오류가 발생했습니다.');
        }

        $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
        if ($ext !== 'zip') {
            return array('ok' => false, 'message' => 'ZIP 파일만 업로드할 수 있습니다.');
        }

        $replacing = onoff_builder_project_exists($project_id);

        $project_dir = onoff_builder_project_dir($project_id);
        if ($project_dir === '') {
            return array('ok' => false, 'message' => '프로젝트 경로를 확인할 수 없습니다.');
        }

        if (is_dir($project_dir)) {
            onoff_builder_remove_dir($project_dir);
        }
        if (!onoff_builder_ensure_dir($project_dir)) {
            return array('ok' => false, 'message' => '프로젝트 폴더를 만들 수 없습니다.');
        }

        $extract = onoff_builder_extract_zip($file['tmp_name'], $project_dir);
        if (!$extract['ok']) {
            onoff_builder_remove_dir($project_dir);
            return array('ok' => false, 'message' => $extract['message']);
        }

        if ($dist_only) {
            for ($i = 0; $i < 3; $i++) {
                if (!onoff_builder_unwrap_single_root_dir($project_dir)) {
                    break;
                }
            }
            $entry = onoff_builder_find_index_html($project_dir);
            if ($entry === '') {
                onoff_builder_remove_dir($project_dir);
                return array(
                    'ok'      => false,
                    'message' => 'index.html을 찾을 수 없습니다. npm run build 후 dist 폴더를 ZIP으로 업로드해 주세요.',
                );
            }

            return array(
                'ok'             => true,
                'message'        => '빌드 결과(dist)가 적용되었습니다. [배포하고 바로 적용]을 눌러 주세요.',
                'project_id'     => $project_id,
                'project_name'   => $project_name,
                'entry'          => $entry,
                'replaced'       => $replacing,
                'needs_build'    => false,
                'builder_source' => false,
            );
        }

        $prep = onoff_builder_normalize_uploaded_project($project_dir);
        if ($prep['status'] === 'invalid') {
            onoff_builder_remove_dir($project_dir);
            return array(
                'ok'      => false,
                'message' => 'index.html을 찾을 수 없습니다. 빌더 ZIP 또는 dist ZIP을 업로드해 주세요.',
            );
        }

        if ($prep['status'] === 'needs_build') {
            return array(
                'ok'             => true,
                'message'        => '빌더 원본이 저장되었습니다. [iCRM에서 빌드]를 실행하거나 dist ZIP을 별도로 업로드한 뒤 [배포하고 바로 적용]을 눌러 주세요.',
                'project_id'     => $project_id,
                'project_name'   => $project_name,
                'entry'          => '',
                'replaced'       => $replacing,
                'needs_build'    => true,
                'builder_source' => true,
            );
        }

        $message = $replacing
            ? '기존 프로젝트를 새 ZIP으로 교체했습니다. [배포하고 바로 적용]을 눌러 주세요.'
            : '업로드가 완료되었습니다. [배포하고 바로 적용]을 눌러 주세요.';
        if ($prep['entry'] !== 'index.html' && $prep['entry'] !== '') {
            $message = '빌더 ZIP에서 dist를 찾아 적용했습니다. [배포하고 바로 적용]을 눌러 주세요.';
        }

        return array(
            'ok'             => true,
            'message'        => $message,
            'project_id'     => $project_id,
            'project_name'   => $project_name,
            'entry'          => $prep['entry'],
            'replaced'       => $replacing,
            'needs_build'    => false,
            'builder_source' => !empty($prep['builder_source']),
        );
    }
}

if (!function_exists('onoff_builder_replace_project_from_zip')) {
    /**
     * dist ZIP으로 프로젝트 폴더 교체 (iCRM 빌드 결과 적용)
     *
     * @return array{ok:bool,message?:string,entry?:string}
     */
    function onoff_builder_replace_project_from_zip($project_id, $zip_path)
    {
        if (!onoff_builder_validate_project_id($project_id)) {
            return array('ok' => false, 'message' => '프로젝트 ID가 올바르지 않습니다.');
        }

        $project_id = onoff_builder_sanitize_project_id($project_id);
        $project_dir = onoff_builder_project_dir($project_id);
        if ($project_dir === '') {
            return array('ok' => false, 'message' => '프로젝트 경로를 확인할 수 없습니다.');
        }

        $temp = rtrim(sys_get_temp_dir(), '/\\') . '/onoff-builder-replace-'
            . $project_id . '-' . getmypid() . '-' . time();
        if (is_dir($temp)) {
            onoff_builder_remove_dir($temp);
        }
        if (!onoff_builder_ensure_dir($temp)) {
            return array('ok' => false, 'message' => '임시 폴더를 만들 수 없습니다.');
        }

        $extract = onoff_builder_extract_zip($zip_path, $temp);
        if (!$extract['ok']) {
            onoff_builder_remove_dir($temp);
            return array('ok' => false, 'message' => $extract['message']);
        }

        for ($i = 0; $i < 3; $i++) {
            if (!onoff_builder_unwrap_single_root_dir($temp)) {
                break;
            }
        }

        $entry = onoff_builder_find_index_html($temp);
        if ($entry === '') {
            onoff_builder_remove_dir($temp);
            return array('ok' => false, 'message' => '빌드 결과에 index.html이 없습니다.');
        }

        if (is_dir($project_dir)) {
            onoff_builder_remove_dir($project_dir);
        }

        $replaced = false;
        if (@rename($temp, $project_dir)) {
            $replaced = true;
        } else {
            if (!onoff_builder_ensure_dir($project_dir)) {
                onoff_builder_remove_dir($temp);
                return array('ok' => false, 'message' => '프로젝트 폴더를 만들 수 없습니다.');
            }
            if (!onoff_builder_move_dir_contents($temp, $project_dir)) {
                onoff_builder_remove_dir($temp);
                onoff_builder_remove_dir($project_dir);
                return array('ok' => false, 'message' => '프로젝트 폴더 교체에 실패했습니다. 서버 쓰기 권한을 확인해 주세요.');
            }
            onoff_builder_remove_dir($temp);
            $replaced = true;
        }

        if (!$replaced) {
            onoff_builder_remove_dir($temp);
            return array('ok' => false, 'message' => '프로젝트 폴더 교체에 실패했습니다.');
        }

        return array('ok' => true, 'entry' => $entry, 'message' => '빌드 결과가 적용되었습니다.');
    }
}

if (!function_exists('onoff_builder_zip_project_dir')) {
    /**
     * 프로젝트 imports 폴더를 dist ZIP으로 압축 (iCRM 배포용)
     *
     * @return array{ok:bool,message?:string,path?:string}
     */
    function onoff_builder_zip_project_dir($project_id)
    {
        if (!onoff_builder_validate_project_id($project_id)) {
            return array('ok' => false, 'message' => '프로젝트 ID가 올바르지 않습니다.');
        }
        if (!class_exists('ZipArchive')) {
            return array('ok' => false, 'message' => 'PHP ZipArchive 확장이 필요합니다.');
        }

        $dir = onoff_builder_project_dir($project_id);
        if ($dir === '' || !is_dir($dir)) {
            return array('ok' => false, 'message' => '프로젝트 폴더를 찾을 수 없습니다.');
        }

        $zipRoot = $dir;
        $import = onoff_builder_get_import($project_id);
        $entry = is_array($import) && !empty($import['entry']) ? (string) $import['entry'] : 'index.html';
        if ($entry !== '' && $entry !== 'index.html') {
            $entry_dir = dirname(str_replace('\\', '/', $entry));
            if ($entry_dir !== '' && $entry_dir !== '.') {
                $candidate = $dir . '/' . $entry_dir;
                if (is_dir($candidate)) {
                    $zipRoot = $candidate;
                }
            }
        }

        $zipPath = sys_get_temp_dir() . '/onoff-builder-' . onoff_builder_sanitize_project_id($project_id) . '-' . time() . '.zip';
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return array('ok' => false, 'message' => 'ZIP 파일을 만들 수 없습니다.');
        }

        $baseLen = strlen(rtrim(str_replace('\\', '/', $zipRoot), '/')) + 1;
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($zipRoot, FilesystemIterator::SKIP_DOTS)
        );

        foreach ($it as $file) {
            if (!$file->isFile()) {
                continue;
            }
            $full = str_replace('\\', '/', $file->getPathname());
            $rel = substr($full, $baseLen);
            if ($rel === '' || onoff_builder_zip_blocked_entry($rel)) {
                continue;
            }
            $zip->addFile($full, $rel);
        }

        $zip->close();

        if (!is_file($zipPath) || filesize($zipPath) === 0) {
            @unlink($zipPath);
            return array('ok' => false, 'message' => 'ZIP 생성에 실패했습니다.');
        }

        return array('ok' => true, 'path' => $zipPath);
    }
}
