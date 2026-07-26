<?php
/**
 * RSS · sitemap · robots — 모든 복사 사이트 공통 (G5_URL · 글이름 URL 자동)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('seofeed_is_enabled')) {
    function seofeed_is_enabled()
    {
        if (function_exists('g5site_cfg_bool')) {
            return g5site_cfg_bool('seo_feed_enabled', true);
        }

        return true;
    }
}

if (!function_exists('seofeed_get_base_url')) {
    function seofeed_get_base_url()
    {
        if (function_exists('icrm_get_site_base_url')) {
            $url = icrm_get_site_base_url();
            if ($url !== '') {
                return rtrim($url, '/');
            }
        }

        if (defined('G5_DOMAIN') && G5_DOMAIN !== '') {
            return rtrim(G5_DOMAIN, '/');
        }

        if (defined('G5_URL') && G5_URL !== '') {
            return rtrim(G5_URL, '/');
        }

        return '';
    }
}

if (!function_exists('seofeed_abs_url')) {
    function seofeed_abs_url($path)
    {
        $path = trim((string) $path);
        if ($path === '') {
            return seofeed_get_base_url() . '/';
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        $base = seofeed_get_base_url();
        if ($path[0] !== '/') {
            $path = '/' . $path;
        }

        return $base . $path;
    }
}

if (!function_exists('seofeed_xml_escape')) {
    function seofeed_xml_escape($str)
    {
        $str = (string) $str;

        return htmlspecialchars($str, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}

if (!function_exists('seofeed_rfc822_date')) {
    function seofeed_rfc822_date($datetime)
    {
        $ts = strtotime((string) $datetime);
        if ($ts === false) {
            return '';
        }

        return date('r', $ts);
    }
}

if (!function_exists('seofeed_w3c_date')) {
    function seofeed_w3c_date($datetime)
    {
        $datetime = trim((string) $datetime);
        if ($datetime === '') {
            return '';
        }

        if (strlen($datetime) >= 19) {
            return substr($datetime, 0, 10) . 'T' . substr($datetime, 11, 8) . '+09:00';
        }

        $ts = strtotime($datetime);

        return $ts !== false ? date('c', $ts) : '';
    }
}

if (!function_exists('seofeed_get_excluded_page_paths')) {
    function seofeed_get_excluded_page_paths()
    {
        $defaults = array(
            '/page/inquiry-thanks.php',
            '/page/404.php',
            '/page/style-guide.php',
            '/page/local-template.php',
            '/page/_init.php',
        );

        if (!function_exists('g5site_cfg')) {
            return $defaults;
        }

        $extra = g5site_cfg('sitemap_exclude_pages', '');
        if ($extra === '') {
            return $defaults;
        }

        $parts = preg_split('/[\s,;]+/', $extra, -1, PREG_SPLIT_NO_EMPTY);
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '') {
                continue;
            }
            if ($part[0] !== '/') {
                $part = '/' . ltrim($part, '/');
            }
            $defaults[] = $part;
        }

        return array_values(array_unique($defaults));
    }
}

if (!function_exists('seofeed_get_static_page_paths')) {
    function seofeed_get_static_page_paths()
    {
        $paths = array('/');

        if (function_exists('g5site_cfg')) {
            $raw = g5site_cfg('sitemap_static_pages', '');
            if ($raw !== '') {
                $parts = preg_split('/[\s,;]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
                foreach ($parts as $part) {
                    $part = trim($part);
                    if ($part === '' || $part === '/') {
                        continue;
                    }
                    if ($part[0] !== '/') {
                        $part = '/' . ltrim($part, '/');
                    }
                    $paths[] = $part;
                }
            }
        }

        $page_dir = G5_PATH . '/page';
        if (is_dir($page_dir)) {
            $exclude = seofeed_get_excluded_page_paths();
            foreach (glob($page_dir . '/*.php') as $file) {
                $name = basename($file);
                if ($name[0] === '_' || $name === '_init.php') {
                    continue;
                }
                $path = '/page/' . $name;
                if (!in_array($path, $exclude, true)) {
                    $paths[] = $path;
                }
            }
        }

        return array_values(array_unique($paths));
    }
}

if (!function_exists('seofeed_get_excluded_boards')) {
    function seofeed_get_excluded_boards()
    {
        $defaults = array('inquiry');

        if (!function_exists('g5site_cfg')) {
            return $defaults;
        }

        $raw = g5site_cfg('sitemap_exclude_boards', '');
        if ($raw === '') {
            return $defaults;
        }

        $parts = preg_split('/[\s,;]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
        foreach ($parts as $part) {
            $defaults[] = preg_replace('/[^a-z0-9_]/i', '', $part);
        }

        return array_values(array_unique(array_filter($defaults)));
    }
}

if (!function_exists('seofeed_get_public_boards')) {
    function seofeed_get_public_boards($rss_only = false)
    {
        global $g5;

        $exclude = seofeed_get_excluded_boards();
        $boards = array();

        $sql = " select bo_table, bo_subject, bo_use_rss_view, bo_read_level, bo_page_rows
                   from {$g5['board_table']}
                  order by bo_table asc ";
        $result = sql_query($sql, false);

        while ($row = sql_fetch_array($result)) {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', $row['bo_table']);
            if ($bo_table === '' || in_array($bo_table, $exclude, true)) {
                continue;
            }
            if ((int) $row['bo_read_level'] >= 2) {
                continue;
            }
            if ($rss_only && empty($row['bo_use_rss_view'])) {
                continue;
            }
            $boards[] = $row;
        }

        return $boards;
    }
}

if (!function_exists('seofeed_post_url')) {
    function seofeed_post_url($bo_table, $wr_id, $write = null)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;

        if ($bo_table === '' || $wr_id < 1) {
            return '';
        }

        if ($write === null) {
            $write_table = $g5['write_prefix'] . $bo_table;
            $write = get_write($write_table, $wr_id, true);
        }

        if (function_exists('icrm_ensure_wr_seo_title')
            && is_array($write)
            && empty($write['wr_seo_title'])) {
            icrm_ensure_wr_seo_title($bo_table, $wr_id);
        }

        if (function_exists('get_pretty_url')) {
            return get_pretty_url($bo_table, $wr_id);
        }

        return G5_BBS_URL . '/board.php?bo_table=' . urlencode($bo_table) . '&wr_id=' . $wr_id;
    }
}

if (!function_exists('seofeed_board_list_url')) {
    function seofeed_board_list_url($bo_table)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        if ($bo_table === '') {
            return '';
        }

        if (function_exists('get_pretty_url')) {
            return get_pretty_url($bo_table);
        }

        return G5_BBS_URL . '/board.php?bo_table=' . urlencode($bo_table);
    }
}

if (!function_exists('seofeed_board_rss_url')) {
    function seofeed_board_rss_url($bo_table)
    {
        global $config;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        if ($bo_table === '') {
            return '';
        }

        if (!empty($config['cf_bbs_rewrite'])) {
            return seofeed_abs_url('/rss/' . $bo_table);
        }

        return G5_BBS_URL . '/rss.php?bo_table=' . urlencode($bo_table);
    }
}

if (!function_exists('seofeed_site_rss_url')) {
    function seofeed_site_rss_url()
    {
        return seofeed_abs_url('/rss.php');
    }
}

if (!function_exists('seofeed_sitemap_url')) {
    function seofeed_sitemap_url()
    {
        return seofeed_abs_url('/sitemap.xml');
    }
}

if (!function_exists('seofeed_get_rss_limit')) {
    function seofeed_get_rss_limit()
    {
        $limit = function_exists('g5site_cfg') ? (int) g5site_cfg('sitemap_rss_item_limit', '50') : 50;

        return max(10, min(200, $limit > 0 ? $limit : 50));
    }
}

if (!function_exists('seofeed_get_posts_limit')) {
    function seofeed_get_posts_limit()
    {
        $limit = function_exists('g5site_cfg') ? (int) g5site_cfg('sitemap_max_posts_per_board', '500') : 500;

        return max(50, min(5000, $limit > 0 ? $limit : 500));
    }
}

if (!function_exists('seofeed_collect_recent_posts')) {
    function seofeed_collect_recent_posts($rss_only = false, $limit = 0)
    {
        global $g5;

        if ($limit < 1) {
            $limit = seofeed_get_rss_limit();
        }

        $posts = array();
        $boards = seofeed_get_public_boards($rss_only);

        foreach ($boards as $board) {
            $bo_table = $board['bo_table'];
            $write_table = $g5['write_prefix'] . $bo_table;
            $lines = max(5, (int) $board['bo_page_rows']);
            if ($lines > $limit) {
                $lines = $limit;
            }

            $sql = " select wr_id, wr_subject, wr_content, wr_name, wr_datetime, wr_option
                       from {$write_table}
                      where wr_is_comment = 0
                        and wr_option not like '%secret%'
                      order by wr_num desc, wr_reply asc
                      limit 0, {$lines} ";
            $result = sql_query($sql, false);

            while ($row = sql_fetch_array($result)) {
                $row['bo_table'] = $bo_table;
                $row['board_subject'] = $board['bo_subject'];
                $posts[] = $row;
            }
        }

        usort($posts, function ($a, $b) {
            return strcmp($b['wr_datetime'], $a['wr_datetime']);
        });

        return array_slice($posts, 0, $limit);
    }
}

if (!function_exists('seofeed_strip_html_excerpt')) {
    function seofeed_strip_html_excerpt($html, $len = 300)
    {
        $text = trim(preg_replace('/\s+/', ' ', strip_tags((string) $html)));

        if ($text === '') {
            return '';
        }

        if (function_exists('cut_str')) {
            return cut_str($text, $len);
        }

        return strlen($text) > $len ? substr($text, 0, $len) . '...' : $text;
    }
}

if (!function_exists('seofeed_output_site_rss')) {
    function seofeed_output_site_rss()
    {
        global $config;

        if (!seofeed_is_enabled()) {
            header('HTTP/1.1 503 Service Unavailable');
            echo 'RSS is disabled.';
            exit;
        }

        $posts = seofeed_collect_recent_posts(true, seofeed_get_rss_limit());
        $site_name = isset($config['cf_title']) ? $config['cf_title'] : 'Site';
        $site_url = seofeed_get_base_url() . '/';
        $feed_url = seofeed_site_rss_url();
        $site_desc = function_exists('g5site_cfg') ? g5site_cfg('site_desc', $site_name) : $site_name;

        header('Content-Type: application/rss+xml; charset=utf-8');
        header('Cache-Control: public, max-age=600');

        echo '<?xml version="1.0" encoding="utf-8"?>' . "\n";
        echo '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">' . "\n";
        echo '<channel>' . "\n";
        echo '<title>' . seofeed_xml_escape($site_name) . '</title>' . "\n";
        echo '<link>' . seofeed_xml_escape($site_url) . '</link>' . "\n";
        echo '<description>' . seofeed_xml_escape($site_desc) . '</description>' . "\n";
        echo '<language>ko</language>' . "\n";
        echo '<atom:link href="' . seofeed_xml_escape($feed_url) . '" rel="self" type="application/rss+xml"/>' . "\n";

        foreach ($posts as $row) {
            $link = seofeed_post_url($row['bo_table'], (int) $row['wr_id']);
            $html = (strpos($row['wr_option'], 'html') !== false);
            $desc = seofeed_strip_html_excerpt($row['wr_content']);
            $pub = seofeed_w3c_date($row['wr_datetime']);
            $title = '[' . $row['board_subject'] . '] ' . $row['wr_subject'];

            echo '<item>' . "\n";
            echo '<title>' . seofeed_xml_escape($title) . '</title>' . "\n";
            echo '<link>' . seofeed_xml_escape($link) . '</link>' . "\n";
            echo '<guid isPermaLink="true">' . seofeed_xml_escape($link) . '</guid>' . "\n";
            echo '<description><![CDATA[' . ($html ? conv_content($row['wr_content'], 1) : $desc) . ']]></description>' . "\n";
            echo '<author>' . seofeed_xml_escape($row['wr_name']) . '</author>' . "\n";
            if ($pub !== '') {
                echo '<pubDate>' . seofeed_xml_escape($pub) . '</pubDate>' . "\n";
            }
            echo '</item>' . "\n";
        }

        echo '</channel>' . "\n";
        echo '</rss>' . "\n";
        exit;
    }
}

if (!function_exists('seofeed_output_sitemap')) {
    function seofeed_output_sitemap()
    {
        global $g5;

        if (!seofeed_is_enabled()) {
            header('HTTP/1.1 503 Service Unavailable');
            echo 'Sitemap is disabled.';
            exit;
        }

        $posts_limit = seofeed_get_posts_limit();
        $urls = array();

        foreach (seofeed_get_static_page_paths() as $path) {
            $urls[] = array(
                'loc'        => seofeed_abs_url($path),
                'changefreq' => ($path === '/') ? 'weekly' : 'monthly',
                'priority'   => ($path === '/') ? '1.0' : '0.8',
            );
        }

        foreach (seofeed_get_public_boards(false) as $board) {
            $bo_table = $board['bo_table'];
            $urls[] = array(
                'loc'        => seofeed_board_list_url($bo_table),
                'changefreq' => 'weekly',
                'priority'   => '0.7',
            );

            $write_table = $g5['write_prefix'] . $bo_table;
            $sql = " select wr_id, wr_seo_title, wr_datetime
                       from {$write_table}
                      where wr_is_comment = 0
                        and wr_option not like '%secret%'
                      order by wr_num desc, wr_reply asc
                      limit 0, {$posts_limit} ";
            $result = sql_query($sql, false);

            while ($row = sql_fetch_array($result)) {
                $loc = seofeed_post_url($bo_table, (int) $row['wr_id']);
                if ($loc === '') {
                    continue;
                }
                $urls[] = array(
                    'loc'        => $loc,
                    'lastmod'    => substr($row['wr_datetime'], 0, 10),
                    'changefreq' => 'monthly',
                    'priority'   => '0.6',
                );
            }
        }

        header('Content-Type: application/xml; charset=utf-8');
        header('Cache-Control: public, max-age=3600');

        echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($urls as $url) {
            echo '  <url>' . "\n";
            echo '    <loc>' . seofeed_xml_escape($url['loc']) . '</loc>' . "\n";
            if (!empty($url['lastmod'])) {
                echo '    <lastmod>' . seofeed_xml_escape($url['lastmod']) . '</lastmod>' . "\n";
            }
            if (!empty($url['changefreq'])) {
                echo '    <changefreq>' . seofeed_xml_escape($url['changefreq']) . '</changefreq>' . "\n";
            }
            if (!empty($url['priority'])) {
                echo '    <priority>' . seofeed_xml_escape($url['priority']) . '</priority>' . "\n";
            }
            echo '  </url>' . "\n";
        }

        echo '</urlset>' . "\n";
        exit;
    }
}

if (!function_exists('seofeed_output_robots')) {
    function seofeed_output_robots()
    {
        if (!seofeed_is_enabled()) {
            header('Content-Type: text/plain; charset=utf-8');
            echo "User-agent: *\nDisallow: /\n";
            exit;
        }

        $sitemap = seofeed_sitemap_url();

        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: public, max-age=86400');

        echo "User-agent: *\n";
        echo "Allow: /\n\n";
        echo "Disallow: /adm/\n";
        echo "Disallow: /bbs/login.php\n";
        echo "Disallow: /bbs/register.php\n";
        echo "Disallow: /bbs/password.php\n";
        echo "Disallow: /data/\n";
        echo "Disallow: /_BUILDER_INPUT/\n";
        echo "Disallow: /page/style-guide.php\n";
        echo "Disallow: /page/inquiry-thanks.php\n";
        echo "Disallow: /page/404.php\n";
        echo "Disallow: /page/local-template.php\n";
        echo "Disallow: /install/\n";
        echo "Disallow: /icrm/\n\n";
        echo 'Sitemap: ' . $sitemap . "\n";
        exit;
    }
}
