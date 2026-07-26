<?php
/**
 * SEO 메타 — 저장 · AI 생성 · 대표 이미지 업로드 · 일괄 SEO API
 */
require_once __DIR__ . '/../../../common.php';

header('Content-Type: application/json; charset=utf-8');

include_once G5_LIB_PATH . '/seo-meta.lib.php';

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

$action = isset($_REQUEST['action']) ? preg_replace('/[^a-z_]/', '', $_REQUEST['action']) : '';

$super_only = array('save_settings', 'save_meta', 'bulk_list', 'bulk_run', 'geo_fix_post', 'test_icrm', 'sync_points', 'request_point_charge');
$manager_actions = array('ai_generate', 'ai_draft', 'ai_faq', 'ai_image_alt', 'ai_score', 'ai_keywords', 'ai_publish_checklist', 'ai_internal_links', 'rank_register', 'upload_image');

if (in_array($action, $super_only, true)) {
    if ($is_admin !== 'super') {
        echo json_encode(array('ok' => false, 'error' => '최고관리자만 사용할 수 있습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
} elseif (in_array($action, $manager_actions, true)) {
    if (!g5b_seo_meta_user_can_manage()) {
        echo json_encode(array('ok' => false, 'error' => '관리자 권한이 필요합니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
} elseif ($action !== '') {
    echo json_encode(array('ok' => false, 'error' => '알 수 없는 요청입니다.'), JSON_UNESCAPED_UNICODE);
    exit;
} else {
    echo json_encode(array('ok' => false, 'error' => '알 수 없는 요청입니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'save_settings') {
    $license_key = isset($_POST['icrm_license_key']) ? trim((string) $_POST['icrm_license_key']) : '';
    $api_base_url = isset($_POST['icrm_seo_api_base_url']) ? trim((string) $_POST['icrm_seo_api_base_url']) : '';

    if ($license_key === '') {
        $license_key = g5b_seo_meta_get_license_key();
    }

    if ($license_key === '') {
        echo json_encode(array('ok' => false, 'error' => 'iCRM 라이선스 키를 입력해 주세요. (iCRM에 사이트 등록 시 발급)'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!g5b_seo_meta_save_license_settings($license_key, $api_base_url)) {
        echo json_encode(array('ok' => false, 'error' => '설정 파일 저장에 실패했습니다. data/ 폴더 권한을 확인하세요.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(array('ok' => true, 'message' => 'iCRM 연동 설정이 저장되었습니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'test_icrm') {
    $license_key = isset($_POST['icrm_license_key']) ? trim((string) $_POST['icrm_license_key']) : '';
    $api_base_url = isset($_POST['icrm_seo_api_base_url']) ? trim((string) $_POST['icrm_seo_api_base_url']) : '';

    if ($license_key !== '' || $api_base_url !== '') {
        $save_key = $license_key !== '' ? $license_key : g5b_seo_meta_get_license_key();
        if ($save_key !== '') {
            g5b_seo_meta_save_license_settings($save_key, $api_base_url);
        }
    }

    $result = g5b_seo_meta_test_icrm_api();
    echo json_encode(array(
        'ok'      => !empty($result['ok']),
        'message' => isset($result['message']) ? $result['message'] : '',
        'error'   => empty($result['ok']) && isset($result['message']) ? $result['message'] : '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'sync_points') {
    if (!function_exists('icrm_point_fetch_balance_from_icrm')) {
        echo json_encode(array('ok' => false, 'error' => '포인트 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = icrm_point_fetch_balance_from_icrm(null, array('sync_mode' => 'force'));
    if (!$result['ok']) {
        echo json_encode(array('ok' => false, 'error' => isset($result['error']) ? $result['error'] : '동기화 실패'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(array(
        'ok'      => true,
        'message' => 'iCRM 포인트 동기화 완료 · 잔액 ' . number_format((int) $result['point_balance']) . 'P',
        'balance' => (int) $result['point_balance'],
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'request_point_charge') {
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

if ($action === 'upload_image') {
    $file_key = isset($_FILES['image']) ? 'image' : (isset($_FILES['og_image']) ? 'og_image' : '');
    if ($file_key === '') {
        echo json_encode(array('ok' => false, 'error' => '이미지 파일이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = g5b_seo_meta_upload_featured_image($_FILES[$file_key]);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'save_meta') {
    $type = isset($_POST['type']) ? preg_replace('/[^a-z]/', '', $_POST['type']) : '';
    $key = isset($_POST['key']) ? trim((string) $_POST['key']) : '';

    if ($type === '' || $key === '') {
        echo json_encode(array('ok' => false, 'error' => '유형 또는 키가 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $faq = array();
    if (!empty($_POST['faq_q']) && is_array($_POST['faq_q'])) {
        $faq_a = isset($_POST['faq_a']) && is_array($_POST['faq_a']) ? $_POST['faq_a'] : array();
        foreach ($_POST['faq_q'] as $i => $q) {
            $q = trim((string) $q);
            $a = isset($faq_a[$i]) ? trim((string) $faq_a[$i]) : '';
            if ($q !== '' && $a !== '') {
                $faq[] = array('q' => $q, 'a' => $a);
            }
        }
    }

    $row = array(
        'title'       => isset($_POST['title']) ? $_POST['title'] : '',
        'description' => isset($_POST['description']) ? $_POST['description'] : '',
        'keywords'    => isset($_POST['keywords']) ? $_POST['keywords'] : '',
        'robots'      => isset($_POST['robots']) ? $_POST['robots'] : '',
        'og_image'    => isset($_POST['og_image']) ? $_POST['og_image'] : '',
        'canonical'   => isset($_POST['canonical']) ? $_POST['canonical'] : '',
        'schema_type' => isset($_POST['schema_type']) ? $_POST['schema_type'] : '',
        'faq'         => $faq,
    );

    if (!g5b_seo_meta_save($type, $key, $row)) {
        echo json_encode(array('ok' => false, 'error' => '저장에 실패했습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(array('ok' => true, 'message' => 'SEO 메타가 저장되었습니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'ai_generate') {
    $type = isset($_POST['type']) ? preg_replace('/[^a-z]/', '', $_POST['type']) : '';
    $key = isset($_POST['key']) ? trim((string) $_POST['key']) : '';
    $extra = array(
        'subject' => isset($_POST['subject']) ? $_POST['subject'] : '',
        'content' => isset($_POST['content']) ? $_POST['content'] : '',
    );

    if ($type === '' || $key === '') {
        echo json_encode(array('ok' => false, 'error' => '유형 또는 키가 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = g5b_seo_meta_ai_generate($type, $key, $extra);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'ai_draft') {
    $params = array(
        'topic'      => isset($_POST['topic']) ? $_POST['topic'] : '',
        'keywords'   => isset($_POST['keywords']) ? $_POST['keywords'] : '',
        'tone'       => isset($_POST['tone']) ? $_POST['tone'] : 'professional',
        'length'     => isset($_POST['length']) ? $_POST['length'] : 'medium',
        'board_name' => isset($_POST['board_name']) ? $_POST['board_name'] : '',
    );

    $result = g5b_seo_meta_ai_draft_post($params);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'ai_faq') {
    $type = isset($_POST['type']) ? preg_replace('/[^a-z]/', '', $_POST['type']) : 'posts';
    $key = isset($_POST['key']) ? trim((string) $_POST['key']) : '';
    $count = isset($_POST['count']) ? (int) $_POST['count'] : 6;
    $extra = array(
        'subject' => isset($_POST['subject']) ? $_POST['subject'] : '',
        'content' => isset($_POST['content']) ? $_POST['content'] : '',
    );

    if ($key === '') {
        echo json_encode(array('ok' => false, 'error' => '키가 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = g5b_seo_meta_ai_generate_faq_enhanced($type, $key, $extra, $count);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'ai_score') {
    $subject = isset($_POST['subject']) ? $_POST['subject'] : '';
    $content = isset($_POST['content']) ? $_POST['content'] : '';
    $extra = array(
        'seo_title'   => isset($_POST['seo_title']) ? $_POST['seo_title'] : '',
        'description' => isset($_POST['description']) ? $_POST['description'] : '',
        'keywords'    => isset($_POST['keywords']) ? $_POST['keywords'] : '',
        'faq_count'   => isset($_POST['faq_count']) ? (int) $_POST['faq_count'] : 0,
    );

    $result = g5b_seo_meta_ai_score_post($subject, $content, $extra);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'ai_keywords') {
    $subject = isset($_POST['subject']) ? $_POST['subject'] : '';
    $content = isset($_POST['content']) ? $_POST['content'] : '';
    $extra = array(
        'keywords'   => isset($_POST['keywords']) ? $_POST['keywords'] : '',
        'board_name' => isset($_POST['board_name']) ? $_POST['board_name'] : '',
        'limit'      => isset($_POST['limit']) ? (int) $_POST['limit'] : 6,
    );

    $result = g5b_seo_meta_ai_keyword_suggestions($subject, $content, $extra);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'ai_publish_checklist') {
    $subject = isset($_POST['subject']) ? $_POST['subject'] : '';
    $content = isset($_POST['content']) ? $_POST['content'] : '';
    $extra = array(
        'seo_title'   => isset($_POST['seo_title']) ? $_POST['seo_title'] : '',
        'description' => isset($_POST['description']) ? $_POST['description'] : '',
        'keywords'    => isset($_POST['keywords']) ? $_POST['keywords'] : '',
        'faq_count'   => isset($_POST['faq_count']) ? (int) $_POST['faq_count'] : 0,
        'has_rank'    => !empty($_POST['has_rank']),
    );

    $result = g5b_seo_meta_ai_publish_checklist($subject, $content, $extra);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'ai_internal_links') {
    $subject = isset($_POST['subject']) ? $_POST['subject'] : '';
    $content = isset($_POST['content']) ? $_POST['content'] : '';
    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $wr_id = isset($_POST['wr_id']) ? (int) $_POST['wr_id'] : 0;
    $extra = array(
        'keywords'   => isset($_POST['keywords']) ? $_POST['keywords'] : '',
        'board_name' => isset($_POST['board_name']) ? $_POST['board_name'] : '',
        'limit'      => isset($_POST['limit']) ? (int) $_POST['limit'] : 5,
    );

    $result = g5b_seo_meta_ai_internal_links($subject, $content, $bo_table, $wr_id, $extra);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'rank_register') {
    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $wr_id = isset($_POST['wr_id']) ? (int) $_POST['wr_id'] : 0;
    $keywords = isset($_POST['keywords']) ? $_POST['keywords'] : '';

    if ($bo_table === '' || $wr_id < 1) {
        echo json_encode(array('ok' => false, 'error' => '글 저장 후 순위체크 키워드를 등록할 수 있습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!is_file(G5_LIB_PATH . '/icrm-rank.lib.php')) {
        echo json_encode(array('ok' => false, 'error' => '순위체크 모듈이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    include_once G5_LIB_PATH . '/icrm-rank.lib.php';
    $result = icrm_rank_save_target($bo_table, $wr_id, $keywords, true, array('naver', 'google'));
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'ai_image_alt') {
    $subject = isset($_POST['subject']) ? $_POST['subject'] : '';
    $content = isset($_POST['content']) ? $_POST['content'] : '';
    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $wr_id = isset($_POST['wr_id']) ? (int) $_POST['wr_id'] : 0;
    $save = !empty($_POST['save']) && $_POST['save'] === '1';

    $files = array();
    if (!empty($_POST['file_names']) && is_array($_POST['file_names'])) {
        $alts = isset($_POST['file_alts']) && is_array($_POST['file_alts']) ? $_POST['file_alts'] : array();
        foreach ($_POST['file_names'] as $i => $name) {
            $files[] = array(
                'index'       => $i,
                'name'        => (string) $name,
                'current_alt' => isset($alts[$i]) ? (string) $alts[$i] : '',
            );
        }
    } elseif ($bo_table !== '' && $wr_id > 0) {
        $files = g5b_seo_meta_get_post_files($bo_table, $wr_id);
    }

    $result = g5b_seo_meta_ai_image_alts($subject, $content, $files);
    if (!$result['ok']) {
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($save && $bo_table !== '' && $wr_id > 0 && !empty($result['data']['file_alts'])) {
        g5b_seo_meta_save_post_file_alts($bo_table, $wr_id, $result['data']['file_alts']);

        global $g5;
        $write_table = $g5['write_prefix'] . $bo_table;
        if (!empty($result['data']['content'])) {
            sql_query(" update {$write_table} set wr_content = '" . sql_escape_string($result['data']['content']) . "' where wr_id = '{$wr_id}' ");
        }
    }

    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'bulk_list') {
    $bo_table = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
    $only_missing = !isset($_GET['only_missing']) || $_GET['only_missing'] !== '0';

    if ($bo_table === '') {
        echo json_encode(array('ok' => false, 'error' => '게시판을 선택해 주세요.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = g5b_seo_meta_bulk_fetch_posts($bo_table, $page, 50, $only_missing);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'bulk_run') {
    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $wr_id = isset($_POST['wr_id']) ? (int) $_POST['wr_id'] : 0;
    $include_faq = !isset($_POST['include_faq']) || $_POST['include_faq'] !== '0';

    if ($bo_table === '' || $wr_id < 1) {
        echo json_encode(array('ok' => false, 'error' => '게시판 또는 글 ID가 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = g5b_seo_meta_bulk_process_post($bo_table, $wr_id, $include_faq);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'geo_fix_post') {
    if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
        include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
    }

    $bo_table = isset($_POST['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_POST['bo_table']) : '';
    $wr_id = isset($_POST['wr_id']) ? (int) $_POST['wr_id'] : 0;
    $options = array(
        'include_faq'  => !isset($_POST['include_faq']) || $_POST['include_faq'] !== '0',
        'include_rank' => !isset($_POST['include_rank']) || $_POST['include_rank'] !== '0',
    );

    if ($bo_table === '' || $wr_id < 1) {
        echo json_encode(array('ok' => false, 'error' => '게시판 또는 글 ID가 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!function_exists('g5b_seo_geo_fix_post')) {
        echo json_encode(array('ok' => false, 'error' => 'geo_module_unavailable'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(g5b_seo_geo_fix_post($bo_table, $wr_id, $options), JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(array('ok' => false, 'error' => '알 수 없는 요청입니다.'), JSON_UNESCAPED_UNICODE);
