<?php
require_once dirname(__DIR__) . '/../../common.php';
require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

if (!onoff_builder_is_deploy_user()) {
    echo json_encode(array('ok' => false, 'error' => '로그인이 필요하거나 배포 권한이 없습니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

if (is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';
}

$action = isset($_REQUEST['action']) ? preg_replace('/[^a-z_]/', '', $_REQUEST['action']) : '';

if ($action === 'builder_status') {
    if (!function_exists('icrm_builder_deploy_check_status')) {
        echo json_encode(array('ok' => false, 'error' => '빌더 배포 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(array('ok' => true, 'status' => icrm_builder_deploy_check_status()), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'publish_apply') {
    if (!function_exists('icrm_builder_deploy_publish_and_apply')) {
        echo json_encode(array('ok' => false, 'error' => '빌더 배포 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $project_id = isset($_POST['project_id']) ? $_POST['project_id'] : '';
    if (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id)) {
        echo json_encode(array('ok' => false, 'error' => '프로젝트를 찾을 수 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $import = onoff_builder_get_import($project_id);
    $project_name = is_array($import) && !empty($import['name']) ? (string) $import['name'] : $project_id;
    $result = icrm_builder_deploy_publish_and_apply($project_id, $project_name);

    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? (isset($result['message']) ? $result['message'] : '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'builder_source_build') {
    if (!function_exists('icrm_builder_deploy_build_source_project')) {
        echo json_encode(array('ok' => false, 'error' => '빌더 빌드 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $project_id = isset($_POST['project_id']) ? $_POST['project_id'] : '';
    if (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id)) {
        echo json_encode(array('ok' => false, 'error' => '프로젝트를 찾을 수 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = icrm_builder_deploy_build_source_project($project_id);
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? (isset($result['message']) ? $result['message'] : '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'builder_pull') {
    if (!function_exists('icrm_builder_deploy_pull')) {
        echo json_encode(array('ok' => false, 'error' => '빌더 배포 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    $dry = !empty($_POST['dry_run']);
    $result = icrm_builder_deploy_pull($dry);
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? (isset($result['message']) ? $result['message'] : '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'builder_rollback') {
    if (!function_exists('icrm_builder_deploy_rollback')) {
        echo json_encode(array('ok' => false, 'error' => '빌더 배포 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    $release_id = isset($_POST['release_id']) ? preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $_POST['release_id']) : '';
    $result = icrm_builder_deploy_rollback($release_id);
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? (isset($result['message']) ? $result['message'] : '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'builder_reset') {
    if (!function_exists('icrm_builder_deploy_reset')) {
        echo json_encode(array('ok' => false, 'error' => '빌더 초기화 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    $result = icrm_builder_deploy_reset();
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? (isset($result['message']) ? $result['message'] : '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(array('ok' => false, 'error' => 'unknown action'), JSON_UNESCAPED_UNICODE);
