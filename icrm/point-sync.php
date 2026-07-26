<?php
/**
 * iCRM → 그누보드 회원 포인트 동기화 API
 *
 * POST JSON { "point_balance": 500000, "mb_id": "admin", "reason": "월 충전" }
 * mb_id 생략 시 admin_mb_id 또는 cf_admin 사용
 * 인증: X-ICRM-Token 또는 ?token= (final-url.php 와 동일)
 */
define('_GNUBOARD_', true);

require_once dirname(__DIR__) . '/common.php';

if (!is_file(G5_LIB_PATH . '/icrm.lib.php')) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode(array('ok' => false, 'error' => 'icrm_not_installed'), JSON_UNESCAPED_UNICODE);
    exit;
}

include_once G5_LIB_PATH . '/icrm.lib.php';

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

if (!function_exists('icrm_check_auth') || !icrm_check_auth()) {
    icrm_json_response(array(
        'ok'      => false,
        'error'   => 'unauthorized',
        'message' => 'iCRM 인증 실패. secret token 또는 허용 IP를 확인하세요.',
    ), 403);
}

$raw = file_get_contents('php://input');
$json = json_decode((string) $raw, true);
if (!is_array($json)) {
    $json = $_POST;
}

$point_balance = null;
if (isset($json['point_balance'])) {
    $point_balance = (int) $json['point_balance'];
} elseif (isset($_GET['point_balance'])) {
    $point_balance = (int) $_GET['point_balance'];
}

if ($point_balance === null) {
    icrm_json_response(array(
        'ok'      => false,
        'error'   => 'invalid_payload',
        'message' => 'point_balance 값이 필요합니다.',
    ), 400);
}

$mb_id = '';
if (isset($json['mb_id'])) {
    $mb_id = trim((string) $json['mb_id']);
} elseif (isset($json['admin_mb_id'])) {
    $mb_id = trim((string) $json['admin_mb_id']);
}
if ($mb_id === '' && function_exists('icrm_point_get_admin_mb_id')) {
    $mb_id = icrm_point_get_admin_mb_id();
}

$reason = isset($json['reason']) ? trim((string) $json['reason']) : 'iCRM 포인트 충전';
if ($reason === '') {
    $reason = 'iCRM 포인트 충전';
}

if (!function_exists('icrm_point_sync_to_balance')) {
    icrm_json_response(array(
        'ok'      => false,
        'error'   => 'point_module_missing',
        'message' => 'icrm-point.lib.php 가 없습니다.',
    ), 503);
}

$check = icrm_point_require_config($mb_id);
if (!$check['ok']) {
    icrm_json_response(array(
        'ok'      => false,
        'error'   => 'gnuboard_point_disabled',
        'message' => $check['error'],
    ), 503);
}

$mb_id = $check['mb_id'];
$before = icrm_point_get_balance($mb_id);
$synced = icrm_point_sync_to_balance($point_balance, $reason, $mb_id);
$after = icrm_point_get_balance($mb_id);

icrm_json_response(array(
    'ok'             => $synced,
    'mb_id'          => $mb_id,
    'admin_mb_id'    => $mb_id,
    'point_balance'  => $after,
    'balance_before' => $before,
    'balance_after'  => $after,
    'message'        => $synced ? '포인트 동기화 완료' : '포인트 동기화 실패',
));
