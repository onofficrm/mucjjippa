<?php
/**
 * iCRM 콘텐츠 수집기 — 그누보드 클라이언트 (수집·재생성은 iCRM, 그누보드는 수신·초안·발행)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

define('ICRM_CONTENT_VERSION', '1.0.0');

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

if (!function_exists('icrm_content_table')) {
    function icrm_content_table($suffix = 'items')
    {
        $prefix = function_exists('icrm_table_prefix') ? icrm_table_prefix() : (defined('G5_TABLE_PREFIX') ? G5_TABLE_PREFIX : 'g5_');

        return $prefix . 'icrm_content_' . $suffix;
    }
}

if (!function_exists('icrm_content_escape')) {
    function icrm_content_escape($value)
    {
        return sql_escape_string((string) $value);
    }
}

if (!function_exists('icrm_content_get_api_base_url')) {
    function icrm_content_get_api_base_url()
    {
        $url = function_exists('onoff_builder_config_api_base_url')
            ? onoff_builder_config_api_base_url('content_api_base_url', '')
            : '';
        if ($url === '' && function_exists('g5site_cfg')) {
            $url = trim(g5site_cfg('icrm_content_api_base_url', ''));
        }
        if ($url === '') {
            $url = 'https://icrm.co.kr/api/content-collector';
        }

        return rtrim($url, '/');
    }
}

if (!function_exists('icrm_content_api_url')) {
    /**
     * iCRM content-collector API URL (rewrite 없이도 동작하는 .php shim 우선)
     */
    function icrm_content_api_url($endpoint)
    {
        $base = icrm_content_get_api_base_url();
        $endpoint = trim(str_replace('\\', '/', (string) $endpoint), '/');
        $map = array(
            'collect'     => 'collect.php',
            'job-status'  => 'job-status.php',
            'settings'    => 'settings.php',
            'rules'       => 'rules.php',
            'items'       => 'items.php',
        );

        if (isset($map[$endpoint])) {
            return $base . '/' . $map[$endpoint];
        }

        return $base . '/' . $endpoint;
    }
}

if (!function_exists('icrm_content_get_license_key')) {
    function icrm_content_get_license_key()
    {
        if (function_exists('icrm_point_get_license_key')) {
            return icrm_point_get_license_key();
        }
        if (function_exists('g5site_cfg')) {
            return trim(g5site_cfg('icrm_license_key', ''));
        }

        return '';
    }
}

if (!function_exists('icrm_content_site_domain')) {
    function icrm_content_site_domain()
    {
        if (!empty($_SERVER['HTTP_HOST'])) {
            $host = strtolower(preg_replace('/[^a-zA-Z0-9.\-:]/', '', (string) $_SERVER['HTTP_HOST']));
            if ($host !== '') {
                return $host;
            }
        }

        if (function_exists('g5b_seo_meta_site_domain')) {
            return g5b_seo_meta_site_domain();
        }
        if (function_exists('icrm_rank_site_domain')) {
            return icrm_rank_site_domain();
        }
        if (defined('G5_URL') && G5_URL) {
            $host = parse_url(G5_URL, PHP_URL_HOST);
            if ($host) {
                return strtolower($host);
            }
        }

        return '';
    }
}

if (!function_exists('icrm_content_is_enabled')) {
    function icrm_content_is_enabled()
    {
        if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('content_collector_builtin', true)) {
            return false;
        }

        return true;
    }
}

if (!function_exists('icrm_content_get_default_bo_table')) {
    function icrm_content_get_default_bo_table()
    {
        if (function_exists('g5site_cfg')) {
            return preg_replace('/[^a-z0-9_]/i', '', trim(g5site_cfg('icrm_content_default_bo_table', '')));
        }

        return '';
    }
}

if (!function_exists('icrm_content_get_default_mb_id')) {
    function icrm_content_get_default_mb_id()
    {
        $mb_id = '';
        if (function_exists('g5site_cfg')) {
            $mb_id = trim(g5site_cfg('icrm_content_default_mb_id', ''));
        }
        if ($mb_id === '' && function_exists('icrm_point_get_admin_mb_id')) {
            $mb_id = icrm_point_get_admin_mb_id();
        }

        return $mb_id;
    }
}

if (!function_exists('icrm_content_ensure_tables')) {
    function icrm_content_ensure_tables()
    {
        static $done = false;
        if ($done) {
            return;
        }

        $items = icrm_content_table('items');
        $jobs = icrm_content_table('jobs');

        sql_query(" create table if not exists {$items} (
            ici_id int not null auto_increment,
            request_id varchar(64) not null default '',
            icrm_job_id varchar(64) not null default '',
            source_url varchar(512) not null default '',
            source_hash varchar(64) not null default '',
            source_title varchar(255) not null default '',
            bo_table varchar(20) not null default '',
            mb_id varchar(20) not null default '',
            ca_name varchar(50) not null default '',
            wr_id int not null default 0,
            subject varchar(255) not null default '',
            content_html mediumtext not null,
            seo_json text not null,
            rank_keywords text not null,
            status varchar(20) not null default 'review',
            reject_reason text not null,
            notes text not null,
            cost_krw decimal(12,4) not null default 0,
            points_charged int not null default 0,
            created_at datetime not null default '0000-00-00 00:00:00',
            updated_at datetime not null default '0000-00-00 00:00:00',
            published_at datetime not null default '0000-00-00 00:00:00',
            primary key (ici_id),
            unique key request_id (request_id),
            unique key source_hash (source_hash),
            key status (status),
            key bo_table (bo_table),
            key wr_id (wr_id),
            key created_at (created_at)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8 ", false);

        sql_query(" create table if not exists {$jobs} (
            icj_id int not null auto_increment,
            request_id varchar(64) not null default '',
            source_url varchar(512) not null default '',
            source_type varchar(20) not null default '',
            keyword varchar(255) not null default '',
            bo_table varchar(20) not null default '',
            mb_id varchar(20) not null default '',
            icrm_job_id varchar(64) not null default '',
            status varchar(20) not null default 'queued',
            error_message text not null,
            created_at datetime not null default '0000-00-00 00:00:00',
            updated_at datetime not null default '0000-00-00 00:00:00',
            primary key (icj_id),
            unique key request_id (request_id),
            key status (status),
            key created_at (created_at)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8 ", false);

        $col = sql_fetch(" show columns from {$jobs} like 'source_type' ");
        if (!$col) {
            sql_query(" alter table {$jobs} add source_type varchar(20) not null default '' after source_url ", false);
        }
        $col = sql_fetch(" show columns from {$jobs} like 'keyword' ");
        if (!$col) {
            sql_query(" alter table {$jobs} add keyword varchar(255) not null default '' after source_type ", false);
        }

        $col = sql_fetch(" show columns from {$items} like 'source_type' ");
        if (!$col) {
            sql_query(" alter table {$items} add source_type varchar(20) not null default '' after source_url ", false);
        }
        $col = sql_fetch(" show columns from {$items} like 'excerpt' ");
        if (!$col) {
            sql_query(" alter table {$items} add excerpt varchar(1000) not null default '' after content_html ", false);
        }
        $col = sql_fetch(" show columns from {$items} like 'collect_mode' ");
        if (!$col) {
            sql_query(" alter table {$items} add collect_mode varchar(20) not null default 'source' after excerpt ", false);
        }

        $done = true;
    }
}

if (!function_exists('icrm_content_bootstrap')) {
    function icrm_content_bootstrap()
    {
        if (!icrm_content_is_enabled()) {
            return false;
        }

        icrm_content_ensure_tables();

        return true;
    }
}

if (!function_exists('icrm_content_make_request_id')) {
    function icrm_content_make_request_id($task = 'import')
    {
        if (function_exists('icrm_point_make_request_id')) {
            return icrm_point_make_request_id('content', $task);
        }

        try {
            $rand = bin2hex(random_bytes(8));
        } catch (Exception $e) {
            $rand = md5(uniqid('', true));
        }

        return 'content_' . preg_replace('/[^a-z0-9_]/', '', (string) $task) . '_' . date('YmdHis') . '_' . $rand;
    }
}

if (!function_exists('icrm_content_hash_source')) {
    function icrm_content_hash_source($source_url, $domain = '')
    {
        $source_url = trim((string) $source_url);
        if ($domain === '') {
            $domain = icrm_content_site_domain();
        }

        return hash('sha256', strtolower($domain) . '|' . strtolower($source_url));
    }
}

if (!function_exists('icrm_content_row_to_item')) {
    function icrm_content_row_to_item(array $row)
    {
        $seo = array();
        if (!empty($row['seo_json'])) {
            $decoded = json_decode((string) $row['seo_json'], true);
            if (is_array($decoded)) {
                $seo = $decoded;
            }
        }

        $rank_keywords = array();
        if (!empty($row['rank_keywords'])) {
            $text = str_replace(array("\r\n", "\r"), "\n", (string) $row['rank_keywords']);
            foreach (explode("\n", $text) as $line) {
                $kw = trim($line);
                if ($kw !== '' && !in_array($kw, $rank_keywords, true)) {
                    $rank_keywords[] = $kw;
                }
            }
        }

        return array(
            'ici_id'         => (int) $row['ici_id'],
            'request_id'     => (string) $row['request_id'],
            'icrm_job_id'    => (string) $row['icrm_job_id'],
            'source_url'     => (string) $row['source_url'],
            'source_type'    => icrm_content_item_infer_source_type(
                isset($row['source_type']) ? (string) $row['source_type'] : '',
                (string) $row['source_url']
            ),
            'source_hash'    => (string) $row['source_hash'],
            'source_title'   => (string) $row['source_title'],
            'bo_table'       => (string) $row['bo_table'],
            'mb_id'          => (string) $row['mb_id'],
            'ca_name'        => (string) $row['ca_name'],
            'wr_id'          => (int) $row['wr_id'],
            'subject'        => (string) $row['subject'],
            'content_html'   => (string) $row['content_html'],
            'excerpt'        => icrm_content_item_excerpt($row),
            'collect_mode'   => isset($row['collect_mode']) ? (string) $row['collect_mode'] : 'source',
            'media_label'    => icrm_content_item_media_label(
                isset($row['source_type']) ? (string) $row['source_type'] : '',
                (string) $row['source_url']
            ),
            'source_host'    => icrm_content_item_source_host((string) $row['source_url']),
            'seo'            => $seo,
            'rank_keywords'  => $rank_keywords,
            'status'         => (string) $row['status'],
            'reject_reason'  => (string) $row['reject_reason'],
            'notes'          => (string) $row['notes'],
            'cost_krw'       => (float) $row['cost_krw'],
            'points_charged' => (int) $row['points_charged'],
            'created_at'     => (string) $row['created_at'],
            'updated_at'     => (string) $row['updated_at'],
            'published_at'   => (string) $row['published_at'],
        );
    }
}

if (!function_exists('icrm_content_item_infer_source_type')) {
    function icrm_content_item_infer_source_type($source_type, $source_url)
    {
        $source_type = preg_replace('/[^a-z_]/', '', (string) $source_type);
        if (in_array($source_type, array('youtube', 'rss', 'web', 'naver'), true)) {
            return $source_type;
        }

        return icrm_content_job_infer_source_type('', $source_url);
    }
}

if (!function_exists('icrm_content_item_media_label')) {
    function icrm_content_item_media_label($source_type, $source_url = '')
    {
        return icrm_content_job_media_label($source_type, $source_url);
    }
}

if (!function_exists('icrm_content_item_source_host')) {
    function icrm_content_item_source_host($source_url)
    {
        $host = strtolower(trim((string) @parse_url((string) $source_url, PHP_URL_HOST)));
        if ($host === '') {
            return '';
        }

        return preg_replace('/^www\./', '', $host);
    }
}

if (!function_exists('icrm_content_item_excerpt')) {
    function icrm_content_item_excerpt(array $row)
    {
        if (!empty($row['excerpt'])) {
            return trim((string) $row['excerpt']);
        }

        $html = (string) ($row['content_html'] ?? '');
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($html)));
        if ($text === '') {
            return '';
        }

        return function_exists('mb_strimwidth')
            ? mb_strimwidth($text, 0, 180, '…', 'UTF-8')
            : substr($text, 0, 180);
    }
}

if (!function_exists('icrm_content_get_item')) {
    function icrm_content_get_item($ici_id)
    {
        icrm_content_ensure_tables();
        $ici_id = (int) $ici_id;
        if ($ici_id < 1) {
            return null;
        }

        $row = sql_fetch(" select * from " . icrm_content_table('items') . " where ici_id = '{$ici_id}' limit 1 ");
        if (!$row || empty($row['ici_id'])) {
            return null;
        }

        return icrm_content_row_to_item($row);
    }
}

if (!function_exists('icrm_content_find_by_source_hash')) {
    function icrm_content_find_by_source_hash($source_hash)
    {
        icrm_content_ensure_tables();
        $source_hash = preg_replace('/[^a-f0-9]/', '', strtolower((string) $source_hash));
        if ($source_hash === '') {
            return null;
        }

        $row = sql_fetch(" select * from " . icrm_content_table('items') . "
                           where source_hash = '" . icrm_content_escape($source_hash) . "'
                           limit 1 ");
        if (!$row || empty($row['ici_id'])) {
            return null;
        }

        return icrm_content_row_to_item($row);
    }
}

if (!function_exists('icrm_content_validate_license_payload')) {
    function icrm_content_validate_license_payload(array $json)
    {
        $license = isset($json['license_key']) ? trim((string) $json['license_key']) : '';
        $domain = isset($json['domain']) ? strtolower(trim((string) $json['domain'])) : '';

        $expected_key = icrm_content_get_license_key();
        $expected_domain = icrm_content_site_domain();

        if ($expected_key === '') {
            return array('ok' => false, 'error' => 'license_not_configured');
        }

        if ($license === '' || !hash_equals($expected_key, $license)) {
            return array('ok' => false, 'error' => 'invalid_license');
        }

        if ($domain !== '' && $expected_domain !== '' && $domain !== $expected_domain) {
            return array('ok' => false, 'error' => 'domain_mismatch');
        }

        return array('ok' => true);
    }
}

if (!function_exists('icrm_content_import_payload')) {
    /**
     * iCRM → 그누보드 수신 (초안 저장)
     *
     * @param array $json
     * @return array
     */
    function icrm_content_import_payload(array $json)
    {
        icrm_content_ensure_tables();

        $license_check = icrm_content_validate_license_payload($json);
        if (!$license_check['ok']) {
            return array('ok' => false, 'error' => $license_check['error'], 'message' => '라이선스 또는 도메인 검증 실패');
        }

        $source_url = isset($json['source_url']) ? trim((string) $json['source_url']) : '';
        if ($source_url === '') {
            return array('ok' => false, 'error' => 'missing_source_url', 'message' => 'source_url 이 필요합니다.');
        }

        $source_hash = isset($json['source_hash']) ? trim((string) $json['source_hash']) : '';
        if ($source_hash === '') {
            $source_hash = icrm_content_hash_source($source_url);
        }

        $existing = icrm_content_find_by_source_hash($source_hash);
        if ($existing && $existing['status'] !== 'rejected') {
            return array(
                'ok'      => true,
                'duplicate' => true,
                'ici_id'  => $existing['ici_id'],
                'status'  => $existing['status'],
                'wr_id'   => $existing['wr_id'],
                'message' => '이미 수집된 URL입니다.',
            );
        }

        $request_id = isset($json['request_id']) ? trim((string) $json['request_id']) : '';
        if ($request_id === '') {
            $request_id = icrm_content_make_request_id('import');
        }

        $dup_req = sql_fetch(" select ici_id from " . icrm_content_table('items') . "
                               where request_id = '" . icrm_content_escape($request_id) . "' limit 1 ");
        if ($dup_req && !empty($dup_req['ici_id'])) {
            $item = icrm_content_get_item((int) $dup_req['ici_id']);

            return array(
                'ok'     => true,
                'duplicate' => true,
                'ici_id' => (int) $dup_req['ici_id'],
                'status' => $item ? $item['status'] : 'review',
                'message' => '동일 request_id 로 이미 처리되었습니다.',
            );
        }

        $bo_table = isset($json['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $json['bo_table']) : '';
        if ($bo_table === '') {
            $bo_table = icrm_content_get_default_bo_table();
        }
        if ($bo_table === '' || !function_exists('icrm_validate_bo_table') || !icrm_validate_bo_table($bo_table)) {
            return array('ok' => false, 'error' => 'invalid_bo_table', 'message' => '유효한 bo_table 이 필요합니다.');
        }

        $mb_id = isset($json['mb_id']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $json['mb_id']) : '';
        if ($mb_id === '') {
            $mb_id = icrm_content_get_default_mb_id();
        }
        if ($mb_id === '' || !function_exists('get_member')) {
            return array('ok' => false, 'error' => 'invalid_mb_id', 'message' => '작성자 mb_id 가 필요합니다.');
        }
        $member = get_member($mb_id);
        if (empty($member['mb_id'])) {
            return array('ok' => false, 'error' => 'member_not_found', 'message' => '회원을 찾을 수 없습니다: ' . $mb_id);
        }

        $subject = isset($json['subject']) ? trim((string) $json['subject']) : '';
        if ($subject === '') {
            return array('ok' => false, 'error' => 'missing_subject', 'message' => 'subject 가 필요합니다.');
        }

        $content_html = isset($json['content_html']) ? (string) $json['content_html'] : '';
        if (isset($json['content']) && $content_html === '') {
            $content_html = (string) $json['content'];
        }
        if (trim(strip_tags($content_html)) === '') {
            return array('ok' => false, 'error' => 'missing_content', 'message' => 'content_html 이 필요합니다.');
        }

        $seo = isset($json['seo']) && is_array($json['seo']) ? $json['seo'] : array();
        if (empty($seo) && isset($json['seo_meta']) && is_array($json['seo_meta'])) {
            $seo = $json['seo_meta'];
        }

        $rank_keywords = array();
        if (!empty($json['rank_keywords']) && is_array($json['rank_keywords'])) {
            $rank_keywords = $json['rank_keywords'];
        } elseif (!empty($json['keywords']) && is_array($json['keywords'])) {
            $rank_keywords = $json['keywords'];
        }
        if (function_exists('icrm_rank_parse_keywords')) {
            $rank_keywords = icrm_rank_parse_keywords($rank_keywords);
        } else {
            $clean = array();
            foreach ((array) $rank_keywords as $kw) {
                $kw = trim((string) $kw);
                if ($kw !== '') {
                    $clean[] = $kw;
                }
            }
            $rank_keywords = array_slice($clean, 0, 10);
        }

        $status = isset($json['status']) ? preg_replace('/[^a-z_]/', '', (string) $json['status']) : 'review';
        if (!in_array($status, array('review', 'pending'), true)) {
            $status = 'review';
        }

        $cost_krw = isset($json['cost_krw']) ? (float) $json['cost_krw'] : 0;
        $points_charged = isset($json['points_charged']) ? (int) $json['points_charged'] : 0;

        if (function_exists('icrm_point_apply_api_response')
            && ($points_charged > 0 || $cost_krw > 0)
            && (!function_exists('icrm_point_usage_already_recorded') || !icrm_point_usage_already_recorded($request_id))) {
            $billing_json = array(
                'success'        => true,
                'cost_krw'       => $cost_krw,
                'points_charged' => $points_charged,
            );
            icrm_point_apply_api_response('content_collector', 'import', $billing_json, $request_id);
        }

        $now = G5_TIME_YMDHIS;
        $seo_json = json_encode($seo, JSON_UNESCAPED_UNICODE);
        if ($seo_json === false) {
            $seo_json = '{}';
        }

        $rank_text = implode("\n", $rank_keywords);
        $icrm_job_id = isset($json['icrm_job_id']) ? trim((string) $json['icrm_job_id']) : '';
        $source_title = isset($json['source_title']) ? trim((string) $json['source_title']) : '';
        $ca_name = isset($json['ca_name']) ? trim((string) $json['ca_name']) : '';
        $notes = isset($json['notes']) ? trim((string) $json['notes']) : '';
        $source_type = icrm_content_item_infer_source_type(
            isset($json['source_type']) ? (string) $json['source_type'] : '',
            $source_url
        );
        $excerpt = isset($json['excerpt']) ? trim((string) $json['excerpt']) : '';
        if ($excerpt === '' && !empty($json['seo']['description'])) {
            $excerpt = trim((string) $json['seo']['description']);
        }
        $collect_mode = isset($json['collect_mode']) ? preg_replace('/[^a-z_]/', '', (string) $json['collect_mode']) : 'source';
        if (!in_array($collect_mode, array('source', 'regenerate', 'batch'), true)) {
            $collect_mode = 'source';
        }

        sql_query(" insert into " . icrm_content_table('items') . "
                        set request_id = '" . icrm_content_escape($request_id) . "',
                            icrm_job_id = '" . icrm_content_escape($icrm_job_id) . "',
                            source_url = '" . icrm_content_escape($source_url) . "',
                            source_type = '" . icrm_content_escape($source_type) . "',
                            source_hash = '" . icrm_content_escape($source_hash) . "',
                            source_title = '" . icrm_content_escape($source_title) . "',
                            bo_table = '" . icrm_content_escape($bo_table) . "',
                            mb_id = '" . icrm_content_escape($mb_id) . "',
                            ca_name = '" . icrm_content_escape($ca_name) . "',
                            subject = '" . icrm_content_escape($subject) . "',
                            content_html = '" . icrm_content_escape($content_html) . "',
                            excerpt = '" . icrm_content_escape($excerpt) . "',
                            collect_mode = '" . icrm_content_escape($collect_mode) . "',
                            seo_json = '" . icrm_content_escape($seo_json) . "',
                            rank_keywords = '" . icrm_content_escape($rank_text) . "',
                            status = '" . icrm_content_escape($status) . "',
                            notes = '" . icrm_content_escape($notes) . "',
                            cost_krw = '" . (float) $cost_krw . "',
                            points_charged = '" . (int) $points_charged . "',
                            created_at = '{$now}',
                            updated_at = '{$now}' ");

        $ici_id = (int) sql_insert_id();

        sql_query(" update " . icrm_content_table('jobs') . "
                       set status = 'completed',
                           icrm_job_id = '" . icrm_content_escape($icrm_job_id) . "',
                           updated_at = '{$now}'
                     where request_id = '" . icrm_content_escape($request_id) . "' ", false);

        return array(
            'ok'         => true,
            'ici_id'     => $ici_id,
            'request_id' => $request_id,
            'status'     => $status,
            'bo_table'   => $bo_table,
            'mb_id'      => $mb_id,
            'message'    => '콘텐츠 초안이 저장되었습니다.',
        );
    }
}

if (!function_exists('icrm_content_fetch_items')) {
    function icrm_content_fetch_items($status = 'review', $bo_table = '', $page = 1, $per_page = 20, $options = array())
    {
        icrm_content_ensure_tables();
        if (!is_array($options)) {
            $options = array();
        }

        $page = max(1, (int) $page);
        $per_page = max(1, min(100, (int) $per_page));
        $offset = ($page - 1) * $per_page;

        $where = ' where 1=1 ';
        if ($status !== '' && $status !== 'all') {
            $status = preg_replace('/[^a-z_]/', '', (string) $status);
            $where .= " and status = '" . icrm_content_escape($status) . "' ";
        }
        if ($bo_table !== '') {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
            $where .= " and bo_table = '" . icrm_content_escape($bo_table) . "' ";
        }

        $search = isset($options['search']) ? trim((string) $options['search']) : '';
        if ($search !== '') {
            $search_esc = icrm_content_escape($search);
            $where .= " and (subject like '%{$search_esc}%' or source_url like '%{$search_esc}%' or source_title like '%{$search_esc}%' or excerpt like '%{$search_esc}%') ";
        }

        $source_type = isset($options['source_type']) ? preg_replace('/[^a-z_]/', '', (string) $options['source_type']) : '';
        if ($source_type !== '') {
            $where .= " and source_type = '" . icrm_content_escape($source_type) . "' ";
        }

        $mb_id = isset($options['mb_id']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $options['mb_id']) : '';
        if ($mb_id !== '') {
            $where .= " and mb_id = '" . icrm_content_escape($mb_id) . "' ";
        }

        $collect_mode = isset($options['collect_mode']) ? preg_replace('/[^a-z_]/', '', (string) $options['collect_mode']) : '';
        if ($collect_mode !== '') {
            $where .= " and collect_mode = '" . icrm_content_escape($collect_mode) . "' ";
        }

        $total_row = sql_fetch(" select count(*) as cnt from " . icrm_content_table('items') . $where);
        $total = isset($total_row['cnt']) ? (int) $total_row['cnt'] : 0;

        $items = array();
        $res = sql_query(" select * from " . icrm_content_table('items') . $where . "
                           order by ici_id desc
                           limit {$offset}, {$per_page} ");
        while ($row = sql_fetch_array($res)) {
            $items[] = icrm_content_row_to_item($row);
        }

        return array(
            'ok'       => true,
            'items'    => $items,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $per_page,
        );
    }
}

if (!function_exists('icrm_content_get_stats')) {
    function icrm_content_get_stats()
    {
        icrm_content_ensure_tables();

        $stats = array(
            'review'    => 0,
            'published' => 0,
            'rejected'  => 0,
            'total'     => 0,
            'processing'=> 0,
            'today'     => 0,
        );

        $res = sql_query(" select status, count(*) as cnt from " . icrm_content_table('items') . " group by status ");
        while ($row = sql_fetch_array($res)) {
            $st = (string) $row['status'];
            $cnt = (int) $row['cnt'];
            if (isset($stats[$st])) {
                $stats[$st] = $cnt;
            }
            $stats['total'] += $cnt;
        }

        $job_row = sql_fetch(" select count(*) as cnt from " . icrm_content_table('jobs') . "
                               where status in ('queued', 'processing') ");
        $stats['processing'] = isset($job_row['cnt']) ? (int) $job_row['cnt'] : 0;

        $today = G5_TIME_YMD;
        $today_row = sql_fetch(" select count(*) as cnt from " . icrm_content_table('items') . "
                                 where created_at >= '{$today} 00:00:00' ");
        $stats['today'] = isset($today_row['cnt']) ? (int) $today_row['cnt'] : 0;

        return $stats;
    }
}

if (!function_exists('icrm_content_update_draft')) {
    function icrm_content_update_draft($ici_id, array $fields)
    {
        icrm_content_ensure_tables();
        $item = icrm_content_get_item($ici_id);
        if (!$item) {
            return array('ok' => false, 'error' => 'not_found');
        }
        if ($item['status'] === 'published') {
            return array('ok' => false, 'error' => 'already_published');
        }

        $sets = array();
        if (isset($fields['subject'])) {
            $subject = trim((string) $fields['subject']);
            if ($subject !== '') {
                $sets[] = "subject = '" . icrm_content_escape($subject) . "'";
            }
        }
        if (isset($fields['content_html'])) {
            $sets[] = "content_html = '" . icrm_content_escape((string) $fields['content_html']) . "'";
        }
        if (isset($fields['bo_table'])) {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $fields['bo_table']);
            if ($bo_table !== '' && function_exists('icrm_validate_bo_table') && icrm_validate_bo_table($bo_table)) {
                $sets[] = "bo_table = '" . icrm_content_escape($bo_table) . "'";
            }
        }
        if (isset($fields['mb_id'])) {
            $mb_id = preg_replace('/[^a-z0-9_]/i', '', (string) $fields['mb_id']);
            if ($mb_id !== '' && function_exists('get_member')) {
                $member = get_member($mb_id);
                if (!empty($member['mb_id'])) {
                    $sets[] = "mb_id = '" . icrm_content_escape($mb_id) . "'";
                }
            }
        }
        if (isset($fields['ca_name'])) {
            $sets[] = "ca_name = '" . icrm_content_escape(trim((string) $fields['ca_name'])) . "'";
        }
        if (isset($fields['notes'])) {
            $sets[] = "notes = '" . icrm_content_escape(trim((string) $fields['notes'])) . "'";
        }

        if (!$sets) {
            return array('ok' => false, 'error' => 'nothing_to_update');
        }

        $now = G5_TIME_YMDHIS;
        $sets[] = "updated_at = '{$now}'";
        sql_query(" update " . icrm_content_table('items') . " set " . implode(', ', $sets) . " where ici_id = '" . (int) $ici_id . "' ");

        return array('ok' => true, 'item' => icrm_content_get_item($ici_id));
    }
}

if (!function_exists('icrm_compose_get_api_base_url')) {
    function icrm_compose_get_api_base_url()
    {
        $url = function_exists('g5site_cfg') ? trim(g5site_cfg('icrm_compose_api_base_url', '')) : '';
        if ($url === '') {
            $url = 'https://icrm.co.kr/api/compose';
        }

        return rtrim($url, '/');
    }
}

if (!function_exists('icrm_compose_api_url')) {
    function icrm_compose_api_url($endpoint = 'generate')
    {
        $base = icrm_compose_get_api_base_url();
        $endpoint = trim(str_replace('\\', '/', (string) $endpoint), '/');
        if ($endpoint === 'generate') {
            return $base . '/generate.php';
        }

        return $base . '/' . $endpoint;
    }
}

if (!function_exists('icrm_compose_length_to_chars')) {
    function icrm_compose_length_to_chars($length_key)
    {
        $map = array(
            'short'  => 1000,
            'medium' => 1800,
            'long'   => 2500,
            'xlong'  => 3500,
        );
        $length_key = preg_replace('/[^a-z_]/', '', (string) $length_key);

        return isset($map[$length_key]) ? (int) $map[$length_key] : 1800;
    }
}

if (!function_exists('icrm_compose_icrm_request')) {
    function icrm_compose_icrm_request($task, $params = array(), $timeout = 120)
    {
        if (is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
            include_once G5_LIB_PATH . '/seo-meta.lib.php';
        }

        $license_key = function_exists('g5b_seo_meta_get_license_key')
            ? g5b_seo_meta_get_license_key()
            : icrm_content_get_license_key();
        if ($license_key === '') {
            return array('ok' => false, 'error' => 'license_not_configured', 'message' => 'iCRM 라이선스 키를 설정해 주세요.');
        }

        $request_id = function_exists('icrm_point_make_request_id')
            ? icrm_point_make_request_id('compose', $task)
            : '';

        if (!in_array($task, array('styles', 'expand_presets'), true) && function_exists('icrm_point_check_before_call')) {
            $precheck = icrm_point_check_before_call(1);
            if (!$precheck['ok']) {
                return array('ok' => false, 'error' => $precheck['error'], 'message' => $precheck['error']);
            }
        }

        $payload = array_merge(
            function_exists('g5b_seo_meta_site_ai_context') ? g5b_seo_meta_site_ai_context() : array(),
            array(
                'license_key'        => $license_key,
                'domain'             => function_exists('g5b_seo_meta_site_domain') ? g5b_seo_meta_site_domain() : icrm_content_site_domain(),
                'task'               => preg_replace('/[^a-z_]/', '', (string) $task),
                'request_id'         => $request_id,
                'admin_mb_id'        => function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : '',
                'billing_multiplier' => function_exists('icrm_point_get_multiplier') ? icrm_point_get_multiplier() : 6,
            ),
            is_array($params) ? $params : array()
        );

        if (function_exists('icrm_point_is_enabled') && icrm_point_is_enabled()) {
            $billing_mb = function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : '';
            $payload['member_point_balance'] = function_exists('icrm_point_get_balance')
                ? (int) icrm_point_get_balance($billing_mb)
                : 0;
        }

        try {
            $raw = icrm_content_http_post_json(icrm_compose_api_url('generate'), $payload, $timeout);
        } catch (Exception $e) {
            return array('ok' => false, 'error' => 'api_error', 'message' => $e->getMessage());
        }

        $json = json_decode($raw, true);
        if (!is_array($json)) {
            return array('ok' => false, 'error' => 'invalid_response', 'message' => 'iCRM 응답을 해석할 수 없습니다.');
        }

        if (!in_array($task, array('styles', 'expand_presets'), true) && function_exists('icrm_point_apply_api_response')) {
            $billing = icrm_point_apply_api_response('compose', $task, $json, $request_id);
            if (!$billing['ok']) {
                return array(
                    'ok'      => false,
                    'error'   => isset($billing['error']) ? $billing['error'] : 'point_failed',
                    'message' => isset($billing['error']) ? $billing['error'] : '포인트 차감 실패',
                );
            }
        }

        if (empty($json['success'])) {
            $msg = isset($json['message']) && $json['message'] !== '' ? (string) $json['message'] : 'iCRM 요청에 실패했습니다.';
            if (($json['status'] ?? '') === 'point_insufficient'
                && $msg === '포인트가 부족합니다.'
                && function_exists('icrm_point_get_balance')) {
                $local_balance = (int) icrm_point_get_balance();
                if ($local_balance > 0) {
                    $msg = '회원 포인트(' . number_format($local_balance) . 'P)가 iCRM에 전달되지 않았습니다. iCRM·사이트를 최신 업데이트한 뒤 다시 시도해 주세요.';
                }
            }

            return array('ok' => false, 'error' => isset($json['status']) ? (string) $json['status'] : 'api_failed', 'message' => $msg);
        }

        $data = isset($json['data']) && is_array($json['data']) ? $json['data'] : array();

        return array(
            'ok'             => true,
            'data'           => $data,
            'model'          => isset($json['model']) ? (string) $json['model'] : 'icrm-compose',
            'points_charged' => isset($json['points_charged']) ? (int) $json['points_charged'] : 0,
        );
    }
}

if (!function_exists('icrm_content_compose_suggest_titles')) {
    function icrm_content_compose_suggest_titles(array $params = array())
    {
        $topic = isset($params['topic']) ? trim((string) $params['topic']) : '';
        if ($topic === '') {
            return array('ok' => false, 'error' => 'empty_topic', 'message' => '주제를 입력해 주세요.');
        }

        $result = icrm_compose_icrm_request('titles', array(
            'keyword'  => $topic,
            'topic'    => $topic,
            'keywords' => isset($params['keywords']) ? trim((string) $params['keywords']) : '',
            'style'    => isset($params['style']) ? preg_replace('/[^a-z_]/', '', (string) $params['style']) : 'expert',
            'count'    => isset($params['count']) ? (int) $params['count'] : 8,
            'goal_type'=> isset($params['goal_type']) ? preg_replace('/[^a-z_]/', '', (string) $params['goal_type']) : 'seo_ranking',
        ), 90);

        if (!$result['ok']) {
            return $result;
        }

        return array(
            'ok'     => true,
            'titles' => isset($result['data']['titles']) && is_array($result['data']['titles']) ? $result['data']['titles'] : array(),
            'message'=> '제목 후보를 생성했습니다. 원하는 제목을 선택해 본문을 생성하세요.',
        );
    }
}

if (!function_exists('icrm_content_compose_generate_draft')) {
    function icrm_content_compose_generate_draft(array $params = array())
    {
        $topic = isset($params['topic']) ? trim((string) $params['topic']) : '';
        $title = isset($params['title']) ? trim((string) $params['title']) : (isset($params['subject']) ? trim((string) $params['subject']) : '');
        if ($topic === '') {
            return array('ok' => false, 'error' => 'empty_topic', 'message' => '주제를 입력해 주세요.');
        }
        if ($title === '') {
            return array('ok' => false, 'error' => 'empty_title', 'message' => '제목을 선택하거나 입력해 주세요.');
        }

        $length_key = isset($params['length']) ? preg_replace('/[^a-z_]/', '', (string) $params['length']) : 'medium';
        $target_chars = isset($params['target_chars']) ? (int) $params['target_chars'] : icrm_compose_length_to_chars($length_key);

        $result = icrm_compose_icrm_request('generate', array(
            'keyword'      => $topic,
            'topic'        => $topic,
            'title'        => $title,
            'subject'      => $title,
            'keywords'     => isset($params['keywords']) ? trim((string) $params['keywords']) : '',
            'style'        => isset($params['style']) ? preg_replace('/[^a-z_]/', '', (string) $params['style']) : 'expert',
            'target_chars' => $target_chars,
            'goal_type'    => isset($params['goal_type']) ? preg_replace('/[^a-z_]/', '', (string) $params['goal_type']) : 'seo_ranking',
        ), 180);

        if (!$result['ok']) {
            return $result;
        }

        $data = $result['data'];

        return array(
            'ok'      => true,
            'data'    => array(
                'subject' => isset($data['subject']) ? (string) $data['subject'] : $title,
                'content' => isset($data['content']) ? (string) $data['content'] : '',
            ),
            'subject' => isset($data['subject']) ? (string) $data['subject'] : $title,
            'content' => isset($data['content']) ? (string) $data['content'] : '',
            'message' => '본문 초안을 생성했습니다. 내용을 확인한 뒤 발행하세요.',
        );
    }
}

if (!function_exists('icrm_content_compose_expand_presets')) {
    function icrm_content_compose_expand_presets()
    {
        $result = icrm_compose_icrm_request('expand_presets', array(), 20);
        if (!$result['ok']) {
            return $result;
        }

        return array(
            'ok'      => true,
            'presets' => isset($result['data']['presets']) && is_array($result['data']['presets']) ? $result['data']['presets'] : array(),
        );
    }
}

if (!function_exists('icrm_content_compose_expand_content')) {
    function icrm_content_compose_expand_content(array $params = array())
    {
        $type = isset($params['type']) ? preg_replace('/[^a-z_]/', '', (string) $params['type']) : '';
        $content = isset($params['content']) ? (string) $params['content'] : (isset($params['content_html']) ? (string) $params['content_html'] : '');
        if ($type === '') {
            return array('ok' => false, 'error' => 'empty_type', 'message' => '확장 유형이 필요합니다.');
        }
        if (trim(strip_tags($content)) === '') {
            return array('ok' => false, 'error' => 'empty_content', 'message' => '본문이 비어 있습니다.');
        }

        $plain = trim(strip_tags($content));
        if (function_exists('mb_strlen') && function_exists('mb_substr')) {
            $context = mb_substr($plain, 0, 3000, 'UTF-8');
        } else {
            $context = substr($plain, 0, 3000);
        }

        $paragraphs = preg_split('/\n{2,}/', $plain);
        $current_paragraph = '';
        $previous_paragraph = '';
        if (is_array($paragraphs) && count($paragraphs) > 0) {
            $current_paragraph = trim((string) end($paragraphs));
            if (count($paragraphs) > 1) {
                $previous_paragraph = trim((string) $paragraphs[count($paragraphs) - 2]);
            }
        }

        $result = icrm_compose_icrm_request('expand', array(
            'type'               => $type,
            'subject'            => isset($params['subject']) ? trim((string) $params['subject']) : '',
            'content'            => $content,
            'context'            => $context,
            'current_paragraph'  => $current_paragraph,
            'previous_paragraph' => $previous_paragraph,
        ), 90);

        if (!$result['ok']) {
            return $result;
        }

        $html = isset($result['data']['html']) ? (string) $result['data']['html'] : '';

        return array(
            'ok'      => true,
            'html'    => $html,
            'content' => $content . "\n" . $html,
            'label'   => isset($result['data']['label']) ? (string) $result['data']['label'] : '',
            'message' => '본문에 AI 확장 내용을 추가했습니다.',
        );
    }
}

if (!function_exists('icrm_content_compose_ai_draft')) {
    function icrm_content_compose_ai_draft(array $params = array())
    {
        if (!empty($params['title']) || !empty($params['subject'])) {
            return icrm_content_compose_generate_draft($params);
        }

        return icrm_content_compose_suggest_titles($params);
    }
}

if (!function_exists('icrm_content_validate_board_publish')) {
    /**
     * 발행·초안 저장 전 게시판·작성자 권한 검증
     *
     * @return array ok(bool), error, message
     */
    function icrm_content_validate_board_publish($bo_table, $mb_id)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $mb_id = preg_replace('/[^a-z0-9_]/i', '', (string) $mb_id);
        if ($bo_table === '' || $mb_id === '') {
            return array('ok' => false, 'error' => 'invalid_params', 'message' => '게시판과 작성자를 확인해 주세요.');
        }

        if (defined('ICRM_MEMBER_PUBLISH') && ICRM_MEMBER_PUBLISH) {
            if (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
                include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
            }
            if (function_exists('icrm_member_board_publish_block_reason')) {
                $reason = icrm_member_board_publish_block_reason($bo_table, $mb_id);
                if ($reason !== '') {
                    return array('ok' => false, 'error' => 'forbidden_board', 'message' => $reason);
                }
            } elseif (function_exists('icrm_member_board_can_publish_to') && !icrm_member_board_can_publish_to($bo_table, $mb_id)) {
                return array('ok' => false, 'error' => 'forbidden_board', 'message' => '내가 만든 게시판만 선택할 수 있습니다.');
            }
        } else {
            global $is_admin;
            if ($is_admin !== 'super') {
                if (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
                    include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
                }
                if (function_exists('icrm_member_board_can_write_to') && !icrm_member_board_can_write_to($bo_table, $mb_id)) {
                    $board = function_exists('icrm_member_board_fetch') ? icrm_member_board_fetch($bo_table) : array();
                    $required = (int) ($board['bo_write_level'] ?? 1);
                    $author = get_member($mb_id);
                    $level = !empty($author['mb_level']) ? (int) $author['mb_level'] : 0;

                    return array(
                        'ok'      => false,
                        'error'   => 'write_level',
                        'message' => '글쓰기 Lv.' . $required . ' 이상 필요합니다. (작성자 Lv.' . $level . ')',
                    );
                }
            }
        }

        return array('ok' => true);
    }
}

if (!function_exists('icrm_content_member_can_access_item')) {
    function icrm_content_member_can_access_item($ici_id, $mb_id = '')
    {
        global $member, $is_admin;

        $ici_id = (int) $ici_id;
        if ($ici_id < 1) {
            return false;
        }

        $item = icrm_content_get_item($ici_id);
        if (!$item) {
            return false;
        }

        if ($is_admin === 'super' && defined('ICRM_MEMBER_PUBLISH') && ICRM_MEMBER_PUBLISH) {
            return (string) ($item['collect_mode'] ?? '') === 'compose';
        }

        $mb_id = preg_replace('/[^a-z0-9_]/i', '', trim((string) $mb_id));
        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }
        if ($mb_id === '') {
            return false;
        }

        return (string) ($item['mb_id'] ?? '') === $mb_id
            && (string) ($item['collect_mode'] ?? '') === 'compose';
    }
}

if (!function_exists('icrm_content_fetch_member_compose_items')) {
    function icrm_content_fetch_member_compose_items($mb_id, $status = 'review', $page = 1, $per_page = 15)
    {
        $mb_id = preg_replace('/[^a-z0-9_]/i', '', trim((string) $mb_id));
        if ($mb_id === '') {
            return array('ok' => true, 'items' => array(), 'total' => 0, 'page' => 1, 'per_page' => $per_page);
        }

        return icrm_content_fetch_items($status, '', $page, $per_page, array(
            'mb_id'        => $mb_id,
            'collect_mode' => 'compose',
        ));
    }
}

if (!function_exists('icrm_content_member_item_post_url')) {
    function icrm_content_member_item_post_url(array $item)
    {
        if (empty($item['bo_table']) || empty($item['wr_id'])) {
            return '';
        }

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $item['bo_table']);
        $wr_id = (int) $item['wr_id'];
        if ($bo_table === '' || $wr_id < 1 || !defined('G5_BBS_URL')) {
            return '';
        }

        return G5_BBS_URL . '/board.php?bo_table=' . rawurlencode($bo_table) . '&wr_id=' . $wr_id;
    }
}

if (!function_exists('icrm_content_member_item_edit_url')) {
    function icrm_content_member_item_edit_url(array $item)
    {
        if (empty($item['bo_table']) || empty($item['wr_id'])) {
            return '';
        }

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $item['bo_table']);
        $wr_id = (int) $item['wr_id'];
        if ($bo_table === '' || $wr_id < 1 || !defined('G5_BBS_URL')) {
            return '';
        }

        return G5_BBS_URL . '/write.php?w=u&bo_table=' . rawurlencode($bo_table) . '&wr_id=' . $wr_id;
    }
}

if (!function_exists('icrm_content_member_delete_compose_item')) {
    function icrm_content_member_delete_compose_item($ici_id, $mb_id = '')
    {
        global $member;

        if ($mb_id === '' && !empty($member['mb_id'])) {
            $mb_id = (string) $member['mb_id'];
        }

        if (!icrm_content_member_can_access_item($ici_id, $mb_id)) {
            return array('ok' => false, 'error' => 'forbidden', 'message' => '이 초안에 접근할 수 없습니다.');
        }

        $item = icrm_content_get_item($ici_id);
        if (!$item) {
            return array('ok' => false, 'error' => 'not_found', 'message' => '초안을 찾을 수 없습니다.');
        }
        if ($item['status'] === 'published') {
            return array('ok' => false, 'error' => 'already_published', 'message' => '발행된 글은 삭제할 수 없습니다.');
        }

        return icrm_content_delete_item($ici_id);
    }
}

if (!function_exists('icrm_content_publish_error_message')) {
    function icrm_content_publish_error_message(array $result)
    {
        $message = isset($result['message']) ? trim((string) $result['message']) : '';
        if ($message === '') {
            $message = isset($result['error']) ? (string) $result['error'] : '요청에 실패했습니다.';
        }

        $error = isset($result['error']) ? (string) $result['error'] : '';
        if (in_array($error, array('forbidden_board', 'write_level'), true)) {
            $message .= ' 게시판 메뉴에서 확인하거나 다른 게시판을 선택해 주세요.';
        } elseif ($error === 'empty_board') {
            $message .= ' 발행할 게시판을 먼저 선택해 주세요.';
        } elseif ($error === 'already_published') {
            $message .= ' 발행 완료 목록에서 확인할 수 있습니다.';
        }

        return $message;
    }
}

if (!function_exists('icrm_content_save_compose_draft')) {
    function icrm_content_save_compose_draft(array $fields, $ici_id = 0)
    {
        icrm_content_ensure_tables();

        $subject = isset($fields['subject']) ? trim((string) $fields['subject']) : '';
        $content_html = isset($fields['content_html']) ? (string) $fields['content_html'] : '';
        $bo_table = isset($fields['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $fields['bo_table']) : icrm_content_get_default_bo_table();
        $mb_id = isset($fields['mb_id']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $fields['mb_id']) : icrm_content_get_default_mb_id();
        $keywords = isset($fields['keywords']) ? trim((string) $fields['keywords']) : '';
        $topic = isset($fields['topic']) ? trim((string) $fields['topic']) : '';
        $ca_name = isset($fields['ca_name']) ? trim((string) $fields['ca_name']) : '';

        if ($subject === '') {
            return array('ok' => false, 'error' => 'empty_subject', 'message' => '제목을 입력해 주세요.');
        }
        if (trim(strip_tags($content_html)) === '') {
            return array('ok' => false, 'error' => 'empty_content', 'message' => '본문을 입력해 주세요.');
        }
        if ($bo_table === '') {
            return array('ok' => false, 'error' => 'empty_board', 'message' => '게시판을 선택해 주세요.');
        }
        if ($mb_id === '') {
            return array('ok' => false, 'error' => 'empty_author', 'message' => '작성자를 입력해 주세요.');
        }
        if (!function_exists('icrm_validate_bo_table') || !icrm_validate_bo_table($bo_table)) {
            return array('ok' => false, 'error' => 'invalid_bo_table', 'message' => '유효하지 않은 게시판입니다.');
        }
        $publish_check = icrm_content_validate_board_publish($bo_table, $mb_id);
        if (empty($publish_check['ok'])) {
            return $publish_check;
        }
        $member = get_member($mb_id);
        if (empty($member['mb_id'])) {
            return array('ok' => false, 'error' => 'member_not_found', 'message' => '작성자 회원을 찾을 수 없습니다.');
        }

        $rank_lines = array();
        if ($keywords !== '') {
            foreach (preg_split('/[\r\n,]+/', $keywords) as $kw) {
                $kw = trim($kw);
                if ($kw !== '') {
                    $rank_lines[] = $kw;
                }
            }
        }
        $rank_text = implode("\n", array_slice($rank_lines, 0, 10));

        $ici_id = (int) $ici_id;
        if ($ici_id > 0) {
            if (defined('ICRM_MEMBER_PUBLISH') && ICRM_MEMBER_PUBLISH && function_exists('icrm_content_member_can_access_item')) {
                if (!icrm_content_member_can_access_item($ici_id, $mb_id)) {
                    return array('ok' => false, 'error' => 'forbidden', 'message' => '이 초안을 수정할 수 없습니다.');
                }
            }

            $item = icrm_content_get_item($ici_id);
            if (!$item) {
                return array('ok' => false, 'error' => 'not_found', 'message' => '초안을 찾을 수 없습니다.');
            }
            if ($item['status'] === 'published') {
                return array('ok' => false, 'error' => 'already_published', 'message' => '이미 발행된 초안입니다.');
            }
            $update = icrm_content_update_draft($ici_id, array(
                'subject'      => $subject,
                'content_html' => $content_html,
                'bo_table'     => $bo_table,
                'mb_id'        => $mb_id,
                'ca_name'      => $ca_name,
            ));
            if (empty($update['ok'])) {
                return $update;
            }
            if ($rank_text !== '') {
                sql_query(" update " . icrm_content_table('items') . "
                               set rank_keywords = '" . icrm_content_escape($rank_text) . "'
                             where ici_id = '" . (int) $ici_id . "' ");
            }

            return array(
                'ok'      => true,
                'ici_id'  => $ici_id,
                'message' => '초안을 저장했습니다.',
                'item'    => icrm_content_get_item($ici_id),
            );
        }

        $request_id = 'compose_' . str_replace('.', '', uniqid('', true));
        $source_hash = 'compose:' . hash('sha256', $request_id . (string) microtime(true));
        $source_title = $topic !== '' ? $topic : mb_substr($subject, 0, 120, 'UTF-8');
        $plain = trim(strip_tags($content_html));
        $excerpt = function_exists('mb_substr') ? mb_substr($plain, 0, 200, 'UTF-8') : substr($plain, 0, 200);
        $now = G5_TIME_YMDHIS;

        sql_query(" insert into " . icrm_content_table('items') . "
                        set request_id = '" . icrm_content_escape($request_id) . "',
                            source_url = '',
                            source_type = 'manual',
                            source_hash = '" . icrm_content_escape($source_hash) . "',
                            source_title = '" . icrm_content_escape($source_title) . "',
                            bo_table = '" . icrm_content_escape($bo_table) . "',
                            mb_id = '" . icrm_content_escape($mb_id) . "',
                            ca_name = '" . icrm_content_escape($ca_name) . "',
                            subject = '" . icrm_content_escape($subject) . "',
                            content_html = '" . icrm_content_escape($content_html) . "',
                            excerpt = '" . icrm_content_escape($excerpt) . "',
                            collect_mode = 'compose',
                            seo_json = '{}',
                            rank_keywords = '" . icrm_content_escape($rank_text) . "',
                            status = 'review',
                            created_at = '{$now}',
                            updated_at = '{$now}' ");

        $ici_id = (int) sql_insert_id();

        return array(
            'ok'      => true,
            'ici_id'  => $ici_id,
            'message' => '초안을 저장했습니다.',
        );
    }
}

if (!function_exists('icrm_content_compose_publish')) {
    function icrm_content_compose_publish(array $fields, $options = array())
    {
        $ici_id = isset($fields['ici_id']) ? (int) $fields['ici_id'] : 0;
        $save = icrm_content_save_compose_draft($fields, $ici_id);
        if (empty($save['ok'])) {
            return $save;
        }

        $result = icrm_content_publish_item((int) $save['ici_id'], $options);
        if (empty($result['ok']) && function_exists('icrm_content_publish_error_message')) {
            $result['message'] = icrm_content_publish_error_message($result);
        }

        return $result;
    }
}

if (!function_exists('icrm_content_reject_item')) {
    function icrm_content_reject_item($ici_id, $reason = '')
    {
        icrm_content_ensure_tables();
        $item = icrm_content_get_item($ici_id);
        if (!$item) {
            return array('ok' => false, 'error' => 'not_found');
        }
        if ($item['status'] === 'published') {
            return array('ok' => false, 'error' => 'already_published');
        }

        $now = G5_TIME_YMDHIS;
        sql_query(" update " . icrm_content_table('items') . "
                       set status = 'rejected',
                           reject_reason = '" . icrm_content_escape(trim((string) $reason)) . "',
                           updated_at = '{$now}'
                     where ici_id = '" . (int) $ici_id . "' ");

        return array('ok' => true, 'message' => '초안을 반려했습니다.');
    }
}

if (!function_exists('icrm_content_delete_item')) {
    function icrm_content_delete_item($ici_id)
    {
        icrm_content_ensure_tables();
        $item = icrm_content_get_item($ici_id);
        if (!$item) {
            return array('ok' => false, 'error' => 'not_found');
        }
        if ($item['status'] === 'published') {
            return array('ok' => false, 'error' => 'already_published', 'message' => '발행된 글은 삭제할 수 없습니다.');
        }

        sql_query(" delete from " . icrm_content_table('items') . " where ici_id = '" . (int) $ici_id . "' ");

        return array('ok' => true, 'message' => '수집 콘텐츠를 삭제했습니다.');
    }
}

if (!function_exists('icrm_content_recollect_item')) {
    function icrm_content_recollect_item($ici_id, $collect_mode = '')
    {
        $item = icrm_content_get_item($ici_id);
        if (!$item) {
            return array('ok' => false, 'error' => 'not_found');
        }
        if ($item['source_url'] === '') {
            return array('ok' => false, 'error' => 'missing_source_url');
        }

        $options = array(
            'source_type'  => $item['source_type'],
            'keyword'      => '',
            'collect_mode' => $collect_mode !== '' ? $collect_mode : (string) $item['collect_mode'],
        );
        if ($options['collect_mode'] === 'batch') {
            $options['collect_mode'] = 'source';
        }

        return icrm_content_request_collect(
            (string) $item['source_url'],
            (string) $item['bo_table'],
            (string) $item['mb_id'],
            $options
        );
    }
}

if (!function_exists('icrm_content_insert_board_post')) {
    function icrm_content_insert_board_post($bo_table, $mb_id, $subject, $content_html, $ca_name = '')
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $mb_id = preg_replace('/[^a-z0-9_]/i', '', (string) $mb_id);
        if ($bo_table === '' || $mb_id === '') {
            return array('ok' => false, 'error' => 'invalid_params');
        }

        if (!function_exists('icrm_validate_bo_table') || !icrm_validate_bo_table($bo_table)) {
            return array('ok' => false, 'error' => 'invalid_bo_table');
        }

        $member = get_member($mb_id);
        if (empty($member['mb_id'])) {
            return array('ok' => false, 'error' => 'member_not_found');
        }

        $board = sql_fetch(" select * from {$g5['board_table']} where bo_table = '" . sql_real_escape_string($bo_table) . "' ");
        if (empty($board['bo_table'])) {
            return array('ok' => false, 'error' => 'board_not_found');
        }

        $publish_check = icrm_content_validate_board_publish($bo_table, $mb_id);
        if (empty($publish_check['ok'])) {
            return array(
                'ok'      => false,
                'error'   => isset($publish_check['error']) ? (string) $publish_check['error'] : 'forbidden_board',
                'message' => isset($publish_check['message']) ? (string) $publish_check['message'] : '발행 권한이 없습니다.',
            );
        }

        $write_table = $g5['write_prefix'] . $bo_table;
        $subject = trim(stripslashes((string) $subject));
        $content_html = (string) $content_html;
        $ca_name = trim((string) $ca_name);

        $wr_option = (strpos($content_html, '<') !== false) ? 'html1' : '';
        $wr_seo_title = '';
        if (function_exists('icrm_canonical_seo_title_from_subject')) {
            $wr_seo_title = icrm_canonical_seo_title_from_subject($write_table, $subject, 0);
        } elseif (function_exists('icrm_load_uri_lib') && icrm_load_uri_lib()) {
            $wr_seo_title = exist_seo_title_recursive('bbs', generate_seo_title($subject), $write_table, 0);
        }

        $wr_name = addslashes(clean_xss_tags($board['bo_use_name'] ? $member['mb_name'] : $member['mb_nick']));
        $wr_email = addslashes($member['mb_email']);
        $wr_homepage = addslashes(clean_xss_tags($member['mb_homepage']));
        $wr_subject = sql_real_escape_string($subject);
        $wr_content = sql_real_escape_string($content_html);
        $wr_seo_title_esc = sql_real_escape_string($wr_seo_title);
        $ca_name_esc = sql_real_escape_string($ca_name);
        $wr_option_esc = sql_real_escape_string($wr_option);
        $remote_ip = isset($_SERVER['REMOTE_ADDR']) ? sql_real_escape_string($_SERVER['REMOTE_ADDR']) : '';

        sql_query(" insert into {$write_table}
                        set wr_num = (SELECT IFNULL(MIN(wr_num) - 1, -1) FROM {$write_table} as sq),
                            wr_reply = '',
                            wr_comment = 0,
                            ca_name = '{$ca_name_esc}',
                            wr_option = '{$wr_option_esc}',
                            wr_subject = '{$wr_subject}',
                            wr_content = '{$wr_content}',
                            wr_seo_title = '{$wr_seo_title_esc}',
                            wr_link1 = '',
                            wr_link2 = '',
                            wr_link1_hit = 0,
                            wr_link2_hit = 0,
                            wr_hit = 0,
                            wr_good = 0,
                            wr_nogood = 0,
                            mb_id = '" . sql_real_escape_string($mb_id) . "',
                            wr_password = '',
                            wr_name = '{$wr_name}',
                            wr_email = '{$wr_email}',
                            wr_homepage = '{$wr_homepage}',
                            wr_datetime = '" . G5_TIME_YMDHIS . "',
                            wr_last = '" . G5_TIME_YMDHIS . "',
                            wr_ip = '{$remote_ip}' ");

        $wr_id = (int) sql_insert_id();
        if ($wr_id < 1) {
            return array('ok' => false, 'error' => 'insert_failed');
        }

        sql_query(" update {$write_table} set wr_parent = '{$wr_id}' where wr_id = '{$wr_id}' ");
        sql_query(" insert into {$g5['board_new_table']} ( bo_table, wr_id, wr_parent, bn_datetime, mb_id )
                    values ( '{$bo_table}', '{$wr_id}', '{$wr_id}', '" . G5_TIME_YMDHIS . "', '" . sql_real_escape_string($mb_id) . "' ) ");
        sql_query(" update {$g5['board_table']} set bo_count_write = bo_count_write + 1 where bo_table = '{$bo_table}' ");

        if (function_exists('icrm_ensure_wr_seo_title')) {
            icrm_ensure_wr_seo_title($bo_table, $wr_id);
        }

        return array('ok' => true, 'wr_id' => $wr_id, 'bo_table' => $bo_table);
    }
}

if (!function_exists('icrm_content_apply_seo_and_rank')) {
    function icrm_content_apply_seo_and_rank($bo_table, $wr_id, array $seo, array $rank_keywords)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return;
        }

        if (!empty($seo) && function_exists('g5b_seo_meta_save')) {
            g5b_seo_meta_save('posts', $bo_table . ':' . $wr_id, $seo);
        }

        if (!empty($rank_keywords) && function_exists('icrm_rank_save_target')) {
            icrm_rank_save_target($bo_table, $wr_id, $rank_keywords, true);
        }
    }
}

if (!function_exists('icrm_content_publish_item')) {
    function icrm_content_publish_item($ici_id, $options = array())
    {
        icrm_content_ensure_tables();
        if (!is_array($options)) {
            $options = array();
        }

        $geo_package = !empty($options['geo_package']);
        if ($geo_package) {
            if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
                include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
            }
            if (function_exists('icrm_content_apply_geo_package')) {
                $pack = icrm_content_apply_geo_package($ici_id, $options);
                if (empty($pack['ok'])) {
                    return array(
                        'ok'      => false,
                        'error'   => isset($pack['error']) ? (string) $pack['error'] : 'geo_package_failed',
                        'message' => isset($pack['message']) ? (string) $pack['message'] : 'GEO 패키지 적용에 실패했습니다.',
                    );
                }
            }
        }

        $item = icrm_content_get_item($ici_id);
        if (!$item) {
            return array('ok' => false, 'error' => 'not_found', 'message' => '초안을 찾을 수 없습니다.');
        }
        if ($item['status'] === 'published' && $item['wr_id'] > 0) {
            return array('ok' => false, 'error' => 'already_published', 'message' => '이미 발행된 초안입니다.', 'wr_id' => $item['wr_id']);
        }
        if ($item['status'] === 'rejected') {
            return array('ok' => false, 'error' => 'rejected', 'message' => '반려된 초안은 발행할 수 없습니다.');
        }

        $publish_check = icrm_content_validate_board_publish($item['bo_table'], $item['mb_id']);
        if (empty($publish_check['ok'])) {
            return $publish_check;
        }

        $insert = icrm_content_insert_board_post(
            $item['bo_table'],
            $item['mb_id'],
            $item['subject'],
            $item['content_html'],
            $item['ca_name']
        );
        if (empty($insert['ok'])) {
            return array(
                'ok'      => false,
                'error'   => isset($insert['error']) ? $insert['error'] : 'publish_failed',
                'message' => '게시글 저장에 실패했습니다.',
            );
        }

        $wr_id = (int) $insert['wr_id'];
        icrm_content_apply_seo_and_rank($item['bo_table'], $wr_id, $item['seo'], $item['rank_keywords']);

        $now = G5_TIME_YMDHIS;
        sql_query(" update " . icrm_content_table('items') . "
                       set status = 'published',
                           wr_id = '{$wr_id}',
                           published_at = '{$now}',
                           updated_at = '{$now}'
                     where ici_id = '" . (int) $ici_id . "' ");

        $final_url = '';
        if (function_exists('icrm_build_final_url')) {
            $final_url = icrm_build_final_url($item['bo_table'], $wr_id);
        } elseif (function_exists('get_pretty_url')) {
            $final_url = get_pretty_url($item['bo_table'], $wr_id);
        }

        return array(
            'ok'        => true,
            'ici_id'    => (int) $ici_id,
            'wr_id'     => $wr_id,
            'bo_table'  => $item['bo_table'],
            'final_url' => $final_url,
            'message'   => $geo_package ? 'GEO 패키지 적용 후 게시판에 발행했습니다.' : '게시판에 발행했습니다.',
            'geo_applied' => $geo_package,
        );
    }
}

if (!function_exists('icrm_content_http_post_json')) {
    function icrm_content_http_post_json($url, $payload, $timeout = 90)
    {
        $body = json_encode($payload);
        if ($body === false) {
            throw new Exception('콘텐츠 수집 요청 JSON 생성 실패');
        }
        if (!function_exists('curl_init')) {
            throw new Exception('서버에 cURL 확장이 필요합니다.');
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => array('Content-Type: application/json', 'Accept: application/json'),
            CURLOPT_TIMEOUT        => (int) $timeout,
            CURLOPT_CONNECTTIMEOUT => min(15, (int) $timeout),
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_FOLLOWLOCATION => false,
        ));

        $response = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno) {
            throw new Exception('iCRM 콘텐츠 API 연결 실패: ' . $error);
        }
        if ($status < 200 || $status >= 300) {
            if ($status >= 300 && $status < 400) {
                throw new Exception('iCRM 콘텐츠 API가 다른 페이지로 리다이렉트했습니다. icrm.co.kr에 content-collector API가 배포되었는지 확인해 주세요. (HTTP ' . $status . ')');
            }
            if ($status >= 500) {
                throw new Exception('iCRM 콘텐츠 API 서버 오류입니다. icrm.co.kr에 content-collector API(_bootstrap.php·extend) 배포를 확인해 주세요. (HTTP ' . $status . ')');
            }

            throw new Exception('iCRM 콘텐츠 API HTTP ' . $status);
        }

        return (string) $response;
    }
}

if (!function_exists('icrm_content_min_collect_points')) {
    /** iCRM content-collector 입장 최소 포인트 (원문 수집 기준) */
    function icrm_content_min_collect_points($collect_mode = 'source', $max_items = 10)
    {
        $collect_mode = strtolower(trim((string) $collect_mode));
        $max_items = max(1, min(20, (int) $max_items));
        if ($collect_mode === 'regenerate') {
            return 2700;
        }
        if ($collect_mode === 'batch') {
            return max(600, 600 * $max_items);
        }

        return 600;
    }
}

if (!function_exists('icrm_content_validate_collect_url')) {
    /**
     * 검색·목록 URL 등 크롤링 불가 주소 사전 차단
     *
     * @return array{ok:bool,error?:string,message?:string}
     */
    function icrm_content_validate_collect_url($source_url)
    {
        $url = strtolower(trim((string) $source_url));
        if ($url === '') {
            return array('ok' => false, 'error' => 'invalid_url', 'message' => 'URL을 입력해 주세요.');
        }

        if (strpos($url, 'search.naver.com') !== false || strpos($url, 'm.search.naver.com') !== false) {
            return array(
                'ok'      => false,
                'error'   => 'naver_search_blocked',
                'message' => '네이버 검색·목록 페이지는 봇 접근이 차단되어 수집할 수 없습니다. blog.naver.com 또는 cafe.naver.com 글 URL을 직접 입력해 주세요.',
            );
        }

        if (preg_match('#(^|//|\.)(www\.)?google\.(com|co\.kr)/search#', $url)) {
            return array(
                'ok'      => false,
                'error'   => 'google_search_blocked',
                'message' => '구글 검색 결과 페이지는 수집할 수 없습니다. 개별 글·기사 URL을 직접 입력해 주세요.',
            );
        }

        if (strpos($url, 'youtube.com/results') !== false || strpos($url, 'youtube.com/search') !== false) {
            return array(
                'ok'      => false,
                'error'   => 'youtube_search_blocked',
                'message' => 'YouTube 검색 결과 페이지는 본문 추출이 어렵습니다. 채널·영상 URL을 직접 입력해 주세요.',
            );
        }

        return array('ok' => true);
    }
}

if (!function_exists('icrm_content_request_collect')) {
    /**
     * 그누보드 → iCRM 수집·재생성 요청
     */
    function icrm_content_request_collect($source_url, $bo_table = '', $mb_id = '', $options = array())
    {
        icrm_content_ensure_tables();
        if (!is_array($options)) {
            $options = array();
        }

        if (function_exists('icrm_point_sync_connection_from_icrm')) {
            icrm_point_sync_connection_from_icrm();
        }

        $license = icrm_content_get_license_key();
        if ($license === '') {
            return array('ok' => false, 'error' => 'license_not_configured', 'message' => 'iCRM 라이선스 키를 설정해 주세요.');
        }

        $source_url = trim((string) $source_url);
        if ($source_url === '' || !preg_match('#^https?://#i', $source_url)) {
            return array('ok' => false, 'error' => 'invalid_url', 'message' => 'http(s) URL을 입력해 주세요.');
        }

        $url_check = icrm_content_validate_collect_url($source_url);
        if (!$url_check['ok']) {
            return array(
                'ok'      => false,
                'error'   => isset($url_check['error']) ? (string) $url_check['error'] : 'unsupported_url',
                'message' => isset($url_check['message']) ? (string) $url_check['message'] : '수집할 수 없는 URL입니다.',
            );
        }

        if ($bo_table === '') {
            $bo_table = icrm_content_get_default_bo_table();
        }
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        if ($bo_table === '' || !function_exists('icrm_validate_bo_table') || !icrm_validate_bo_table($bo_table)) {
            return array('ok' => false, 'error' => 'invalid_bo_table', 'message' => '게시판을 선택해 주세요.');
        }

        if ($mb_id === '') {
            $mb_id = icrm_content_get_default_mb_id();
        }
        $mb_id = preg_replace('/[^a-z0-9_]/i', '', (string) $mb_id);
        if ($mb_id === '' || !function_exists('get_member') || empty(get_member($mb_id)['mb_id'])) {
            return array('ok' => false, 'error' => 'invalid_mb_id', 'message' => '작성자 회원 ID를 확인해 주세요.');
        }

        $request_id = icrm_content_make_request_id('collect');
        $source_type = isset($options['source_type']) ? preg_replace('/[^a-z_]/', '', (string) $options['source_type']) : 'web';
        if (!in_array($source_type, array('youtube', 'rss', 'web'), true)) {
            $source_type = 'web';
        }
        if ($source_type === 'web' && (strpos(strtolower($source_url), 'blog.naver.com') !== false || strpos(strtolower($source_url), 'cafe.naver.com') !== false)) {
            $source_type = 'naver';
        }
        $keyword = isset($options['keyword']) ? trim((string) $options['keyword']) : '';
        $rule_name = isset($options['rule_name']) ? trim((string) $options['rule_name']) : '';
        $collect_mode = isset($options['collect_mode']) ? preg_replace('/[^a-z_]/', '', (string) $options['collect_mode']) : '';
        $max_items = isset($options['max_items']) ? max(1, min(20, (int) $options['max_items'])) : 10;
        $source_url_lower = strtolower($source_url);
        $is_feed_url = (strpos($source_url_lower, 'news.google.com/rss') !== false
            || preg_match('#/(feed|rss)(\.xml|/|$|\?)#', $source_url_lower)
            || preg_match('#\.(xml|rss)(\?|$)#', $source_url_lower));
        if (!in_array($collect_mode, array('source', 'regenerate', 'batch'), true)) {
            if ($is_feed_url) {
                $collect_mode = 'batch';
            } else {
                $collect_mode = 'source';
            }
        } elseif ($is_feed_url && $collect_mode === 'source') {
            $collect_mode = 'batch';
        }
        $callback_url = function_exists('icrm_get_site_base_url')
            ? rtrim(icrm_get_site_base_url(), '/') . '/icrm/content-import.php'
            : G5_URL . '/icrm/content-import.php';

        $billing_mb_id = function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : $mb_id;
        $member_point_balance = 0;
        if (function_exists('icrm_point_get_balance')) {
            $member_point_balance = (int) icrm_point_get_balance($billing_mb_id);
        }

        if (function_exists('icrm_point_is_enabled') && icrm_point_is_enabled()) {
            $min_points = icrm_content_min_collect_points($collect_mode, $max_items);
            if ($member_point_balance < $min_points) {
                return array(
                    'ok'      => false,
                    'error'   => 'point_insufficient',
                    'message' => 'AI API 포인트가 부족합니다. (보유 ' . number_format($member_point_balance) . 'P / 필요 약 ' . number_format($min_points) . 'P)',
                );
            }
        }

        $payload = array(
            'license_key'          => $license,
            'domain'               => icrm_content_site_domain(),
            'request_id'           => $request_id,
            'admin_mb_id'          => $billing_mb_id,
            'member_point_balance' => $member_point_balance,
            'billing_multiplier'   => function_exists('icrm_point_get_multiplier') ? icrm_point_get_multiplier() : 6,
            'source_url'           => $source_url,
            'source_type'          => $source_type,
            'keyword'              => $keyword,
            'rule_name'            => $rule_name,
            'collect_mode'         => $collect_mode,
            'max_items'            => $max_items,
            'bo_table'             => $bo_table,
            'mb_id'                => $mb_id,
            'callback_url'         => $callback_url,
        );
        if ($source_type === 'youtube' && $is_feed_url) {
            $payload['discovery_youtube_only'] = true;
        }
        if (!empty($options['gcr_id'])) {
            $payload['gcr_id'] = (int) $options['gcr_id'];
        }

        $now = G5_TIME_YMDHIS;
        sql_query(" insert into " . icrm_content_table('jobs') . "
                        set request_id = '" . icrm_content_escape($request_id) . "',
                            source_url = '" . icrm_content_escape($source_url) . "',
                            source_type = '" . icrm_content_escape($source_type) . "',
                            keyword = '" . icrm_content_escape($keyword) . "',
                            bo_table = '" . icrm_content_escape($bo_table) . "',
                            mb_id = '" . icrm_content_escape($mb_id) . "',
                            status = 'queued',
                            error_message = '',
                            created_at = '{$now}',
                            updated_at = '{$now}' ");

        try {
            $raw = icrm_content_http_post_json(icrm_content_api_url('collect'), $payload);
        } catch (Exception $e) {
            sql_query(" update " . icrm_content_table('jobs') . "
                           set status = 'failed',
                               error_message = '" . icrm_content_escape($e->getMessage()) . "',
                               updated_at = '" . G5_TIME_YMDHIS . "'
                         where request_id = '" . icrm_content_escape($request_id) . "' ");

            return array('ok' => false, 'error' => 'api_error', 'message' => $e->getMessage());
        }

        $json = json_decode($raw, true);
        if (!is_array($json)) {
            return array('ok' => false, 'error' => 'invalid_response', 'message' => 'iCRM 응답을 해석할 수 없습니다.');
        }

        if (function_exists('icrm_point_apply_api_response')) {
            $billing = icrm_point_apply_api_response('content_collector', 'collect', $json, $request_id);
            if (!$billing['ok']) {
                sql_query(" update " . icrm_content_table('jobs') . "
                               set status = 'failed',
                                   error_message = '" . icrm_content_escape(isset($billing['error']) ? $billing['error'] : 'billing_failed') . "',
                                   updated_at = '" . G5_TIME_YMDHIS . "'
                             where request_id = '" . icrm_content_escape($request_id) . "' ");

                return array(
                    'ok'      => false,
                    'error'   => isset($billing['status']) ? $billing['status'] : 'billing_failed',
                    'message' => isset($billing['error']) ? $billing['error'] : '포인트 처리에 실패했습니다.',
                );
            }
        }

        $job_status = !empty($json['success']) ? 'processing' : 'failed';
        $icrm_job_id = isset($json['job_id']) ? trim((string) $json['job_id']) : '';
        $error_message = !empty($json['success']) ? '' : (isset($json['message']) ? (string) $json['message'] : 'iCRM 요청 실패');

        sql_query(" update " . icrm_content_table('jobs') . "
                       set status = '" . icrm_content_escape($job_status) . "',
                           icrm_job_id = '" . icrm_content_escape($icrm_job_id) . "',
                           error_message = '" . icrm_content_escape($error_message) . "',
                           updated_at = '" . G5_TIME_YMDHIS . "'
                     where request_id = '" . icrm_content_escape($request_id) . "' ");

        if ($job_status === 'failed') {
            $msg = $error_message !== '' ? $error_message : 'iCRM 수집 요청에 실패했습니다.';
            if ($msg === '포인트가 부족합니다.' && function_exists('icrm_point_get_balance')) {
                $msg = '회원 포인트가 iCRM에 전달되지 않았습니다. 업데이트 후 다시 시도해 주세요. (현재 ' . number_format(icrm_point_get_balance()) . 'P)';
            }

            return array(
                'ok'      => false,
                'error'   => isset($json['status']) ? (string) $json['status'] : 'request_failed',
                'message' => $msg,
            );
        }

        return array(
            'ok'         => true,
            'request_id' => $request_id,
            'job_id'     => $icrm_job_id,
            'message'    => isset($json['message']) ? (string) $json['message'] : 'iCRM에 수집 요청을 전송했습니다. 완료되면 초안함에 표시됩니다.',
        );
    }
}

if (!function_exists('icrm_content_job_infer_source_type')) {
    function icrm_content_job_infer_source_type($source_type, $source_url)
    {
        $source_type = preg_replace('/[^a-z_]/', '', (string) $source_type);
        if (in_array($source_type, array('youtube', 'rss', 'web'), true)) {
            return $source_type;
        }

        $url = strtolower((string) $source_url);
        if (strpos($url, 'youtube.com') !== false || strpos($url, 'youtu.be') !== false) {
            return 'youtube';
        }
        if (strpos($url, 'news.google.com/rss') !== false || strpos($url, 'rss') !== false || preg_match('/\.(xml|rss)(\?|$)/i', $url)) {
            return 'rss';
        }
        if (strpos($url, 'blog.naver.com') !== false || strpos($url, 'cafe.naver.com') !== false) {
            return 'naver';
        }

        return 'web';
    }
}

if (!function_exists('icrm_content_job_infer_keyword')) {
    function icrm_content_job_infer_keyword($keyword, $source_url)
    {
        $keyword = trim((string) $keyword);
        if ($keyword !== '') {
            return $keyword;
        }

        $url = (string) $source_url;
        $parsed = parse_url($url);
        if (empty($parsed['query'])) {
            return '';
        }

        parse_str($parsed['query'], $query);
        foreach (array('search_query', 'query', 'q', 'keyword') as $key) {
            if (!empty($query[$key])) {
                $value = trim(urldecode((string) $query[$key]));
                if ($value !== '') {
                    return $value;
                }
            }
        }

        return '';
    }
}

if (!function_exists('icrm_content_job_media_label')) {
    function icrm_content_job_media_label($source_type, $source_url = '')
    {
        $source_type = icrm_content_job_infer_source_type($source_type, $source_url);
        $url = strtolower((string) $source_url);

        if ($source_type === 'youtube') {
            return 'YouTube';
        }
        if ($source_type === 'rss') {
            return 'RSS';
        }
        if (strpos($url, 'naver.com') !== false) {
            return '네이버';
        }
        if (strpos($url, 'google.com') !== false) {
            return 'Google';
        }

        return 'Web';
    }
}

if (!function_exists('icrm_content_build_icrm_api_payload')) {
    function icrm_content_build_icrm_api_payload($extra = array())
    {
        $payload = array(
            'license_key' => icrm_content_get_license_key(),
            'domain'      => icrm_content_site_domain(),
        );

        if (function_exists('icrm_point_get_billing_mb_id')) {
            $payload['admin_mb_id'] = icrm_point_get_billing_mb_id();
        }

        if (!is_array($extra)) {
            return $payload;
        }

        foreach ($extra as $key => $value) {
            $payload[$key] = $value;
        }

        return $payload;
    }
}

if (!function_exists('icrm_content_map_remote_job_status')) {
    function icrm_content_map_remote_job_status($remote_status, $imported = false)
    {
        if ($imported || $remote_status === 'completed') {
            return 'completed';
        }
        if (in_array((string) $remote_status, array('failed', 'callback_failed'), true)) {
            return 'failed';
        }

        return 'processing';
    }
}

if (!function_exists('icrm_content_sync_job_from_icrm')) {
    function icrm_content_sync_job_from_icrm($request_id, $icrm_job_id = '')
    {
        icrm_content_ensure_tables();
        $request_id = trim((string) $request_id);
        $icrm_job_id = trim((string) $icrm_job_id);
        if ($request_id === '' && $icrm_job_id === '') {
            return false;
        }

        if (function_exists('icrm_point_sync_connection_from_icrm')) {
            icrm_point_sync_connection_from_icrm();
        }

        $extra = array();
        if ($request_id !== '') {
            $extra['request_id'] = $request_id;
        }
        if ($icrm_job_id !== '') {
            $extra['job_id'] = $icrm_job_id;
        }

        try {
            $raw = icrm_content_http_post_json(
                icrm_content_api_url('job-status'),
                icrm_content_build_icrm_api_payload($extra),
                20
            );
        } catch (Exception $e) {
            return false;
        }

        $json = json_decode($raw, true);
        if (!is_array($json) || empty($json['success'])) {
            return false;
        }

        $remote_status = (string) ($json['status'] ?? '');
        $imported = false;
        $error_message = (string) ($json['error_message'] ?? '');

        if (!empty($json['import_payload']) && is_array($json['import_payload'])) {
            $import = icrm_content_import_payload($json['import_payload']);
            if (!empty($import['ok'])) {
                $imported = true;
                $error_message = '';
            } elseif ($remote_status === 'callback_failed' && $error_message === '') {
                $error_message = isset($import['message']) ? (string) $import['message'] : '초안 수신에 실패했습니다.';
            }
        }

        if ($remote_status === 'callback_failed' && !$imported && $error_message === '') {
            $error_message = '사이트로 결과를 전송하지 못했습니다. iCRM 연동 토큰을 확인해 주세요.';
        }

        $local_status = icrm_content_map_remote_job_status($remote_status, $imported);
        if ($local_status === 'completed') {
            $error_message = '';
        }
        $remote_job_id = isset($json['job_id']) ? trim((string) $json['job_id']) : $icrm_job_id;
        $now = G5_TIME_YMDHIS;

        if ($request_id !== '') {
            sql_query(" update " . icrm_content_table('jobs') . "
                           set status = '" . icrm_content_escape($local_status) . "',
                               icrm_job_id = '" . icrm_content_escape($remote_job_id) . "',
                               error_message = '" . icrm_content_escape($error_message) . "',
                               updated_at = '{$now}'
                         where request_id = '" . icrm_content_escape($request_id) . "' ", false);
        }

        return true;
    }
}

if (!function_exists('icrm_content_sync_pending_jobs')) {
    function icrm_content_sync_pending_jobs($limit = 15)
    {
        icrm_content_ensure_tables();
        $limit = max(1, min(30, (int) $limit));

        $res = sql_query(" select request_id, icrm_job_id, status, error_message
                             from " . icrm_content_table('jobs') . "
                            where status in ('queued', 'processing')
                               or (status = 'failed' and error_message like '%콜백%')
                               or (status = 'completed' and error_message != '')
                            order by icj_id desc
                            limit {$limit} ");
        while ($row = sql_fetch_array($res)) {
            icrm_content_sync_job_from_icrm(
                (string) ($row['request_id'] ?? ''),
                (string) ($row['icrm_job_id'] ?? '')
            );
        }
    }
}

if (!function_exists('icrm_content_job_has_draft')) {
    function icrm_content_job_has_draft($request_id)
    {
        $request_id = trim((string) $request_id);
        if ($request_id === '') {
            return false;
        }

        $row = sql_fetch(" select ici_id from " . icrm_content_table('items') . "
                           where (request_id = '" . icrm_content_escape($request_id) . "'
                              or request_id like '" . icrm_content_escape($request_id) . "_%')
                             and status != 'rejected'
                           limit 1 ");

        return !empty($row['ici_id']);
    }
}

if (!function_exists('icrm_content_humanize_job_error')) {
    function icrm_content_humanize_job_error($error_message, $source_url = '')
    {
        $msg = trim((string) $error_message);
        if ($msg === '') {
            return '';
        }

        $url = strtolower((string) $source_url);
        if (strpos($msg, 'HTTP 403') !== false && strpos($url, 'naver.com') !== false) {
            return '네이버가 자동 수집(봇) 접근을 차단했습니다. 검색 URL이 아닌 blog.naver.com · cafe.naver.com 글 URL을 입력해 주세요.';
        }
        if (strpos($msg, 'HTTP 403') !== false) {
            return '해당 URL 접근이 차단(403)되어 수집할 수 없습니다. 개별 글·기사 URL을 사용해 주세요.';
        }
        if (strpos($msg, '본문을 추출하지 못했습니다') !== false) {
            if (strpos($url, 'youtube.com/results') !== false || strpos($url, 'search_query=') !== false || strpos($url, 'search.naver.com') !== false) {
                return '검색 결과 페이지에서는 본문을 추출할 수 없습니다. 개별 글·영상 URL을 입력해 주세요.';
            }
        }
        if ($msg === '콜백 전송에 실패했습니다.') {
            return '결과 전송에 실패했습니다. 요청 이력을 새로고침하면 초안함에 반영될 수 있습니다.';
        }

        return $msg;
    }
}

if (!function_exists('icrm_content_job_status_label')) {
    function icrm_content_job_status_label($status)
    {
        $map = array(
            'queued'     => '대기',
            'processing' => '수집 중',
            'completed'  => '완료',
            'failed'     => '실패',
        );
        $status = (string) $status;

        return isset($map[$status]) ? $map[$status] : $status;
    }
}

if (!function_exists('icrm_content_job_status_hint')) {
    function icrm_content_job_status_hint($status, $has_draft = false)
    {
        if ((string) $status === 'processing' || (string) $status === 'queued') {
            return '수집중입니다. 잠시만 기다려주세요.';
        }
        if ((string) $status === 'completed' && $has_draft) {
            return '초안함에서 확인하세요.';
        }

        return '';
    }
}

if (!function_exists('icrm_content_job_row_to_item')) {
    function icrm_content_job_row_to_item(array $row)
    {
        $source_url = (string) ($row['source_url'] ?? '');
        $source_type = icrm_content_job_infer_source_type($row['source_type'] ?? '', $source_url);
        $keyword = icrm_content_job_infer_keyword($row['keyword'] ?? '', $source_url);
        $media_label = icrm_content_job_media_label($source_type, $source_url);
        $status = (string) ($row['status'] ?? '');
        $request_id = (string) ($row['request_id'] ?? '');
        $has_draft = $status === 'completed' && icrm_content_job_has_draft($request_id);
        $error_message = icrm_content_humanize_job_error($row['error_message'] ?? '', $source_url);
        if ($has_draft || ($status === 'completed' && $error_message !== '' && strpos($error_message, '콜백') !== false)) {
            $error_message = '';
        }

        return array(
            'icj_id'          => (int) ($row['icj_id'] ?? 0),
            'request_id'      => $request_id,
            'source_url'      => $source_url,
            'source_type'     => $source_type,
            'keyword'         => $keyword,
            'media_label'     => $media_label,
            'bo_table'        => (string) ($row['bo_table'] ?? ''),
            'mb_id'           => (string) ($row['mb_id'] ?? ''),
            'icrm_job_id'     => (string) ($row['icrm_job_id'] ?? ''),
            'status'          => $status,
            'status_label'    => icrm_content_job_status_label($status),
            'status_hint'     => icrm_content_job_status_hint($status, $has_draft),
            'error_message'   => $error_message,
            'has_draft'       => $has_draft,
            'created_at'      => (string) ($row['created_at'] ?? ''),
            'updated_at'      => (string) ($row['updated_at'] ?? ''),
        );
    }
}

if (!function_exists('icrm_content_fetch_jobs')) {
    function icrm_content_fetch_jobs($page = 1, $per_page = 20)
    {
        icrm_content_ensure_tables();
        icrm_content_sync_pending_jobs();

        $page = max(1, (int) $page);
        $per_page = max(1, min(100, (int) $per_page));
        $offset = ($page - 1) * $per_page;

        $total_row = sql_fetch(" select count(*) as cnt from " . icrm_content_table('jobs'));
        $total = isset($total_row['cnt']) ? (int) $total_row['cnt'] : 0;

        $items = array();
        $res = sql_query(" select * from " . icrm_content_table('jobs') . "
                           order by icj_id desc
                           limit {$offset}, {$per_page} ");
        while ($row = sql_fetch_array($res)) {
            $items[] = icrm_content_job_row_to_item($row);
        }

        return array('ok' => true, 'items' => $items, 'total' => $total, 'page' => $page, 'per_page' => $per_page);
    }
}

if (!function_exists('icrm_content_icrm_api_post')) {
    function icrm_content_icrm_api_post($endpoint, $payload = array(), $timeout = 25)
    {
        $license = icrm_content_get_license_key();
        if ($license === '') {
            return array('ok' => false, 'error' => 'license_not_configured', 'message' => 'iCRM 라이선스 키를 설정해 주세요.');
        }

        $body = icrm_content_build_icrm_api_payload($payload);
        $url = icrm_content_api_url($endpoint);

        try {
            $raw = icrm_content_http_post_json($url, $body, $timeout);
        } catch (Exception $e) {
            return array('ok' => false, 'error' => 'api_error', 'message' => $e->getMessage());
        }

        $json = json_decode($raw, true);
        if (!is_array($json)) {
            return array('ok' => false, 'error' => 'invalid_response', 'message' => 'iCRM 응답을 해석할 수 없습니다.');
        }

        if (empty($json['success'])) {
            return array(
                'ok'      => false,
                'error'   => isset($json['status']) ? (string) $json['status'] : 'api_failed',
                'message' => isset($json['message']) ? (string) $json['message'] : 'iCRM 요청에 실패했습니다.',
                'raw'     => $json,
            );
        }

        return array('ok' => true, 'data' => $json);
    }
}

if (!function_exists('icrm_content_fetch_remote_settings')) {
    function icrm_content_fetch_remote_settings()
    {
        $res = icrm_content_icrm_api_post('settings', array('action' => 'get'));
        if (!$res['ok']) {
            return array(
                'ok'       => false,
                'settings' => array(
                    'default_bo_table'     => icrm_content_get_default_bo_table(),
                    'default_mb_id'        => icrm_content_get_default_mb_id(),
                    'default_collect_mode' => 'source',
                    'default_max_items'    => 10,
                    'web_engine'           => 'naver',
                ),
                'message'  => $res['message'] ?? '',
            );
        }

        $settings = isset($res['data']['settings']) && is_array($res['data']['settings']) ? $res['data']['settings'] : array();

        return array('ok' => true, 'settings' => $settings);
    }
}

if (!function_exists('icrm_content_save_remote_settings')) {
    function icrm_content_save_remote_settings($input)
    {
        $input = is_array($input) ? $input : array();
        $payload = array_merge(array('action' => 'save'), $input);

        return icrm_content_icrm_api_post('settings', $payload);
    }
}

if (!function_exists('icrm_content_fetch_remote_rules')) {
    function icrm_content_fetch_remote_rules($filters = array())
    {
        $payload = array_merge(array('action' => 'list'), is_array($filters) ? $filters : array());
        $res = icrm_content_icrm_api_post('rules', $payload);
        if (!$res['ok']) {
            return array('ok' => false, 'items' => array(), 'total' => 0, 'message' => $res['message'] ?? '');
        }

        return array(
            'ok'       => true,
            'items'    => isset($res['data']['items']) && is_array($res['data']['items']) ? $res['data']['items'] : array(),
            'total'    => (int) ($res['data']['total'] ?? 0),
            'page'     => (int) ($res['data']['page'] ?? 1),
            'per_page' => (int) ($res['data']['per_page'] ?? 20),
        );
    }
}

if (!function_exists('icrm_content_save_remote_rule')) {
    function icrm_content_save_remote_rule($input)
    {
        $input = is_array($input) ? $input : array();
        $payload = array_merge(array('action' => 'save'), $input);

        return icrm_content_icrm_api_post('rules', $payload);
    }
}

if (!function_exists('icrm_content_delete_remote_rule')) {
    function icrm_content_delete_remote_rule($gcr_id)
    {
        return icrm_content_icrm_api_post('rules', array(
            'action' => 'delete',
            'gcr_id' => (int) $gcr_id,
        ));
    }
}

if (!function_exists('icrm_content_toggle_remote_rule')) {
    function icrm_content_toggle_remote_rule($gcr_id, $is_active)
    {
        return icrm_content_icrm_api_post('rules', array(
            'action'       => 'toggle',
            'gcr_id'       => (int) $gcr_id,
            'gcr_is_active'=> !empty($is_active) ? 1 : 0,
        ));
    }
}

if (!function_exists('icrm_content_run_remote_rule')) {
    function icrm_content_run_remote_rule($gcr_id, $options = array())
    {
        icrm_content_ensure_tables();
        if (!is_array($options)) {
            $options = array();
        }

        if (function_exists('icrm_point_sync_connection_from_icrm')) {
            icrm_point_sync_connection_from_icrm();
        }

        $request_id = icrm_content_make_request_id('rule');
        $settings = icrm_content_fetch_remote_settings();
        $remote = isset($settings['settings']) && is_array($settings['settings']) ? $settings['settings'] : array();
        $bo_table = isset($options['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $options['bo_table']) : '';
        $mb_id = isset($options['mb_id']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $options['mb_id']) : '';
        if ($bo_table === '') {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) ($remote['default_bo_table'] ?? icrm_content_get_default_bo_table()));
        }
        if ($mb_id === '') {
            $mb_id = preg_replace('/[^a-z0-9_]/i', '', (string) ($remote['default_mb_id'] ?? icrm_content_get_default_mb_id()));
        }

        $callback_url = function_exists('icrm_get_site_base_url')
            ? rtrim(icrm_get_site_base_url(), '/') . '/icrm/content-import.php'
            : G5_URL . '/icrm/content-import.php';

        $billing_mb_id = function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : $mb_id;
        $member_point_balance = function_exists('icrm_point_get_balance') ? (int) icrm_point_get_balance($billing_mb_id) : 0;

        $payload = array(
            'action'               => 'run',
            'request_id'           => $request_id,
            'gcr_id'               => (int) $gcr_id,
            'bo_table'             => $bo_table,
            'mb_id'                => $mb_id,
            'callback_url'         => $callback_url,
            'admin_mb_id'          => $billing_mb_id,
            'member_point_balance' => $member_point_balance,
            'billing_multiplier'   => function_exists('icrm_point_get_multiplier') ? icrm_point_get_multiplier() : 6,
        );

        $res = icrm_content_icrm_api_post('rules', $payload, 30);
        if (!$res['ok']) {
            return array('ok' => false, 'message' => $res['message'] ?? '규칙 실행에 실패했습니다.');
        }

        $json = $res['data'];
        if (function_exists('icrm_point_apply_api_response')) {
            icrm_point_apply_api_response('content_collector', 'collect', $json, $request_id);
        }

        $now = G5_TIME_YMDHIS;
        sql_query(" insert into " . icrm_content_table('jobs') . "
                        set request_id = '" . icrm_content_escape($request_id) . "',
                            source_url = '',
                            source_type = '',
                            keyword = '',
                            bo_table = '" . icrm_content_escape($bo_table) . "',
                            mb_id = '" . icrm_content_escape($mb_id) . "',
                            status = '" . icrm_content_escape(!empty($json['success']) ? 'processing' : 'failed') . "',
                            icrm_job_id = '" . icrm_content_escape(isset($json['job_id']) ? (string) $json['job_id'] : '') . "',
                            error_message = '" . icrm_content_escape(!empty($json['success']) ? '' : (string) ($json['message'] ?? '')) . "',
                            created_at = '{$now}',
                            updated_at = '{$now}' ");

        return array(
            'ok'         => !empty($json['success']),
            'request_id' => $request_id,
            'job_id'     => isset($json['job_id']) ? (string) $json['job_id'] : '',
            'message'    => isset($json['message']) ? (string) $json['message'] : '수집 요청을 접수했습니다.',
        );
    }
}

if (!function_exists('icrm_content_sync_remote_items')) {
    function icrm_content_sync_remote_items($filters = array())
    {
        icrm_content_ensure_tables();
        $payload = array_merge(array(
            'page'     => 1,
            'per_page' => 50,
        ), is_array($filters) ? $filters : array());

        $res = icrm_content_icrm_api_post('items', $payload, 30);
        if (!$res['ok']) {
            return $res;
        }

        $imported = 0;
        $items = isset($res['data']['items']) && is_array($res['data']['items']) ? $res['data']['items'] : array();
        foreach ($items as $remote) {
            if (!is_array($remote)) {
                continue;
            }
            $payload_data = isset($remote['import_payload']) && is_array($remote['import_payload']) ? $remote['import_payload'] : array();
            if (empty($payload_data) || empty($payload_data['source_url'])) {
                continue;
            }
            $request_id = (string) ($remote['request_id'] ?? ($payload_data['request_id'] ?? ''));
            if ($request_id !== '') {
                $exists = sql_fetch(" select ici_id from " . icrm_content_table('items') . "
                                       where request_id = '" . icrm_content_escape($request_id) . "' limit 1 ");
                if (!empty($exists['ici_id'])) {
                    continue;
                }
            }
            $import = icrm_content_import_payload($payload_data);
            if (!empty($import['ok'])) {
                $imported++;
            }
        }

        return array(
            'ok'       => true,
            'imported' => $imported,
            'stats'    => isset($res['data']['stats']) && is_array($res['data']['stats']) ? $res['data']['stats'] : array(),
            'total'    => (int) ($res['data']['total'] ?? 0),
        );
    }
}

if (!function_exists('icrm_content_should_fallback_collect')) {
    function icrm_content_should_fallback_collect($result)
    {
        if (!is_array($result) || !empty($result['ok'])) {
            return false;
        }
        $error = (string) ($result['error'] ?? '');
        $message = (string) ($result['message'] ?? '');
        if ($error === 'invalid_response') {
            return true;
        }
        if (preg_match('/HTTP\s+(302|404|500|502|503)/', $message)) {
            return true;
        }
        if (strpos($message, '리다이렉트') !== false || strpos($message, '서버 오류') !== false) {
            return true;
        }

        return false;
    }
}

if (!function_exists('icrm_content_resolve_rule_source')) {
    /**
     * iCRM onoff_g5_content_collector_resolve_rule_source 와 동일한 URL·모드 해석
     *
     * @return array{ok:bool,source_url?:string,source_type?:string,collect_mode?:string,max_items?:int,keyword?:string,message?:string}
     */
    function icrm_content_resolve_rule_source($input)
    {
        $input = is_array($input) ? $input : array();
        $media = strtolower(trim((string) ($input['gcr_media_type'] ?? ($input['source_type'] ?? 'web'))));
        $keyword = trim((string) ($input['gcr_search_keyword'] ?? ($input['keyword'] ?? '')));
        $target = trim((string) ($input['gcr_target_url'] ?? ($input['target_url'] ?? '')));
        $rss = trim((string) ($input['gcr_rss_url'] ?? ($input['rss_url'] ?? '')));
        $collect_mode = in_array((string) ($input['gcr_collect_mode'] ?? ($input['collect_mode'] ?? '')), array('source', 'batch', 'regenerate'), true)
            ? (string) ($input['gcr_collect_mode'] ?? $input['collect_mode'])
            : 'batch';
        $max_items = max(1, min(20, (int) ($input['gcr_max_items'] ?? ($input['max_items'] ?? 10))));
        $web_engine = isset($input['web_engine']) ? preg_replace('/[^a-z_]/', '', strtolower((string) $input['web_engine'])) : 'naver';

        if ($media === 'youtube') {
            if ($target !== '') {
                return array(
                    'ok'           => true,
                    'source_url'   => $target,
                    'source_type'  => 'youtube',
                    'collect_mode' => $collect_mode === 'regenerate' ? 'regenerate' : 'source',
                    'max_items'    => 1,
                    'keyword'      => $keyword,
                );
            }
            if ($keyword === '') {
                return array('ok' => false, 'message' => 'YouTube 검색 키워드가 없습니다.');
            }
            $query = 'site:youtube.com/watch inurl:watch ' . $keyword;

            return array(
                'ok'           => true,
                'source_url'   => 'https://news.google.com/rss/search?q=' . rawurlencode($query) . '&hl=ko&gl=KR&ceid=KR:ko',
                'source_type'  => 'youtube',
                'collect_mode' => $collect_mode === 'source' ? 'batch' : $collect_mode,
                'max_items'    => $max_items,
                'keyword'      => $keyword,
            );
        }

        if ($media === 'rss') {
            if ($rss !== '') {
                return array(
                    'ok'           => true,
                    'source_url'   => $rss,
                    'source_type'  => 'rss',
                    'collect_mode' => $collect_mode === 'source' ? 'batch' : $collect_mode,
                    'max_items'    => $max_items,
                    'keyword'      => $keyword,
                );
            }
            if ($keyword === '') {
                return array('ok' => false, 'message' => 'RSS 검색 키워드가 없습니다.');
            }

            return array(
                'ok'           => true,
                'source_url'   => 'https://news.google.com/rss/search?q=' . rawurlencode($keyword) . '&hl=ko&gl=KR&ceid=KR:ko',
                'source_type'  => 'rss',
                'collect_mode' => 'batch',
                'max_items'    => $max_items,
                'keyword'      => $keyword,
            );
        }

        if ($target !== '') {
            $source_type = $media === 'naver' ? 'naver' : 'web';
            if (strpos(strtolower($target), 'blog.naver.com') !== false || strpos(strtolower($target), 'cafe.naver.com') !== false) {
                $source_type = 'naver';
            }

            return array(
                'ok'           => true,
                'source_url'   => $target,
                'source_type'  => $source_type,
                'collect_mode' => $collect_mode === 'batch' ? 'source' : $collect_mode,
                'max_items'    => 1,
                'keyword'      => $keyword,
            );
        }

        if ($keyword === '') {
            return array('ok' => false, 'message' => '검색 키워드가 없습니다.');
        }

        if ($media === 'naver' || $web_engine === 'naver') {
            $query = 'site:blog.naver.com ' . $keyword;
            $source_type = 'naver';
        } else {
            $query = $keyword;
            $source_type = 'rss';
        }

        return array(
            'ok'           => true,
            'source_url'   => 'https://news.google.com/rss/search?q=' . rawurlencode($query) . '&hl=ko&gl=KR&ceid=KR:ko',
            'source_type'  => $source_type,
            'collect_mode' => 'batch',
            'max_items'    => $max_items,
            'keyword'      => $keyword,
        );
    }
}

if (!function_exists('icrm_content_request_collect_from_rule')) {
    function icrm_content_request_collect_from_rule($input, $options = array())
    {
        $resolved = icrm_content_resolve_rule_source($input);
        if (empty($resolved['ok'])) {
            return array('ok' => false, 'message' => $resolved['message'] ?? '수집 URL을 만들 수 없습니다.');
        }

        $bo_table = isset($options['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $options['bo_table']) : '';
        $mb_id = isset($options['mb_id']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $options['mb_id']) : '';
        if ($bo_table === '') {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) ($input['gcr_bo_table'] ?? ($input['bo_table'] ?? '')));
        }
        if ($mb_id === '') {
            $mb_id = preg_replace('/[^a-z0-9_]/i', '', (string) ($input['gcr_mb_id'] ?? ($input['mb_id'] ?? '')));
        }

        $collect = icrm_content_request_collect(
            (string) $resolved['source_url'],
            $bo_table,
            $mb_id,
            array(
                'source_type'  => (string) ($resolved['source_type'] ?? 'web'),
                'keyword'      => (string) ($resolved['keyword'] ?? ''),
                'rule_name'    => trim((string) ($input['gcr_name'] ?? ($input['rule_name'] ?? ''))),
                'collect_mode' => (string) ($resolved['collect_mode'] ?? 'batch'),
                'max_items'    => (int) ($resolved['max_items'] ?? 10),
            )
        );
        if (!empty($collect['ok'])) {
            $collect['fallback'] = true;
            $collect['message'] = isset($collect['message']) ? (string) $collect['message'] : '수집 요청을 접수했습니다. (iCRM 규칙 API 미사용)';
        }

        return $collect;
    }
}

if (!function_exists('icrm_content_save_rule_and_run')) {
    function icrm_content_save_rule_and_run($input, $options = array())
    {
        $input = is_array($input) ? $input : array();
        $options = is_array($options) ? $options : array();
        $run = !empty($options['run']);

        $save = icrm_content_save_remote_rule($input);
        if (!$save['ok']) {
            if ($run && icrm_content_should_fallback_collect($save)) {
                return icrm_content_request_collect_from_rule($input, $options);
            }

            return array('ok' => false, 'message' => $save['message'] ?? '규칙 저장에 실패했습니다.');
        }

        if (!$run) {
            return array(
                'ok'      => true,
                'gcr_id'  => (int) ($save['data']['gcr_id'] ?? 0),
                'rule'    => $save['data']['rule'] ?? array(),
                'message' => $save['data']['message'] ?? '규칙을 저장했습니다.',
            );
        }

        $gcr_id = (int) ($save['data']['gcr_id'] ?? 0);
        if ($gcr_id <= 0) {
            return icrm_content_request_collect_from_rule($input, $options);
        }

        $run_res = icrm_content_run_remote_rule($gcr_id, $options);
        if (!$run_res['ok'] && icrm_content_should_fallback_collect($run_res)) {
            return icrm_content_request_collect_from_rule($input, $options);
        }

        return $run_res;
    }
}

