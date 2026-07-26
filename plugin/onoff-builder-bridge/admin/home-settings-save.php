<?php
include_once(dirname(__DIR__) . '/_common.php');
include_once(dirname(__DIR__) . '/bootstrap.php');

onoff_builder_require_admin(defined('G5_ADMIN_URL') ? G5_ADMIN_URL : G5_URL);
onoff_builder_require_post();

$project_id = isset($_POST['home_builder_bridge_id']) ? $_POST['home_builder_bridge_id'] : '';

if ($project_id !== '' && (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id))) {
    onoff_builder_alert('프로젝트를 찾을 수 없습니다.', onoff_builder_admin_url('home-settings.php'));
}

if (!onoff_builder_set_home_bridge_id($project_id)) {
    onoff_builder_alert('_site.config.php 저장에 실패했습니다. 파일 권한을 확인하세요.', onoff_builder_admin_url('home-settings.php'));
}

$msg = $project_id === '' ? '홈 연결이 해제되었습니다.' : '홈(/) 연결이 저장되었습니다.';

if (function_exists('goto_url')) {
    goto_url(onoff_builder_admin_url('home-settings.php?msg=' . urlencode($msg)));
}

header('Location: ' . onoff_builder_admin_url('home-settings.php?msg=' . urlencode($msg)));
exit;
