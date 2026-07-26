<?php
/**
 * 동적 robots.txt (Sitemap URL 자동)
 *
 * 접속: /robots.php 또는 /robots.txt (rewrite)
 */
include_once './_common.php';

if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

include_once G5_LIB_PATH . '/seo-feed.lib.php';

seofeed_output_robots();
