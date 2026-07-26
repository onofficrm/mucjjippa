<?php
/**
 * iCRM 회원 — 게시판 추가 (템플릿 프로비저닝)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('icrm_member_board_log_file')) {
    function icrm_member_board_log_file()
    {
        $dir = G5_DATA_PATH . '/icrm-member';
        if (!is_dir($dir)) {
            @mkdir($dir, G5_DIR_PERMISSION, true);
        }

        return $dir . '/board-log.json';
    }
}

if (!function_exists('icrm_member_board_read_log')) {
    function icrm_member_board_read_log()
    {
        $file = icrm_member_board_log_file();
        if (!is_file($file)) {
            return array();
        }
        $decoded = json_decode((string) file_get_contents($file), true);

        return is_array($decoded) ? $decoded : array();
    }
}

if (!function_exists('icrm_member_board_write_log')) {
    function icrm_member_board_write_log(array $log)
    {
        file_put_contents(
            icrm_member_board_log_file(),
            json_encode($log, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            LOCK_EX
        );
    }
}

if (!function_exists('icrm_member_board_month_count')) {
    function icrm_member_board_month_count($mb_id = '')
    {
        $mb_id = trim((string) $mb_id);
        $ym = date('Y-m');
        $count = 0;
        foreach (icrm_member_board_read_log() as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ($mb_id !== '' && isset($row['mb_id']) && (string) $row['mb_id'] !== $mb_id) {
                continue;
            }
            if (isset($row['created_at']) && strpos((string) $row['created_at'], $ym) === 0) {
                if ((string) ($row['source'] ?? 'created') === 'linked') {
                    continue;
                }
                $count++;
            }
        }

        return $count;
    }
}

if (!function_exists('icrm_member_board_templates')) {
    function icrm_member_board_templates()
    {
        return array(
            'column' => array(
                'label'            => '칼럼 · 블로그',
                'skin'             => 'onoff-column',
                'mobile_skin'      => 'onoff-column',
                'use_category'     => '0',
                'category_list'    => '',
                'bo_comment_level' => '1',
            ),
            'faq' => array(
                'label'            => 'FAQ',
                'skin'             => 'onoff-faq',
                'mobile_skin'      => 'onoff-faq',
                'use_category'     => '0',
                'category_list'    => '',
                'bo_comment_level' => '1',
            ),
            'reviews' => array(
                'label'            => '후기 · 리뷰',
                'skin'             => 'onoff-reviews',
                'mobile_skin'      => 'onoff-reviews',
                'use_category'     => '1',
                'category_list'    => '일반|추천',
                'bo_comment_level' => '0',
            ),
            'inquiry' => array(
                'label'            => '문의 · 상담',
                'skin'             => 'onoff-inquiry',
                'mobile_skin'      => 'onoff-inquiry',
                'use_category'     => '0',
                'category_list'    => '',
                'bo_comment_level' => '0',
            ),
        );
    }
}

if (!function_exists('icrm_member_board_skin_exists')) {
    function icrm_member_board_skin_exists($skin)
    {
        $skin = preg_replace('/[^a-z0-9_-]/i', '', (string) $skin);
        if ($skin === '') {
            return false;
        }

        return is_dir(G5_SKIN_PATH . '/board/' . $skin)
            && is_dir(G5_MOBILE_PATH . '/skin/board/' . $skin);
    }
}

if (!function_exists('icrm_member_board_resolve_skin')) {
    function icrm_member_board_resolve_skin($skin)
    {
        if (icrm_member_board_skin_exists($skin)) {
            return $skin;
        }

        if (icrm_member_board_skin_exists('onoff-column')) {
            return 'onoff-column';
        }

        return 'basic-clean';
    }
}

if (!function_exists('icrm_member_board_create_table')) {
    function icrm_member_board_create_table($bo_table)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return false;
        }

        $admin_dir = defined('G5_ADMIN_DIR') ? G5_ADMIN_DIR : 'adm';
        $sql_file = G5_PATH . '/' . $admin_dir . '/sql_write.sql';
        if (!is_file($sql_file)) {
            return false;
        }

        $file = file($sql_file);
        if (!is_array($file)) {
            return false;
        }
        if (function_exists('get_db_create_replace')) {
            $file = get_db_create_replace($file);
        }
        $sql = implode("\n", $file);
        $create_table = $g5['write_prefix'] . $bo_table;
        $sql = preg_replace(array('/__TABLE_NAME__/', '/;/'), array($create_table, ''), $sql);
        sql_query($sql, false);

        $board_path = G5_DATA_PATH . '/file/' . $bo_table;
        @mkdir($board_path, G5_DIR_PERMISSION, true);
        @chmod($board_path, G5_DIR_PERMISSION);
        $index_file = $board_path . '/index.php';
        if ($fp = @fopen($index_file, 'w')) {
            @fwrite($fp, '');
            @fclose($fp);
            @chmod($index_file, G5_FILE_PERMISSION);
        }

        return true;
    }
}

if (!function_exists('icrm_member_board_create')) {
    /**
     * @param array $input bo_table, bo_subject, template, mb_id
     * @return array
     */
    function icrm_member_board_create(array $input)
    {
        global $g5, $member;

        if (!function_exists('icrm_member_can_boards') || !icrm_member_can_boards()) {
            return array('success' => false, 'message' => '게시판 추가 권한이 없습니다.');
        }

        $mb_id = isset($input['mb_id']) ? trim((string) $input['mb_id']) : '';
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }

        $max = icrm_member_board_max_per_month();
        if (icrm_member_board_month_count($mb_id) >= $max) {
            return array(
                'success' => false,
                'message' => '이번 달 게시판 추가 한도(' . $max . '개)를 초과했습니다.',
            );
        }

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower(trim((string) ($input['bo_table'] ?? ''))));
        $bo_subject = trim(strip_tags((string) ($input['bo_subject'] ?? '')));
        $template_key = preg_replace('/[^a-z_]/', '', (string) ($input['template'] ?? 'column'));

        if ($bo_table === '' || strlen($bo_table) < 2 || strlen($bo_table) > 20) {
            return array('success' => false, 'message' => '게시판 ID는 영문 소문자·숫자·_ 2~20자여야 합니다.');
        }
        if ($bo_subject === '') {
            return array('success' => false, 'message' => '게시판 이름을 입력하세요.');
        }

        $templates = icrm_member_board_templates();
        if (!isset($templates[$template_key])) {
            $template_key = 'column';
        }
        $tpl = $templates[$template_key];

        $exists = sql_fetch(" select bo_table from {$g5['board_table']} where bo_table = '" . sql_real_escape_string($bo_table) . "' ");
        if (!empty($exists['bo_table'])) {
            return array('success' => false, 'message' => '이미 사용 중인 게시판 ID입니다.');
        }

        $skin = icrm_member_board_resolve_skin($tpl['skin']);
        $mobile_skin = icrm_member_board_resolve_skin($tpl['mobile_skin']);

        $gr_id = 'community';
        $gr = sql_fetch(" select gr_id from {$g5['group_table']} where gr_id = '" . sql_real_escape_string($gr_id) . "' ");
        if (empty($gr['gr_id'])) {
            $gr_id = '';
        }

        sql_query(" insert into {$g5['board_table']}
            set bo_table = '" . sql_real_escape_string($bo_table) . "',
                gr_id = '" . sql_real_escape_string($gr_id) . "',
                bo_subject = '" . sql_real_escape_string($bo_subject) . "',
                bo_mobile_subject = '" . sql_real_escape_string($bo_subject) . "',
                bo_device = 'both',
                bo_admin = '',
                bo_list_level = '1',
                bo_read_level = '1',
                bo_write_level = '2',
                bo_reply_level = '10',
                bo_comment_level = '" . sql_real_escape_string((string) $tpl['bo_comment_level']) . "',
                bo_upload_level = '10',
                bo_download_level = '1',
                bo_use_category = '" . sql_real_escape_string((string) $tpl['use_category']) . "',
                bo_category_list = '" . sql_real_escape_string((string) $tpl['category_list']) . "',
                bo_use_dhtml_editor = '1',
                bo_select_editor = 'smarteditor2',
                bo_use_secret = '0',
                bo_use_comment = '" . ($tpl['bo_comment_level'] === '0' ? '0' : '1') . "',
                bo_use_search = '1',
                bo_read_point = '0',
                bo_write_point = '0',
                bo_comment_point = '0',
                bo_download_point = '0',
                bo_skin = '" . sql_real_escape_string($skin) . "',
                bo_mobile_skin = '" . sql_real_escape_string($mobile_skin) . "',
                bo_order = '0' ", false);

        if (!icrm_member_board_create_table($bo_table)) {
            sql_query(" delete from {$g5['board_table']} where bo_table = '" . sql_real_escape_string($bo_table) . "' ");
            return array('success' => false, 'message' => '게시판 테이블 생성에 실패했습니다.');
        }

        $log = icrm_member_board_read_log();
        $log[] = array(
            'bo_table'    => $bo_table,
            'bo_subject'  => $bo_subject,
            'template'    => $template_key,
            'mb_id'       => $mb_id,
            'source'      => 'created',
            'created_at'  => date('Y-m-d H:i:s'),
        );
        icrm_member_board_write_log($log);

        if (function_exists('auto_comment_ensure_board_config')) {
            auto_comment_ensure_board_config($bo_table);
        }

        $board_url = G5_BBS_URL . '/board.php?bo_table=' . rawurlencode($bo_table);

        return array(
            'success'    => true,
            'message'    => '게시판이 생성되었습니다.',
            'bo_table'   => $bo_table,
            'bo_subject' => $bo_subject,
            'board_url'  => $board_url,
            'write_url'  => G5_BBS_URL . '/write.php?bo_table=' . rawurlencode($bo_table),
        );
    }
}

if (!function_exists('icrm_member_board_list_recent')) {
    function icrm_member_board_list_recent($limit = 10)
    {
        $log = icrm_member_board_read_log();
        usort($log, function ($a, $b) {
            return strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? ''));
        });

        return array_slice($log, 0, max(1, (int) $limit));
    }
}

if (!function_exists('icrm_member_board_guess_template')) {
    function icrm_member_board_guess_template(array $board_row)
    {
        $bo_table = isset($board_row['bo_table'])
            ? preg_replace('/[^a-z0-9_]/', '', strtolower((string) $board_row['bo_table']))
            : '';
        $table_hints = array(
            'notice'  => 'faq',
            'qa'      => 'inquiry',
            'qna'     => 'inquiry',
            'gallery' => 'reviews',
            'free'    => 'column',
        );
        if ($bo_table !== '' && isset($table_hints[$bo_table])) {
            return $table_hints[$bo_table];
        }

        $skin = isset($board_row['bo_skin']) ? (string) $board_row['bo_skin'] : '';
        $legacy_skins = array(
            'faq-accordion'   => 'faq',
            'landing-inquiry' => 'inquiry',
            'reviews'         => 'reviews',
            'basic-card'      => 'reviews',
            'basic-notice'    => 'faq',
            'gallery-grid'    => 'reviews',
            'gallery-masonry' => 'reviews',
            'basic'           => 'column',
            'gallery'         => 'reviews',
        );
        if (isset($legacy_skins[$skin])) {
            return $legacy_skins[$skin];
        }
        foreach (icrm_member_board_templates() as $key => $tpl) {
            if ($skin === $tpl['skin'] || $skin === $tpl['mobile_skin']) {
                return $key;
            }
        }

        return isset($board_row['template']) ? (string) $board_row['template'] : 'column';
    }
}

if (!function_exists('icrm_member_board_can_publish_to')) {
    function icrm_member_board_can_publish_to($bo_table, $mb_id = '')
    {
        if (!icrm_member_board_can_manage($bo_table, $mb_id)) {
            return false;
        }

        return icrm_member_board_can_write_to($bo_table, $mb_id);
    }
}

if (!function_exists('icrm_member_board_can_write_to')) {
    /**
     * 게시판 글쓰기 레벨(bo_write_level) 충족 여부
     */
    function icrm_member_board_can_write_to($bo_table, $mb_id = '')
    {
        global $member, $is_admin;

        if ($is_admin === 'super') {
            return true;
        }

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return false;
        }

        $board = icrm_member_board_fetch($bo_table);
        if (empty($board['bo_table'])) {
            return false;
        }

        $mb_id = trim((string) $mb_id);
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }
        if ($mb_id === '') {
            return false;
        }

        $author = get_member($mb_id);
        if (empty($author['mb_id'])) {
            return false;
        }

        $required = (int) ($board['bo_write_level'] ?? 1);

        return (int) $author['mb_level'] >= $required;
    }
}

if (!function_exists('icrm_member_board_publish_block_reason')) {
    /**
     * 발행 불가 사유 (빈 문자열이면 발행 가능)
     */
    function icrm_member_board_publish_block_reason($bo_table, $mb_id = '')
    {
        global $member, $is_admin;

        if ($is_admin === 'super') {
            return '';
        }

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return '게시판 ID가 없습니다.';
        }

        if (!icrm_member_board_can_manage($bo_table, $mb_id)) {
            return '내가 만든 게시판만 발행할 수 있습니다.';
        }

        if (icrm_member_board_can_write_to($bo_table, $mb_id)) {
            return '';
        }

        $board = icrm_member_board_fetch($bo_table);
        $required = (int) ($board['bo_write_level'] ?? 1);
        $mb_id = trim((string) $mb_id);
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }
        $author = $mb_id !== '' ? get_member($mb_id) : array();
        $level = !empty($author['mb_level']) ? (int) $author['mb_level'] : 0;

        return '이 게시판은 글쓰기 Lv.' . $required . ' 이상 필요합니다. (현재 Lv.' . $level . ')';
    }
}

if (!function_exists('icrm_member_board_list_publishable')) {
    function icrm_member_board_list_publishable($mb_id = '', $limit = 50)
    {
        $rows = array();
        foreach (icrm_member_board_list_manageable($mb_id, $limit) as $row) {
            if (empty($row['bo_table'])) {
                continue;
            }
            if (!icrm_member_board_can_publish_to($row['bo_table'], $mb_id)) {
                continue;
            }
            $board = icrm_member_board_fetch($row['bo_table']);
            $row['bo_write_level'] = (int) ($board['bo_write_level'] ?? 1);
            $rows[] = $row;
        }

        return $rows;
    }
}

if (!function_exists('icrm_member_board_categories')) {
    function icrm_member_board_categories($bo_table)
    {
        $board = icrm_member_board_fetch($bo_table);
        if (empty($board['bo_table']) || empty($board['bo_use_category']) || (string) $board['bo_use_category'] === '0') {
            return array();
        }

        $categories = array();
        foreach (explode('|', (string) ($board['bo_category_list'] ?? '')) as $cat) {
            $cat = trim($cat);
            if ($cat !== '') {
                $categories[] = $cat;
            }
        }

        return $categories;
    }
}

if (!function_exists('icrm_member_board_can_manage')) {
    function icrm_member_board_can_manage($bo_table, $mb_id = '')
    {
        global $is_admin, $member;

        if (!function_exists('icrm_member_can_boards') || !icrm_member_can_boards()) {
            return false;
        }

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return false;
        }

        if ($is_admin === 'super') {
            return true;
        }

        $mb_id = trim((string) $mb_id);
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }
        if ($mb_id === '') {
            return false;
        }

        foreach (icrm_member_board_read_log() as $row) {
            if (!is_array($row) || empty($row['bo_table'])) {
                continue;
            }
            if (preg_replace('/[^a-z0-9_]/', '', strtolower((string) $row['bo_table'])) !== $bo_table) {
                continue;
            }

            return isset($row['mb_id']) && (string) $row['mb_id'] === $mb_id;
        }

        return false;
    }
}

if (!function_exists('icrm_member_board_fetch')) {
    function icrm_member_board_fetch($bo_table)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return array();
        }

        $board = sql_fetch(" select bo_table, bo_subject, bo_mobile_subject, bo_skin, bo_mobile_skin,
                                    bo_use_category, bo_category_list, bo_use_comment, bo_write_level
                             from {$g5['board_table']}
                             where bo_table = '" . sql_real_escape_string($bo_table) . "' ");

        return is_array($board) ? $board : array();
    }
}

if (!function_exists('icrm_member_board_list_manageable')) {
    function icrm_member_board_list_manageable($mb_id = '', $limit = 50)
    {
        global $member, $is_admin;

        $mb_id = trim((string) $mb_id);
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }

        $rows = array();
        foreach (icrm_member_board_read_log() as $log_row) {
            if (!is_array($log_row) || empty($log_row['bo_table'])) {
                continue;
            }

            if ($is_admin !== 'super') {
                if ($mb_id === '' || (string) ($log_row['mb_id'] ?? '') !== $mb_id) {
                    continue;
                }
            }

            $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $log_row['bo_table']));
            if ($bo_table === '') {
                continue;
            }

            $board = icrm_member_board_fetch($bo_table);
            if (empty($board['bo_table'])) {
                continue;
            }

            $rows[] = array(
                'bo_table'         => $bo_table,
                'bo_subject'       => (string) ($board['bo_subject'] ?? $log_row['bo_subject'] ?? $bo_table),
                'bo_mobile_subject'=> (string) ($board['bo_mobile_subject'] ?? $board['bo_subject'] ?? ''),
                'template'         => icrm_member_board_guess_template(array_merge($log_row, $board)),
                'source'           => (string) ($log_row['source'] ?? 'created'),
                'mb_id'            => (string) ($log_row['mb_id'] ?? ''),
                'created_at'       => (string) ($log_row['created_at'] ?? ''),
                'updated_at'       => (string) ($log_row['updated_at'] ?? ''),
                'linked_at'        => (string) ($log_row['linked_at'] ?? ''),
                'board_url'        => G5_BBS_URL . '/board.php?bo_table=' . rawurlencode($bo_table),
            );
        }

        usort($rows, function ($a, $b) {
            $a_ts = (string) ($a['updated_at'] ?: $a['created_at']);
            $b_ts = (string) ($b['updated_at'] ?: $b['created_at']);

            return strcmp($b_ts, $a_ts);
        });

        return array_slice($rows, 0, max(1, (int) $limit));
    }
}

if (!function_exists('icrm_member_board_update_log_entry')) {
    function icrm_member_board_update_log_entry($bo_table, array $changes)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return;
        }

        $log = icrm_member_board_read_log();
        foreach ($log as $idx => $row) {
            if (!is_array($row) || empty($row['bo_table'])) {
                continue;
            }
            if (preg_replace('/[^a-z0-9_]/', '', strtolower((string) $row['bo_table'])) !== $bo_table) {
                continue;
            }
            foreach ($changes as $key => $value) {
                $log[$idx][$key] = $value;
            }
            $log[$idx]['updated_at'] = date('Y-m-d H:i:s');
            icrm_member_board_write_log($log);
            return;
        }
    }
}

if (!function_exists('icrm_member_board_update')) {
    /**
     * @param array $input bo_table, bo_subject, template, mb_id
     * @return array
     */
    function icrm_member_board_update(array $input)
    {
        global $g5, $member;

        $mb_id = isset($input['mb_id']) ? trim((string) $input['mb_id']) : '';
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower(trim((string) ($input['bo_table'] ?? ''))));
        $bo_subject = trim(strip_tags((string) ($input['bo_subject'] ?? '')));
        $template_key = preg_replace('/[^a-z_]/', '', (string) ($input['template'] ?? ''));

        if ($bo_table === '') {
            return array('success' => false, 'message' => '게시판 ID가 없습니다.');
        }
        if ($bo_subject === '') {
            return array('success' => false, 'message' => '게시판 이름을 입력하세요.');
        }
        if (!icrm_member_board_can_manage($bo_table, $mb_id)) {
            return array('success' => false, 'message' => '이 게시판을 수정할 권한이 없습니다.');
        }

        $board = icrm_member_board_fetch($bo_table);
        if (empty($board['bo_table'])) {
            return array('success' => false, 'message' => '게시판을 찾을 수 없습니다.');
        }

        $templates = icrm_member_board_templates();
        if ($template_key === '' || !isset($templates[$template_key])) {
            $template_key = icrm_member_board_guess_template($board);
        }

        if (!icrm_member_board_apply_template($bo_table, $template_key, $bo_subject)) {
            return array('success' => false, 'message' => '템플릿 적용에 실패했습니다.');
        }

        icrm_member_board_update_log_entry($bo_table, array(
            'bo_subject' => $bo_subject,
            'template'   => $template_key,
        ));

        $board_url = G5_BBS_URL . '/board.php?bo_table=' . rawurlencode($bo_table);

        return array(
            'success'    => true,
            'message'    => '게시판이 수정되었습니다.',
            'bo_table'   => $bo_table,
            'bo_subject' => $bo_subject,
            'template'   => $template_key,
            'board_url'  => $board_url,
        );
    }
}

if (!function_exists('icrm_member_board_can_connect')) {
    function icrm_member_board_can_connect()
    {
        global $is_admin;

        return $is_admin === 'super';
    }
}

if (!function_exists('icrm_member_board_is_logged')) {
    function icrm_member_board_is_logged($bo_table)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return false;
        }

        foreach (icrm_member_board_read_log() as $row) {
            if (!is_array($row) || empty($row['bo_table'])) {
                continue;
            }
            if (preg_replace('/[^a-z0-9_]/', '', strtolower((string) $row['bo_table'])) === $bo_table) {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('icrm_member_board_list_connectable')) {
    /**
     * board-log에 없는 기존 그누보드 게시판 목록
     */
    function icrm_member_board_list_connectable($limit = 100)
    {
        global $g5;

        $linked = array();
        foreach (icrm_member_board_read_log() as $row) {
            if (!is_array($row) || empty($row['bo_table'])) {
                continue;
            }
            $bt = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $row['bo_table']));
            if ($bt !== '') {
                $linked[$bt] = true;
            }
        }

        $rows = array();
        $res = sql_query(" select bo_table, bo_subject, bo_skin, bo_mobile_skin
                           from {$g5['board_table']}
                           order by bo_table ");
        while ($b = sql_fetch_array($res)) {
            if (empty($b['bo_table'])) {
                continue;
            }
            $bt = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $b['bo_table']));
            if ($bt === '' || isset($linked[$bt])) {
                continue;
            }
            $rows[] = array(
                'bo_table'       => $bt,
                'bo_subject'     => (string) ($b['bo_subject'] ?? $bt),
                'bo_skin'        => (string) ($b['bo_skin'] ?? ''),
                'template_guess' => icrm_member_board_guess_template($b),
            );
        }

        return array_slice($rows, 0, max(1, (int) $limit));
    }
}

if (!function_exists('icrm_member_board_apply_template')) {
    function icrm_member_board_apply_template($bo_table, $template_key, $bo_subject = '')
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return false;
        }

        $templates = icrm_member_board_templates();
        if (!isset($templates[$template_key])) {
            $template_key = 'column';
        }
        $tpl = $templates[$template_key];

        $board = icrm_member_board_fetch($bo_table);
        if (empty($board['bo_table'])) {
            return false;
        }

        if ($bo_subject === '') {
            $bo_subject = (string) ($board['bo_subject'] ?? $bo_table);
        }

        $skin = icrm_member_board_resolve_skin($tpl['skin']);
        $mobile_skin = icrm_member_board_resolve_skin($tpl['mobile_skin']);

        sql_query(" update {$g5['board_table']}
            set bo_subject = '" . sql_real_escape_string($bo_subject) . "',
                bo_mobile_subject = '" . sql_real_escape_string($bo_subject) . "',
                bo_comment_level = '" . sql_real_escape_string((string) $tpl['bo_comment_level']) . "',
                bo_use_category = '" . sql_real_escape_string((string) $tpl['use_category']) . "',
                bo_category_list = '" . sql_real_escape_string((string) $tpl['category_list']) . "',
                bo_use_comment = '" . ($tpl['bo_comment_level'] === '0' ? '0' : '1') . "',
                bo_skin = '" . sql_real_escape_string($skin) . "',
                bo_mobile_skin = '" . sql_real_escape_string($mobile_skin) . "'
            where bo_table = '" . sql_real_escape_string($bo_table) . "' ", false);

        return true;
    }
}

if (!function_exists('icrm_member_board_connect')) {
    /**
     * 기존 게시판을 iCRM board-log에 연결 (최고관리자)
     *
     * @param array $input bo_table, template, mb_id(담당 회원)
     * @return array
     */
    function icrm_member_board_connect(array $input)
    {
        global $member;

        if (!icrm_member_board_can_connect()) {
            return array('success' => false, 'message' => '기존 게시판 연결은 최고관리자만 할 수 있습니다.');
        }

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower(trim((string) ($input['bo_table'] ?? ''))));
        $template_key = preg_replace('/[^a-z_]/', '', (string) ($input['template'] ?? ''));
        $mb_id = isset($input['mb_id']) ? preg_replace('/[^a-z0-9_]/i', '', trim((string) $input['mb_id'])) : '';

        if ($bo_table === '') {
            return array('success' => false, 'message' => '연결할 게시판을 선택하세요.');
        }

        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }
        if ($mb_id === '') {
            return array('success' => false, 'message' => '담당 회원 ID를 입력하세요.');
        }

        $owner = get_member($mb_id);
        if (empty($owner['mb_id'])) {
            return array('success' => false, 'message' => '담당 회원을 찾을 수 없습니다.');
        }

        if (icrm_member_board_is_logged($bo_table)) {
            return array('success' => false, 'message' => '이미 연결된 게시판입니다.');
        }

        $board = icrm_member_board_fetch($bo_table);
        if (empty($board['bo_table'])) {
            return array('success' => false, 'message' => '게시판을 찾을 수 없습니다.');
        }

        $templates = icrm_member_board_templates();
        if ($template_key === '' || !isset($templates[$template_key])) {
            $template_key = icrm_member_board_guess_template($board);
        }

        if (!icrm_member_board_apply_template($bo_table, $template_key, (string) ($board['bo_subject'] ?? $bo_table))) {
            return array('success' => false, 'message' => '템플릿 적용에 실패했습니다.');
        }

        $now = date('Y-m-d H:i:s');
        $log = icrm_member_board_read_log();
        $log[] = array(
            'bo_table'   => $bo_table,
            'bo_subject' => (string) ($board['bo_subject'] ?? $bo_table),
            'template'   => $template_key,
            'mb_id'      => $mb_id,
            'source'     => 'linked',
            'linked_at'  => $now,
            'created_at' => $now,
        );
        icrm_member_board_write_log($log);

        if (function_exists('auto_comment_ensure_board_config')) {
            auto_comment_ensure_board_config($bo_table);
        }

        $board_url = G5_BBS_URL . '/board.php?bo_table=' . rawurlencode($bo_table);

        return array(
            'success'    => true,
            'message'    => '기존 게시판이 연결되었습니다. 콘텐츠 발행·플랫폼 스킨 적용 대상에 포함됩니다.',
            'bo_table'   => $bo_table,
            'bo_subject' => (string) ($board['bo_subject'] ?? $bo_table),
            'template'   => $template_key,
            'mb_id'      => $mb_id,
            'board_url'  => $board_url,
        );
    }
}

if (!function_exists('icrm_member_board_log_index')) {
    function icrm_member_board_log_index()
    {
        $index = array();
        foreach (icrm_member_board_read_log() as $row) {
            if (!is_array($row) || empty($row['bo_table'])) {
                continue;
            }
            $bt = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $row['bo_table']));
            if ($bt !== '') {
                $index[$bt] = $row;
            }
        }

        return $index;
    }
}

if (!function_exists('icrm_member_board_list_all_from_db')) {
    /**
     * 그누보드에 이미 생성된 모든 게시판
     */
    function icrm_member_board_list_all_from_db($limit = 100)
    {
        global $g5;

        $rows = array();
        $res = sql_query(" select bo_table, bo_subject, bo_mobile_subject, bo_skin, bo_mobile_skin
                           from {$g5['board_table']}
                           order by bo_table ");
        while ($b = sql_fetch_array($res)) {
            if (empty($b['bo_table'])) {
                continue;
            }
            $bt = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $b['bo_table']));
            if ($bt === '') {
                continue;
            }
            $rows[] = array(
                'bo_table'          => $bt,
                'bo_subject'        => (string) ($b['bo_subject'] ?? $bt),
                'bo_mobile_subject' => (string) ($b['bo_mobile_subject'] ?? $b['bo_subject'] ?? ''),
                'bo_skin'           => (string) ($b['bo_skin'] ?? ''),
                'bo_mobile_skin'    => (string) ($b['bo_mobile_skin'] ?? ''),
            );
        }

        return array_slice($rows, 0, max(1, (int) $limit));
    }
}

if (!function_exists('icrm_member_board_design_preview_urls')) {
    function icrm_member_board_design_preview_urls($bo_table)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '' || !defined('G5_BBS_URL')) {
            return array();
        }

        return array(
            'list_url'  => G5_BBS_URL . '/board.php?bo_table=' . rawurlencode($bo_table),
            'write_url' => G5_BBS_URL . '/write.php?bo_table=' . rawurlencode($bo_table),
        );
    }
}

if (!function_exists('icrm_member_board_list_for_design')) {
    /**
     * 게시판 디자인 관리 — iCRM 연결 여부와 관계없이 기존 게시판 포함
     */
    function icrm_member_board_list_for_design($mb_id = '')
    {
        global $member;

        $mb_id = trim((string) $mb_id);
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }

        $log_index = icrm_member_board_log_index();
        $templates = icrm_member_board_templates();
        $rows = array();

        foreach (icrm_member_board_list_all_from_db() as $board) {
            $bt = (string) $board['bo_table'];
            $log = isset($log_index[$bt]) ? $log_index[$bt] : null;
            $merged = is_array($log) ? array_merge($board, $log) : $board;
            $template = icrm_member_board_guess_template($merged);
            $tpl = isset($templates[$template]) ? $templates[$template] : $templates['column'];
            $preview = icrm_member_board_design_preview_urls($bt);

            $rows[] = array(
                'bo_table'         => $bt,
                'bo_subject'       => (string) ($board['bo_subject'] ?? $bt),
                'template'         => $template,
                'template_label'   => (string) ($tpl['label'] ?? $template),
                'bo_skin'          => (string) ($board['bo_skin'] ?? ''),
                'bo_mobile_skin'   => (string) ($board['bo_mobile_skin'] ?? ''),
                'linked'           => $log !== null,
                'source'           => $log !== null ? (string) ($log['source'] ?? 'linked') : 'existing',
                'list_url'         => (string) ($preview['list_url'] ?? ''),
                'write_url'        => (string) ($preview['write_url'] ?? ''),
            );
        }

        return $rows;
    }
}

if (!function_exists('icrm_member_board_ensure_log_entry')) {
    function icrm_member_board_ensure_log_entry($bo_table, $template_key, $mb_id = '')
    {
        global $member;

        $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $bo_table));
        if ($bo_table === '') {
            return false;
        }

        $mb_id = trim((string) $mb_id);
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }
        if ($mb_id === '') {
            global $is_admin;
            if ($is_admin === 'super') {
                $mb_id = 'admin';
            } else {
                return false;
            }
        }

        $board = icrm_member_board_fetch($bo_table);
        if (empty($board['bo_table'])) {
            return false;
        }

        $now = date('Y-m-d H:i:s');
        $log = icrm_member_board_read_log();
        foreach ($log as $idx => $row) {
            if (!is_array($row) || empty($row['bo_table'])) {
                continue;
            }
            if (preg_replace('/[^a-z0-9_]/', '', strtolower((string) $row['bo_table'])) !== $bo_table) {
                continue;
            }
            $log[$idx]['template'] = $template_key;
            $log[$idx]['updated_at'] = $now;
            if (empty($log[$idx]['source'])) {
                $log[$idx]['source'] = 'linked';
            }
            icrm_member_board_write_log($log);

            return true;
        }

        $log[] = array(
            'bo_table'   => $bo_table,
            'bo_subject' => (string) ($board['bo_subject'] ?? $bo_table),
            'template'   => $template_key,
            'mb_id'      => $mb_id,
            'source'     => 'linked',
            'linked_at'  => $now,
            'created_at' => $now,
        );
        icrm_member_board_write_log($log);

        return true;
    }
}

if (!function_exists('icrm_member_board_apply_design_batch')) {
    /**
     * @param array $items array of array(bo_table, template)
     */
    function icrm_member_board_apply_design_batch(array $items, $mb_id = '')
    {
        global $is_admin;

        if (!function_exists('icrm_member_can_design') || !icrm_member_can_design()) {
            return array('success' => false, 'message' => '게시판 디자인 적용 권한이 없습니다.');
        }

        $templates = icrm_member_board_templates();
        $applied = array();
        $errors = array();

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $bo_table = preg_replace('/[^a-z0-9_]/', '', strtolower(trim((string) ($item['bo_table'] ?? ''))));
            $template_key = preg_replace('/[^a-z_]/', '', (string) ($item['template'] ?? ''));
            if ($bo_table === '') {
                continue;
            }
            if ($template_key === '' || !isset($templates[$template_key])) {
                $errors[] = $bo_table . ': 템플릿 오류';
                continue;
            }

            if (!icrm_member_board_apply_template($bo_table, $template_key)) {
                $errors[] = $bo_table . ': 적용 실패';
                continue;
            }

            icrm_member_board_ensure_log_entry($bo_table, $template_key, $mb_id);
            $applied[] = $bo_table;
        }

        if ($applied === array() && $errors !== array()) {
            return array('success' => false, 'message' => implode(' · ', $errors));
        }

        $message = count($applied) . '개 게시판 디자인을 적용했습니다.';
        if ($errors !== array()) {
            $message .= ' (' . implode(' · ', $errors) . ')';
        }

        return array(
            'success' => true,
            'message' => $message,
            'applied' => $applied,
            'errors'  => $errors,
        );
    }
}

if (!function_exists('icrm_member_board_resolve_design_mb_id')) {
    function icrm_member_board_resolve_design_mb_id($mb_id = '')
    {
        global $member, $is_admin;

        $mb_id = trim((string) $mb_id);
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }
        if ($mb_id === '' && $is_admin === 'super') {
            $mb_id = 'admin';
        }

        return $mb_id;
    }
}

if (!function_exists('icrm_member_board_bootstrap_existing')) {
    /**
     * 그누보드 기본 게시판을 iCRM board-log에 자동 등록 (연결 없이 디자인 관리 가능)
     */
    function icrm_member_board_bootstrap_existing($mb_id = '')
    {
        if (!function_exists('icrm_member_can_design') || !icrm_member_can_design()) {
            return array('success' => false, 'linked' => 0, 'message' => '권한이 없습니다.');
        }

        $mb_id = icrm_member_board_resolve_design_mb_id($mb_id);
        if ($mb_id === '') {
            return array('success' => false, 'linked' => 0, 'message' => '회원 정보가 없습니다.');
        }

        $linked = 0;
        foreach (icrm_member_board_list_all_from_db() as $board) {
            $bt = (string) ($board['bo_table'] ?? '');
            if ($bt === '' || icrm_member_board_is_logged($bt)) {
                continue;
            }
            $template = icrm_member_board_guess_template($board);
            if (icrm_member_board_ensure_log_entry($bt, $template, $mb_id)) {
                $linked++;
            }
        }

        return array(
            'success' => true,
            'linked'  => $linked,
            'message' => $linked > 0 ? $linked . '개 기존 게시판을 등록했습니다.' : '등록할 새 게시판이 없습니다.',
        );
    }
}

if (!function_exists('icrm_member_board_apply_all_defaults')) {
    /**
     * 사이트의 모든 게시판에 온오프 템플릿 스킨 적용
     *
     * @param string $mb_id
     * @param bool   $only_legacy basic/gallery 등 기본 스킨만
     */
    function icrm_member_board_apply_all_defaults($mb_id = '', $only_legacy = false)
    {
        $mb_id = icrm_member_board_resolve_design_mb_id($mb_id);
        $legacy_skins = array('', 'basic', 'gallery');
        $items = array();

        icrm_member_board_bootstrap_existing($mb_id);

        foreach (icrm_member_board_list_all_from_db() as $board) {
            $bt = (string) ($board['bo_table'] ?? '');
            if ($bt === '') {
                continue;
            }
            $skin = (string) ($board['bo_skin'] ?? '');
            if ($only_legacy && !in_array($skin, $legacy_skins, true)) {
                continue;
            }
            $items[] = array(
                'bo_table' => $bt,
                'template' => icrm_member_board_guess_template($board),
            );
        }

        if ($items === array()) {
            return array('success' => true, 'message' => '적용할 게시판이 없습니다.', 'applied' => array());
        }

        return icrm_member_board_apply_design_batch($items, $mb_id);
    }
}

if (!function_exists('icrm_member_board_maybe_apply_defaults_after_update')) {
    function icrm_member_board_maybe_apply_defaults_after_update()
    {
        if (!is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
            return array('skipped' => true);
        }
        include_once G5_LIB_PATH . '/icrm-member-board.lib.php';

        if (!function_exists('icrm_member_board_apply_all_defaults')) {
            return array('skipped' => true);
        }

        $flag = '';
        if (function_exists('g5site_cfg')) {
            $flag = trim(g5site_cfg('board_design_defaults_applied_at', ''));
        }
        if ($flag !== '') {
            return array('skipped' => true, 'message' => 'already applied');
        }

        $boards = icrm_member_board_list_all_from_db();
        if ($boards === array()) {
            return array('skipped' => true, 'message' => 'no boards');
        }

        $result = icrm_member_board_apply_all_defaults('', true);
        if (empty($result['success'])) {
            return $result;
        }

        if (is_file(G5_LIB_PATH . '/onoff-platform-skin.lib.php')) {
            include_once G5_LIB_PATH . '/onoff-platform-skin.lib.php';
            if (function_exists('onoff_platform_maybe_apply_board_editor_defaults')) {
                onoff_platform_maybe_apply_board_editor_defaults();
            }
        }

        if (function_exists('onoff_builder_set_site_config_key')) {
            onoff_builder_set_site_config_key('board_design_defaults_applied_at', date('Y-m-d H:i:s'));
        } elseif (is_file(G5_PATH . '/_site.config.php') && is_writable(G5_PATH . '/_site.config.php')) {
            $path = G5_PATH . '/_site.config.php';
            $contents = (string) file_get_contents($path);
            $line = "    'board_design_defaults_applied_at' => '" . date('Y-m-d H:i:s') . "',";
            if (strpos($contents, 'board_design_defaults_applied_at') === false) {
                $marker = "\n);\n\n/**";
                if (strpos($contents, $marker) !== false) {
                    $block = "\n    /* icrm-member-board */\n" . $line . "\n";
                    $contents = str_replace($marker, $block . $marker, $contents);
                    @file_put_contents($path, $contents, LOCK_EX);
                }
            }
        }

        return $result;
    }
}

if (!function_exists('icrm_member_board_design_apply_many')) {
    /** @deprecated icrm_member_board_apply_design_batch 사용 */
    function icrm_member_board_design_apply_many(array $map, $mb_id = '')
    {
        $items = array();
        foreach ($map as $bo_table => $template) {
            $items[] = array(
                'bo_table' => (string) $bo_table,
                'template' => (string) $template,
            );
        }

        return icrm_member_board_apply_design_batch($items, $mb_id);
    }
}
