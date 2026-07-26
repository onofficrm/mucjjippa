<?php
if (!defined('_INDEX_')) define('_INDEX_', true);
if (!defined('_GNUBOARD_')) exit; // 개별 페이지 접근 불가

include_once(G5_PATH.'/inc/onoff-builder-home.php');

/*
 * [보존] 이전 theme/basic 기본 최신글 메인
 *
 * if (G5_IS_MOBILE) {
 *     include_once(G5_THEME_MOBILE_PATH.'/index.php');
 *     return;
 * }
 *
 * if (G5_COMMUNITY_USE === false) {
 *     include_once(G5_THEME_SHOP_PATH.'/index.php');
 *     return;
 * }
 *
 * include_once(G5_THEME_PATH.'/head.php');
 *
 * echo latest('theme/pic_list', 'free', 4, 23);
 * echo latest('theme/pic_list', 'qa', 4, 23);
 * echo latest('theme/pic_list', 'notice', 4, 23);
 * echo latest('theme/pic_block', 'gallery', 4, 23);
 *
 * $sql = " select bo_table
 *             from `{$g5['board_table']}` a left join `{$g5['group_table']}` b on (a.gr_id=b.gr_id)
 *             where a.bo_device <> 'mobile' ";
 * if (!$is_admin) {
 *     $sql .= " and a.bo_use_cert = '' ";
 * }
 * $sql .= " and a.bo_table not in ('notice', 'gallery') ";
 * $sql .= " order by b.gr_order, a.bo_order ";
 * $result = sql_query($sql);
 * for ($i = 0; $row = sql_fetch_array($result); $i++) {
 *     echo latest('theme/basic', $row['bo_table'], 6, 24);
 * }
 *
 * include_once(G5_THEME_PATH.'/tail.php');
 */