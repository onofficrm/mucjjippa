<?php
/**
 * iCRM builder-deploy — ZIP → 사이트 릴리스 패키징 (CLI · publish API 공용)
 */
if (!function_exists('onoff_g5_builder_deploy_pack_remove_dir')) {
    function onoff_g5_builder_deploy_pack_remove_dir($dir)
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                onoff_g5_builder_deploy_pack_remove_dir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }
}

if (!function_exists('onoff_g5_builder_deploy_pack_sanitize_project_id')) {
    function onoff_g5_builder_deploy_pack_sanitize_project_id($id)
    {
        $id = strtolower(trim((string) $id));
        $id = preg_replace('/[^a-z0-9_-]/', '', $id);
        $id = preg_replace('/^-+/', '', $id);

        return substr($id, 0, 50);
    }
}

if (!function_exists('onoff_g5_builder_deploy_pack_blocked_entry')) {
    function onoff_g5_builder_deploy_pack_blocked_entry($name)
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
        if (preg_match('/\.(phtml|phar|cgi|pl|asp|aspx|jsp|exe|sh)$/i', $base)) {
            return true;
        }

        return false;
    }
}

if (!function_exists('onoff_g5_builder_deploy_pack_extract_zip')) {
    function onoff_g5_builder_deploy_pack_extract_zip($zip_path, $dest_dir)
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
            if (!@mkdir($dest_dir, 0755, true)) {
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
            if (onoff_g5_builder_deploy_pack_blocked_entry($name)) {
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP에 허용되지 않는 파일이 포함되어 있습니다. (' . basename($name) . ')');
            }
            if (strpos($name, '../') !== false || strpos($name, '/..') !== false) {
                $zip->close();
                return array('ok' => false, 'message' => 'ZIP에 허용되지 않는 경로가 포함되어 있습니다.');
            }

            $target = $dest_real . $name;
            $target_dir = realpath(dirname($target));
            if ($target_dir === false) {
                $parent = dirname($target);
                if (!@mkdir($parent, 0755, true)) {
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

if (!function_exists('onoff_g5_builder_deploy_pack_find_index_html')) {
    function onoff_g5_builder_deploy_pack_find_index_html($root)
    {
        $root = rtrim(str_replace('\\', '/', (string) $root), '/');
        if ($root === '' || !is_dir($root)) {
            return '';
        }

        $candidates = array();
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($it as $file) {
            if (!$file->isFile()) {
                continue;
            }
            if (strtolower($file->getFilename()) !== 'index.html') {
                continue;
            }
            $full = str_replace('\\', '/', $file->getPathname());
            $rel = ltrim(substr($full, strlen($root)), '/');
            $candidates[] = $rel;
        }

        foreach ($candidates as $rel) {
            if ($rel === 'index.html') {
                return $rel;
            }
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

if (!function_exists('onoff_g5_builder_deploy_pack_is_vite_source')) {
    function onoff_g5_builder_deploy_pack_is_vite_source($root)
    {
        $markers = array('vite.config.ts', 'vite.config.js', 'package.json');
        foreach ($markers as $name) {
            if (is_file(rtrim($root, '/') . '/' . $name)) {
                if ($name === 'package.json' && !onoff_g5_builder_deploy_pack_find_index_html($root)) {
                    return true;
                }
                if ($name !== 'package.json') {
                    return true;
                }
            }
        }
        foreach (array('src/App.tsx', 'src/App.jsx', 'src/main.tsx') as $rel) {
            if (is_file(rtrim($root, '/') . '/' . $rel)) {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('onoff_g5_builder_deploy_pack_copy_tree')) {
    function onoff_g5_builder_deploy_pack_copy_tree($src, $dst, $prefix, array &$filesIndex, array &$relPaths)
    {
        if (!is_dir($src)) {
            return;
        }
        if (!is_dir($dst) && !@mkdir($dst, 0755, true)) {
            throw new RuntimeException('Cannot create directory: ' . $dst);
        }

        foreach (scandir($src) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $from = $src . '/' . $item;
            $to = $dst . '/' . $item;
            if (is_dir($from)) {
                onoff_g5_builder_deploy_pack_copy_tree($from, $to, $prefix . $item . '/', $filesIndex, $relPaths);
                continue;
            }

            $relative = $prefix . $item;
            $destRelative = 'plugin/onoff-builder-bridge/imports/' . $relative;
            $content = file_get_contents($from);
            if ($content === false) {
                throw new RuntimeException('Cannot read: ' . $from);
            }
            $dir = dirname($to);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            if (file_put_contents($to, $content, LOCK_EX) === false) {
                throw new RuntimeException('Cannot write: ' . $to);
            }

            $filesIndex[$destRelative] = array(
                'sha256' => hash('sha256', $content),
                'size'   => strlen($content),
            );
            $relPaths[] = $destRelative;
        }
    }
}

if (!function_exists('onoff_g5_builder_deploy_make_release_id')) {
    function onoff_g5_builder_deploy_make_release_id($release_id = '')
    {
        $release_id = preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $release_id);
        if ($release_id !== '') {
            return $release_id;
        }

        return 'builder-' . date('Y.m.d') . '.' . str_pad((string) (time() % 1000), 3, '0', STR_PAD_LEFT);
    }
}

if (!function_exists('onoff_g5_builder_deploy_publish_from_dir')) {
    function onoff_g5_builder_deploy_publish_from_dir($domain, $projectId, $projectName, $sourceRoot, $entry, $releaseId = '')
    {
        if (!function_exists('onoff_g5_builder_deploy_sanitize_domain')) {
            return array('success' => false, 'message' => 'builder-deploy module unavailable');
        }

        $domain = onoff_g5_builder_deploy_sanitize_domain($domain);
        $projectId = onoff_g5_builder_deploy_pack_sanitize_project_id($projectId);
        $projectName = trim((string) $projectName);
        if ($projectName === '') {
            $projectName = $projectId;
        }
        if ($domain === '' || $projectId === '' || !preg_match('/^[a-z0-9][a-z0-9_-]*$/', $projectId)) {
            return array('success' => false, 'message' => 'domain 또는 project_id 가 올바르지 않습니다.');
        }
        if ($sourceRoot === '' || !is_dir($sourceRoot)) {
            return array('success' => false, 'message' => '소스 폴더를 찾을 수 없습니다.');
        }
        if ($entry === '') {
            return array('success' => false, 'message' => 'index.html 을 찾을 수 없습니다.');
        }

        $releaseId = onoff_g5_builder_deploy_make_release_id($releaseId);
        $packageId = 'builder-page-' . $projectId;
        $filesIndex = array();
        $relPaths = array();

        $releaseRoot = onoff_g5_builder_deploy_release_root($domain, $releaseId);
        $filesRoot = $releaseRoot . '/files';
        if ($releaseRoot === '') {
            return array('success' => false, 'message' => '릴리스 경로를 만들 수 없습니다.');
        }
        if (is_dir($releaseRoot)) {
            onoff_g5_builder_deploy_pack_remove_dir($releaseRoot);
        }
        if (!@mkdir($filesRoot, 0755, true)) {
            return array('success' => false, 'message' => '릴리스 폴더 생성 실패');
        }

        $importDest = $filesRoot . '/plugin/onoff-builder-bridge/imports/' . $projectId;
        try {
            onoff_g5_builder_deploy_pack_copy_tree($sourceRoot, $importDest, $projectId . '/', $filesIndex, $relPaths);
        } catch (RuntimeException $e) {
            onoff_g5_builder_deploy_pack_remove_dir($releaseRoot);
            return array('success' => false, 'message' => $e->getMessage());
        }

        if ($relPaths === array()) {
            onoff_g5_builder_deploy_pack_remove_dir($releaseRoot);
            return array('success' => false, 'message' => '배포할 파일이 없습니다.');
        }

        $releasedAt = date('c');
        $manifest = array(
            'release_id'    => $releaseId,
            'type'          => 'builder-page',
            'site_domain'   => $domain,
            'project_id'    => $projectId,
            'project_name'  => $projectName,
            'project_entry' => basename($entry),
            'released_at'   => $releasedAt,
            'packages'      => array(
                $packageId => array(
                    'id'          => $packageId,
                    'version'     => preg_replace('/^builder-/', '', $releaseId),
                    'title'       => $projectName . ' 빌더 페이지',
                    'description' => '빌더 dist ZIP 배포',
                    'depends'     => array(),
                    'files'       => $relPaths,
                    'patches'     => array(),
                    'config_keys' => array(),
                ),
            ),
            'bundles' => array(
                'builder-deploy' => array(
                    'id'          => 'builder-deploy',
                    'title'       => '빌더 디자인 배포',
                    'description' => '사이트별 빌더 페이지',
                    'packages'    => array($packageId),
                ),
            ),
            'files' => $filesIndex,
        );

        if (file_put_contents(
            $releaseRoot . '/manifest.json',
            json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            LOCK_EX
        ) === false) {
            onoff_g5_builder_deploy_pack_remove_dir($releaseRoot);
            return array('success' => false, 'message' => 'manifest 저장 실패');
        }

        $siteRoot = onoff_g5_builder_deploy_site_root($domain);
        if ($siteRoot !== '' && !is_dir($siteRoot)) {
            @mkdir($siteRoot, 0755, true);
        }
        file_put_contents(
            onoff_g5_builder_deploy_current_pointer_path($domain),
            json_encode(array(
                'release_id'   => $releaseId,
                'released_at'  => $releasedAt,
                'project_id'   => $projectId,
                'project_name' => $projectName,
            ), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            LOCK_EX
        );

        return array(
            'success'      => true,
            'message'      => '빌더 디자인 릴리스가 등록되었습니다.',
            'release_id'   => $releaseId,
            'domain'       => $domain,
            'project_id'   => $projectId,
            'project_name' => $projectName,
            'file_count'   => count($relPaths),
        );
    }
}

if (!function_exists('onoff_g5_builder_deploy_publish_from_zip')) {
    function onoff_g5_builder_deploy_publish_from_zip($domain, $projectId, $projectName, $zipPath, $releaseId = '')
    {
        if (!is_file($zipPath)) {
            return array('success' => false, 'message' => 'ZIP 파일을 찾을 수 없습니다.');
        }

        $maxBytes = 50 * 1024 * 1024;
        $size = filesize($zipPath);
        if ($size !== false && $size > $maxBytes) {
            return array('success' => false, 'message' => 'ZIP 파일이 너무 큽니다. (최대 50MB)');
        }

        $tempRoot = sys_get_temp_dir() . '/builder-deploy-pack-' . getmypid() . '-' . time();
        if (!@mkdir($tempRoot, 0755, true)) {
            return array('success' => false, 'message' => '임시 폴더 생성 실패');
        }

        $extractDir = $tempRoot . '/extract';
        @mkdir($extractDir, 0755, true);

        $extract = onoff_g5_builder_deploy_pack_extract_zip($zipPath, $extractDir);
        if (empty($extract['ok'])) {
            onoff_g5_builder_deploy_pack_remove_dir($tempRoot);
            return array('success' => false, 'message' => $extract['message'] ?? 'ZIP 추출 실패');
        }

        for ($i = 0; $i < 3; $i++) {
            if (!onoff_g5_builder_deploy_pack_unwrap_single_root($extractDir)) {
                break;
            }
        }

        $isViteSource = onoff_g5_builder_deploy_pack_is_vite_source($extractDir);
        $entry = onoff_g5_builder_deploy_pack_find_index_html($extractDir);
        if ($isViteSource) {
            if (is_file($extractDir . '/dist/index.html')) {
                $entry = 'dist/index.html';
            } else {
                @set_time_limit(600);
                $build = onoff_g5_builder_deploy_build_source_from_zip($zipPath);
                onoff_g5_builder_deploy_pack_remove_dir($tempRoot);
                if (empty($build['success']) || empty($build['zip_base64'])) {
                    return array(
                        'success' => false,
                        'message' => isset($build['message']) ? (string) $build['message'] : 'Vite 원본 빌드에 실패했습니다.',
                    );
                }
                $distRaw = base64_decode((string) $build['zip_base64'], true);
                if ($distRaw === false || $distRaw === '') {
                    return array('success' => false, 'message' => '빌드 결과 ZIP을 읽을 수 없습니다.');
                }
                $distZip = sys_get_temp_dir() . '/builder-deploy-dist-' . getmypid() . '-' . time() . '.zip';
                if (file_put_contents($distZip, $distRaw, LOCK_EX) === false) {
                    return array('success' => false, 'message' => '빌드 결과 저장 실패');
                }
                $result = onoff_g5_builder_deploy_publish_from_zip($domain, $projectId, $projectName, $distZip, $releaseId);
                @unlink($distZip);

                return $result;
            }
        }

        if (onoff_g5_builder_deploy_pack_is_vite_source($extractDir) && $entry === '') {
            onoff_g5_builder_deploy_pack_remove_dir($tempRoot);
            return array('success' => false, 'message' => 'dist ZIP만 업로드할 수 있습니다. npm run build 후 dist 폴더를 압축해 주세요.');
        }

        if ($entry === '') {
            onoff_g5_builder_deploy_pack_remove_dir($tempRoot);
            return array('success' => false, 'message' => 'index.html 을 찾을 수 없습니다.');
        }

        $sourceRoot = $extractDir;
        $entryDir = dirname($entry);
        if ($entryDir !== '' && $entryDir !== '.') {
            $sourceRoot = $extractDir . '/' . $entryDir;
        }

        $result = onoff_g5_builder_deploy_publish_from_dir(
            $domain,
            $projectId,
            $projectName,
            $sourceRoot,
            $entry,
            $releaseId
        );

        onoff_g5_builder_deploy_pack_remove_dir($tempRoot);

        return $result;
    }
}

if (!function_exists('onoff_g5_builder_deploy_pack_unwrap_single_root')) {
    function onoff_g5_builder_deploy_pack_unwrap_single_root($root)
    {
        $root = rtrim(str_replace('\\', '/', (string) $root), '/');
        if ($root === '' || !is_dir($root)) {
            return false;
        }

        $items = array();
        foreach (@scandir($root) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $items[] = $item;
        }
        if (count($items) !== 1) {
            return false;
        }

        $only = $items[0];
        $subdir = $root . '/' . $only;
        if (!is_dir($subdir)) {
            return false;
        }

        foreach (@scandir($subdir) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $src = $subdir . '/' . $item;
            $dst = $root . '/' . $item;
            if (is_dir($src)) {
                onoff_g5_builder_deploy_pack_copy_tree_simple($src, $dst);
                onoff_g5_builder_deploy_pack_remove_dir($src);
            } else {
                if (is_file($dst)) {
                    @unlink($dst);
                }
                @rename($src, $dst);
            }
        }
        @rmdir($subdir);

        return true;
    }
}

if (!function_exists('onoff_g5_builder_deploy_pack_copy_tree_simple')) {
    function onoff_g5_builder_deploy_pack_copy_tree_simple($src, $dst)
    {
        if (!is_dir($src)) {
            return;
        }
        if (!is_dir($dst) && !@mkdir($dst, 0755, true)) {
            return;
        }
        foreach (@scandir($src) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $from = $src . '/' . $item;
            $to = $dst . '/' . $item;
            if (is_dir($from)) {
                onoff_g5_builder_deploy_pack_copy_tree_simple($from, $to);
            } else {
                @copy($from, $to);
            }
        }
    }
}

if (!function_exists('onoff_g5_builder_deploy_pack_zip_dir')) {
    function onoff_g5_builder_deploy_pack_zip_dir($sourceDir)
    {
        if (!class_exists('ZipArchive')) {
            return array('ok' => false, 'message' => 'PHP ZipArchive 확장이 필요합니다.');
        }
        if (!is_dir($sourceDir)) {
            return array('ok' => false, 'message' => '압축할 폴더를 찾을 수 없습니다.');
        }

        $zipPath = sys_get_temp_dir() . '/builder-deploy-dist-' . getmypid() . '-' . time() . '.zip';
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return array('ok' => false, 'message' => 'ZIP 파일을 만들 수 없습니다.');
        }

        $baseLen = strlen(rtrim(str_replace('\\', '/', $sourceDir), '/')) + 1;
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourceDir, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($it as $file) {
            if (!$file->isFile()) {
                continue;
            }
            $full = str_replace('\\', '/', $file->getPathname());
            $rel = substr($full, $baseLen);
            if ($rel === '' || onoff_g5_builder_deploy_pack_blocked_entry($rel)) {
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

if (!function_exists('onoff_g5_builder_deploy_pack_run_npm_build')) {
    function onoff_g5_builder_deploy_pack_run_npm_build($sourceDir)
    {
        $sourceDir = rtrim(str_replace('\\', '/', (string) $sourceDir), '/');
        if ($sourceDir === '' || !is_file($sourceDir . '/package.json')) {
            return array('ok' => false, 'message' => 'package.json을 찾을 수 없습니다.');
        }

        $npm = '';
        foreach (array('npm', '/usr/local/bin/npm', '/opt/homebrew/bin/npm') as $candidate) {
            if ($candidate === 'npm') {
                $npm = trim((string) @shell_exec('command -v npm 2>/dev/null'));
                if ($npm !== '') {
                    break;
                }
                continue;
            }
            if (is_executable($candidate)) {
                $npm = $candidate;
                break;
            }
        }
        if ($npm === '') {
            return array('ok' => false, 'message' => 'iCRM 서버에 npm이 설치되어 있지 않습니다.');
        }

        $npmCache = $sourceDir . '/.npm-cache';
        if (!is_dir($npmCache)) {
            @mkdir($npmCache, 0755, true);
        }

        $cwd = 'cd ' . escapeshellarg($sourceDir) . ' && ';
        $env = 'HOME=' . escapeshellarg($sourceDir)
            . ' npm_config_cache=' . escapeshellarg($npmCache)
            . ' npm_config_production=false NODE_ENV=development'
            . ' PATH=' . escapeshellarg($sourceDir . '/node_modules/.bin') . ':$PATH ';
        $installCmd = $cwd . $env . escapeshellarg($npm) . ' install --include=dev --production=false --no-audit --no-fund 2>&1';
        $buildCmd = $cwd . $env . escapeshellarg($npm) . ' run build 2>&1';

        $installOut = array();
        $installCode = 0;
        exec($installCmd, $installOut, $installCode);
        if ($installCode !== 0) {
            return array(
                'ok'      => false,
                'message' => 'npm install 실패: ' . trim(implode("\n", array_slice($installOut, -6))),
            );
        }

        $buildOut = array();
        $buildCode = 0;
        exec($buildCmd, $buildOut, $buildCode);
        if ($buildCode !== 0) {
            return array(
                'ok'      => false,
                'message' => 'npm run build 실패: ' . trim(implode("\n", array_slice($buildOut, -8))),
            );
        }

        $distDir = $sourceDir . '/dist';
        if (!is_file($distDir . '/index.html')) {
            return array('ok' => false, 'message' => '빌드 후 dist/index.html을 찾을 수 없습니다.');
        }

        return array('ok' => true, 'dist_dir' => $distDir);
    }
}

if (!function_exists('onoff_g5_builder_deploy_build_source_from_zip')) {
    function onoff_g5_builder_deploy_build_source_from_zip($zipPath)
    {
        if (!is_file($zipPath)) {
            return array('success' => false, 'message' => 'ZIP 파일을 찾을 수 없습니다.');
        }

        $maxBytes = 50 * 1024 * 1024;
        $size = filesize($zipPath);
        if ($size !== false && $size > $maxBytes) {
            return array('success' => false, 'message' => 'ZIP 파일이 너무 큽니다. (최대 50MB)');
        }

        $tempRoot = sys_get_temp_dir() . '/builder-deploy-build-' . getmypid() . '-' . time();
        if (!@mkdir($tempRoot, 0755, true)) {
            return array('success' => false, 'message' => '임시 폴더 생성 실패');
        }

        $extractDir = $tempRoot . '/extract';
        @mkdir($extractDir, 0755, true);
        $extract = onoff_g5_builder_deploy_pack_extract_zip($zipPath, $extractDir);
        if (empty($extract['ok'])) {
            onoff_g5_builder_deploy_pack_remove_dir($tempRoot);
            return array('success' => false, 'message' => $extract['message'] ?? 'ZIP 추출 실패');
        }

        for ($i = 0; $i < 3; $i++) {
            if (!onoff_g5_builder_deploy_pack_unwrap_single_root($extractDir)) {
                break;
            }
        }

        $isViteSource = onoff_g5_builder_deploy_pack_is_vite_source($extractDir);
        $entry = onoff_g5_builder_deploy_pack_find_index_html($extractDir);
        $distDir = '';

        if ($isViteSource && !is_file($extractDir . '/dist/index.html')) {
            @set_time_limit(600);
            $build = onoff_g5_builder_deploy_pack_run_npm_build($extractDir);
            if (empty($build['ok'])) {
                onoff_g5_builder_deploy_pack_remove_dir($tempRoot);
                return array('success' => false, 'message' => $build['message'] ?? '빌드 실패');
            }
            $distDir = $build['dist_dir'];
        } elseif ($isViteSource && is_file($extractDir . '/dist/index.html')) {
            $distDir = $extractDir . '/dist';
        } elseif ($entry !== '') {
            $entryDir = dirname($entry);
            $distDir = ($entryDir === '' || $entryDir === '.') ? $extractDir : ($extractDir . '/' . $entryDir);
        } else {
            onoff_g5_builder_deploy_pack_remove_dir($tempRoot);
            return array('success' => false, 'message' => '빌드할 Vite 프로젝트 또는 dist를 찾을 수 없습니다.');
        }

        $zipResult = onoff_g5_builder_deploy_pack_zip_dir($distDir);
        onoff_g5_builder_deploy_pack_remove_dir($tempRoot);
        if (empty($zipResult['ok']) || empty($zipResult['path'])) {
            return array('success' => false, 'message' => $zipResult['message'] ?? 'dist ZIP 생성 실패');
        }

        $distZipPath = $zipResult['path'];
        $raw = file_get_contents($distZipPath);
        @unlink($distZipPath);
        if ($raw === false || $raw === '') {
            return array('success' => false, 'message' => 'dist ZIP 읽기 실패');
        }

        return array(
            'success'   => true,
            'message'   => '빌드가 완료되었습니다.',
            'zip_base64'=> base64_encode($raw),
        );
    }
}
