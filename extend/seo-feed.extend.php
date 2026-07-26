<?php
/**
 * RSS · sitemap · robots — onoff-g5-base 내장
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('seo_feed_enabled', true)) {
    return;
}

if (is_file(G5_LIB_PATH . '/seo-feed.lib.php')) {
    include_once G5_LIB_PATH . '/seo-feed.lib.php';
}

if (!function_exists('seofeed_add_rewrite_rules')) {
    function seofeed_add_rewrite_rules($rules, $get_path_url, $base_path, $return_string)
    {
        $extra = "RewriteRule ^sitemap\\.xml$ sitemap.php [L]\n";
        $extra .= "RewriteRule ^robots\\.txt$ robots.php [L]\n";
        $extra .= "RewriteRule ^rss\\.xml$ rss.php [L]\n";

        return $rules . $extra;
    }
}

if (function_exists('add_replace')) {
    add_replace('add_mod_rewrite_pre_rules', 'seofeed_add_rewrite_rules', 10, 4);
}

if (!function_exists('seofeed_filter_board_rss_href')) {
    function seofeed_filter_board_rss_href($rss_href, $board, $bo_table)
    {
        if (!function_exists('seofeed_board_rss_url')) {
            return $rss_href;
        }

        return seofeed_board_rss_url($bo_table);
    }
}

if (function_exists('add_replace')) {
    add_replace('get_list_rss_url', 'seofeed_filter_board_rss_href', 10, 3);
}
