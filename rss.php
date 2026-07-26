<?php
/**
 * 사이트 통합 RSS (네이버·구글 RSS 제출용)
 *
 * - /rss.php              → 전체 게시판 최신글
 * - /rss.php?bo_table=xxx → 해당 게시판 (bbs/rss.php 위임)
 * - /rss/{bo_table}       → rewrite 시 동일
 */
include_once './_common.php';

if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

include_once G5_LIB_PATH . '/seo-feed.lib.php';

$bo_table = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $_GET['bo_table']) : '';

if ($bo_table !== '') {
    include_once G5_BBS_PATH . '/rss.php';
    exit;
}

seofeed_output_site_rss();
