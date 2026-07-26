<?php
include_once(dirname(__FILE__) . '/_common.php');
include_once(dirname(__FILE__) . '/bootstrap.php');

onoff_builder_require_admin(defined('G5_ADMIN_URL') ? G5_ADMIN_URL : G5_URL);

$release_id = isset($_GET['release_id']) ? preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $_GET['release_id']) : '';

if (!is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
    onoff_builder_alert('빌더 배포 모듈이 없습니다. 온오프빌더 업데이트를 적용하세요.', onoff_builder_admin_url('list.php'));
}

include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';

$result = icrm_builder_deploy_stage_preview_release($release_id);
if (empty($result['success']) || empty($result['page_url'])) {
    onoff_builder_alert(
        isset($result['message']) ? $result['message'] : '미리보기 준비에 실패했습니다.',
        function_exists('icrm_update_admin_url') ? icrm_update_admin_url() : onoff_builder_admin_url('list.php')
    );
}

header('Location: ' . $result['page_url']);
exit;
