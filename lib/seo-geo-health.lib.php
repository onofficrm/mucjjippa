<?php
/**
 * SEO · GEO 헬스 대시보드 · 초안 GEO 패키지
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('g5b_seo_geo_health_bootstrap')) {
    function g5b_seo_geo_health_bootstrap()
    {
        if (!is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
            return false;
        }
        include_once G5_LIB_PATH . '/seo-meta.lib.php';
        if (is_file(G5_LIB_PATH . '/icrm-rank.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-rank.lib.php';
        }
        if (is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-content.lib.php';
        }

        return true;
    }
}

if (!function_exists('g5b_seo_geo_normalize_meta')) {
    function g5b_seo_geo_normalize_meta($meta)
    {
        if (function_exists('g5b_seo_meta_normalize_record')) {
            return g5b_seo_meta_normalize_record(is_array($meta) ? $meta : array());
        }

        return array(
            'title'       => '',
            'description' => '',
            'keywords'    => '',
            'robots'      => '',
            'og_image'    => '',
            'canonical'   => '',
            'schema_type' => '',
            'faq'         => array(),
            'updated_at'  => '',
        );
    }
}

if (!function_exists('g5b_seo_geo_score_meta')) {
    /**
     * 로컬 GEO 점수 (0~100, AI 호출 없음)
     */
    function g5b_seo_geo_score_meta($meta, $rank_tracked = false)
    {
        $meta = g5b_seo_geo_normalize_meta($meta);
        $score = 0;

        if ($meta['title'] !== '') {
            $score += 15;
        }
        $desc_len = function_exists('mb_strlen') ? mb_strlen($meta['description'], 'UTF-8') : strlen($meta['description']);
        if ($desc_len >= 80) {
            $score += 15;
        }
        if ($desc_len >= 120 && $desc_len <= 170) {
            $score += 10;
        }
        if ($meta['keywords'] !== '') {
            $score += 10;
        }
        $faq_count = count($meta['faq']);
        if ($faq_count >= 3) {
            $score += 25;
        } elseif ($faq_count > 0) {
            $score += 10;
        }
        if ($meta['schema_type'] !== '') {
            $score += 10;
        }
        if ($meta['og_image'] !== '') {
            $score += 5;
        }
        if ($rank_tracked) {
            $score += 10;
        }

        return min(100, $score);
    }
}

if (!function_exists('g5b_seo_geo_score_grade')) {
    function g5b_seo_geo_score_grade($score)
    {
        $score = (int) $score;
        if ($score >= 80) {
            return 'A';
        }
        if ($score >= 60) {
            return 'B';
        }
        if ($score >= 40) {
            return 'C';
        }

        return 'D';
    }
}

if (!function_exists('g5b_seo_geo_post_gap_flags')) {
    function g5b_seo_geo_post_gap_flags($meta, $rank_tracked = false)
    {
        $meta = g5b_seo_geo_normalize_meta($meta);
        $flags = array();

        if ($meta['title'] === '' || $meta['description'] === '') {
            $flags[] = 'meta_missing';
        }
        $desc_len = function_exists('mb_strlen') ? mb_strlen($meta['description'], 'UTF-8') : strlen($meta['description']);
        if ($desc_len > 0 && $desc_len < 80) {
            $flags[] = 'desc_short';
        }
        if (count($meta['faq']) < 3) {
            $flags[] = 'faq_missing';
        }
        if ($meta['schema_type'] === '') {
            $flags[] = 'schema_missing';
        }
        if (!$rank_tracked) {
            $flags[] = 'rank_missing';
        }

        return $flags;
    }
}

if (!function_exists('g5b_seo_geo_health_get_summary')) {
    function g5b_seo_geo_health_get_summary($bo_table = '')
    {
        global $g5;

        if (!g5b_seo_geo_health_bootstrap()) {
            return array('ok' => false, 'error' => 'seo_meta_unavailable');
        }

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $stats = array(
            'posts_total'      => 0,
            'posts_with_seo'   => 0,
            'posts_with_faq'   => 0,
            'posts_with_schema'=> 0,
            'posts_rank_tracked'=> 0,
            'avg_geo_score'    => 0,
            'gap_meta'         => 0,
            'gap_faq'          => 0,
            'gap_rank'         => 0,
        );

        $boards = array();
        $bres = sql_query(" select bo_table, bo_subject from {$g5['board_table']} order by bo_table ");
        while ($b = sql_fetch_array($bres)) {
            if ($bo_table !== '' && $b['bo_table'] !== $bo_table) {
                continue;
            }
            $boards[] = $b;
        }

        $score_sum = 0;
        foreach ($boards as $board) {
            $bt = $board['bo_table'];
            $write_table = $g5['write_prefix'] . $bt;
            if (!sql_query(" select 1 from {$write_table} limit 1 ", false)) {
                continue;
            }

            $res = sql_query(" select wr_id from {$write_table} where wr_is_comment = 0 order by wr_id desc limit 300 ");
            while ($row = sql_fetch_array($res)) {
                $wr_id = (int) $row['wr_id'];
                $stats['posts_total']++;

                $meta = g5b_seo_geo_normalize_meta(g5b_seo_meta_get('posts', $bt . ':' . $wr_id));
                $rank_tracked = function_exists('icrm_rank_get_target')
                    ? !empty(icrm_rank_get_target($bt, $wr_id))
                    : false;

                if (g5b_seo_meta_post_has_seo($bt, $wr_id)) {
                    $stats['posts_with_seo']++;
                }
                if (count($meta['faq']) >= 3) {
                    $stats['posts_with_faq']++;
                } else {
                    $stats['gap_faq']++;
                }
                if ($meta['schema_type'] !== '') {
                    $stats['posts_with_schema']++;
                }
                if ($rank_tracked) {
                    $stats['posts_rank_tracked']++;
                } else {
                    $stats['gap_rank']++;
                }

                $flags = g5b_seo_geo_post_gap_flags($meta, $rank_tracked);
                if (in_array('meta_missing', $flags, true)) {
                    $stats['gap_meta']++;
                }

                $score_sum += g5b_seo_geo_score_meta($meta, $rank_tracked);
            }
        }

        if ($stats['posts_total'] > 0) {
            $stats['avg_geo_score'] = (int) round($score_sum / $stats['posts_total']);
        }

        $rank_stats = function_exists('icrm_rank_get_dashboard_stats') ? icrm_rank_get_dashboard_stats() : array();
        $content_stats = function_exists('icrm_content_get_stats') ? icrm_content_get_stats() : array();

        return array(
            'ok'            => true,
            'bo_table'      => $bo_table,
            'stats'         => $stats,
            'rank'          => $rank_stats,
            'content'       => $content_stats,
            'ai_configured' => function_exists('g5b_seo_meta_is_ai_configured') ? g5b_seo_meta_is_ai_configured() : false,
        );
    }
}

if (!function_exists('g5b_seo_geo_health_fetch_gaps')) {
    function g5b_seo_geo_health_fetch_gaps($bo_table = '', $gap = 'all', $page = 1, $per_page = 30)
    {
        global $g5;

        if (!g5b_seo_geo_health_bootstrap()) {
            return array('ok' => false, 'error' => 'seo_meta_unavailable');
        }

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $gap = preg_replace('/[^a-z_]/', '', (string) $gap);
        $page = max(1, (int) $page);
        $per_page = max(1, min(50, (int) $per_page));

        $boards = array();
        $bres = sql_query(" select bo_table, bo_subject from {$g5['board_table']} order by bo_table ");
        while ($b = sql_fetch_array($bres)) {
            if ($bo_table !== '' && $b['bo_table'] !== $bo_table) {
                continue;
            }
            $boards[] = $b;
        }

        $candidates = array();
        foreach ($boards as $board) {
            $bt = $board['bo_table'];
            $write_table = $g5['write_prefix'] . $bt;
            if (!sql_query(" select 1 from {$write_table} limit 1 ", false)) {
                continue;
            }

            $res = sql_query(" select wr_id, wr_subject, wr_datetime from {$write_table}
                               where wr_is_comment = 0 order by wr_id desc limit 300 ");
            while ($row = sql_fetch_array($res)) {
                $wr_id = (int) $row['wr_id'];
                $meta = g5b_seo_geo_normalize_meta(g5b_seo_meta_get('posts', $bt . ':' . $wr_id));
                $rank_tracked = function_exists('icrm_rank_get_target')
                    ? !empty(icrm_rank_get_target($bt, $wr_id))
                    : false;
                $flags = g5b_seo_geo_post_gap_flags($meta, $rank_tracked);

                if ($gap !== 'all' && !in_array($gap, $flags, true)) {
                    continue;
                }
                if ($gap === 'all' && empty($flags)) {
                    continue;
                }

                $candidates[] = array(
                    'bo_table'    => $bt,
                    'bo_subject'  => (string) $board['bo_subject'],
                    'wr_id'       => $wr_id,
                    'subject'     => get_text(strip_tags((string) $row['wr_subject'])),
                    'datetime'    => (string) $row['wr_datetime'],
                    'geo_score'   => g5b_seo_geo_score_meta($meta, $rank_tracked),
                    'geo_grade'   => g5b_seo_geo_score_grade(g5b_seo_geo_score_meta($meta, $rank_tracked)),
                    'faq_count'   => count($meta['faq']),
                    'flags'       => $flags,
                    'rank_tracked'=> $rank_tracked,
                );
            }
        }

        usort($candidates, function ($a, $b) {
            if ($a['geo_score'] === $b['geo_score']) {
                return $b['wr_id'] - $a['wr_id'];
            }

            return $a['geo_score'] - $b['geo_score'];
        });

        $total = count($candidates);
        $offset = ($page - 1) * $per_page;
        $items = array_slice($candidates, $offset, $per_page);

        return array(
            'ok'       => true,
            'items'    => $items,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $per_page,
            'gap'      => $gap,
        );
    }
}

if (!function_exists('g5b_seo_geo_build_internal_links_html')) {
    function g5b_seo_geo_build_internal_links_html(array $links)
    {
        if (empty($links)) {
            return '';
        }

        $html = '<section class="g5b-internal-links" aria-label="관련 글">' . "\n";
        $html .= '<h3>관련 글</h3><ul>' . "\n";
        foreach ($links as $link) {
            if (!is_array($link)) {
                continue;
            }
            $snippet = trim((string) ($link['html_snippet'] ?? ''));
            if ($snippet !== '') {
                $html .= '<li>' . $snippet . '</li>' . "\n";
                continue;
            }
            $url = trim((string) ($link['url'] ?? ''));
            $anchor = trim((string) ($link['anchor_text'] ?? ''));
            if ($url === '' || $anchor === '') {
                continue;
            }
            $html .= '<li><a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '">'
                . htmlspecialchars($anchor, ENT_QUOTES, 'UTF-8') . '</a></li>' . "\n";
        }
        $html .= '</ul></section>';

        return $html;
    }
}

if (!function_exists('g5b_seo_geo_append_internal_links')) {
    function g5b_seo_geo_append_internal_links($content_html, array $links)
    {
        $content_html = (string) $content_html;
        if (strpos($content_html, 'g5b-internal-links') !== false) {
            return $content_html;
        }
        $block = g5b_seo_geo_build_internal_links_html($links);
        if ($block === '') {
            return $content_html;
        }

        return rtrim($content_html) . "\n\n" . $block;
    }
}

if (!function_exists('g5b_seo_geo_keywords_to_rank_list')) {
    function g5b_seo_geo_keywords_to_rank_list($keywords, $subject = '', $bo_table = '', $wr_id = 0)
    {
        $list = array();
        foreach (preg_split('/[,;\n]+/u', (string) $keywords) as $kw) {
            $kw = trim($kw);
            if ($kw !== '' && !in_array($kw, $list, true)) {
                $list[] = $kw;
            }
        }
        if (empty($list) && function_exists('icrm_rank_suggest_keywords') && $bo_table !== '' && $wr_id > 0) {
            $list = icrm_rank_suggest_keywords($bo_table, $wr_id, $subject);
        }
        if (empty($list) && trim((string) $subject) !== '') {
            $list[] = trim((string) $subject);
        }

        return array_slice($list, 0, 10);
    }
}

if (!function_exists('g5b_seo_geo_apply_draft_package')) {
    /**
     * 수집 초안에 SEO·FAQ·내부링크·키워드 패키지 적용 (발행 전)
     */
    function g5b_seo_geo_apply_draft_package(array $item, $options = array())
    {
        if (!g5b_seo_geo_health_bootstrap()) {
            return array('ok' => false, 'error' => 'seo_meta_unavailable', 'message' => 'SEO 모듈을 사용할 수 없습니다.');
        }
        if (!g5b_seo_meta_is_ai_configured()) {
            return array('ok' => false, 'error' => 'ai_not_configured', 'message' => 'iCRM SEO API 연동이 필요합니다.');
        }

        $options = is_array($options) ? $options : array();
        $include_faq = !array_key_exists('include_faq', $options) || !empty($options['include_faq']);
        $include_links = !array_key_exists('include_internal_links', $options) || !empty($options['include_internal_links']);
        $include_seo = !array_key_exists('include_seo', $options) || !empty($options['include_seo']);

        $subject = trim((string) ($item['subject'] ?? ''));
        $content_html = (string) ($item['content_html'] ?? '');
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) ($item['bo_table'] ?? ''));
        $ici_id = (int) ($item['ici_id'] ?? 0);
        $draft_key = 'draft:' . ($ici_id > 0 ? $ici_id : md5($subject . $content_html));

        $extra = array(
            'subject' => $subject,
            'content' => $content_html,
        );

        $seo = is_array($item['seo'] ?? null) ? $item['seo'] : array();
        $steps = array();

        if ($include_seo && ($subject === '' || trim((string) ($seo['title'] ?? '')) === '' || trim((string) ($seo['description'] ?? '')) === '')) {
            $gen = g5b_seo_meta_ai_generate('posts', $draft_key, $extra);
            if (empty($gen['ok'])) {
                return array(
                    'ok'      => false,
                    'error'   => isset($gen['error']) ? (string) $gen['error'] : 'seo_generate_failed',
                    'message' => isset($gen['error']) ? (string) $gen['error'] : 'SEO 생성에 실패했습니다.',
                );
            }
            $seo = array_merge($seo, (array) ($gen['data'] ?? array()));
            $steps[] = 'seo';
        }

        $faq = array();
        if (!empty($seo['faq']) && is_array($seo['faq'])) {
            $faq = $seo['faq'];
        }
        if ($include_faq && count($faq) < 3) {
            $faq_result = g5b_seo_meta_ai_generate_faq_enhanced('posts', $draft_key, $extra, 6);
            if (!empty($faq_result['ok']) && !empty($faq_result['data']['faq'])) {
                $faq = $faq_result['data']['faq'];
                $seo['faq'] = $faq;
                $steps[] = 'faq';
            }
        }

        if ($include_links && $subject !== '' && $content_html !== '' && function_exists('g5b_seo_meta_ai_internal_links')) {
            $links_result = g5b_seo_meta_ai_internal_links($subject, $content_html, $bo_table, 0, $extra);
            if (!empty($links_result['ok']) && !empty($links_result['data']['links'])) {
                $content_html = g5b_seo_geo_append_internal_links($content_html, (array) $links_result['data']['links']);
                $steps[] = 'internal_links';
            }
        }

        if (trim((string) ($seo['schema_type'] ?? '')) === '') {
            $seo['schema_type'] = 'Article';
        }

        $rank_keywords = array();
        if (!empty($item['rank_keywords']) && is_array($item['rank_keywords'])) {
            $rank_keywords = $item['rank_keywords'];
        }
        if (empty($rank_keywords)) {
            $rank_keywords = g5b_seo_geo_keywords_to_rank_list(
                isset($seo['keywords']) ? (string) $seo['keywords'] : '',
                $subject,
                $bo_table,
                0
            );
        }

        $geo_score = g5b_seo_geo_score_meta($seo, !empty($rank_keywords));

        return array(
            'ok'            => true,
            'subject'       => $subject,
            'content_html'  => $content_html,
            'seo'           => $seo,
            'rank_keywords' => $rank_keywords,
            'geo_score'     => $geo_score,
            'geo_grade'     => g5b_seo_geo_score_grade($geo_score),
            'steps'         => $steps,
            'message'       => 'GEO 패키지를 적용했습니다.',
        );
    }
}

if (!function_exists('icrm_content_apply_geo_package')) {
    function icrm_content_apply_geo_package($ici_id, $options = array())
    {
        if (!function_exists('icrm_content_get_item')) {
            if (is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
                include_once G5_LIB_PATH . '/icrm-content.lib.php';
            }
        }
        icrm_content_ensure_tables();

        $item = icrm_content_get_item((int) $ici_id);
        if (!$item) {
            return array('ok' => false, 'error' => 'not_found', 'message' => '초안을 찾을 수 없습니다.');
        }
        if ($item['status'] === 'published') {
            return array('ok' => false, 'error' => 'already_published', 'message' => '이미 발행된 글입니다.');
        }

        $pack = g5b_seo_geo_apply_draft_package($item, $options);
        if (empty($pack['ok'])) {
            return $pack;
        }

        $sets = array();
        if (!empty($pack['content_html'])) {
            $sets[] = "content_html = '" . icrm_content_escape((string) $pack['content_html']) . "'";
        }
        $seo_json = json_encode((array) ($pack['seo'] ?? array()), JSON_UNESCAPED_UNICODE);
        if ($seo_json === false) {
            $seo_json = '{}';
        }
        $sets[] = "seo_json = '" . icrm_content_escape($seo_json) . "'";
        $rank_text = implode("\n", (array) ($pack['rank_keywords'] ?? array()));
        $sets[] = "rank_keywords = '" . icrm_content_escape($rank_text) . "'";
        $sets[] = "updated_at = '" . G5_TIME_YMDHIS . "'";

        sql_query(" update " . icrm_content_table('items') . " set " . implode(', ', $sets) . "
                     where ici_id = '" . (int) $ici_id . "' ");

        return array(
            'ok'            => true,
            'ici_id'        => (int) $ici_id,
            'geo_score'     => (int) ($pack['geo_score'] ?? 0),
            'geo_grade'     => (string) ($pack['geo_grade'] ?? ''),
            'steps'         => (array) ($pack['steps'] ?? array()),
            'item'          => icrm_content_get_item((int) $ici_id),
            'message'       => (string) ($pack['message'] ?? 'GEO 패키지를 적용했습니다.'),
        );
    }
}

if (!function_exists('g5b_seo_geo_fix_post')) {
    /**
     * 발행된 게시글 SEO·FAQ·순위 보완 (AI)
     */
    function g5b_seo_geo_fix_post($bo_table, $wr_id, $options = array())
    {
        if (!g5b_seo_geo_health_bootstrap()) {
            return array('ok' => false, 'error' => 'seo_meta_unavailable', 'message' => 'SEO 모듈을 사용할 수 없습니다.');
        }
        if (!g5b_seo_meta_is_ai_configured()) {
            return array('ok' => false, 'error' => 'ai_not_configured', 'message' => 'iCRM SEO API 연동이 필요합니다.');
        }

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return array('ok' => false, 'error' => 'invalid_post', 'message' => '글 정보가 올바르지 않습니다.');
        }

        $options = is_array($options) ? $options : array();
        $include_faq = !array_key_exists('include_faq', $options) || !empty($options['include_faq']);
        $include_rank = !array_key_exists('include_rank', $options) || !empty($options['include_rank']);

        $result = g5b_seo_meta_bulk_process_post($bo_table, $wr_id, $include_faq);
        if (empty($result['ok'])) {
            return array(
                'ok'      => false,
                'error'   => isset($result['error']) ? (string) $result['error'] : 'seo_fix_failed',
                'message' => isset($result['error']) ? (string) $result['error'] : 'SEO 보완에 실패했습니다.',
            );
        }

        $key = $bo_table . ':' . $wr_id;
        $data = is_array($result['data'] ?? null) ? $result['data'] : g5b_seo_meta_get('posts', $key);
        if (trim((string) ($data['schema_type'] ?? '')) === '') {
            $data['schema_type'] = 'Article';
            g5b_seo_meta_save('posts', $key, $data);
        }

        $steps = array('seo');
        if ($include_faq && count($data['faq'] ?? array()) >= 3) {
            $steps[] = 'faq';
        }

        if ($include_rank && is_file(G5_LIB_PATH . '/icrm-rank.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-rank.lib.php';
            $ctx = g5b_seo_meta_extract_post_context($bo_table, $wr_id);
            $keywords = g5b_seo_geo_keywords_to_rank_list(
                isset($data['keywords']) ? (string) $data['keywords'] : '',
                isset($ctx['subject']) ? (string) $ctx['subject'] : '',
                $bo_table,
                $wr_id
            );
            if (!empty($keywords)) {
                $rank_result = icrm_rank_save_target($bo_table, $wr_id, $keywords, true);
                if (!empty($rank_result['ok'])) {
                    $steps[] = 'rank';
                }
            }
        }

        $meta = g5b_seo_meta_get('posts', $key);
        $rank_tracked = function_exists('icrm_rank_get_target')
            ? !empty(icrm_rank_get_target($bo_table, $wr_id))
            : in_array('rank', $steps, true);
        $geo_score = g5b_seo_geo_score_meta($meta, $rank_tracked);

        return array(
            'ok'        => true,
            'bo_table'  => $bo_table,
            'wr_id'     => $wr_id,
            'subject'   => isset($result['subject']) ? (string) $result['subject'] : '',
            'geo_score' => $geo_score,
            'geo_grade' => g5b_seo_geo_score_grade($geo_score),
            'steps'     => $steps,
            'message'   => 'SEO를 보완했습니다.',
        );
    }
}
