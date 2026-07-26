<?php
/**
 * 동적 sitemap.xml (글이름 URL 포함)
 *
 * 접속: /sitemap.php 또는 /sitemap.xml (rewrite)
 */
include_once './_common.php';

if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

include_once G5_LIB_PATH . '/seo-feed.lib.php';

seofeed_output_sitemap();
