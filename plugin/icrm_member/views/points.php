<?php
if (!defined('_GNUBOARD_') || !defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

$action_url = function_exists('icrm_member_action_url')
    ? icrm_member_action_url()
    : G5_PLUGIN_URL . '/icrm_member/action.php';

if (!defined('ICRM_HUB_ACTIVE')) {
    define('ICRM_HUB_ACTIVE', true);
}

include G5_PLUGIN_PATH . '/icrm_hub/admin/views/points.php';
