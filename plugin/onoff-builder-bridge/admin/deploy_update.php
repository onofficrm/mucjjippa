<?php
include_once(dirname(__DIR__) . '/_common.php');
include_once(dirname(__DIR__) . '/bootstrap.php');

onoff_builder_require_admin(defined('G5_ADMIN_URL') ? G5_ADMIN_URL : G5_URL);
onoff_builder_require_post();

$project_id = isset($_POST['project_id']) ? $_POST['project_id'] : '';
$project_name = isset($_POST['project_name']) ? trim(strip_tags($_POST['project_name'])) : '';

if (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id)) {
    onoff_builder_alert('프로젝트를 찾을 수 없습니다.', onoff_builder_admin_url('list.php'));
}

if (!is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
    onoff_builder_alert(
        '빌더 배포 모듈이 없습니다. 온오프빌더 업데이트를 먼저 적용하세요.',
        onoff_builder_admin_url('deploy.php?project_id=' . urlencode($project_id))
    );
}

include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';

$result = icrm_builder_deploy_publish_project($project_id, $project_name);

if (empty($result['success'])) {
    onoff_builder_alert(
        isset($result['message']) ? $result['message'] : '배포 등록에 실패했습니다.',
        onoff_builder_admin_url('deploy.php?project_id=' . urlencode($project_id))
    );
}

$release = isset($result['release_id']) ? (string) $result['release_id'] : '';
$msg = 'iCRM 배포 등록 완료';
if ($release !== '') {
    $msg .= ' (릴리스: ' . $release . ')';
}
$msg .= '. 사이트 관리자가 온오프빌더 업데이트 → 빌더 디자인 적용을 실행하세요.';

if (function_exists('goto_url')) {
    goto_url(onoff_builder_admin_url('list.php?msg=' . urlencode($msg)));
}

header('Location: ' . onoff_builder_admin_url('list.php?msg=' . urlencode($msg)));
exit;
