<?php
if (!defined('_GNUBOARD_') || !defined('ICRM_HUB_ACTIVE')) {
    exit;
}

if (is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-content.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-rank.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-rank.lib.php';
}
if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
    include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
}

$license_ok = function_exists('icrm_admin_shell_license_ok') ? icrm_admin_shell_license_ok() : false;
$ai_ready = function_exists('g5b_seo_meta_is_ai_configured') ? g5b_seo_meta_is_ai_configured() : false;

$geo_avg = 0;
$gap_meta = 0;
$gap_faq = 0;
$gap_rank = 0;
if (function_exists('g5b_seo_geo_health_get_summary')) {
    $health = g5b_seo_geo_health_get_summary('');
    if (!empty($health['ok']) && isset($health['stats'])) {
        $geo_avg = (int) ($health['stats']['avg_geo_score'] ?? 0);
        $gap_meta = (int) ($health['stats']['gap_meta'] ?? 0);
        $gap_faq = (int) ($health['stats']['gap_faq'] ?? 0);
        $gap_rank = (int) ($health['stats']['gap_rank'] ?? 0);
    }
}

$content_review = 0;
$content_processing = 0;
if (function_exists('icrm_content_get_stats')) {
    if (function_exists('icrm_content_bootstrap')) {
        icrm_content_bootstrap();
    }
    $cstats = icrm_content_get_stats();
    $content_review = (int) ($cstats['review'] ?? 0);
    $content_processing = (int) ($cstats['processing'] ?? 0);
}

$rank_enabled = 0;
$rank_never = 0;
if (function_exists('icrm_rank_get_dashboard_stats')) {
    $rstats = icrm_rank_get_dashboard_stats();
    $rank_enabled = (int) ($rstats['targets_enabled'] ?? 0);
    $rank_never = (int) ($rstats['never_checked'] ?? 0);
}

$point_balance = 0;
if (function_exists('icrm_point_get_balance')) {
    $mb_id = function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : '';
    $point_balance = (int) icrm_point_get_balance($mb_id);
}

$todo = array();
if ($content_review > 0) {
    $todo[] = array(
        'label' => '수집 콘텐츠 검토 ' . $content_review . '건',
        'url'   => icrm_admin_page_url('content', array('tab' => 'inbox', 'status' => 'review')),
    );
}
if ($gap_meta > 0 || $gap_faq > 0) {
    $todo[] = array(
        'label' => 'SEO 보완 (메타 ' . $gap_meta . ' · FAQ ' . $gap_faq . ')',
        'url'   => icrm_admin_page_url('seo', array('tab' => 'health')),
    );
}
if ($gap_rank > 0) {
    $todo[] = array(
        'label' => '순위 미등록 ' . $gap_rank . '건',
        'url'   => icrm_admin_page_url('seo', array('tab' => 'health', 'gap' => 'rank_missing')),
    );
}
if ($rank_never > 0) {
    $todo[] = array(
        'label' => '순위 미확인 ' . $rank_never . '건',
        'url'   => icrm_admin_page_url('rank'),
    );
}
if (!$license_ok) {
    $todo[] = array(
        'label' => 'iCRM 연동 설정',
        'url'   => icrm_admin_page_url('seo', array('tab' => 'settings')),
    );
}

function icrm_dash_h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
?>

<header class="icrm-dash-header">
    <h2 class="icrm-dash-header__title">오늘의 작업</h2>
    <p class="icrm-dash-header__sub">검토 <?php echo (int) $content_review; ?>건 · GEO <?php echo (int) $geo_avg; ?>점 · 포인트 <?php echo number_format($point_balance); ?>P</p>
</header>

<?php if (!$license_ok) { ?>
<p class="icrm-dash-alert"><strong>iCRM 미연동</strong> — AI 기능을 쓰려면 <a href="<?php echo icrm_dash_h(icrm_admin_page_url('seo', array('tab' => 'settings'))); ?>">연동 설정</a>을 먼저 해 주세요.</p>
<?php } elseif (!$ai_ready) { ?>
<p class="icrm-dash-alert">라이선스는 있으나 SEO API 연결을 확인해 주세요. <a href="<?php echo icrm_dash_h(icrm_admin_page_url('seo', array('tab' => 'settings'))); ?>">연동 테스트</a></p>
<?php } ?>

<div class="icrm-dash-grid">
    <a class="icrm-dash-stat icrm-dash-stat--accent" href="<?php echo icrm_dash_h(icrm_admin_page_url('seo', array('tab' => 'health'))); ?>">
        <strong><?php echo (int) $geo_avg; ?></strong>
        <span>평균 GEO 점수</span>
    </a>
    <a class="icrm-dash-stat<?php echo $content_review > 0 ? ' icrm-dash-stat--warn' : ''; ?>" href="<?php echo icrm_dash_h(icrm_admin_page_url('content', array('tab' => 'inbox', 'status' => 'review'))); ?>">
        <strong><?php echo (int) $content_review; ?></strong>
        <span>수집 검토 대기</span>
    </a>
    <a class="icrm-dash-stat" href="<?php echo icrm_dash_h(icrm_admin_page_url('rank')); ?>">
        <strong><?php echo (int) $rank_enabled; ?></strong>
        <span>순위체크 등록</span>
    </a>
    <a class="icrm-dash-stat" href="<?php echo icrm_dash_h(icrm_admin_page_url('points')); ?>">
        <strong><?php echo number_format($point_balance); ?></strong>
        <span>AI 포인트</span>
    </a>
</div>

<div class="icrm-dash-actions">
    <a class="icrm-dash-action icrm-dash-action--primary" href="<?php echo icrm_dash_h(icrm_admin_page_url('publish')); ?>">+ 콘텐츠 발행</a>
    <a class="icrm-dash-action icrm-dash-action--secondary" href="<?php echo icrm_dash_h(icrm_admin_page_url('content', array('tab' => 'collect'))); ?>">콘텐츠 수집</a>
    <a class="icrm-dash-action icrm-dash-action--secondary" href="<?php echo icrm_dash_h(icrm_admin_page_url('seo', array('tab' => 'health'))); ?>">SEO 보완</a>
    <a class="icrm-dash-action icrm-dash-action--secondary" href="<?php echo icrm_dash_h(icrm_admin_page_url('rank')); ?>">순위 확인</a>
    <a class="icrm-dash-action icrm-dash-action--secondary" href="<?php echo icrm_dash_h(icrm_admin_page_url('points')); ?>">포인트 충전</a>
</div>

<section class="icrm-dash-panel">
    <h2>할 일</h2>
    <?php if ($content_processing > 0) { ?>
    <p class="icrm-dash-empty" style="margin-bottom:12px">수집 진행 중 <?php echo (int) $content_processing; ?>건 · <a href="<?php echo icrm_dash_h(icrm_admin_page_url('content', array('tab' => 'jobs'))); ?>">요청 이력</a></p>
    <?php } ?>
    <?php if (empty($todo)) { ?>
    <p class="icrm-dash-empty">지금 처리할 항목이 없습니다.</p>
    <?php } else { ?>
    <ul class="icrm-dash-todo">
        <?php foreach ($todo as $item) { ?>
        <li><a href="<?php echo icrm_dash_h($item['url']); ?>"><?php echo icrm_dash_h($item['label']); ?></a></li>
        <?php } ?>
    </ul>
    <?php } ?>
</section>
