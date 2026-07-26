<?php
include_once(dirname(__DIR__) . '/_common.php');
include_once(dirname(__DIR__) . '/bootstrap.php');

onoff_builder_require_admin(defined('G5_ADMIN_URL') ? G5_ADMIN_URL : G5_URL);

$project_id = isset($_GET['project_id']) ? $_GET['project_id'] : '';
if (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id)) {
    onoff_builder_alert('프로젝트를 찾을 수 없습니다.', onoff_builder_admin_url('list.php'));
}

$project_id = onoff_builder_sanitize_project_id($project_id);
$import = onoff_builder_get_import($project_id);
$project_name = is_array($import) && !empty($import['name']) ? $import['name'] : $project_id;

$license_ok = false;
$domain = '';
$deploy_ready = false;
$deploy_message = '';
$remote_release = '';
$update_available = false;
$apply_admin_url = defined('G5_PLUGIN_URL') ? G5_PLUGIN_URL . '/icrm_update/admin/index.php' : '';

if (is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-update.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';
}

if (function_exists('icrm_builder_deploy_get_license_key')) {
    $license_ok = icrm_builder_deploy_get_license_key() !== '';
}
if (function_exists('icrm_builder_deploy_site_domain')) {
    $domain = icrm_builder_deploy_site_domain();
}
if (function_exists('icrm_update_admin_url')) {
    $apply_admin_url = icrm_update_admin_url();
}

if ($license_ok && function_exists('icrm_builder_deploy_check_status')) {
    $st = icrm_builder_deploy_check_status();
    $deploy_ready = !empty($st['ready']) || !empty($st['license_ok']);
    $deploy_message = isset($st['message']) ? (string) $st['message'] : '';
    $remote_release = isset($st['remote_release']) ? (string) $st['remote_release'] : '';
    $update_available = !empty($st['update_available']);
} elseif (!$license_ok) {
    $deploy_message = '온오프빌더 라이선스를 먼저 설정하세요.';
} else {
    $deploy_message = '빌더 배포 모듈이 없습니다. 온오프빌더 업데이트를 적용하세요.';
}

$page_url = onoff_builder_page_url($project_id);

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>그누보드에 배포 — <?php echo onoff_builder_escape($project_name); ?></title>
<link rel="stylesheet" href="<?php echo onoff_builder_escape(ONOFF_BUILDER_ASSETS_URL . '/css/admin.css'); ?>">
</head>
<body class="onoff-builder-admin">
<header class="onoff-builder-admin__header">
  <div class="onoff-builder-admin__inner">
    <p class="onoff-builder-admin__brand">
      <a href="<?php echo onoff_builder_escape(onoff_builder_admin_url()); ?>">onoff-builder-bridge</a>
      <span class="onoff-builder-admin__brand-sub">온오프빌더 중앙 배포</span>
    </p>
    <nav class="onoff-builder-admin__topnav" aria-label="관리 메뉴">
      <a href="<?php echo onoff_builder_escape(onoff_builder_admin_url()); ?>">홈</a>
      <a href="<?php echo onoff_builder_escape(onoff_builder_admin_url('upload.php')); ?>">업로드</a>
      <a href="<?php echo onoff_builder_escape(onoff_builder_admin_url('list.php')); ?>">목록</a>
    </nav>
  </div>
</header>
<main class="onoff-builder-admin__main">
  <div class="onoff-builder-admin__inner">
    <div class="onoff-builder-admin__page-head">
      <h1>그누보드에 배포</h1>
      <p class="onoff-builder-admin__lead">프로젝트 <strong><?php echo onoff_builder_escape($project_name); ?></strong> (<code><?php echo onoff_builder_escape($project_id); ?></code>)를 온오프빌더에 등록합니다. 사이트 관리자가 <strong>온오프빌더 업데이트 → 빌더 디자인 적용</strong>으로 반영합니다.</p>
    </div>

    <div class="onoff-builder-admin__help">
      <p><strong>배포 흐름</strong></p>
      <ol style="margin:0;padding-left:1.25rem">
        <li>아래 [온오프빌더에 배포 등록] — 중앙 서버에 릴리스 생성</li>
        <li>사이트 관리자 → <a href="<?php echo onoff_builder_escape($apply_admin_url); ?>">온오프빌더 업데이트</a> → 빌더 디자인 적용</li>
        <li>적용 후 <a href="<?php echo onoff_builder_escape($page_url); ?>" target="_blank" rel="noopener">미리보기 URL</a>에서 확인</li>
      </ol>
    </div>

    <div class="onoff-builder-admin__form" style="margin-top:1rem">
      <div class="onoff-builder-admin__field">
        <label>배포 대상 사이트</label>
        <input type="text" value="<?php echo onoff_builder_escape($domain ?: '(도메인 확인 불가)'); ?>" readonly>
        <p class="hint">라이선스에 등록된 도메인으로 배포됩니다.</p>
      </div>
      <div class="onoff-builder-admin__field">
        <label>프로젝트 ID</label>
        <input type="text" value="<?php echo onoff_builder_escape($project_id); ?>" readonly>
      </div>
      <?php if ($remote_release !== '') { ?>
      <div class="onoff-builder-admin__field">
        <label>온오프빌더 등록된 최신 릴리스</label>
        <input type="text" value="<?php echo onoff_builder_escape($remote_release); ?>" readonly>
        <?php if ($update_available) { ?>
        <p class="hint">사이트에 아직 적용되지 않은 디자인이 있습니다.</p>
        <?php } ?>
      </div>
      <?php } ?>
      <?php if ($deploy_message !== '' && (!$license_ok || !$deploy_ready)) { ?>
      <p class="onoff-builder-admin__alert"><?php echo onoff_builder_escape($deploy_message); ?></p>
      <?php } ?>
      <form method="post" action="<?php echo onoff_builder_escape(onoff_builder_admin_url('deploy_update.php')); ?>" class="onoff-builder-admin__form-actions">
        <input type="hidden" name="project_id" value="<?php echo onoff_builder_escape($project_id); ?>">
        <input type="hidden" name="project_name" value="<?php echo onoff_builder_escape($project_name); ?>">
        <button type="submit" class="onoff-builder-admin__btn onoff-builder-admin__btn--primary" <?php echo ($license_ok && function_exists('icrm_builder_deploy_publish_project')) ? '' : 'disabled'; ?>>온오프빌더에 배포 등록</button>
        <a class="onoff-builder-admin__btn" href="<?php echo onoff_builder_escape(onoff_builder_admin_url('list.php')); ?>">목록</a>
        <?php if ($apply_admin_url !== '') { ?>
        <a class="onoff-builder-admin__btn" href="<?php echo onoff_builder_escape($apply_admin_url); ?>">온오프빌더 업데이트</a>
        <?php } ?>
      </form>
    </div>
  </div>
</main>
<script src="<?php echo onoff_builder_escape(ONOFF_BUILDER_ASSETS_URL . '/js/admin.js'); ?>"></script>
</body>
</html>
