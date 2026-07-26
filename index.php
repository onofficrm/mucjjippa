<?php
include_once('./_common.php');

define('_INDEX_', true);
if (!defined('_GNUBOARD_')) exit; // 개별 페이지 접근 불가

include_once(G5_PATH.'/inc/onoff-builder-home.php');

/*
 * [보존] 이전 루트 메인 출력 코드
 *
 * // 빌더 브릿지 홈 렌더 우선 적용
 * if (is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
 *     include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';
 *     if (function_exists('onoff_builder_maybe_render_home') && onoff_builder_maybe_render_home()) {
 *         return;
 *     }
 * }
 *
 * // 테마 사용 시 테마 index로 위임
 * if (defined('G5_THEME_PATH')) {
 *     require_once(G5_THEME_PATH.'/index.php');
 *     return;
 * }
 *
 * // 모바일은 mobile/index.php 사용
 * if (G5_IS_MOBILE) {
 *     include_once(G5_MOBILE_PATH.'/index.php');
 *     return;
 * }
 *
 * include_once(G5_PATH.'/head.php');
 *
 * $g5_main_sections = array(
 *     'hero',
 *     'service',
 *     'advantage',
 *     'portfolio',
 *     'latest',
 *     'review',
 *     'faq',
 *     'contact',
 * );
 *
 * echo '<h2 class="sound_only">메인</h2>';
 * echo '<main id="siteMain" class="site-main">';
 * foreach ($g5_main_sections as $section_name) {
 *     $section_file = G5_PATH.'/section/'.$section_name.'.php';
 *     if (is_file($section_file)) {
 *         include_once($section_file);
 *     }
 * }
 * echo '</main>';
 *
 * include_once(G5_PATH.'/tail.php');
 */
