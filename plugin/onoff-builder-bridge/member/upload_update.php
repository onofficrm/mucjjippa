<?php
include_once(dirname(__DIR__) . '/../../common.php');
include_once(dirname(__DIR__) . '/bootstrap.php');

onoff_builder_require_deploy_user();
onoff_builder_require_post();

$project_id = isset($_POST['project_id']) ? $_POST['project_id'] : '';
$project_name = isset($_POST['project_name']) ? trim(strip_tags($_POST['project_name'])) : '';

if ($project_name === '') {
    onoff_builder_member_portal_redirect('프로젝트 이름을 입력하세요.');
}

if (!isset($_FILES['zip_file'])) {
    onoff_builder_member_portal_redirect('ZIP 파일을 선택하세요.');
}

$result = onoff_builder_handle_zip_upload(
    $project_id,
    $project_name,
    $_FILES['zip_file'],
    array('dist_only' => !empty($_POST['dist_only']))
);

if (empty($result['ok'])) {
    onoff_builder_member_portal_redirect(
        isset($result['message']) ? $result['message'] : '가져오기에 실패했습니다.'
    );
}

$id = $result['project_id'];
$entry = isset($result['entry']) ? $result['entry'] : 'index.html';

if (!onoff_builder_add_import(array(
    'id'             => $id,
    'name'           => $result['project_name'],
    'path'           => $id,
    'entry'          => $entry,
    'needs_build'    => !empty($result['needs_build']),
    'builder_source' => !empty($result['builder_source']),
))) {
    onoff_builder_remove_dir(onoff_builder_project_dir($id));
    onoff_builder_member_portal_redirect('프로젝트 정보 저장에 실패했습니다.');
}

if (function_exists('onoff_builder_sync_import_build_flags')) {
    onoff_builder_sync_import_build_flags($id);
}

$msg = isset($result['message']) ? $result['message'] : '업로드가 완료되었습니다. 아래 [배포하고 바로 적용]을 눌러 주세요.';
if (empty($_POST['skip_auto_publish'])) {
    @set_time_limit(600);
    @ini_set('memory_limit', '256M');

    if (is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
        include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';
    }

    if (function_exists('icrm_builder_deploy_publish_and_apply')) {
        $deploy = icrm_builder_deploy_publish_and_apply($id, $result['project_name']);

        if (!empty($deploy['success'])) {
            $msg = isset($deploy['message']) ? (string) $deploy['message'] : '디자인 배포 및 적용이 완료되었습니다.';
        } else {
            $detail = isset($deploy['message']) ? (string) $deploy['message'] : '원인을 확인할 수 없습니다.';
            $msg .= ' 자동 배포 실패: ' . $detail;
        }
    } else {
        $msg .= ' 자동 배포 실패: 배포 모듈을 찾을 수 없습니다.';
    }
}

onoff_builder_member_portal_redirect($msg);
