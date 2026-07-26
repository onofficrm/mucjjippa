<?php
if (!defined('ICRM_MEMBER_ACTIVE')) {
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
<link rel="stylesheet" href="<?php echo icrm_member_h(G5_URL . '/css/icrm-update-panel.css'); ?>">
<?php include G5_PLUGIN_PATH . '/icrm_update/admin/_panel.php'; ?>
