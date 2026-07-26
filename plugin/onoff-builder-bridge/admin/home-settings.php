<?php
include_once(dirname(__DIR__) . '/_common.php');
include_once(dirname(__DIR__) . '/bootstrap.php');

onoff_builder_require_admin(defined('G5_ADMIN_URL') ? G5_ADMIN_URL : G5_URL);

$projects = onoff_builder_get_imports();
$current = onoff_builder_get_home_bridge_id();
$msg = isset($_GET['msg']) ? trim(strip_tags($_GET['msg'])) : '';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>홈(/) 연결 설정 — onoff-builder-bridge</title>
<link rel="stylesheet" href="<?php echo onoff_builder_escape(ONOFF_BUILDER_ASSETS_URL . '/css/admin.css'); ?>">
</head>
<body class="onoff-builder-admin">
<header class="onoff-builder-admin__header">
  <div class="onoff-builder-admin__inner">
    <p class="onoff-builder-admin__brand">
      <a href="<?php echo onoff_builder_escape(onoff_builder_admin_url()); ?>">onoff-builder-bridge</a>
    </p>
    <nav class="onoff-builder-admin__topnav" aria-label="관리 메뉴">
      <a href="<?php echo onoff_builder_escape(onoff_builder_admin_url()); ?>">홈</a>
      <a href="<?php echo onoff_builder_escape(onoff_builder_admin_url('list.php')); ?>">목록</a>
      <a class="is-active" href="<?php echo onoff_builder_escape(onoff_builder_admin_url('home-settings.php')); ?>">홈 연결</a>
    </nav>
  </div>
</header>
<main class="onoff-builder-admin__main">
  <div class="onoff-builder-admin__inner">
    <div class="onoff-builder-admin__page-head">
      <h1>홈(/) 연결</h1>
      <p class="onoff-builder-admin__lead">사이트 루트 <code>/</code> 접속 시 선택한 빌더 페이지를 표시합니다. 게시판·관리자 URL은 그대로 유지됩니다.</p>
    </div>

    <?php if ($msg !== '') { ?>
    <p class="onoff-builder-admin__notice"><?php echo onoff_builder_escape($msg); ?></p>
    <?php } ?>

    <form class="onoff-builder-admin__form" method="post" action="<?php echo onoff_builder_escape(onoff_builder_admin_url('home-settings-save.php')); ?>">
      <div class="onoff-builder-admin__field">
        <label for="home_builder_bridge_id">홈에 표시할 프로젝트</label>
        <select name="home_builder_bridge_id" id="home_builder_bridge_id">
          <option value="">(연결 안 함 — 기존 index.php 섹션)</option>
          <?php foreach ($projects as $p) {
              $pid = isset($p['id']) ? $p['id'] : '';
              if ($pid === '' || $pid === 'preview-tmp') {
                  continue;
              }
              $label = isset($p['name']) ? $p['name'] : $pid;
              ?>
          <option value="<?php echo onoff_builder_escape($pid); ?>" <?php echo $current === $pid ? 'selected' : ''; ?>><?php echo onoff_builder_escape($label); ?> (<?php echo onoff_builder_escape($pid); ?>)</option>
          <?php } ?>
        </select>
        <p class="hint">모바일·테마 사용 사이트는 기존 홈이 우선 적용될 수 있습니다.</p>
      </div>
      <div class="onoff-builder-admin__form-actions">
        <button type="submit" class="onoff-builder-admin__btn onoff-builder-admin__btn--primary">저장</button>
        <a class="onoff-builder-admin__btn" href="<?php echo onoff_builder_escape(onoff_builder_admin_url('list.php')); ?>">목록</a>
      </div>
    </form>
  </div>
</main>
</body>
</html>
