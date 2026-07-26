<?php
/**
 * iCRM 게시글 검색 순위 — 그누보드 클라이언트 (체크는 iCRM 중앙 API)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

define('ICRM_RANK_VERSION', '1.0.0');

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

if (!function_exists('icrm_rank_table')) {
    function icrm_rank_table($suffix = 'targets')
    {
        $prefix = function_exists('icrm_table_prefix') ? icrm_table_prefix() : (defined('G5_TABLE_PREFIX') ? G5_TABLE_PREFIX : 'g5_');

        return $prefix . 'icrm_rank_' . $suffix;
    }
}

if (!function_exists('icrm_rank_escape')) {
    function icrm_rank_escape($value)
    {
        return sql_escape_string((string) $value);
    }
}

if (!function_exists('icrm_rank_get_api_base_url')) {
    function icrm_rank_get_api_base_url()
    {
        $url = function_exists('onoff_builder_config_api_base_url')
            ? onoff_builder_config_api_base_url('rank_api_base_url', '')
            : '';
        if ($url === '' && function_exists('g5site_cfg')) {
            $url = trim(g5site_cfg('icrm_rank_api_base_url', ''));
        }
        if ($url === '') {
            $url = 'https://icrm.co.kr/api/rank-check';
        }

        return rtrim($url, '/');
    }
}

if (!function_exists('icrm_rank_get_license_key')) {
    function icrm_rank_get_license_key()
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

if (!function_exists('icrm_rank_site_domain')) {
    function icrm_rank_site_domain()
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
        if (function_exists('auto_comment_site_domain')) {
            return auto_comment_site_domain();
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

if (!function_exists('icrm_rank_is_enabled')) {
    function icrm_rank_is_enabled()
    {
        if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('rank_check_builtin', true)) {
            return false;
        }

        return true;
    }
}

if (!function_exists('icrm_rank_ensure_tables')) {
    function icrm_rank_ensure_tables()
    {
        static $done = false;
        if ($done) {
            return;
        }

        $targets = icrm_rank_table('targets');
        $results = icrm_rank_table('results');
        $checks = icrm_rank_table('checks');

        sql_query(" create table if not exists {$targets} (
            irt_id int not null auto_increment,
            bo_table varchar(20) not null default '',
            wr_id int not null default 0,
            target_url varchar(512) not null default '',
            keywords text not null,
            engines varchar(64) not null default 'naver,google',
            enabled tinyint not null default 1,
            last_checked_at datetime not null default '0000-00-00 00:00:00',
            created_at datetime not null default '0000-00-00 00:00:00',
            updated_at datetime not null default '0000-00-00 00:00:00',
            primary key (irt_id),
            unique key post_key (bo_table, wr_id),
            key enabled (enabled),
            key last_checked (last_checked_at)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8 ", false);

        sql_query(" create table if not exists {$results} (
            irr_id int not null auto_increment,
            bo_table varchar(20) not null default '',
            wr_id int not null default 0,
            keyword varchar(255) not null default '',
            engine varchar(20) not null default '',
            rank_pos int not null default 0,
            rank_prev int not null default 0,
            matched_url varchar(512) not null default '',
            status varchar(32) not null default '',
            request_id varchar(64) not null default '',
            checked_at datetime not null default '0000-00-00 00:00:00',
            primary key (irr_id),
            key post_engine (bo_table, wr_id, engine),
            key checked_at (checked_at),
            key keyword (keyword(100))
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8 ", false);

        sql_query(" create table if not exists {$checks} (
            irc_id int not null auto_increment,
            request_id varchar(64) not null default '',
            item_count int not null default 0,
            keyword_count int not null default 0,
            cost_krw decimal(12,4) not null default 0,
            points_charged int not null default 0,
            status varchar(20) not null default '',
            error_message text not null,
            created_at datetime not null default '0000-00-00 00:00:00',
            primary key (irc_id),
            unique key request_id (request_id),
            key created_at (created_at)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8 ", false);

        $done = true;
    }
}

if (!function_exists('icrm_rank_bootstrap')) {
    function icrm_rank_bootstrap()
    {
        if (!icrm_rank_is_enabled()) {
            return false;
        }

        icrm_rank_ensure_tables();

        return true;
    }
}

if (!function_exists('icrm_rank_parse_keywords')) {
    function icrm_rank_parse_keywords($raw)
    {
        if (is_array($raw)) {
            $parts = $raw;
        } else {
            $text = str_replace(array("\r\n", "\r"), "\n", (string) $raw);
            $text = str_replace(array(',', '，', '|'), "\n", $text);
            $parts = explode("\n", $text);
        }

        $keywords = array();
        foreach ($parts as $part) {
            $kw = trim((string) $part);
            if ($kw !== '' && !in_array($kw, $keywords, true)) {
                $keywords[] = $kw;
            }
        }

        return array_slice($keywords, 0, 10);
    }
}

if (!function_exists('icrm_rank_keywords_to_text')) {
    function icrm_rank_keywords_to_text($keywords)
    {
        if (!is_array($keywords)) {
            return '';
        }

        return implode("\n", $keywords);
    }
}

if (!function_exists('icrm_rank_get_post_url')) {
    function icrm_rank_get_post_url($bo_table, $wr_id)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return '';
        }

        if (function_exists('icrm_resolve_post_url')) {
            $resolved = icrm_resolve_post_url($bo_table, $wr_id);
            if (!empty($resolved['ok']) && !empty($resolved['final_url'])) {
                return (string) $resolved['final_url'];
            }
        }

        if (defined('G5_BBS_URL')) {
            return G5_BBS_URL . '/board.php?bo_table=' . urlencode($bo_table) . '&wr_id=' . $wr_id;
        }

        return '';
    }
}

if (!function_exists('icrm_rank_suggest_keywords')) {
    function icrm_rank_suggest_keywords($bo_table, $wr_id, $subject = '')
    {
        $keywords = array();
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;

        if ($subject === '' && $bo_table !== '' && $wr_id > 0) {
            global $g5;
            $write_table = $g5['write_prefix'] . $bo_table;
            $row = sql_fetch(" select wr_subject from {$write_table} where wr_id = '{$wr_id}' and wr_is_comment = 0 limit 1 ");
            if ($row) {
                $subject = (string) $row['wr_subject'];
            }
        }

        $subject = trim(strip_tags($subject));
        if ($subject !== '') {
            $keywords[] = $subject;
        }

        if (function_exists('g5b_seo_meta_get') && $bo_table !== '' && $wr_id > 0) {
            $meta = g5b_seo_meta_get('posts', $bo_table . ':' . $wr_id);
            if (is_array($meta) && !empty($meta['keywords'])) {
                $keywords = array_merge($keywords, icrm_rank_parse_keywords($meta['keywords']));
            }
        }

        if (function_exists('g5site_cfg')) {
            $main = trim(g5site_cfg('main_keyword', ''));
            if ($main !== '') {
                $keywords[] = $main;
            }
            $address = trim(g5site_cfg('address', ''));
            if ($address !== '' && $subject !== '') {
                $short_addr = preg_replace('/\s+.*/u', '', $address);
                if ($short_addr !== '') {
                    $keywords[] = $short_addr . ' ' . $subject;
                }
            }
        }

        return icrm_rank_parse_keywords($keywords);
    }
}

if (!function_exists('icrm_rank_get_target')) {
    function icrm_rank_get_target($bo_table, $wr_id)
    {
        icrm_rank_ensure_tables();

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return null;
        }

        $row = sql_fetch(" select * from " . icrm_rank_table('targets') . "
                           where bo_table = '" . icrm_rank_escape($bo_table) . "'
                             and wr_id = '{$wr_id}' limit 1 ");

        if (!$row) {
            return null;
        }

        $row['keywords'] = icrm_rank_parse_keywords($row['keywords']);
        $row['engines'] = icrm_rank_parse_engines($row['engines']);

        return $row;
    }
}

if (!function_exists('icrm_rank_parse_engines')) {
    function icrm_rank_parse_engines($raw)
    {
        $allowed = array('naver', 'google');
        $parts = array_map('trim', explode(',', strtolower((string) $raw)));
        $engines = array();
        foreach ($parts as $part) {
            if (in_array($part, $allowed, true) && !in_array($part, $engines, true)) {
                $engines[] = $part;
            }
        }

        return $engines ? $engines : $allowed;
    }
}

if (!function_exists('icrm_rank_save_target')) {
    function icrm_rank_save_target($bo_table, $wr_id, $keywords, $enabled = true, $engines = null)
    {
        icrm_rank_ensure_tables();

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return array('ok' => false, 'error' => '게시글 정보가 올바르지 않습니다.');
        }

        $keywords = icrm_rank_parse_keywords($keywords);
        if (!$keywords) {
            return array('ok' => false, 'error' => '체크할 키워드를 1개 이상 입력해 주세요.');
        }

        $engines = $engines === null ? array('naver', 'google') : icrm_rank_parse_engines($engines);
        $url = icrm_rank_get_post_url($bo_table, $wr_id);
        $now = G5_TIME_YMDHIS;
        $enabled_val = $enabled ? 1 : 0;

        $existing = icrm_rank_get_target($bo_table, $wr_id);
        if ($existing) {
            sql_query(" update " . icrm_rank_table('targets') . "
                           set target_url = '" . icrm_rank_escape($url) . "',
                               keywords = '" . icrm_rank_escape(icrm_rank_keywords_to_text($keywords)) . "',
                               engines = '" . icrm_rank_escape(implode(',', $engines)) . "',
                               enabled = '{$enabled_val}',
                               updated_at = '{$now}'
                         where bo_table = '" . icrm_rank_escape($bo_table) . "'
                           and wr_id = '{$wr_id}' ");
        } else {
            sql_query(" insert into " . icrm_rank_table('targets') . "
                            set bo_table = '" . icrm_rank_escape($bo_table) . "',
                                wr_id = '{$wr_id}',
                                target_url = '" . icrm_rank_escape($url) . "',
                                keywords = '" . icrm_rank_escape(icrm_rank_keywords_to_text($keywords)) . "',
                                engines = '" . icrm_rank_escape(implode(',', $engines)) . "',
                                enabled = '{$enabled_val}',
                                created_at = '{$now}',
                                updated_at = '{$now}' ");
        }

        return array('ok' => true, 'keywords' => $keywords, 'target_url' => $url);
    }
}

if (!function_exists('icrm_rank_delete_target')) {
    function icrm_rank_delete_target($bo_table, $wr_id)
    {
        icrm_rank_ensure_tables();
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;

        sql_query(" delete from " . icrm_rank_table('targets') . "
                     where bo_table = '" . icrm_rank_escape($bo_table) . "'
                       and wr_id = '{$wr_id}' ");

        return true;
    }
}

if (!function_exists('icrm_rank_rank_label')) {
    function icrm_rank_rank_label($rank, $status = '')
    {
        $rank = (int) $rank;
        $status = (string) $status;

        if ($status === 'error') {
            return '오류';
        }
        if ($status === 'url_mismatch') {
            return $rank > 0 ? $rank . '위*' : 'URL불일치';
        }
        if ($rank <= 0 || $status === 'not_found') {
            return '100위+';
        }

        return $rank . '위';
    }
}

if (!function_exists('icrm_rank_rank_delta')) {
    function icrm_rank_rank_delta($current, $previous)
    {
        $current = (int) $current;
        $previous = (int) $previous;
        if ($previous <= 0 || $current <= 0) {
            return 0;
        }

        return $previous - $current;
    }
}

if (!function_exists('icrm_rank_get_latest_results_map')) {
    function icrm_rank_get_latest_results_map($bo_table, $wr_id)
    {
        icrm_rank_ensure_tables();

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        $map = array(
            'naver' => null,
            'google' => null,
            'items' => array(),
        );

        if ($bo_table === '' || $wr_id < 1) {
            return $map;
        }

        $sql = " select *
                   from " . icrm_rank_table('results') . "
                  where bo_table = '" . icrm_rank_escape($bo_table) . "'
                    and wr_id = '{$wr_id}'
                  order by checked_at desc, irr_id desc ";
        $result = sql_query($sql);
        $seen = array();

        while ($row = sql_fetch_array($result)) {
            $key = $row['engine'] . '|' . $row['keyword'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $map['items'][] = $row;

            $engine = (string) $row['engine'];
            $rank = (int) $row['rank_pos'];
            if (!isset($map[$engine]) || $map[$engine] === null) {
                $map[$engine] = $row;
            } elseif ($rank > 0 && ((int) $map[$engine]['rank_pos'] <= 0 || $rank < (int) $map[$engine]['rank_pos'])) {
                $map[$engine] = $row;
            }
        }

        return $map;
    }
}

if (!function_exists('icrm_rank_get_dashboard_stats')) {
    function icrm_rank_get_dashboard_stats()
    {
        icrm_rank_ensure_tables();

        $targets = icrm_rank_table('targets');
        $results = icrm_rank_table('results');

        $target_row = sql_fetch(" select count(*) as cnt,
                                         sum(case when enabled = 1 then 1 else 0 end) as enabled_cnt,
                                         sum(case when last_checked_at = '0000-00-00 00:00:00' then 1 else 0 end) as never_checked
                                    from {$targets} ");
        $today = date('Y-m-d 00:00:00', G5_SERVER_TIME);
        $checked_today = sql_fetch(" select count(distinct concat(bo_table, ':', wr_id)) as cnt
                                       from {$results}
                                      where checked_at >= '{$today}' ");

        return array(
            'targets_total'   => (int) $target_row['cnt'],
            'targets_enabled' => (int) $target_row['enabled_cnt'],
            'never_checked'   => (int) $target_row['never_checked'],
            'checked_today'   => (int) $checked_today['cnt'],
        );
    }
}

if (!function_exists('icrm_rank_fetch_posts')) {
    function icrm_rank_fetch_posts($bo_table = '', $page = 1, $per_page = 30, $filter = 'all')
    {
        global $g5;

        icrm_rank_ensure_tables();

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $page = max(1, (int) $page);
        $per_page = max(1, min(100, (int) $per_page));
        $filter = in_array($filter, array('all', 'tracked', 'unchecked', 'top10', 'dropped'), true) ? $filter : 'all';

        $boards = array();
        $sql = " select bo_table, bo_subject from {$g5['board_table']} order by bo_table ";
        $bres = sql_query($sql);
        while ($b = sql_fetch_array($bres)) {
            if ($bo_table !== '' && $b['bo_table'] !== $bo_table) {
                continue;
            }
            $boards[] = $b;
        }

        $items = array();
        foreach ($boards as $board) {
            $bt = $board['bo_table'];
            $write_table = $g5['write_prefix'] . $bt;
            if (!sql_query(" select 1 from {$write_table} limit 1 ", false)) {
                continue;
            }

            $result = sql_query(" select w.wr_id, w.wr_subject, w.wr_datetime, w.wr_hit,
                                         t.irt_id, t.keywords, t.enabled, t.last_checked_at, t.target_url
                                    from {$write_table} w
                                    left join " . icrm_rank_table('targets') . " t
                                      on t.bo_table = w.bo_table and t.wr_id = w.wr_id
                                   where w.wr_is_comment = 0
                                   order by w.wr_id desc
                                   limit 500 ");
            while ($row = sql_fetch_array($result)) {
                $row['bo_table'] = $bt;
                $row['bo_subject'] = $board['bo_subject'];
                $row['keyword_list'] = !empty($row['keywords']) ? icrm_rank_parse_keywords($row['keywords']) : array();
                $row['tracked'] = !empty($row['irt_id']);
                $summary = icrm_rank_get_latest_results_map($bt, (int) $row['wr_id']);
                $row['naver'] = $summary['naver'];
                $row['google'] = $summary['google'];

                $naver_rank = $row['naver'] ? (int) $row['naver']['rank_pos'] : 0;
                $google_rank = $row['google'] ? (int) $row['google']['rank_pos'] : 0;
                $best_rank = 0;
                foreach (array($naver_rank, $google_rank) as $r) {
                    if ($r > 0 && ($best_rank <= 0 || $r < $best_rank)) {
                        $best_rank = $r;
                    }
                }
                $row['best_rank'] = $best_rank;

                $include = true;
                if ($filter === 'tracked' && !$row['tracked']) {
                    $include = false;
                } elseif ($filter === 'unchecked') {
                    $include = !$row['tracked']
                        || empty($row['last_checked_at'])
                        || $row['last_checked_at'] === '0000-00-00 00:00:00';
                } elseif ($filter === 'top10' && $best_rank > 10) {
                    $include = false;
                } elseif ($filter === 'dropped') {
                    $dropped = false;
                    foreach ($summary['items'] as $it) {
                        if ((int) $it['rank_prev'] > 0 && (int) $it['rank_pos'] > 0 && (int) $it['rank_pos'] > (int) $it['rank_prev']) {
                            $dropped = true;
                            break;
                        }
                    }
                    if (!$dropped) {
                        $include = false;
                    }
                }

                if ($include) {
                    $items[] = $row;
                }
            }
        }

        usort($items, function ($a, $b) {
            return (int) $b['wr_id'] - (int) $a['wr_id'];
        });

        $total = count($items);
        $offset = ($page - 1) * $per_page;

        return array(
            'ok'       => true,
            'items'    => array_slice($items, $offset, $per_page),
            'total'    => $total,
            'page'     => $page,
            'per_page' => $per_page,
        );
    }
}

if (!function_exists('icrm_rank_http_post_json')) {
    function icrm_rank_http_post_json($url, $payload, $timeout = 60)
    {
        $body = json_encode($payload);
        if ($body === false) {
            throw new Exception('순위체크 요청 JSON 생성 실패');
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
            throw new Exception('iCRM 순위 API 연결 실패: ' . $error);
        }
        if ($status < 200 || $status >= 300) {
            throw new Exception('iCRM 순위 API HTTP ' . $status);
        }

        return (string) $response;
    }
}

if (!function_exists('icrm_rank_icrm_api_url')) {
    function icrm_rank_icrm_api_url($endpoint = 'check')
    {
        return icrm_rank_get_api_base_url() . '/' . ltrim((string) $endpoint, '/');
    }
}

if (!function_exists('icrm_rank_build_check_items')) {
    function icrm_rank_build_check_items($posts)
    {
        $items = array();
        foreach ($posts as $post) {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $post['bo_table']);
            $wr_id = (int) $post['wr_id'];
            if ($bo_table === '' || $wr_id < 1) {
                continue;
            }

            $target = icrm_rank_get_target($bo_table, $wr_id);
            if (!$target || empty($target['enabled']) || empty($target['keywords'])) {
                continue;
            }

            $items[] = array(
                'bo_table' => $bo_table,
                'wr_id'    => $wr_id,
                'url'      => !empty($target['target_url']) ? $target['target_url'] : icrm_rank_get_post_url($bo_table, $wr_id),
                'keywords' => $target['keywords'],
                'engines'  => $target['engines'],
            );
        }

        return $items;
    }
}

if (!function_exists('icrm_rank_save_results')) {
    function icrm_rank_save_results($results, $request_id = '')
    {
        icrm_rank_ensure_tables();
        if (!is_array($results)) {
            return 0;
        }

        $saved = 0;
        $now = G5_TIME_YMDHIS;
        $touched = array();

        foreach ($results as $row) {
            if (!is_array($row)) {
                continue;
            }

            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) (isset($row['bo_table']) ? $row['bo_table'] : ''));
            $wr_id = (int) (isset($row['wr_id']) ? $row['wr_id'] : 0);
            $keyword = trim((string) (isset($row['keyword']) ? $row['keyword'] : ''));
            $engine = preg_replace('/[^a-z]/', '', (string) (isset($row['engine']) ? $row['engine'] : ''));
            if ($bo_table === '' || $wr_id < 1 || $keyword === '' || $engine === '') {
                continue;
            }

            $prev = sql_fetch(" select rank_pos from " . icrm_rank_table('results') . "
                                 where bo_table = '" . icrm_rank_escape($bo_table) . "'
                                   and wr_id = '{$wr_id}'
                                   and keyword = '" . icrm_rank_escape($keyword) . "'
                                   and engine = '" . icrm_rank_escape($engine) . "'
                                 order by checked_at desc, irr_id desc
                                 limit 1 ");

            $rank = (int) (isset($row['rank']) ? $row['rank'] : (isset($row['rank_pos']) ? $row['rank_pos'] : 0));
            $rank_prev = isset($row['rank_prev']) ? (int) $row['rank_prev'] : (int) ($prev ? $prev['rank_pos'] : 0);
            $matched = isset($row['matched_url']) ? (string) $row['matched_url'] : '';
            $status = isset($row['status']) ? (string) $row['status'] : ($rank > 0 ? 'found' : 'not_found');
            $checked_at = isset($row['checked_at']) && $row['checked_at'] !== '' ? (string) $row['checked_at'] : $now;
            $req = $request_id !== '' ? $request_id : (isset($row['request_id']) ? (string) $row['request_id'] : '');

            sql_query(" insert into " . icrm_rank_table('results') . "
                            set bo_table = '" . icrm_rank_escape($bo_table) . "',
                                wr_id = '{$wr_id}',
                                keyword = '" . icrm_rank_escape($keyword) . "',
                                engine = '" . icrm_rank_escape($engine) . "',
                                rank_pos = '{$rank}',
                                rank_prev = '{$rank_prev}',
                                matched_url = '" . icrm_rank_escape($matched) . "',
                                status = '" . icrm_rank_escape($status) . "',
                                request_id = '" . icrm_rank_escape($req) . "',
                                checked_at = '" . icrm_rank_escape($checked_at) . "' ");

            $touched[$bo_table . ':' . $wr_id] = $checked_at;
            $saved++;
        }

        foreach ($touched as $key => $checked_at) {
            list($bo_table, $wr_id) = explode(':', $key, 2);
            sql_query(" update " . icrm_rank_table('targets') . "
                           set last_checked_at = '" . icrm_rank_escape($checked_at) . "',
                               target_url = '" . icrm_rank_escape(icrm_rank_get_post_url($bo_table, (int) $wr_id)) . "',
                               updated_at = '" . G5_TIME_YMDHIS . "'
                         where bo_table = '" . icrm_rank_escape($bo_table) . "'
                           and wr_id = '" . (int) $wr_id . "' ");
        }

        return $saved;
    }
}

if (!function_exists('icrm_rank_log_check')) {
    function icrm_rank_log_check($request_id, $item_count, $keyword_count, $cost_krw, $points_charged, $status, $error = '')
    {
        icrm_rank_ensure_tables();
        $request_id = substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $request_id), 0, 64);
        if ($request_id === '') {
            return;
        }

        $exists = sql_fetch(" select irc_id from " . icrm_rank_table('checks') . "
                               where request_id = '" . icrm_rank_escape($request_id) . "' limit 1 ");
        if ($exists) {
            return;
        }

        sql_query(" insert into " . icrm_rank_table('checks') . "
                        set request_id = '" . icrm_rank_escape($request_id) . "',
                            item_count = '" . (int) $item_count . "',
                            keyword_count = '" . (int) $keyword_count . "',
                            cost_krw = '" . icrm_rank_escape(sprintf('%.4f', (float) $cost_krw)) . "',
                            points_charged = '" . (int) $points_charged . "',
                            status = '" . icrm_rank_escape(substr((string) $status, 0, 20)) . "',
                            error_message = '" . icrm_rank_escape((string) $error) . "',
                            created_at = '" . G5_TIME_YMDHIS . "' ");
    }
}

if (!function_exists('icrm_rank_run_check')) {
    function icrm_rank_run_check($bo_table, $wr_ids = array(), $engines = null)
    {
        icrm_rank_ensure_tables();

        $license_key = icrm_rank_get_license_key();
        if ($license_key === '') {
            return array('ok' => false, 'error' => 'iCRM 라이선스 키가 없습니다. SEO 메타 또는 자동댓글 설정에서 키를 등록하세요.');
        }

        $posts = array();
        if (is_array($wr_ids) && $wr_ids) {
            foreach ($wr_ids as $wr_id) {
                $posts[] = array('bo_table' => $bo_table, 'wr_id' => (int) $wr_id);
            }
        } else {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
            $result = sql_query(" select bo_table, wr_id from " . icrm_rank_table('targets') . "
                                   where enabled = 1 " . ($bo_table !== '' ? " and bo_table = '" . icrm_rank_escape($bo_table) . "' " : '') . "
                                   order by last_checked_at asc, irt_id asc ");
            while ($row = sql_fetch_array($result)) {
                $posts[] = $row;
            }
        }

        $items = icrm_rank_build_check_items($posts);
        if (!$items) {
            return array('ok' => false, 'error' => '순위체크 대상 글이 없습니다. 키워드를 등록하고 활성화해 주세요.');
        }

        if ($engines !== null) {
            $engines = icrm_rank_parse_engines($engines);
            foreach ($items as &$item) {
                $item['engines'] = $engines;
            }
            unset($item);
        }

        $request_id = function_exists('icrm_point_make_request_id')
            ? icrm_point_make_request_id('rank_check', 'check')
            : ('rank_check_' . date('YmdHis') . '_' . mt_rand(1000, 9999));

        if (function_exists('icrm_point_check_before_call')) {
            $precheck = icrm_point_check_before_call(1);
            if (!$precheck['ok']) {
                return $precheck;
            }
        }

        $keyword_count = 0;
        foreach ($items as $item) {
            $keyword_count += count($item['keywords']) * count($item['engines']);
        }

        $payload = array(
            'license_key'        => $license_key,
            'domain'             => icrm_rank_site_domain(),
            'request_id'         => $request_id,
            'admin_mb_id'        => function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : '',
            'billing_multiplier' => function_exists('icrm_point_get_multiplier') ? icrm_point_get_multiplier() : 6,
            'items'              => $items,
            'engines'            => $engines ? $engines : array('naver', 'google'),
        );

        try {
            $response = icrm_rank_http_post_json(icrm_rank_icrm_api_url('check'), $payload, 120);
        } catch (Exception $e) {
            icrm_rank_log_check($request_id, count($items), $keyword_count, 0, 0, 'failed', $e->getMessage());

            return array('ok' => false, 'error' => $e->getMessage());
        }

        $json = json_decode($response, true);
        if (!is_array($json)) {
            icrm_rank_log_check($request_id, count($items), $keyword_count, 0, 0, 'failed', 'JSON 파싱 실패');

            return array('ok' => false, 'error' => 'iCRM API 응답 JSON을 읽을 수 없습니다.');
        }

        if (function_exists('icrm_point_apply_api_response')) {
            $billing = icrm_point_apply_api_response('rank_check', 'check', $json, $request_id);
            if (!$billing['ok']) {
                icrm_rank_log_check($request_id, count($items), $keyword_count, 0, 0, 'point_insufficient', $billing['error']);

                return $billing;
            }
        }

        if (empty($json['success'])) {
            $msg = isset($json['message']) ? (string) $json['message'] : '순위체크 실패';
            icrm_rank_log_check($request_id, count($items), $keyword_count, 0, 0, 'failed', $msg);

            return array('ok' => false, 'error' => $msg, 'status' => isset($json['status']) ? $json['status'] : '');
        }

        $results = isset($json['results']) && is_array($json['results']) ? $json['results'] : array();
        $saved = icrm_rank_save_results($results, $request_id);

        $cost = isset($json['cost_krw']) ? (float) $json['cost_krw'] : 0;
        $points = isset($json['points_charged']) ? (int) $json['points_charged'] : 0;
        icrm_rank_log_check($request_id, count($items), $keyword_count, $cost, $points, 'success', '');

        return array(
            'ok'             => true,
            'saved'          => $saved,
            'item_count'     => count($items),
            'keyword_count'  => $keyword_count,
            'points_charged' => $points,
            'point_balance'  => isset($json['point_balance']) ? (int) $json['point_balance'] : (function_exists('icrm_point_get_balance') ? icrm_point_get_balance() : 0),
            'results'        => $results,
        );
    }
}

if (!function_exists('icrm_rank_get_post_detail')) {
    function icrm_rank_get_post_detail($bo_table, $wr_id)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return array('ok' => false, 'error' => '글 정보가 없습니다.');
        }

        $board = get_board_db($bo_table, true);
        $write_table = $g5['write_prefix'] . $bo_table;
        $write = sql_fetch(" select * from {$write_table} where wr_id = '{$wr_id}' and wr_is_comment = 0 limit 1 ");
        if (!$write) {
            return array('ok' => false, 'error' => '게시글을 찾을 수 없습니다.');
        }

        $target = icrm_rank_get_target($bo_table, $wr_id);
        $results_map = icrm_rank_get_latest_results_map($bo_table, $wr_id);
        $history = array();
        $hres = sql_query(" select * from " . icrm_rank_table('results') . "
                             where bo_table = '" . icrm_rank_escape($bo_table) . "'
                               and wr_id = '{$wr_id}'
                             order by checked_at desc, irr_id desc
                             limit 100 ");
        while ($h = sql_fetch_array($hres)) {
            $history[] = $h;
        }

        return array(
            'ok'          => true,
            'board'       => $board,
            'write'       => $write,
            'target'      => $target,
            'target_url'  => icrm_rank_get_post_url($bo_table, $wr_id),
            'suggested'   => icrm_rank_suggest_keywords($bo_table, $wr_id, $write['wr_subject']),
            'latest'      => $results_map['items'],
            'summary'     => array(
                'naver'  => $results_map['naver'],
                'google' => $results_map['google'],
            ),
            'history'     => $history,
        );
    }
}
