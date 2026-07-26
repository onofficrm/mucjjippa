<?php
/**
 * 온오프빌더 설치 점검
 *
 * FTP 초기 설치 후 브라우저에서 접속:
 *   https://도메인/onoff-builder-install-check.php
 */
include_once __DIR__ . '/common.php';

if ($is_admin !== 'super') {
    alert('최고관리자만 실행할 수 있습니다.', G5_URL);
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

$required_files = array(
    '업데이트 라이브러리' => 'lib/icrm-update.lib.php',
    '업데이트 적용 라이브러리' => 'lib/onoff-update.lib.php',
    '업데이트 복구 라이브러리' => 'lib/icrm-update-bootstrap.lib.php',
    '업데이트 관리자' => 'plugin/icrm_update/admin/index.php',
    '업데이트 패널' => 'plugin/icrm_update/admin/_panel.php',
    '업데이트 CSS' => 'css/icrm-update-panel.css',
    '공통 API 설정 라이브러리' => 'lib/onoff-builder-config.lib.php',
    '공통 API 설정 샘플' => 'data/onoff-builder.config.sample.php',
    '빌더 배포 라이브러리' => 'lib/icrm-builder-deploy.lib.php',
    '빌더 플러그인' => 'plugin/onoff-builder-bridge/bootstrap.php',
    '회원 포털' => 'plugin/icrm_member/index.php',
    '기본 UI CSS' => 'css/onoff-platform.css',
    'RSS' => 'rss.php',
    'Sitemap' => 'sitemap.php',
    'Robots' => 'robots.php',
);

$writable_paths = array(
    'data' => G5_DATA_PATH,
    'cache' => G5_DATA_PATH . '/cache',
    'builder data' => G5_PLUGIN_PATH . '/onoff-builder-bridge/data',
);

function obi_h($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function obi_ok_badge($ok)
{
    return $ok ? '<span class="ok">정상</span>' : '<span class="bad">확인 필요</span>';
}

function obi_site_domain()
{
    if (!empty($_SERVER['HTTP_HOST'])) {
        return strtolower(preg_replace('/[^a-zA-Z0-9.\-:]/', '', (string) $_SERVER['HTTP_HOST']));
    }
    if (defined('G5_URL') && G5_URL) {
        $host = parse_url(G5_URL, PHP_URL_HOST);
        return $host ? strtolower($host) : '';
    }
    return '';
}

function obi_license_key()
{
    if (function_exists('onoff_builder_config_license_key')) {
        $key = onoff_builder_config_license_key();
        if ($key !== '') {
            return $key;
        }
    }

    if (is_file(G5_DATA_PATH . '/icrm-update.config.php')) {
        include_once G5_DATA_PATH . '/icrm-update.config.php';
        if (defined('ICRM_UPDATE_LICENSE_KEY') && trim((string) ICRM_UPDATE_LICENSE_KEY) !== '') {
            return trim((string) ICRM_UPDATE_LICENSE_KEY);
        }
    }
    if (function_exists('g5site_cfg')) {
        $key = trim(g5site_cfg('icrm_license_key', ''));
        if ($key !== '') {
            return $key;
        }
    }
    return '';
}

function obi_api_base()
{
    if (function_exists('onoff_builder_config_api_base_url')) {
        $url = onoff_builder_config_api_base_url('g5_update_api_base_url', '');
        if ($url !== '') {
            return $url;
        }
    }

    if (is_file(G5_DATA_PATH . '/icrm-update.config.php')) {
        include_once G5_DATA_PATH . '/icrm-update.config.php';
        if (defined('ICRM_UPDATE_API_BASE_URL') && trim((string) ICRM_UPDATE_API_BASE_URL) !== '') {
            return rtrim(trim((string) ICRM_UPDATE_API_BASE_URL), '/');
        }
    }
    if (function_exists('g5site_cfg')) {
        $url = trim(g5site_cfg('icrm_update_api_base_url', ''));
        if ($url !== '') {
            return rtrim($url, '/');
        }
    }
    return 'https://icrm.co.kr/api/g5-update';
}

function obi_api_post($endpoint, array $payload)
{
    $url = obi_api_base() . '/' . ltrim((string) $endpoint, '/');
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => array('Content-Type: application/json', 'Accept: application/json'),
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 8,
        ));
        $raw = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($raw === false) {
            return array('success' => false, 'message' => 'API 연결 실패: ' . $err);
        }
    } else {
        $ctx = stream_context_create(array('http' => array(
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'content' => $body,
            'timeout' => 20,
        )));
        $raw = @file_get_contents($url, false, $ctx);
        if ($raw === false) {
            return array('success' => false, 'message' => 'API 연결 실패');
        }
    }
    $decoded = json_decode((string) $raw, true);
    return is_array($decoded) ? $decoded : array('success' => false, 'message' => 'API 응답이 JSON이 아닙니다.');
}

$license = obi_license_key();
$api_result = null;
if ($license !== '') {
    $api_result = obi_api_post('manifest', array(
        'license_key' => $license,
        'domain' => obi_site_domain(),
        'bundle' => 'icrm-full',
        'release_id' => '',
    ));
}
?>
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>온오프빌더 설치 점검</title>
<style>
body{margin:0;background:#eef2f7;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Malgun Gothic',sans-serif;font-size:14px;line-height:1.55}
.wrap{max-width:880px;margin:32px auto;padding:0 16px 48px}
.head{margin-bottom:18px}.head h1{margin:0 0 6px;font-size:24px}.head p{margin:0;color:#64748b}
.card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:22px;margin:14px 0;box-shadow:0 14px 40px rgba(15,23,42,.06)}
.card h2{margin:0 0 14px;font-size:17px}
.row{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid #eef2f7}.row:first-of-type{border-top:0}
.label{font-weight:700}.path{color:#64748b;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
.ok,.bad,.muted{display:inline-flex;align-items:center;border-radius:999px;padding:4px 10px;font-weight:800;font-size:12px}
.ok{background:#ecfdf5;color:#047857}.bad{background:#fef2f2;color:#b91c1c}.muted{background:#f1f5f9;color:#475569}
.hint{margin:12px 0 0;color:#64748b}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 14px;border-radius:10px;background:#071d34;color:#fff;text-decoration:none;font-weight:800}.btn.ghost{background:#fff;color:#071d34;border:1px solid #dbe3ef}
</style>
</head>
<body>
<div class="wrap">
    <div class="head">
        <h1>온오프빌더 설치 점검</h1>
        <p>FTP 초기 설치 후 업데이트 연결, 필수 파일, 쓰기 권한을 확인합니다.</p>
    </div>

    <div class="card">
        <h2>기본 정보</h2>
        <div class="row"><span class="label">도메인</span><span><?php echo obi_h(obi_site_domain()); ?></span></div>
        <div class="row"><span class="label">PHP</span><span><?php echo obi_h(PHP_VERSION); ?></span></div>
        <div class="row"><span class="label">라이선스</span><span><?php echo obi_ok_badge($license !== ''); ?></span></div>
        <div class="row"><span class="label">업데이트 API</span><span class="path"><?php echo obi_h(obi_api_base()); ?></span></div>
    </div>

    <div class="card">
        <h2>필수 파일</h2>
        <?php foreach ($required_files as $label => $relative) {
            $ok = is_file(G5_PATH . '/' . $relative);
            ?>
        <div class="row">
            <span><span class="label"><?php echo obi_h($label); ?></span><br><span class="path"><?php echo obi_h($relative); ?></span></span>
            <span><?php echo obi_ok_badge($ok); ?></span>
        </div>
        <?php } ?>
    </div>

    <div class="card">
        <h2>쓰기 권한</h2>
        <?php foreach ($writable_paths as $label => $path) {
            $exists = is_dir($path);
            $ok = $exists && is_writable($path);
            ?>
        <div class="row">
            <span><span class="label"><?php echo obi_h($label); ?></span><br><span class="path"><?php echo obi_h($path); ?></span></span>
            <span><?php echo $exists ? obi_ok_badge($ok) : '<span class="muted">폴더 없음</span>'; ?></span>
        </div>
        <?php } ?>
        <p class="hint">`builder data` 폴더는 디자인 배포 기능을 적용한 후 생성될 수 있습니다.</p>
    </div>

    <div class="card">
        <h2>업데이트 서버 연결</h2>
        <?php if ($license === '') { ?>
            <p class="hint">라이선스 키가 아직 저장되지 않았습니다. 먼저 <code>icrm-update-install.php</code>에서 라이선스를 저장하세요.</p>
        <?php } elseif (!empty($api_result['success'])) { ?>
            <div class="row"><span class="label">상태</span><span class="ok">연결됨</span></div>
            <div class="row"><span class="label">최신 릴리스</span><span class="path"><?php echo obi_h(isset($api_result['release_id']) ? $api_result['release_id'] : ''); ?></span></div>
        <?php } else { ?>
            <div class="row"><span class="label">상태</span><span class="bad">연결 실패</span></div>
            <p class="hint"><?php echo obi_h(isset($api_result['message']) ? $api_result['message'] : '응답 없음'); ?></p>
        <?php } ?>
        <div class="actions">
            <a class="btn" href="<?php echo obi_h(G5_PLUGIN_URL . '/icrm_update/admin/index.php'); ?>">온오프빌더 업데이트</a>
            <a class="btn ghost" href="<?php echo obi_h(G5_ADMIN_URL); ?>">관리자 홈</a>
        </div>
    </div>
</div>
</body>
</html>
