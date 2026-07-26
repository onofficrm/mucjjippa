<?php
/**
 * 게시판 글보기 SEO — Article/Breadcrumb Schema, 관련글
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

include_once dirname(__FILE__) . '/g5b-seo-list.php';

/* iCRM DB 직접 발행: 글보기 시 wr_seo_title 보정 (커스텀 스킨 공통) */
if (function_exists('g5site_cfg_bool') && g5site_cfg_bool('icrm_builtin', true)) {
    if (is_file(G5_LIB_PATH.'/icrm.lib.php')) {
        include_once G5_LIB_PATH.'/icrm.lib.php';
        if (function_exists('icrm_ensure_wr_seo_title_on_view')) {
            icrm_ensure_wr_seo_title_on_view();
        }
        if (function_exists('icrm_enqueue_board_assets')) {
            icrm_enqueue_board_assets();
        }
    }
}

if (!function_exists('g5b_seo_view_article_image')) {
    /**
     * 대표 이미지 URL (첨부 썸네일)
     *
     * @param string $bo_table
     * @param array  $view
     * @return string
     */
    function g5b_seo_view_article_image($bo_table, $view)
    {
        if (empty($view['wr_id'])) {
            return '';
        }

        if (!function_exists('get_list_thumbnail')) {
            include_once G5_LIB_PATH . '/thumbnail.lib.php';
        }

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        if ($bo_table === '') {
            return '';
        }

        $thumb = get_list_thumbnail($bo_table, (int) $view['wr_id'], 800, 600, false, true);
        if (!empty($thumb['src'])) {
            return $thumb['src'];
        }

        return '';
    }
}

if (!function_exists('g5b_seo_view_prepare_article')) {
    /**
     * Article Schema용 전역 변수 설정
     *
     * @param array  $view
     * @param string $bo_table
     * @param int    $wr_id
     */
    function g5b_seo_view_prepare_article($view, $bo_table, $wr_id)
    {
        global $article_title, $article_description, $article_url, $article_image,
               $article_date_published, $article_date_modified, $article_author_name;

        $article_title = !empty($view['wr_subject']) ? get_text($view['wr_subject']) : '';

        $plain = '';
        if (!empty($view['wr_content'])) {
            $plain = trim(preg_replace('/\s+/', ' ', strip_tags($view['wr_content'])));
        }
        if ($plain !== '') {
            $article_description = function_exists('cut_str') ? cut_str($plain, 180) : substr($plain, 0, 180);
        } else {
            $article_description = '';
        }

        $bo_table_safe = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $article_url = '';
        if ($bo_table_safe !== '' && $wr_id > 0 && function_exists('get_pretty_url')) {
            $article_url = get_pretty_url($bo_table_safe, $wr_id);
        }
        if ($article_url === '' && $bo_table_safe !== '' && $wr_id > 0) {
            $article_url = G5_BBS_URL . '/board.php?bo_table=' . urlencode($bo_table_safe) . '&wr_id=' . (int) $wr_id;
        }

        $article_image = g5b_seo_view_article_image($bo_table_safe, $view);

        $article_date_published = '';
        if (!empty($view['wr_datetime'])) {
            $ts = strtotime($view['wr_datetime']);
            if ($ts !== false) {
                $article_date_published = date('c', $ts);
            }
        }

        $article_date_modified = $article_date_published;
        if (!empty($view['wr_last'])) {
            $ts = strtotime($view['wr_last']);
            if ($ts !== false) {
                $article_date_modified = date('c', $ts);
            }
        }

        $article_author_name = !empty($view['wr_name']) ? get_text($view['wr_name']) : '';
    }
}

if (!function_exists('g5b_seo_view_breadcrumb_items')) {
    /**
     * @param array  $board
     * @param array  $view
     * @param string $bo_table
     * @param int    $wr_id
     * @return array
     */
    function g5b_seo_view_breadcrumb_items($board, $view, $bo_table, $wr_id)
    {
        $bo_table_safe = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $list_url = G5_BBS_URL . '/board.php?bo_table=' . urlencode($bo_table_safe);
        if (function_exists('get_pretty_url') && $bo_table_safe !== '') {
            $pretty = get_pretty_url($bo_table_safe);
            if ($pretty) {
                $list_url = $pretty;
            }
        }

        $view_url = $list_url;
        if ($wr_id > 0 && function_exists('get_pretty_url') && $bo_table_safe !== '') {
            $view_url = get_pretty_url($bo_table_safe, $wr_id);
        } elseif ($wr_id > 0) {
            $view_url .= '&wr_id=' . (int) $wr_id;
        }

        $board_name = isset($board['bo_subject']) ? get_text($board['bo_subject']) : '게시판';
        $post_title = !empty($view['wr_subject']) ? get_text($view['wr_subject']) : '';

        return array(
            array('name' => '홈', 'url' => defined('G5_URL') ? G5_URL : '/'),
            array('name' => $board_name, 'url' => $list_url),
            array('name' => $post_title, 'url' => $view_url),
        );
    }
}

if (!function_exists('g5b_seo_view_get_post_faq_items')) {
    /**
     * SEO 메타 FAQ (화면·JSON-LD 동일 소스)
     *
     * @param string $bo_table
     * @param int    $wr_id
     * @return array
     */
    function g5b_seo_view_get_post_faq_items($bo_table, $wr_id)
    {
        if (!is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
            return array();
        }

        include_once G5_LIB_PATH . '/seo-meta.lib.php';
        if (!function_exists('g5b_seo_meta_get_post_record')) {
            return array();
        }

        $meta = g5b_seo_meta_get_post_record($bo_table, $wr_id);
        if (empty($meta['faq']) || !is_array($meta['faq'])) {
            return array();
        }

        $items = array();
        foreach ($meta['faq'] as $row) {
            if (!is_array($row)) {
                continue;
            }
            $q = isset($row['q']) ? trim((string) $row['q']) : '';
            $a = isset($row['a']) ? trim((string) $row['a']) : '';
            if ($q !== '' && $a !== '') {
                $items[] = array('q' => $q, 'a' => $a);
            }
        }

        return $items;
    }
}

if (!function_exists('g5b_seo_view_faq_styles_printed')) {
    function g5b_seo_view_faq_styles_printed()
    {
        static $done = false;
        if ($done) {
            return;
        }
        $done = true;
        echo '<style>'
            . '.board-seo-faq{margin:2rem 0;padding:1.25rem 1.5rem;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}'
            . '.board-seo-faq__title{margin:0 0 1rem;font-size:1.125rem;font-weight:700;color:#0f172a}'
            . '.board-seo-faq .faq-list{display:flex;flex-direction:column;gap:0.5rem}'
            . '.board-seo-faq .faq-item{border:1px solid #e2e8f0;border-radius:8px;background:#fff;overflow:hidden}'
            . '.board-seo-faq .faq-question{display:block;width:100%;margin:0;padding:0.875rem 1rem;border:0;background:transparent;text-align:left;font:inherit;font-weight:600;color:#1e293b;cursor:pointer;line-height:1.5}'
            . '.board-seo-faq .faq-question:hover{background:#f1f5f9}'
            . '.board-seo-faq .faq-question:focus-visible{outline:2px solid #2563eb;outline-offset:-2px}'
            . '.board-seo-faq .faq-answer{display:none;padding:0 1rem 1rem;color:#334155;line-height:1.7}'
            . '.board-seo-faq .faq-item.is-open .faq-answer{display:block}'
            . '.board-seo-faq .faq-answer p{margin:0}'
            . '</style>';
    }
}

if (!function_exists('g5b_seo_view_render_faq')) {
    /**
     * SEO 메타 FAQ 아코디언 (FAQPage Schema와 동일 데이터)
     *
     * @param array  $view
     * @param string $bo_table
     * @param int    $wr_id
     * @param array  $opts title, accordion_mode
     */
    function g5b_seo_view_render_faq($view, $bo_table, $wr_id, $opts = array())
    {
        if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('g5b_seo_post_faq_visible', true)) {
            return;
        }

        if (!empty($view['wr_option']) && strpos((string) $view['wr_option'], 'secret') !== false) {
            return;
        }

        $bo_table_safe = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id_int = (int) $wr_id;
        if ($bo_table_safe === '' || $wr_id_int < 1) {
            return;
        }

        $faq_items = g5b_seo_view_get_post_faq_items($bo_table_safe, $wr_id_int);
        if (!$faq_items) {
            return;
        }

        $title = isset($opts['title']) ? (string) $opts['title'] : '자주 묻는 질문';
        $mode = isset($opts['accordion_mode']) ? (string) $opts['accordion_mode'] : 'single';

        g5b_seo_view_faq_styles_printed();

        echo '<section class="board-seo-faq" aria-labelledby="board-seo-faq-title">';
        echo '<h2 class="board-seo-faq__title" id="board-seo-faq-title">' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h2>';
        echo '<div class="faq-list" data-accordion-mode="' . htmlspecialchars($mode, ENT_QUOTES, 'UTF-8') . '">';

        foreach ($faq_items as $i => $faq) {
            $open = ($mode === 'single' && $i === 0) ? ' is-open' : '';
            $expanded = ($mode === 'single' && $i === 0) ? 'true' : 'false';
            echo '<div class="faq-item' . $open . '">';
            echo '<button type="button" class="faq-question" aria-expanded="' . $expanded . '">';
            echo htmlspecialchars($faq['q'], ENT_QUOTES, 'UTF-8');
            echo '</button>';
            echo '<div class="faq-answer"><p>' . nl2br(htmlspecialchars($faq['a'], ENT_QUOTES, 'UTF-8')) . '</p></div>';
            echo '</div>';
        }

        echo '</div></section>';
    }
}

if (!function_exists('g5b_seo_view_footer')) {
    /**
     * Schema + 관련글 (글보기 하단)
     *
     * @param array $view
     * @param array $board
     * @param string $bo_table
     * @param int $wr_id
     * @param array $opts article, breadcrumb, faq, related, related_title, related_limit
     */
    function g5b_seo_view_footer($view, $board, $bo_table, $wr_id, $opts = array())
    {
        $article_on = !isset($opts['article']) || $opts['article'];
        $breadcrumb_on = !isset($opts['breadcrumb']) || $opts['breadcrumb'];
        $faq_on = !isset($opts['faq']) || $opts['faq'];
        $related_on = !empty($opts['related']);
        $related_title = isset($opts['related_title']) ? $opts['related_title'] : '관련 글';
        $related_limit = isset($opts['related_limit']) ? (int) $opts['related_limit'] : 4;

        $schema_dir = G5_PATH . '/components/schema/';
        $article_file = $schema_dir . 'article.php';
        $breadcrumb_file = $schema_dir . 'breadcrumb.php';
        $related_file = G5_PATH . '/components/related-posts.php';

        if ($faq_on) {
            g5b_seo_view_render_faq($view, $bo_table, $wr_id, isset($opts['faq_opts']) && is_array($opts['faq_opts']) ? $opts['faq_opts'] : array());
        }

        if ($related_on && is_file($related_file)) {
            echo '<div class="related-posts-wrap board-seo-related">';
            $related_bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
            $related_keyword = !empty($view['wr_subject']) ? get_text(strip_tags($view['wr_subject'])) : '';
            $related_exclude_wr_id = (int) $wr_id;
            $related_title = $related_title;
            $related_limit = max(1, min(8, $related_limit));
            include_once $related_file;
            echo '</div>';
        }

        if ($breadcrumb_on && is_file($breadcrumb_file)) {
            $breadcrumb_items = g5b_seo_view_breadcrumb_items($board, $view, $bo_table, $wr_id);
            include $breadcrumb_file;
        }

        if ($article_on && is_file($article_file)) {
            g5b_seo_view_prepare_article($view, $bo_table, $wr_id);
            include $article_file;
        }
    }
}

if (!function_exists('g5b_seo_view_modified_time')) {
    /**
     * 수정일 표시 (wr_last가 wr_datetime과 다를 때)
     *
     * @param array $view
     * @return string HTML or empty
     */
    function g5b_seo_view_modified_time($view)
    {
        if (empty($view['wr_last']) || empty($view['wr_datetime'])) {
            return '';
        }

        $pub = strtotime($view['wr_datetime']);
        $mod = strtotime($view['wr_last']);
        if ($pub === false || $mod === false || $mod <= $pub) {
            return '';
        }

        return '<li class="if_modified"><span class="sound_only">수정일</span>'
            . g5b_seo_time_tag($view['wr_last'], date('Y-m-d H:i', $mod))
            . '</li>';
    }
}
