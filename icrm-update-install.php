<?php
/**
 * 온오프빌더 업데이트 — 그누보드 사이트 1회 설치
 *
 * FTP로 이 파일 하나만 사이트 루트에 올린 뒤, 최고관리자로 브라우저에서 접속하세요.
 *   https://고객도메인/icrm-update-install.php
 */
include_once __DIR__ . '/common.php';

if ($is_admin !== 'super') {
    alert('최고관리자만 실행할 수 있습니다.', G5_URL);
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

$step = isset($_REQUEST['step']) ? (string) $_REQUEST['step'] : 'form';
$done = is_file(G5_LIB_PATH . '/icrm-update.lib.php')
    && is_file(G5_PLUGIN_PATH . '/icrm_update/admin/index.php');

function icrm_install_h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function icrm_install_config_path()
{
    return G5_DATA_PATH . '/icrm-update.config.php';
}

function icrm_install_common_config_path()
{
    return G5_DATA_PATH . '/onoff-builder.config.php';
}

function icrm_install_load_saved_config()
{
    $license = '';
    $api = '';

    $common_path = icrm_install_common_config_path();
    if (is_file($common_path)) {
        include_once $common_path;
        if (defined('ONOFF_BUILDER_LICENSE_KEY')) {
            $license = trim((string) ONOFF_BUILDER_LICENSE_KEY);
        }
        if (defined('ONOFF_BUILDER_G5_UPDATE_API_BASE_URL')) {
            $api = trim((string) ONOFF_BUILDER_G5_UPDATE_API_BASE_URL);
        }
    }

    $path = icrm_install_config_path();
    if (!is_file($path)) {
        return array('license_key' => $license, 'api_base_url' => $api);
    }
    include_once $path;
    if (defined('ICRM_UPDATE_LICENSE_KEY')) {
        $legacy_license = trim((string) ICRM_UPDATE_LICENSE_KEY);
        if ($license === '' && $legacy_license !== '') {
            $license = $legacy_license;
        }
    }
    if (defined('ICRM_UPDATE_API_BASE_URL')) {
        $legacy_api = trim((string) ICRM_UPDATE_API_BASE_URL);
        if ($api === '' && $legacy_api !== '') {
            $api = $legacy_api;
        }
    }

    return array('license_key' => $license, 'api_base_url' => $api);
}

function icrm_install_save_config($license_key, $api_base_url)
{
    $license_key = trim((string) $license_key);
    $api_base_url = rtrim(trim((string) $api_base_url), '/');
    $php = "<?php\nif (!defined('_GNUBOARD_')) exit;\n"
        . "define('ONOFF_BUILDER_LICENSE_KEY', " . var_export($license_key, true) . ");\n"
        . "define('ONOFF_BUILDER_G5_UPDATE_API_BASE_URL', " . var_export($api_base_url, true) . ");\n"
        . "define('ONOFF_BUILDER_DEPLOY_API_BASE_URL', 'https://icrm.co.kr/api/builder-deploy');\n"
        . "define('ONOFF_BUILDER_AUTO_COMMENT_API_BASE_URL', 'https://icrm.co.kr/api/auto-comment');\n"
        . "define('ONOFF_BUILDER_SEO_META_API_BASE_URL', 'https://icrm.co.kr/api/seo-meta');\n"
        . "define('ONOFF_BUILDER_POINT_API_BASE_URL', 'https://icrm.co.kr/api/site');\n"
        . "define('ONOFF_BUILDER_RANK_API_BASE_URL', 'https://icrm.co.kr/api/rank-check');\n"
        . "define('ONOFF_BUILDER_CONTENT_API_BASE_URL', 'https://icrm.co.kr/api/content-collector');\n"
        . "define('ONOFF_BUILDER_GEMINI_API_KEY', '');\n"
        . "define('ONOFF_BUILDER_GEMINI_MODEL', 'gemini-2.0-flash-lite');\n";

    return file_put_contents(icrm_install_common_config_path(), $php, LOCK_EX) !== false;
}

function icrm_install_read_seo_config_license()
{
    $path = G5_DATA_PATH . '/seo-meta.config.php';
    if (!is_file($path)) {
        return '';
    }
    include $path;
    if (defined('G5B_SEO_ICRM_LICENSE_KEY')) {
        return trim((string) G5B_SEO_ICRM_LICENSE_KEY);
    }

    return '';
}

function icrm_install_license_key()
{
    if (!empty($_POST['license_key'])) {
        return trim((string) $_POST['license_key']);
    }
    if (!empty($_GET['license_key'])) {
        return trim((string) $_GET['license_key']);
    }

    $saved = icrm_install_load_saved_config();
    if ($saved['license_key'] !== '') {
        return $saved['license_key'];
    }

    $seo = icrm_install_read_seo_config_license();
    if ($seo !== '') {
        return $seo;
    }

    if (function_exists('auto_comment_get_setting')) {
        $key = trim(auto_comment_get_setting('icrm_license_key', ''));
        if ($key !== '') {
            return $key;
        }
    }

    if (function_exists('g5site_cfg')) {
        return trim(g5site_cfg('icrm_license_key', ''));
    }

    return '';
}

function icrm_install_api_base()
{
    if (!empty($_POST['api_base_url'])) {
        return rtrim(trim((string) $_POST['api_base_url']), '/');
    }
    if (!empty($_GET['api_base_url'])) {
        return rtrim(trim((string) $_GET['api_base_url']), '/');
    }

    $saved = icrm_install_load_saved_config();
    if ($saved['api_base_url'] !== '') {
        return $saved['api_base_url'];
    }

    if (function_exists('g5site_cfg')) {
        $url = trim(g5site_cfg('icrm_update_api_base_url', ''));
        if ($url !== '') {
            return rtrim($url, '/');
        }
    }

    return 'https://icrm.co.kr/api/g5-update';
}

function icrm_install_domain()
{
    if (!empty($_SERVER['HTTP_HOST'])) {
        $host = strtolower(preg_replace('/[^a-zA-Z0-9.\-:]/', '', (string) $_SERVER['HTTP_HOST']));
        if ($host !== '') {
            return $host;
        }
    }

    if (defined('G5_URL') && G5_URL) {
        $host = parse_url(G5_URL, PHP_URL_HOST);
        if ($host) {
            return strtolower($host);
        }
    }

    return '';
}

function icrm_install_api_post($endpoint, array $payload, $api_base = null)
{
    $base = $api_base !== null ? rtrim($api_base, '/') : icrm_install_api_base();
    $url = $base . '/' . ltrim((string) $endpoint, '/');
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);

    $raw = false;
    $http_code = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => array('Content-Type: application/json', 'Accept: application/json'),
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_CONNECTTIMEOUT => 15,
        ));
        $raw = curl_exec($ch);
        $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_err = curl_error($ch);
        curl_close($ch);
        if ($raw === false) {
            return array(
                'success' => false,
                'message' => 'API 연결 실패: ' . $curl_err . ' (' . $url . ')',
            );
        }
    } else {
        $ctx = stream_context_create(array(
            'http' => array(
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\nAccept: application/json\r\n",
                'content' => $body,
                'timeout' => 120,
            ),
        ));
        $raw = @file_get_contents($url, false, $ctx);
        if ($raw === false) {
            return array(
                'success' => false,
                'message' => 'API 연결 실패. URL·서버 배포 상태를 확인하세요. (' . $url . ')',
            );
        }
    }

    $decoded = json_decode((string) $raw, true);
    if (!is_array($decoded)) {
        $preview = trim(substr(strip_tags((string) $raw), 0, 120));

        return array(
            'success'   => false,
            'message'   => 'API JSON 응답 아님 (HTTP ' . $http_code . '). iCRM에 g5-update API가 배포됐는지 확인하세요.',
            'http_code' => $http_code,
            'preview'   => $preview,
            'url'       => $url,
        );
    }
    if ($http_code > 0) {
        $decoded['http_code'] = $http_code;
    }

    return $decoded;
}

function icrm_install_bootstrap_files()
{
    return array(
        'lib/onoff-update.lib.php',
        'lib/icrm-update.lib.php',
        'lib/icrm-builder-deploy.lib.php',
        'lib/icrm-update-bootstrap.lib.php',
        'extend/icrm-update.extend.php',
        'extend/icrm.extend.php',
        'icrm/update-pull.php',
        'plugin/icrm_update/admin/index.php',
        'plugin/icrm_update/admin/_panel.php',
        'plugin/icrm_update/admin/action.php',
        'css/icrm-update-panel.css',
        'onoff-builder-install-check.php',
    );
}

function icrm_install_write_file($relative, $content)
{
    $relative = ltrim(str_replace('\\', '/', $relative), '/');
    $dest = G5_PATH . '/' . $relative;
    $dir = dirname($dest);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    return file_put_contents($dest, $content, LOCK_EX) !== false;
}

function icrm_install_test_api($license, $api_base)
{
    if ($license === '') {
        return array('ok' => false, 'message' => '라이선스 키를 입력하세요.');
    }

    $resp = icrm_install_api_post('manifest', array(
        'license_key' => $license,
        'domain'      => icrm_install_domain(),
        'bundle'      => 'icrm-full',
        'release_id'  => '',
    ), $api_base);

    if (!empty($resp['success'])) {
        return array(
            'ok'         => true,
            'message'    => '연결 OK — release ' . (isset($resp['release_id']) ? $resp['release_id'] : ''),
            'release_id' => isset($resp['release_id']) ? $resp['release_id'] : '',
        );
    }

    $msg = isset($resp['message']) ? (string) $resp['message'] : 'manifest 실패';
    if (!empty($resp['preview'])) {
        $msg .= ' [' . $resp['preview'] . ']';
    }

    return array('ok' => false, 'message' => $msg);
}

function icrm_install_run($license, $api_base)
{
    if ($license === '') {
        return array('success' => false, 'message' => '온오프빌더 라이선스 키를 입력하세요.');
    }

    icrm_install_save_config($license, $api_base);

    $test = icrm_install_test_api($license, $api_base);
    if (empty($test['ok'])) {
        return array('success' => false, 'message' => $test['message']);
    }

    $manifest = icrm_install_api_post('manifest', array(
        'license_key' => $license,
        'domain'      => icrm_install_domain(),
        'bundle'      => 'icrm-full',
        'release_id'  => '',
    ), $api_base);

    if (empty($manifest['success']) || empty($manifest['release_id'])) {
        return array(
            'success' => false,
            'message' => isset($manifest['message']) ? $manifest['message'] : '온오프빌더 업데이트 manifest 조회 실패',
        );
    }

    $release_id = (string) $manifest['release_id'];
    $installed = array();

    foreach (icrm_install_bootstrap_files() as $relative) {
        $resp = icrm_install_api_post('file', array(
            'license_key' => $license,
            'domain'      => icrm_install_domain(),
            'release_id'  => $release_id,
            'path'        => $relative,
        ), $api_base);
        if (empty($resp['success']) || empty($resp['content_base64'])) {
            return array('success' => false, 'message' => '다운로드 실패: ' . $relative);
        }
        $content = base64_decode((string) $resp['content_base64'], true);
        if ($content === false || !icrm_install_write_file($relative, $content)) {
            return array('success' => false, 'message' => '저장 실패: ' . $relative);
        }
        $installed[] = $relative;
    }

    if (is_file(G5_LIB_PATH . '/onoff-update.lib.php')) {
        include_once G5_LIB_PATH . '/onoff-update.lib.php';
    }
    if (is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
        include_once G5_LIB_PATH . '/icrm-update.lib.php';
    }

    $pull_msg = '';
    if (function_exists('icrm_update_pull')) {
        $pull = icrm_update_pull(false);
        if (!empty($pull['success'])) {
            $pull_msg = isset($pull['message']) ? (string) $pull['message'] : '';
        }
    }

    return array(
        'success'    => true,
        'message'    => '설치 완료',
        'release_id' => $release_id,
        'installed'  => $installed,
        'pull_msg'   => $pull_msg,
        'admin_url'  => G5_PLUGIN_URL . '/icrm_update/admin/index.php',
    );
}

$saved = icrm_install_load_saved_config();
$form_license = icrm_install_license_key();
$form_api = icrm_install_api_base();

$result = null;
$test_result = null;

if ($step === 'test') {
    $test_result = icrm_install_test_api(
        icrm_install_license_key(),
        icrm_install_api_base()
    );
    $step = 'form';
}

if ($step === 'run') {
    $result = icrm_install_run(icrm_install_license_key(), icrm_install_api_base());
}
?>
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>온오프빌더 업데이트 1회 설치</title>
<style>
body{margin:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Malgun Gothic',sans-serif;color:#0f172a}
.box{max-width:600px;margin:32px auto;background:#fff;border:1px solid #d7dee8;border-radius:10px;padding:24px}
h1{margin:0 0 8px;font-size:20px}
.sub{color:#64748b;font-size:13px;margin:0 0 16px;line-height:1.5}
label{display:block;font-size:13px;font-weight:600;margin:12px 0 4px}
input[type=text],input[type=password]{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box}
.btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border:0;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;margin-right:8px;margin-top:12px}
.btn--ghost{background:#fff;color:#334155;border:1px solid #cbd5e1}
.ok{background:#ecfdf5;border:1px solid #6ee7b7;padding:12px;border-radius:8px;margin:12px 0}
.err{background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:8px;margin:12px 0}
.info{background:#eff6ff;border:1px solid #bfdbfe;padding:12px;border-radius:8px;margin:12px 0;font-size:13px;line-height:1.6}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px}
</style>
</head>
<body>
<div class="box">
    <h1>온오프빌더 업데이트 1회 설치</h1>
    <p class="sub">FTP 설치 직후 업데이트·디자인 배포·복구 기능을 연결합니다. 이후 기능 추가는 온오프빌더 업데이트로 진행됩니다.</p>

    <?php if ($done && $step !== 'run') { ?>
        <div class="ok">이미 설치되어 있습니다.</div>
        <p><a class="btn" href="<?php echo icrm_install_h(G5_PLUGIN_URL . '/icrm_update/admin/index.php'); ?>">온오프빌더 업데이트 화면</a></p>
    <?php } elseif ($step === 'run' && is_array($result)) { ?>
        <?php if (!empty($result['success'])) { ?>
            <div class="ok">
                <strong>설치 완료</strong><br>
                release <code><?php echo icrm_install_h($result['release_id']); ?></code>
                <?php if (!empty($result['pull_msg'])) { ?><br><?php echo icrm_install_h($result['pull_msg']); ?><?php } ?>
            </div>
            <p>관리자 → <strong>환경설정 → 온오프빌더 업데이트</strong> 메뉴가 생겼습니다.</p>
            <a class="btn" href="<?php echo icrm_install_h($result['admin_url']); ?>">온오프빌더 업데이트 화면</a>
            <a class="btn btn--ghost" href="<?php echo icrm_install_h(G5_URL . '/onoff-builder-install-check.php'); ?>">설치 점검</a>
            <p class="sub">보안을 위해 <code>icrm-update-install.php</code> 파일을 삭제하세요.</p>
        <?php } else { ?>
            <div class="err"><?php echo icrm_install_h($result['message']); ?></div>
            <a class="btn" href="?">다시 시도</a>
        <?php } ?>
    <?php } else { ?>
        <div class="info">
            <strong>참고</strong><br>
            • <code>https://icrm.co.kr/api/g5-update</code> 는 <strong>브라우저 페이지가 아닙니다</strong> (POST API).<br>
            • 중앙 온오프빌더 업데이트 서버에 최신 릴리스 파일이 배포되어 있어야 합니다.<br>
            • 라이선스 키는 해당 도메인(<code><?php echo icrm_install_h(icrm_install_domain()); ?></code>)용으로 발급받으세요.
        </div>

        <?php if (is_array($test_result)) { ?>
            <div class="<?php echo !empty($test_result['ok']) ? 'ok' : 'err'; ?>">
                <?php echo icrm_install_h($test_result['message']); ?>
            </div>
        <?php } ?>

        <form method="post" action="?step=run">
            <label for="license_key">온오프빌더 라이선스 키 *</label>
            <input type="password" name="license_key" id="license_key" value="<?php echo icrm_install_h($form_license); ?>" placeholder="도메인용 라이선스 키 입력" autocomplete="off">

            <label for="api_base_url">온오프빌더 업데이트 API URL</label>
            <input type="text" name="api_base_url" id="api_base_url" value="<?php echo icrm_install_h($form_api); ?>">

            <button type="submit" class="btn">지금 설치하기</button>
        </form>

        <form method="post" action="?step=test">
            <input type="hidden" name="license_key" value="<?php echo icrm_install_h($form_license); ?>">
            <input type="hidden" name="api_base_url" value="<?php echo icrm_install_h($form_api); ?>">
            <button type="submit" class="btn btn--ghost">API 연결만 테스트</button>
        </form>
    <?php } ?>
</div>
</body>
</html>
