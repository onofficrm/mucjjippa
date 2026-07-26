<?php
/**
 * iCRM → 그누보드 콘텐츠 수집·재생성 결과 수신 API
 *
 * POST JSON — subject, content_html, source_url, bo_table, mb_id, seo …
 * 인증: X-ICRM-Token 또는 ?token= (final-url.php · point-sync.php 와 동일)
 */
require_once dirname(__DIR__) . '/common.php';

if (!is_file(G5_LIB_PATH . '/icrm.lib.php')) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode(array('ok' => false, 'error' => 'icrm_not_installed'), JSON_UNESCAPED_UNICODE);
    exit;
}

include_once G5_LIB_PATH . '/icrm.lib.php';

if (is_file(G5_DATA_PATH . '/icrm.config.php')) {
    include_once G5_DATA_PATH . '/icrm.config.php';
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

if (!is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
    icrm_json_response(array(
        'ok'      => false,
        'error'   => 'content_module_missing',
        'message' => 'icrm-content.lib.php 가 없습니다.',
    ), 503);
}

include_once G5_LIB_PATH . '/icrm-content.lib.php';
icrm_content_bootstrap();

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

if (!is_array($json) || empty($json)) {
    icrm_json_response(array(
        'ok'      => false,
        'error'   => 'invalid_payload',
        'message' => 'JSON 본문이 필요합니다.',
    ), 400);
}

$result = icrm_content_import_payload($json);

if (empty($result['ok'])) {
    $code = 400;
    if (isset($result['error']) && in_array($result['error'], array('invalid_license', 'domain_mismatch'), true)) {
        $code = 403;
    }
    icrm_json_response($result, $code);
}

icrm_json_response($result);
