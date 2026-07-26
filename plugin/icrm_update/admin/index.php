<?php
define('G5_IS_ADMIN', true);
require_once __DIR__ . '/../../../common.php';

if ($is_admin !== 'super') {
    alert('최고관리자만 접근 가능합니다.', G5_URL);
}

if (is_file(G5_LIB_PATH . '/icrm-member.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-member.lib.php';
}
if (function_exists('icrm_member_enabled') && icrm_member_enabled() && function_exists('icrm_member_url')) {
    goto_url(icrm_member_url('update'));
    exit;
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}
if (is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
    include_once G5_LIB_PATH . '/seo-meta.lib.php';
}

if (!is_file(G5_LIB_PATH . '/icrm-update.lib.php') && is_file(G5_LIB_PATH . '/icrm-update-bootstrap.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-update-bootstrap.lib.php';
    icrm_update_bootstrap_install();
}

if (is_file(G5_LIB_PATH . '/onoff-update.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-update.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-update.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';
}

$admin_url = G5_PLUGIN_URL . '/icrm_update/admin/index.php';
$action_url = G5_PLUGIN_URL . '/icrm_update/admin/action.php';
$status = function_exists('icrm_update_check_status') ? icrm_update_check_status() : array(
    'ready' => false,
    'message' => '업데이트 모듈이 없습니다. 온오프빌더 라이선스 설정 후 새로고침하세요.',
);
$builder_status = function_exists('icrm_builder_deploy_check_status') ? icrm_builder_deploy_check_status() : array(
    'ready' => false,
    'message' => '빌더 배포 모듈이 없습니다.',
);
?>
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>온오프빌더 업데이트</title>
<link rel="stylesheet" href="<?php echo htmlspecialchars(G5_URL . '/css/icrm-update-panel.css', ENT_QUOTES, 'UTF-8'); ?>">
<style>
body{margin:0;background:#eef2f7;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Malgun Gothic',sans-serif;font-size:14px;line-height:1.5}
.icu-top{background:#1e293b;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.icu-top h1{margin:0;font-size:18px;font-weight:600}
.icu-top a{color:#cbd5e1;text-decoration:none;font-size:13px}
.icu-wrap{max-width:720px;margin:24px auto;padding:0 16px 40px}
</style>
</head>
<body>
<header class="icu-top">
    <h1>온오프빌더 업데이트</h1>
    <a href="<?php echo htmlspecialchars(G5_ADMIN_URL, ENT_QUOTES, 'UTF-8'); ?>">← 관리자 홈</a>
</header>
<div class="icu-wrap">
<?php
$panel_file = __DIR__ . '/_panel.php';
if (is_file($panel_file)) {
    include $panel_file;
} else {
    ?>
    <div class="icrm-update-panel">
        <div class="icu-card">
            <h2>업데이트 패널 파일이 없습니다</h2>
            <p class="icu-hint">기능 업데이트 파일 일부가 누락되었습니다. 아래 버튼으로 온오프빌더 업데이트를 다시 실행해 복구하세요.</p>
            <?php if (!empty($status['message'])) { ?>
            <p class="icu-hint" style="margin-top:12px;color:#b45309"><?php echo htmlspecialchars((string) $status['message'], ENT_QUOTES, 'UTF-8'); ?></p>
            <?php } ?>
            <div class="icu-actions">
                <button type="button" class="icu-btn icu-btn--primary" id="icu-repair">온오프빌더 업데이트 복구</button>
            </div>
            <div class="icu-msg" id="icu-msg"></div>
            <pre class="icu-log" id="icu-log"></pre>
        </div>
    </div>
    <script>
    (function () {
        var btn = document.getElementById('icu-repair');
        var msg = document.getElementById('icu-msg');
        var log = document.getElementById('icu-log');
        if (!btn) return;
        btn.addEventListener('click', function () {
            btn.disabled = true;
            if (msg) {
                msg.textContent = '업데이트 파일을 다시 적용하는 중입니다...';
                msg.className = 'icu-msg on';
            }
            fetch(<?php echo json_encode($action_url, JSON_UNESCAPED_UNICODE); ?>, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'action=pull'
            }).then(function (r) {
                return r.json();
            }).then(function (data) {
                if (log) log.textContent = JSON.stringify(data, null, 2);
                if (data.ok) {
                    if (msg) {
                        msg.textContent = '복구가 완료되었습니다. 새로고침합니다.';
                        msg.className = 'icu-msg on icu-msg--ok';
                    }
                    setTimeout(function () { location.reload(); }, 700);
                } else {
                    if (msg) {
                        msg.textContent = data.error || (data.result && data.result.message) || '복구 실패';
                        msg.className = 'icu-msg on icu-msg--err';
                    }
                    btn.disabled = false;
                }
            }).catch(function () {
                if (msg) {
                    msg.textContent = '네트워크 오류';
                    msg.className = 'icu-msg on icu-msg--err';
                }
                btn.disabled = false;
            });
        });
    })();
    </script>
    <?php
}
?>
</div>
</body>
</html>
