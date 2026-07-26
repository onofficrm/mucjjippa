<?php
/**
 * 콘텐츠 수집기 — AJAX API
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

include_once G5_LIB_PATH . '/icrm-content.lib.php';
if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
    include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
}
icrm_content_bootstrap();

$action = isset($_REQUEST['action']) ? preg_replace('/[^a-z_]/', '', $_REQUEST['action']) : '';

if ($action === 'stats') {
    echo json_encode(array(
        'ok'    => true,
        'stats' => icrm_content_get_stats(),
        'point' => function_exists('icrm_point_format_summary') ? icrm_point_format_summary() : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'items') {
    $status = isset($_GET['status']) ? preg_replace('/[^a-z_]/', '', $_GET['status']) : 'review';
    $bo_table = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;

    echo json_encode(icrm_content_fetch_items($status, $bo_table, $page, 20), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'item') {
    $ici_id = isset($_GET['ici_id']) ? (int) $_GET['ici_id'] : 0;
    $item = icrm_content_get_item($ici_id);
    if (!$item) {
        echo json_encode(array('ok' => false, 'error' => 'not_found'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(array('ok' => true, 'item' => $item), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'update_draft') {
    $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
    $fields = array();
    foreach (array('subject', 'content_html', 'bo_table', 'mb_id', 'ca_name', 'notes') as $key) {
        if (isset($_POST[$key])) {
            $fields[$key] = $_POST[$key];
        }
    }
    echo json_encode(icrm_content_update_draft($ici_id, $fields), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'publish') {
    $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
    $options = array(
        'geo_package' => !empty($_POST['geo_package']),
    );
    echo json_encode(icrm_content_publish_item($ici_id, $options), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'apply_geo') {
    $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
    if (!function_exists('icrm_content_apply_geo_package')) {
        echo json_encode(array('ok' => false, 'message' => 'GEO 모듈을 사용할 수 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(icrm_content_apply_geo_package($ici_id), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'reject') {
    $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
    $reason = isset($_POST['reason']) ? (string) $_POST['reason'] : '';
    echo json_encode(icrm_content_reject_item($ici_id, $reason), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'request_collect') {
    $source_url = isset($_POST['source_url']) ? trim((string) $_POST['source_url']) : '';
    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $mb_id = isset($_POST['mb_id']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['mb_id']) : '';
    $options = array(
        'source_type'  => isset($_POST['source_type']) ? preg_replace('/[^a-z_]/', '', (string) $_POST['source_type']) : 'web',
        'keyword'      => isset($_POST['keyword']) ? trim((string) $_POST['keyword']) : '',
        'rule_name'    => isset($_POST['rule_name']) ? trim((string) $_POST['rule_name']) : '',
        'collect_mode' => isset($_POST['collect_mode']) ? preg_replace('/[^a-z_]/', '', (string) $_POST['collect_mode']) : 'source',
        'max_items'    => isset($_POST['max_items']) ? (int) $_POST['max_items'] : 10,
    );
    echo json_encode(icrm_content_request_collect($source_url, $bo_table, $mb_id, $options), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'recollect') {
    $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
    echo json_encode(icrm_content_recollect_item($ici_id), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_item') {
    $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
    echo json_encode(icrm_content_delete_item($ici_id), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'jobs') {
    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
    echo json_encode(icrm_content_fetch_jobs($page, 20), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'remote_settings') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $result = icrm_content_save_remote_settings(array(
            'default_bo_table'     => isset($_POST['default_bo_table']) ? (string) $_POST['default_bo_table'] : '',
            'default_mb_id'        => isset($_POST['default_mb_id']) ? (string) $_POST['default_mb_id'] : '',
            'default_collect_mode' => isset($_POST['default_collect_mode']) ? (string) $_POST['default_collect_mode'] : 'source',
            'default_max_items'    => isset($_POST['default_max_items']) ? (int) $_POST['default_max_items'] : 10,
            'web_engine'           => isset($_POST['web_engine']) ? (string) $_POST['web_engine'] : 'naver',
        ));
        if (!$result['ok']) {
            echo json_encode(array('ok' => false, 'message' => $result['message'] ?? '설정 저장에 실패했습니다.'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(array('ok' => true, 'settings' => $result['data']['settings'] ?? array(), 'message' => $result['data']['message'] ?? '저장했습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(icrm_content_fetch_remote_settings(), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'rules') {
    $sub = isset($_REQUEST['sub']) ? preg_replace('/[^a-z_]/', '', (string) $_REQUEST['sub']) : 'list';
    if ($sub === 'save') {
        $rule_input = array(
            'gcr_id'                 => isset($_POST['gcr_id']) ? (int) $_POST['gcr_id'] : 0,
            'gcr_name'               => isset($_POST['gcr_name']) ? (string) $_POST['gcr_name'] : (isset($_POST['rule_name']) ? (string) $_POST['rule_name'] : ''),
            'gcr_media_type'         => isset($_POST['gcr_media_type']) ? (string) $_POST['gcr_media_type'] : (isset($_POST['source_type']) ? (string) $_POST['source_type'] : 'youtube'),
            'gcr_search_keyword'     => isset($_POST['gcr_search_keyword']) ? (string) $_POST['gcr_search_keyword'] : (isset($_POST['keyword']) ? (string) $_POST['keyword'] : ''),
            'gcr_target_url'         => isset($_POST['gcr_target_url']) ? (string) $_POST['gcr_target_url'] : '',
            'gcr_rss_url'            => isset($_POST['gcr_rss_url']) ? (string) $_POST['gcr_rss_url'] : '',
            'gcr_collect_mode'       => isset($_POST['gcr_collect_mode']) ? (string) $_POST['gcr_collect_mode'] : (isset($_POST['collect_mode']) ? (string) $_POST['collect_mode'] : 'batch'),
            'gcr_max_items'          => isset($_POST['gcr_max_items']) ? (int) $_POST['gcr_max_items'] : (isset($_POST['max_items']) ? (int) $_POST['max_items'] : 10),
            'gcr_bo_table'           => isset($_POST['gcr_bo_table']) ? (string) $_POST['gcr_bo_table'] : (isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : ''),
            'gcr_mb_id'              => isset($_POST['gcr_mb_id']) ? (string) $_POST['gcr_mb_id'] : (isset($_POST['mb_id']) ? (string) $_POST['mb_id'] : ''),
            'gcr_run_interval_hours' => isset($_POST['gcr_run_interval_hours']) ? (int) $_POST['gcr_run_interval_hours'] : 24,
            'gcr_is_active'          => !empty($_POST['gcr_is_active']) ? 1 : 0,
            'web_engine'             => isset($_POST['web_engine']) ? (string) $_POST['web_engine'] : '',
            'youtube_mode'           => isset($_POST['youtube_mode']) ? (string) $_POST['youtube_mode'] : '',
        );
        $run_options = array(
            'bo_table' => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
            'mb_id'    => isset($_POST['mb_id']) ? (string) $_POST['mb_id'] : '',
        );
        if (!empty($_POST['run_after'])) {
            $result = icrm_content_save_rule_and_run($rule_input, array_merge($run_options, array('run' => true)));
            echo json_encode(array(
                'ok'       => !empty($result['ok']),
                'gcr_id'   => (int) ($result['gcr_id'] ?? ($result['data']['gcr_id'] ?? 0)),
                'message'  => $result['message'] ?? '',
                'fallback' => !empty($result['fallback']),
            ), JSON_UNESCAPED_UNICODE);
            exit;
        }
        $result = icrm_content_save_remote_rule($rule_input);
        if (!$result['ok']) {
            echo json_encode(array('ok' => false, 'message' => $result['message'] ?? '규칙 저장에 실패했습니다.'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(array(
            'ok'      => true,
            'gcr_id'  => (int) ($result['data']['gcr_id'] ?? 0),
            'rule'    => $result['data']['rule'] ?? array(),
            'message' => $result['data']['message'] ?? '규칙을 저장했습니다.',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($sub === 'delete') {
        $gcr_id = isset($_POST['gcr_id']) ? (int) $_POST['gcr_id'] : 0;
        $result = icrm_content_delete_remote_rule($gcr_id);
        echo json_encode(array(
            'ok'      => $result['ok'],
            'message' => $result['ok'] ? ($result['data']['message'] ?? '삭제했습니다.') : ($result['message'] ?? '삭제에 실패했습니다.'),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($sub === 'toggle') {
        $gcr_id = isset($_POST['gcr_id']) ? (int) $_POST['gcr_id'] : 0;
        $result = icrm_content_toggle_remote_rule($gcr_id, !empty($_POST['gcr_is_active']));
        echo json_encode(array(
            'ok'      => $result['ok'],
            'rule'    => $result['ok'] ? ($result['data']['rule'] ?? array()) : array(),
            'message' => $result['ok'] ? ($result['data']['message'] ?? '') : ($result['message'] ?? ''),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($sub === 'run') {
        $gcr_id = isset($_POST['gcr_id']) ? (int) $_POST['gcr_id'] : 0;
        echo json_encode(icrm_content_run_remote_rule($gcr_id, array(
            'bo_table' => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
            'mb_id'    => isset($_POST['mb_id']) ? (string) $_POST['mb_id'] : '',
        )), JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(icrm_content_fetch_remote_rules(array(
        'page'     => isset($_GET['page']) ? (int) $_GET['page'] : 1,
        'per_page' => 20,
        'search'   => isset($_GET['q']) ? (string) $_GET['q'] : '',
    )), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'sync_remote_items') {
    echo json_encode(icrm_content_sync_remote_items(), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'compose_suggest_titles') {
    echo json_encode(icrm_content_compose_suggest_titles(array(
        'topic'    => isset($_POST['topic']) ? (string) $_POST['topic'] : '',
        'keywords' => isset($_POST['keywords']) ? (string) $_POST['keywords'] : '',
        'style'    => isset($_POST['style']) ? preg_replace('/[^a-z_]/', '', (string) $_POST['style']) : 'expert',
        'count'    => isset($_POST['count']) ? (int) $_POST['count'] : 8,
    )), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'compose_generate_draft') {
    echo json_encode(icrm_content_compose_generate_draft(array(
        'topic'    => isset($_POST['topic']) ? (string) $_POST['topic'] : '',
        'keywords' => isset($_POST['keywords']) ? (string) $_POST['keywords'] : '',
        'title'    => isset($_POST['title']) ? (string) $_POST['title'] : '',
        'style'    => isset($_POST['style']) ? preg_replace('/[^a-z_]/', '', (string) $_POST['style']) : 'expert',
        'length'   => isset($_POST['length']) ? preg_replace('/[^a-z_]/', '', (string) $_POST['length']) : 'medium',
    )), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'compose_expand_presets') {
    echo json_encode(icrm_content_compose_expand_presets(), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'compose_expand') {
    echo json_encode(icrm_content_compose_expand_content(array(
        'type'         => isset($_POST['type']) ? (string) $_POST['type'] : '',
        'subject'      => isset($_POST['subject']) ? (string) $_POST['subject'] : '',
        'content_html' => isset($_POST['content_html']) ? (string) $_POST['content_html'] : '',
    )), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'compose_ai_draft') {
    $result = icrm_content_compose_ai_draft(array(
        'topic'    => isset($_POST['topic']) ? (string) $_POST['topic'] : '',
        'keywords' => isset($_POST['keywords']) ? (string) $_POST['keywords'] : '',
        'title'    => isset($_POST['title']) ? (string) $_POST['title'] : '',
        'style'    => isset($_POST['style']) ? preg_replace('/[^a-z_]/', '', (string) $_POST['style']) : 'expert',
        'length'   => isset($_POST['length']) ? preg_replace('/[^a-z_]/', '', (string) $_POST['length']) : 'medium',
    ));
    if (!empty($result['ok']) && isset($result['data'])) {
        $result['subject'] = isset($result['data']['subject']) ? $result['data']['subject'] : (isset($result['subject']) ? $result['subject'] : '');
        $result['content'] = isset($result['data']['content']) ? $result['data']['content'] : (isset($result['content']) ? $result['content'] : '');
    }
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'compose_save') {
    $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
    echo json_encode(icrm_content_save_compose_draft(array(
        'subject'      => isset($_POST['subject']) ? (string) $_POST['subject'] : '',
        'content_html' => isset($_POST['content_html']) ? (string) $_POST['content_html'] : '',
        'bo_table'     => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
        'mb_id'        => isset($_POST['mb_id']) ? (string) $_POST['mb_id'] : '',
        'ca_name'      => isset($_POST['ca_name']) ? (string) $_POST['ca_name'] : '',
        'keywords'     => isset($_POST['keywords']) ? (string) $_POST['keywords'] : '',
        'topic'        => isset($_POST['topic']) ? (string) $_POST['topic'] : '',
    ), $ici_id), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'compose_publish') {
    $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
    $options = array(
        'geo_package' => !empty($_POST['geo_package']),
    );
    echo json_encode(icrm_content_compose_publish(array(
        'ici_id'       => $ici_id,
        'subject'      => isset($_POST['subject']) ? (string) $_POST['subject'] : '',
        'content_html' => isset($_POST['content_html']) ? (string) $_POST['content_html'] : '',
        'bo_table'     => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
        'mb_id'        => isset($_POST['mb_id']) ? (string) $_POST['mb_id'] : '',
        'ca_name'      => isset($_POST['ca_name']) ? (string) $_POST['ca_name'] : '',
        'keywords'     => isset($_POST['keywords']) ? (string) $_POST['keywords'] : '',
        'topic'        => isset($_POST['topic']) ? (string) $_POST['topic'] : '',
    ), $options), JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(array('ok' => false, 'error' => 'unknown_action'), JSON_UNESCAPED_UNICODE);
