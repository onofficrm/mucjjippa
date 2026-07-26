<?php
require_once dirname(__DIR__, 2) . '/_g5_site_bootstrap.php';

$extend_update = defined('G5_EXTEND_PATH') ? G5_EXTEND_PATH . '/onoff_g5_update.extend.php' : G5_EXTEND_DIR . '/onoff_g5_update.extend.php';
if (is_file($extend_update)) {
    include_once $extend_update;
}

$params = onoff_g5_site_ai_parse_json_request();
$result = onoff_g5_update_api_manifest($params);
$status = !empty($result['success']) ? 200 : 400;
onoff_g5_update_api_response($result, $status);
