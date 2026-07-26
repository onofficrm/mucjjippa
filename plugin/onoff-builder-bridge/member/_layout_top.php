<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

$obb_member_title = isset($obb_member_title) ? $obb_member_title : '홈페이지 디자인 배포';
$obb_member_lead = isset($obb_member_lead) ? $obb_member_lead : '';
?>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo onoff_builder_escape($obb_member_title); ?> — onoff-builder</title>
<link rel="stylesheet" href="<?php echo onoff_builder_escape(ONOFF_BUILDER_ASSETS_URL . '/css/admin.css'); ?>">
<link rel="stylesheet" href="<?php echo onoff_builder_escape(ONOFF_BUILDER_ASSETS_URL . '/css/member.css'); ?>">
</head>
<body class="onoff-builder-admin onoff-builder-member">
<header class="onoff-builder-admin__header">
  <div class="onoff-builder-admin__inner">
    <p class="onoff-builder-admin__brand">
      <a href="<?php echo onoff_builder_escape(onoff_builder_member_url()); ?>">홈페이지 디자인</a>
      <span class="onoff-builder-admin__brand-sub">일반회원 셀프 배포</span>
    </p>
    <nav class="onoff-builder-admin__topnav" aria-label="회원 메뉴">
      <a href="<?php echo onoff_builder_escape(defined('G5_URL') ? G5_URL : '/'); ?>">사이트 홈</a>
      <a class="<?php echo basename($_SERVER['SCRIPT_NAME']) === 'index.php' ? 'is-active' : ''; ?>" href="<?php echo onoff_builder_escape(onoff_builder_member_url()); ?>">배포하기</a>
      <?php if (defined('G5_BBS_URL')) { ?>
      <a href="<?php echo onoff_builder_escape(G5_BBS_URL . '/logout.php'); ?>">로그아웃</a>
      <?php } ?>
    </nav>
  </div>
</header>
<main class="onoff-builder-admin__main">
  <div class="onoff-builder-admin__inner">
