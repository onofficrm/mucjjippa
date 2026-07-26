<?php
require_once __DIR__ . '/../../common.php';

header('Content-Type: application/json; charset=utf-8');

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}
if (is_file(G5_LIB_PATH . '/icrm-member.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-member.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';
}
if (is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
    include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';
}
if (is_file(G5_LIB_PATH . '/onoff-platform-skin.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-platform-skin.lib.php';
}

$action = isset($_REQUEST['action']) ? preg_replace('/[^a-z_]/', '', $_REQUEST['action']) : '';

$member_portal_retired_actions = array(
    'board_create',
    'board_update',
    'board_connect',
    'compose_suggest_titles',
    'compose_generate_draft',
    'compose_expand_presets',
    'compose_expand',
    'compose_ai_draft',
    'compose_save',
    'compose_publish',
    'compose_delete',
);
if (in_array($action, $member_portal_retired_actions, true)) {
    if (!function_exists('icrm_member_is_logged_in') || !icrm_member_is_logged_in()) {
        echo json_encode(array('ok' => false, 'error' => '로그인이 필요합니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(array(
        'ok'    => false,
        'error' => '게시판·콘텐츠 발행은 iCRM AI 관리에서 이용해 주세요.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'request_point_charge') {
    icrm_member_require_json('points');
    if (!function_exists('icrm_point_request_charge')) {
        echo json_encode(array('ok' => false, 'error' => '포인트 충전 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $amount_krw = isset($_POST['amount_krw']) ? (int) $_POST['amount_krw'] : 0;
    $depositor = isset($_POST['depositor']) ? trim((string) $_POST['depositor']) : '';
    $memo = isset($_POST['memo']) ? trim((string) $_POST['memo']) : '';

    $result = icrm_point_request_charge($amount_krw, $depositor, $memo);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'platform_skin_status') {
    icrm_member_require_json('design');
    echo json_encode(array('ok' => true, 'status' => onoff_platform_skin_get_status()), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'platform_skin_apply') {
    icrm_member_require_json('design');
    $result = onoff_platform_skin_apply(array('apply_boards' => true));
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? ($result['message'] ?? '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'board_design_apply') {
    icrm_member_require_json('board_design');
    global $member;
    $boards = array();
    if (isset($_POST['boards'])) {
        $decoded = json_decode((string) $_POST['boards'], true);
        if (is_array($decoded)) {
            $boards = $decoded;
        }
    } elseif (isset($_POST['map']) && is_array($_POST['map'])) {
        foreach ($_POST['map'] as $bo_table => $template) {
            $boards[] = array(
                'bo_table' => (string) $bo_table,
                'template' => (string) $template,
            );
        }
    }
    if ($boards === array()) {
        echo json_encode(array('ok' => false, 'error' => '적용할 게시판 정보가 올바르지 않습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    $result = icrm_member_board_apply_design_batch(
        $boards,
        !empty($member['mb_id']) ? (string) $member['mb_id'] : ''
    );
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? ($result['message'] ?? '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'board_design_apply_defaults') {
    icrm_member_require_json('board_design');
    global $member;
    $result = icrm_member_board_apply_all_defaults(
        !empty($member['mb_id']) ? (string) $member['mb_id'] : '',
        true
    );
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? ($result['message'] ?? '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'board_create') {
    icrm_member_require('boards');
    global $member;
    $result = icrm_member_board_create(array(
        'bo_table'   => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
        'bo_subject' => isset($_POST['bo_subject']) ? (string) $_POST['bo_subject'] : '',
        'template'   => isset($_POST['template']) ? (string) $_POST['template'] : 'column',
        'mb_id'      => !empty($member['mb_id']) ? (string) $member['mb_id'] : '',
    ));
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? ($result['message'] ?? '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'board_update') {
    icrm_member_require('boards');
    global $member;
    $result = icrm_member_board_update(array(
        'bo_table'   => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
        'bo_subject' => isset($_POST['bo_subject']) ? (string) $_POST['bo_subject'] : '',
        'template'   => isset($_POST['template']) ? (string) $_POST['template'] : '',
        'mb_id'      => !empty($member['mb_id']) ? (string) $member['mb_id'] : '',
    ));
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? ($result['message'] ?? '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'board_connect') {
    icrm_member_require('boards');
    $result = icrm_member_board_connect(array(
        'bo_table' => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
        'template' => isset($_POST['template']) ? (string) $_POST['template'] : '',
        'mb_id'    => isset($_POST['mb_id']) ? (string) $_POST['mb_id'] : '',
    ));
    echo json_encode(array(
        'ok'     => !empty($result['success']),
        'result' => $result,
        'error'  => empty($result['success']) ? ($result['message'] ?? '실패') : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if (in_array($action, array('publish_apply', 'builder_pull', 'builder_rollback', 'builder_reset', 'builder_status', 'builder_source_build'), true)) {
    ob_start();
    register_shutdown_function(function () {
        $error = error_get_last();
        if (!$error || !in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR), true)) {
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
        }
        echo json_encode(array(
            'ok'    => false,
            'error' => 'PHP 오류: ' . basename((string) $error['file']) . ':' . (int) $error['line'] . ' ' . (string) $error['message'],
        ), JSON_UNESCAPED_UNICODE);
    });

    icrm_member_require_json('design');
    if ($action === 'builder_status') {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        echo json_encode(array('ok' => true, 'status' => icrm_builder_deploy_check_status()), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'publish_apply') {
        @set_time_limit(600);
        @ini_set('memory_limit', '256M');
        $project_id = isset($_POST['project_id']) ? $_POST['project_id'] : '';
        if (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id)) {
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            echo json_encode(array('ok' => false, 'error' => '프로젝트를 찾을 수 없습니다.'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        $import = onoff_builder_get_import($project_id);
        $project_name = is_array($import) && !empty($import['name']) ? (string) $import['name'] : $project_id;
        $result = icrm_builder_deploy_publish_and_apply($project_id, $project_name);
        $leaked = '';
        if (ob_get_level() > 0) {
            $leaked = trim(strip_tags((string) ob_get_clean()));
        }
        if ($leaked !== '' && empty($result['success'])) {
            $preview = preg_replace('/\s+/', ' ', $leaked);
            $preview = function_exists('mb_substr') ? mb_substr($preview, 0, 160, 'UTF-8') : substr($preview, 0, 160);
            $result['message'] = (isset($result['message']) ? (string) $result['message'] . ' / ' : '') . '출력 누출: ' . $preview;
        }
        echo json_encode(array(
            'ok'     => !empty($result['success']),
            'result' => $result,
            'error'  => empty($result['success']) ? ($result['message'] ?? '실패') : '',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'builder_source_build') {
        $project_id = isset($_POST['project_id']) ? $_POST['project_id'] : '';
        if (!onoff_builder_validate_project_id($project_id) || !onoff_builder_project_exists($project_id)) {
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            echo json_encode(array('ok' => false, 'error' => '프로젝트를 찾을 수 없습니다.'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        if (!function_exists('icrm_builder_deploy_build_source_project')) {
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            echo json_encode(array('ok' => false, 'error' => '빌더 빌드 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        $result = icrm_builder_deploy_build_source_project($project_id);
        $leaked = '';
        if (ob_get_level() > 0) {
            $leaked = trim(strip_tags((string) ob_get_clean()));
        }
        if ($leaked !== '' && empty($result['success'])) {
            $preview = preg_replace('/\s+/', ' ', $leaked);
            $preview = function_exists('mb_substr') ? mb_substr($preview, 0, 160, 'UTF-8') : substr($preview, 0, 160);
            $result['message'] = (isset($result['message']) ? (string) $result['message'] . ' / ' : '') . '출력 누출: ' . $preview;
        }
        echo json_encode(array(
            'ok'     => !empty($result['success']),
            'result' => $result,
            'error'  => empty($result['success']) ? ($result['message'] ?? '실패') : '',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'builder_pull') {
        $result = icrm_builder_deploy_pull(!empty($_POST['dry_run']));
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        echo json_encode(array('ok' => !empty($result['success']), 'result' => $result), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'builder_rollback') {
        $release_id = isset($_POST['release_id']) ? preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $_POST['release_id']) : '';
        $result = icrm_builder_deploy_rollback($release_id);
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        echo json_encode(array('ok' => !empty($result['success']), 'result' => $result), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'builder_reset') {
        if (!function_exists('icrm_builder_deploy_reset')) {
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            echo json_encode(array('ok' => false, 'error' => '빌더 초기화 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        $result = icrm_builder_deploy_reset();
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        echo json_encode(array('ok' => !empty($result['success']), 'result' => $result), JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$compose_actions = array(
    'compose_suggest_titles',
    'compose_generate_draft',
    'compose_expand_presets',
    'compose_expand',
    'compose_ai_draft',
    'compose_save',
    'compose_publish',
    'compose_delete',
);

if (in_array($action, $compose_actions, true)) {
    icrm_member_require('publish');

    include_once G5_LIB_PATH . '/icrm-content.lib.php';
    if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
        include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
    }
    icrm_content_bootstrap();

    global $member;
    $member_mb_id = !empty($member['mb_id']) ? (string) $member['mb_id'] : '';

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
            $result['subject'] = isset($result['data']['subject']) ? $result['data']['subject'] : '';
            $result['content'] = isset($result['data']['content']) ? $result['data']['content'] : '';
        }
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'compose_save') {
        $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
        $result = icrm_content_save_compose_draft(array(
            'subject'      => isset($_POST['subject']) ? (string) $_POST['subject'] : '',
            'content_html' => isset($_POST['content_html']) ? (string) $_POST['content_html'] : '',
            'bo_table'     => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
            'mb_id'        => $member_mb_id !== '' ? $member_mb_id : (isset($_POST['mb_id']) ? (string) $_POST['mb_id'] : ''),
            'ca_name'      => isset($_POST['ca_name']) ? (string) $_POST['ca_name'] : '',
            'keywords'     => isset($_POST['keywords']) ? (string) $_POST['keywords'] : '',
            'topic'        => isset($_POST['topic']) ? (string) $_POST['topic'] : '',
        ), $ici_id);
        if (empty($result['ok']) && function_exists('icrm_content_publish_error_message')) {
            $result['message'] = icrm_content_publish_error_message($result);
        }
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'compose_delete') {
        $ici_id = isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0;
        echo json_encode(icrm_content_member_delete_compose_item($ici_id, $member_mb_id), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === 'compose_publish') {
        $options = array('geo_package' => !empty($_POST['geo_package']));
        $result = icrm_content_compose_publish(array(
            'ici_id'       => isset($_POST['ici_id']) ? (int) $_POST['ici_id'] : 0,
            'subject'      => isset($_POST['subject']) ? (string) $_POST['subject'] : '',
            'content_html' => isset($_POST['content_html']) ? (string) $_POST['content_html'] : '',
            'bo_table'     => isset($_POST['bo_table']) ? (string) $_POST['bo_table'] : '',
            'mb_id'        => $member_mb_id !== '' ? $member_mb_id : (isset($_POST['mb_id']) ? (string) $_POST['mb_id'] : ''),
            'ca_name'      => isset($_POST['ca_name']) ? (string) $_POST['ca_name'] : '',
            'keywords'     => isset($_POST['keywords']) ? (string) $_POST['keywords'] : '',
            'topic'        => isset($_POST['topic']) ? (string) $_POST['topic'] : '',
        ), $options);
        if (empty($result['ok']) && function_exists('icrm_content_publish_error_message')) {
            $result['message'] = icrm_content_publish_error_message($result);
        }
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

echo json_encode(array('ok' => false, 'error' => 'unknown action'), JSON_UNESCAPED_UNICODE);
