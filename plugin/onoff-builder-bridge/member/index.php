<?php
include_once(dirname(__DIR__) . '/../../common.php');
include_once(dirname(__DIR__) . '/bootstrap.php');

onoff_builder_require_deploy_user();

if (function_exists('icrm_member_enabled') && icrm_member_enabled() && is_file(G5_PLUGIN_PATH . '/icrm_member/index.php')) {
    if (function_exists('goto_url')) {
        goto_url(G5_PLUGIN_URL . '/icrm_member/index.php?m=design');
    }
    header('Location: ' . G5_PLUGIN_URL . '/icrm_member/index.php?m=design');
    exit;
}

$obb_member_title = '홈페이지 디자인 배포';
$obb_member_lead = '빌더에서 만든 dist ZIP을 올리고, 버튼 한 번으로 사이트에 반영합니다.';

include __DIR__ . '/_layout_top.php';
include __DIR__ . '/_panel_design.php';
include __DIR__ . '/_layout_bottom.php';
