<?php
/**
 * 게시글 순위체크 — AJAX API
 */
require_once __DIR__ . '/../../../common.php';

header('Content-Type: application/json; charset=utf-8');

if ($is_admin !== 'super') {
    echo json_encode(array('ok' => false, 'error' => '최고관리자만 사용할 수 있습니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

include_once G5_LIB_PATH . '/icrm-rank.lib.php';
icrm_rank_bootstrap();

$action = isset($_REQUEST['action']) ? preg_replace('/[^a-z_]/', '', $_REQUEST['action']) : '';

if ($action === 'dashboard') {
    echo json_encode(array(
        'ok'    => true,
        'stats' => icrm_rank_get_dashboard_stats(),
        'point' => function_exists('icrm_point_format_summary') ? icrm_point_format_summary() : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'posts') {
    $bo_table = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
    $filter = isset($_GET['filter']) ? preg_replace('/[^a-z_]/', '', $_GET['filter']) : 'all';

    $result = icrm_rank_fetch_posts($bo_table, $page, 30, $filter);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'post_detail') {
    $bo_table = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
    $wr_id = isset($_GET['wr_id']) ? (int) $_GET['wr_id'] : 0;

    $detail = icrm_rank_get_post_detail($bo_table, $wr_id);
    echo json_encode($detail, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'suggest_keywords') {
    $bo_table = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
    $wr_id = isset($_GET['wr_id']) ? (int) $_GET['wr_id'] : 0;
    $subject = isset($_GET['subject']) ? (string) $_GET['subject'] : '';

    echo json_encode(array(
        'ok'       => true,
        'keywords' => icrm_rank_suggest_keywords($bo_table, $wr_id, $subject),
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'save_target') {
    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $wr_id = isset($_POST['wr_id']) ? (int) $_POST['wr_id'] : 0;
    $keywords = isset($_POST['keywords']) ? $_POST['keywords'] : '';
    $enabled = !isset($_POST['enabled']) || $_POST['enabled'] !== '0';
    $engines = isset($_POST['engines']) ? $_POST['engines'] : null;

    $result = icrm_rank_save_target($bo_table, $wr_id, $keywords, $enabled, $engines);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_target') {
    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $wr_id = isset($_POST['wr_id']) ? (int) $_POST['wr_id'] : 0;

    icrm_rank_delete_target($bo_table, $wr_id);
    echo json_encode(array('ok' => true, 'message' => '순위체크 설정을 삭제했습니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'run_check') {
    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $wr_ids = array();
    if (!empty($_POST['wr_ids']) && is_array($_POST['wr_ids'])) {
        foreach ($_POST['wr_ids'] as $id) {
            $wr_ids[] = (int) $id;
        }
    } elseif (isset($_POST['wr_id'])) {
        $wr_ids[] = (int) $_POST['wr_id'];
    }

    $engines = null;
    if (!empty($_POST['engines']) && is_array($_POST['engines'])) {
        $engines = $_POST['engines'];
    }

    if ($wr_ids) {
        $last = null;
        foreach ($wr_ids as $wr_id) {
            $last = icrm_rank_run_check($bo_table, array($wr_id), $engines);
            if (!$last['ok']) {
                echo json_encode($last, JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        echo json_encode($last, JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = icrm_rank_run_check($bo_table, array(), $engines);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'sync_points') {
    if (!function_exists('icrm_point_fetch_balance_from_icrm')) {
        echo json_encode(array('ok' => false, 'error' => '포인트 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = icrm_point_fetch_balance_from_icrm(null, array('sync_mode' => 'force'));
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(array('ok' => false, 'error' => '알 수 없는 요청입니다.'), JSON_UNESCAPED_UNICODE);
