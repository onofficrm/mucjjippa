<?php
if (!defined('G5_IS_ADMIN')) {
    define('G5_IS_ADMIN', true);
}
require_once __DIR__ . '/../../../common.php';

if ($is_admin !== 'super') {
    alert('최고관리자만 접근 가능합니다.', G5_URL);
}

require_once G5_LIB_PATH . '/icrm-admin-shell.lib.php';
if (!defined('ICRM_HUB_ACTIVE')) {
    icrm_admin_redirect_to_hub('content');
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

include_once G5_LIB_PATH . '/icrm-content.lib.php';
if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
    include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
}
icrm_content_bootstrap();

$tab = isset($_GET['tab']) ? preg_replace('/[^a-z_]/', '', $_GET['tab']) : 'inbox';
$filter_status = isset($_GET['status']) ? preg_replace('/[^a-z_]/', '', $_GET['status']) : 'review';
$filter_bo = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
$filter_search = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
$filter_media = isset($_GET['media']) ? preg_replace('/[^a-z_]/', '', $_GET['media']) : '';
$detail_id = isset($_GET['ici_id']) ? (int) $_GET['ici_id'] : 0;
$page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;

$action_url = G5_PLUGIN_URL . '/content_collector/admin/action.php';
$import_url = rtrim(function_exists('icrm_get_site_base_url') ? icrm_get_site_base_url() : G5_URL, '/') . '/icrm/content-import.php';

$stats = icrm_content_get_stats();
$license_set = icrm_content_get_license_key() !== '';
$default_bo = icrm_content_get_default_bo_table();
$default_mb = icrm_content_get_default_mb_id();

$remote_settings = icrm_content_fetch_remote_settings();
$icc_settings = ($remote_settings['ok'] && is_array($remote_settings['settings'])) ? $remote_settings['settings'] : array();
if (!empty($icc_settings['default_bo_table'])) {
    $default_bo = (string) $icc_settings['default_bo_table'];
}
if (!empty($icc_settings['default_mb_id'])) {
    $default_mb = (string) $icc_settings['default_mb_id'];
}
$icc_default_collect_mode = !empty($icc_settings['default_collect_mode']) ? (string) $icc_settings['default_collect_mode'] : 'source';
$icc_default_max_items = isset($icc_settings['default_max_items']) ? (int) $icc_settings['default_max_items'] : 10;
$icc_web_engine = !empty($icc_settings['web_engine']) ? (string) $icc_settings['web_engine'] : 'naver';

function icc_h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function icc_status_label($status)
{
    $map = array(
        'review'    => '검토 대기',
        'pending'   => '대기',
        'published' => '발행됨',
        'rejected'  => '반려',
    );

    return isset($map[$status]) ? $map[$status] : $status;
}

function icc_status_class($status)
{
    if ($status === 'published') {
        return 'icc-badge--good';
    }
    if ($status === 'rejected') {
        return 'icc-badge--bad';
    }
    if ($status === 'review') {
        return 'icc-badge--accent';
    }

    return 'icc-badge--muted';
}

function icc_job_media_class($source_type)
{
    $map = array(
        'youtube' => 'icc-job-media--youtube',
        'rss'     => 'icc-job-media--rss',
        'web'     => 'icc-job-media--web',
        'naver'   => 'icc-job-media--naver',
    );

    return isset($map[$source_type]) ? $map[$source_type] : 'icc-job-media--web';
}

function icc_job_status_class($status)
{
    if ($status === 'processing') {
        return 'icc-badge--accent';
    }
    if ($status === 'failed') {
        return 'icc-badge--bad';
    }
    if ($status === 'completed') {
        return 'icc-badge--good';
    }

    return 'icc-badge--muted';
}

$boards = array();
$board_res = sql_query(" select bo_table, bo_subject from {$g5['board_table']} order by bo_table ");
while ($b = sql_fetch_array($board_res)) {
    $boards[] = $b;
}

if ($tab === 'inbox' || $tab === 'jobs') {
    icrm_content_sync_remote_items();
    icrm_content_sync_pending_jobs();
    $stats = icrm_content_get_stats();
}

$items_data = icrm_content_fetch_items($filter_status, $filter_bo, $page, 20, array(
    'search'      => $filter_search,
    'source_type' => $filter_media,
));
$detail = null;
$detail_geo_score = 0;
$detail_geo_grade = '';
if ($tab === 'detail' && $detail_id > 0) {
    $detail = icrm_content_get_item($detail_id);
    if ($detail && function_exists('g5b_seo_geo_score_meta')) {
        $detail_geo_score = g5b_seo_geo_score_meta($detail['seo'], !empty($detail['rank_keywords']));
        $detail_geo_grade = g5b_seo_geo_score_grade($detail_geo_score);
    }
}
$jobs_data = $tab === 'jobs' ? icrm_content_fetch_jobs($page, 20) : null;
$rules_data = ($tab === 'rules') ? icrm_content_fetch_remote_rules(array('page' => $page, 'per_page' => 20, 'search' => $filter_search)) : null;
$edit_rule_id = ($tab === 'rules' && isset($_GET['gcr_id'])) ? (int) $_GET['gcr_id'] : 0;
$edit_rule = null;
if ($edit_rule_id > 0 && is_array($rules_data) && !empty($rules_data['items'])) {
    foreach ($rules_data['items'] as $_rule_row) {
        if ((int) ($_rule_row['gcr_id'] ?? 0) === $edit_rule_id) {
            $edit_rule = $_rule_row;
            break;
        }
    }
}
?>
<style>
<?php if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) { ?>
:root{
    --icc-accent:var(--icrm-text);--icc-accent-2:#27272a;--icc-accent-soft:var(--icrm-accent-soft);--icc-accent-glow:transparent;
    --icc-ink:var(--icrm-text);--icc-muted:var(--icrm-muted);--icc-border:var(--icrm-border);--icc-panel:var(--icrm-surface);
    --icc-good:var(--icrm-success);--icc-bad:#dc2626;--icc-radius:var(--icrm-radius-lg);--icc-shadow:var(--icrm-shadow-xs);
}
<?php } else { ?>
:root{
    --icc-accent:#5b4cdb;--icc-accent-2:#7c6cf0;--icc-accent-soft:rgba(91,76,219,.08);--icc-accent-glow:rgba(91,76,219,.22);
    --icc-ink:#0f172a;--icc-muted:#64748b;--icc-border:rgba(15,23,42,.08);--icc-panel:#fff;
    --icc-good:#0d9488;--icc-bad:#e11d48;--icc-radius:16px;--icc-shadow:0 18px 50px rgba(15,23,42,.06);
}
<?php } ?>
.icc-module{font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Malgun Gothic',sans-serif;color:var(--icc-ink);letter-spacing:-.01em}
.icc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 20px;padding:5px;background:rgba(255,255,255,.72);border:1px solid var(--icc-border);border-radius:999px;box-shadow:var(--icc-shadow);backdrop-filter:blur(8px)}
.icc-tab{display:inline-flex;align-items:center;padding:10px 18px;border-radius:999px;color:#475569;text-decoration:none;font-weight:700;font-size:13px;transition:.2s ease}
.icc-tab:hover{color:var(--icc-accent);background:rgba(91,76,219,.05)}
.icc-tab.is-active{background:linear-gradient(135deg,var(--icc-accent),var(--icc-accent-2));color:#fff;box-shadow:0 10px 24px var(--icc-accent-glow)}
.icc-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-bottom:22px}
.icc-stat{position:relative;overflow:hidden;background:var(--icc-panel);border:1px solid var(--icc-border);border-radius:var(--icc-radius);padding:18px 20px;box-shadow:var(--icc-shadow)}
.icc-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--icc-accent),#a78bfa)}
.icc-stat__num{font-size:28px;font-weight:800;line-height:1.1;background:linear-gradient(135deg,#1e293b,var(--icc-accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.icc-stat__label{font-size:12px;color:var(--icc-muted);margin-top:6px;font-weight:600}
.icc-panel{background:var(--icc-panel);border:1px solid var(--icc-border);border-radius:20px;padding:24px 26px;margin-bottom:18px;box-shadow:var(--icc-shadow)}
.icc-panel__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px}
.icc-panel__head h2{margin:0;font-size:22px;font-weight:800;letter-spacing:-.03em}
.icc-panel__head p{margin:8px 0 0;color:var(--icc-muted);font-size:13px;line-height:1.65;max-width:720px}
.icc-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;padding:14px;background:#f8fafc;border:1px solid var(--icc-border);border-radius:14px}
.icc-toolbar select,.icc-toolbar input[type=text]{padding:10px 12px;border:1px solid var(--icc-border);border-radius:10px;font-size:13px;background:#fff}
.icc-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:12px;border:1px solid var(--icc-border);background:#fff;color:var(--icc-ink);font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;transition:.18s ease}
.icc-btn:hover{border-color:rgba(91,76,219,.35);box-shadow:0 8px 20px rgba(15,23,42,.06)}
.icc-btn--primary{background:linear-gradient(135deg,var(--icc-accent),var(--icc-accent-2));border-color:transparent;color:#fff;box-shadow:0 12px 28px var(--icc-accent-glow)}
.icc-btn--primary:hover{transform:translateY(-1px);box-shadow:0 16px 34px var(--icc-accent-glow)}
.icc-btn--ghost{background:transparent}
.icc-btn--danger{background:#fff;border-color:#fecdd3;color:var(--icc-bad)}
.icc-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.icc-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.icc-table th,.icc-table td{padding:12px 10px;border-bottom:1px solid var(--icc-border);text-align:left;vertical-align:top}
.icc-table th{color:var(--icc-muted);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.icc-table tbody tr{transition:.15s ease}
.icc-table tbody tr:hover td{background:rgba(91,76,219,.03)}
.icc-badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;background:#f1f5f9;color:#475569}
.icc-badge--good{background:#ccfbf1;color:var(--icc-good)}
.icc-badge--bad{background:#ffe4e6;color:var(--icc-bad)}
.icc-badge--accent{background:var(--icc-accent-soft);color:var(--icc-accent)}
.icc-badge--muted{background:#f8fafc;color:var(--icc-muted)}
.icc-job-media{display:inline-flex;align-items:center;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.01em}
.icc-job-media--youtube{background:#fee2e2;color:#b91c1c}
.icc-job-media--rss{background:#d1fae5;color:#047857}
.icc-job-media--web{background:#dbeafe;color:#1d4ed8}
.icc-job-keyword{font-weight:700;color:var(--icc-ink);word-break:break-all}
.icc-job-keyword--empty{color:var(--icc-muted);font-weight:500}
.icc-job-url{display:block;margin-top:4px;font-size:11px;color:var(--icc-muted);word-break:break-all}
.icc-muted{color:var(--icc-muted);font-size:12px;line-height:1.6}
.icc-form-row{display:grid;grid-template-columns:128px 1fr;gap:10px 14px;align-items:start;margin-bottom:12px}
.icc-form-row label{font-weight:700;padding-top:10px;color:#334155}
.icc-form-row input,.icc-form-row select,.icc-form-row textarea{width:100%;padding:11px 12px;border:1px solid var(--icc-border);border-radius:12px;font-size:13px;background:#fff;transition:.15s ease}
.icc-form-row input:focus,.icc-form-row select:focus,.icc-form-row textarea:focus,.icc-field:focus{outline:none;border-color:rgba(91,76,219,.45);box-shadow:0 0 0 4px rgba(91,76,219,.1)}
.icc-job-media--naver{background:#d1fae5;color:#047857}
.icc-content-title{display:block;font-weight:800;color:var(--icc-ink);text-decoration:none;line-height:1.45}
.icc-content-title:hover{color:var(--icc-accent)}
.icc-content-host{display:block;margin-top:4px;font-size:11px;color:var(--icc-muted);word-break:break-all}
.icc-content-excerpt{margin-top:6px;font-size:12px;color:#64748b;line-height:1.55}
.icc-content-actions{display:flex;flex-direction:column;gap:6px;min-width:92px}
.icc-content-actions .icc-btn{width:100%;padding:8px 10px;font-size:11px}
.icc-stat-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:-6px 0 18px}
.icc-stat-mini{background:#fff;border:1px solid var(--icc-border);border-radius:14px;padding:12px 14px;text-align:center}
.icc-stat-mini strong{display:block;font-size:18px;font-weight:800;color:var(--icc-ink)}
.icc-stat-mini span{font-size:11px;color:var(--icc-muted);font-weight:700}
.icc-preview{border:1px solid var(--icc-border);border-radius:14px;padding:18px;background:#fafbfc;max-height:480px;overflow:auto}
.icc-msg{margin-top:12px;font-size:13px;min-height:18px;font-weight:600}
.icc-msg--ok{color:var(--icc-good)}
.icc-msg--err{color:var(--icc-bad)}
.icc-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.icc-code{font-family:ui-monospace,monospace;font-size:11px;background:#f1f5f9;padding:3px 8px;border-radius:6px;word-break:break-all;color:#475569}
.icc-empty{padding:48px 24px;text-align:center;color:var(--icc-muted);border:1px dashed var(--icc-border);border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc)}
.icc-guide{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid rgba(91,76,219,.18);border-radius:999px;background:linear-gradient(180deg,#fff,#faf8ff);color:var(--icc-accent);font-size:12px;font-weight:800;text-decoration:none;transition:.15s ease}
.icc-guide:hover{box-shadow:0 8px 20px rgba(91,76,219,.12)}
.icc-steps{display:flex;flex-direction:column;gap:18px}
.icc-step{background:linear-gradient(180deg,#fff,#fbfcfe);border:1px solid var(--icc-border);border-radius:18px;padding:22px 22px 20px;box-shadow:0 10px 30px rgba(15,23,42,.04)}
.icc-step__title{display:flex;align-items:center;gap:12px;margin:0 0 8px;font-size:16px;font-weight:800}
.icc-step__num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:10px;background:linear-gradient(135deg,var(--icc-accent),var(--icc-accent-2));color:#fff;font-size:12px;font-weight:800;box-shadow:0 8px 18px var(--icc-accent-glow)}
.icc-collect-help{margin:0 0 16px;color:var(--icc-muted);font-size:13px;line-height:1.65}
.icc-collect-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.icc-field label{display:block;margin-bottom:8px;font-size:13px;font-weight:800;color:#334155}
.icc-field input,.icc-field select,.icc-field textarea{width:100%;padding:12px 14px;border:1px solid var(--icc-border);border-radius:12px;font-size:14px;background:#fff}
.icc-field__hint{margin:8px 0 0;font-size:12px;color:var(--icc-muted)}
.icc-notice{margin:0 0 16px;padding:14px 16px;border-radius:12px;font-size:13px;line-height:1.65}
.icc-notice--warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}
.icc-notice--warn strong{display:block;margin-bottom:4px;color:#c2410c}
.icc-notice code{font-size:12px;background:rgba(255,255,255,.7);padding:2px 6px;border-radius:6px}
.icc-web-advanced{margin-top:8px;font-size:13px;color:var(--icc-muted)}
.icc-web-advanced summary{cursor:pointer;font-weight:700;color:#475569}
.icc-field__tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px}
.icc-check{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--icc-muted);font-weight:600}
.icc-bulk-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;padding:12px 16px;background:var(--icc-accent-soft);border:1px solid rgba(91,76,219,.18);border-radius:12px}
.icc-bulk-bar strong{color:var(--icc-accent);font-size:14px}
.icc-table .icc-row-check{width:16px;height:16px;cursor:pointer}
.icc-collect-targets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.icc-source-card{position:relative;display:block;padding:22px 20px 18px;border:1px solid var(--icc-border);border-radius:18px;background:#fff;cursor:pointer;transition:.22s ease;overflow:hidden}
.icc-source-card::after{content:'';position:absolute;inset:0 auto auto 0;width:100%;height:4px;background:transparent;transition:.22s ease}
.icc-source-card:hover{transform:translateY(-2px);border-color:rgba(91,76,219,.28);box-shadow:0 16px 36px rgba(91,76,219,.1)}
.icc-source-card.is-active{border-color:rgba(91,76,219,.45);background:linear-gradient(180deg,#fff,#f7f5ff);box-shadow:0 18px 40px rgba(91,76,219,.14)}
.icc-source-card.is-active::after{background:linear-gradient(90deg,var(--icc-accent),#c4b5fd)}
.icc-source-card input{position:absolute;opacity:0;pointer-events:none}
.icc-source-card__head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}
.icc-source-card__title{display:flex;align-items:center;gap:12px;font-weight:800;color:var(--icc-ink);font-size:15px}
.icc-source-card__icon{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px;font-size:15px;font-weight:900}
.icc-source-card--youtube .icc-source-card__icon{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#dc2626}
.icc-source-card--rss .icc-source-card__icon{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#047857}
.icc-source-card--web .icc-source-card__icon{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1d4ed8}
.icc-source-card__badge{padding:4px 10px;border-radius:999px;background:#f8fafc;border:1px solid var(--icc-border);font-size:10px;color:#64748b;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.icc-source-card p{margin:0 0 14px;color:var(--icc-muted);font-size:13px;line-height:1.6}
.icc-chip-row{display:flex;gap:6px;flex-wrap:wrap}
.icc-chip{display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.9);border:1px solid var(--icc-border);font-size:11px;font-weight:700;color:#64748b}
.icc-collect-mode-panel{display:none;margin-top:18px;padding:20px;border:1px solid var(--icc-border);border-radius:16px;background:#fff;animation:iccFade .25s ease}
.icc-collect-mode-panel.is-active{display:block}
@keyframes iccFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.icc-option-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.icc-segmented{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}
.icc-segmented label{display:block;position:relative}
.icc-segmented input{position:absolute;opacity:0}
.icc-segmented span{display:block;padding:12px 14px;border:1px solid var(--icc-border);border-radius:12px;background:#fff;text-align:center;font-weight:800;font-size:13px;cursor:pointer;transition:.15s ease}
.icc-segmented span:hover{border-color:rgba(91,76,219,.25)}
.icc-segmented input:checked+span{border-color:var(--icc-accent);background:var(--icc-accent-soft);color:var(--icc-accent);box-shadow:inset 0 0 0 1px rgba(91,76,219,.18)}
.icc-web-panel{padding:18px;border-radius:14px;background:linear-gradient(180deg,#f8fafc,#fff);border:1px solid var(--icc-border)}
.icc-web-panel .icc-segmented{margin:10px 0 16px}
.icc-cta{margin-top:6px;padding:22px 22px 20px;border-radius:18px;background:linear-gradient(135deg,#1e1b4b,#312e81 55%,#4c1d95);color:#fff;box-shadow:0 20px 50px rgba(49,46,129,.28)}
.icc-cta strong{display:block;font-size:15px;font-weight:800}
.icc-cta p{margin:8px 0 0;color:rgba(255,255,255,.72);font-size:13px;line-height:1.6}
.icc-cta .icc-actions{margin-top:16px}
.icc-cta .icc-btn{min-width:180px;padding:13px 18px;border-radius:12px}
.icc-cta .icc-btn--primary{background:#fff;color:#312e81;box-shadow:0 12px 28px rgba(0,0,0,.18)}
.icc-cta .icc-btn--ghost{border-color:rgba(255,255,255,.28);color:#fff;background:rgba(255,255,255,.08)}
.icc-cta .icc-btn--ghost:hover{background:rgba(255,255,255,.14)}
@media(max-width:720px){.icc-form-row{grid-template-columns:1fr}.icc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:980px){.icc-collect-grid,.icc-collect-targets,.icc-option-grid{grid-template-columns:1fr}}
</style>

<div class="icc-module">

<?php
$icc_tab_class = (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) ? '' : 'icc-tab';
if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) {
    icrm_admin_subnav_open();
} else {
    echo '<nav class="icc-tabs" aria-label="콘텐츠 수집 메뉴">';
}
?>
    <a class="<?php echo trim($icc_tab_class . ($tab === 'inbox' ? ' is-active' : '')); ?>" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'inbox'))); ?>">수집 콘텐츠 목록</a>
    <a class="<?php echo trim($icc_tab_class . ($tab === 'rules' ? ' is-active' : '')); ?>" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'rules'))); ?>">수집 규칙</a>
    <a class="<?php echo trim($icc_tab_class . ($tab === 'collect' ? ' is-active' : '')); ?>" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'collect'))); ?>">수집 요청</a>
    <a class="<?php echo trim($icc_tab_class . ($tab === 'settings' ? ' is-active' : '')); ?>" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'settings'))); ?>">수집 설정</a>
    <a class="<?php echo trim($icc_tab_class . ($tab === 'jobs' ? ' is-active' : '')); ?>" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'jobs'))); ?>">요청 이력</a>
    <?php if ($detail) { ?>
    <a class="<?php echo trim($icc_tab_class . ($tab === 'detail' ? ' is-active' : '')); ?>" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'detail', 'ici_id' => (int) $detail['ici_id']))); ?>">초안 상세</a>
    <?php } elseif ($tab === 'detail' && $detail_id > 0) { ?>
    <a class="<?php echo trim($icc_tab_class . ' is-active'); ?>" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'detail', 'ici_id' => $detail_id))); ?>">초안 상세</a>
    <?php } ?>
<?php
if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) {
    icrm_admin_subnav_close();
} else {
    echo '</nav>';
}
?>

<div class="icc-grid">
    <div class="icc-stat"><div class="icc-stat__num"><?php echo (int) $stats['review']; ?></div><div class="icc-stat__label">검토 대기</div></div>
    <div class="icc-stat"><div class="icc-stat__num"><?php echo (int) $stats['published']; ?></div><div class="icc-stat__label">발행됨</div></div>
    <div class="icc-stat"><div class="icc-stat__num"><?php echo (int) $stats['processing']; ?></div><div class="icc-stat__label">수집 중</div></div>
    <div class="icc-stat"><div class="icc-stat__num"><?php echo (int) $stats['today']; ?></div><div class="icc-stat__label">오늘 수집</div></div>
    <div class="icc-stat"><div class="icc-stat__num"><?php echo (int) $stats['total']; ?></div><div class="icc-stat__label">전체</div></div>
</div>

<?php if ($tab === 'settings') { ?>

<section class="icc-panel">
    <h2>수집 설정</h2>
    <p class="icc-muted">기본값은 iCRM 서버에 저장됩니다. 사이트에서는 API로 불러와 수집·규칙 실행에 사용합니다.</p>
    <form id="icc_settings_form" class="icc-form" style="max-width:640px;margin-top:16px">
        <div class="icc-form-row">
            <label for="icc_set_bo">기본 게시판</label>
            <select id="icc_set_bo" name="default_bo_table">
                <option value="">선택</option>
                <?php foreach ($boards as $b) {
                    $sel = ($default_bo === $b['bo_table']) ? ' selected' : '';
                    echo '<option value="' . icc_h($b['bo_table']) . '"' . $sel . '>' . icc_h($b['bo_table'] . ' · ' . $b['bo_subject']) . '</option>';
                } ?>
            </select>
        </div>
        <div class="icc-form-row">
            <label for="icc_set_mb">기본 작성자 ID</label>
            <input type="text" id="icc_set_mb" name="default_mb_id" value="<?php echo icc_h($default_mb); ?>">
        </div>
        <div class="icc-form-row">
            <label for="icc_set_mode">기본 수집 방식</label>
            <select id="icc_set_mode" name="default_collect_mode">
                <?php foreach (array('source' => '원문 수집', 'batch' => '피드·키워드 배치', 'regenerate' => 'AI 재생성') as $val => $label) {
                    $sel = ($icc_default_collect_mode === $val) ? ' selected' : '';
                    echo '<option value="' . icc_h($val) . '"' . $sel . '>' . icc_h($label) . '</option>';
                } ?>
            </select>
        </div>
        <div class="icc-form-row">
            <label for="icc_set_max">기본 최대 건수 (배치)</label>
            <input type="number" id="icc_set_max" name="default_max_items" min="1" max="20" value="<?php echo (int) $icc_default_max_items; ?>">
        </div>
        <div class="icc-form-row">
            <label for="icc_set_engine">웹 키워드 검색 엔진</label>
            <select id="icc_set_engine" name="web_engine">
                <option value="naver"<?php echo $icc_web_engine === 'naver' ? ' selected' : ''; ?>>네이버 (blog.naver.com)</option>
                <option value="google"<?php echo $icc_web_engine === 'google' ? ' selected' : ''; ?>>Google News RSS</option>
            </select>
        </div>
        <div class="icc-actions">
            <button type="submit" class="icc-btn icc-btn--primary">iCRM에 저장</button>
        </div>
        <div id="icc_settings_msg" class="icc-msg"></div>
    </form>
</section>

<?php } elseif ($tab === 'rules') { ?>

<section class="icc-panel">
    <div class="icc-panel__head">
        <div>
            <h2>수집 규칙</h2>
            <p class="icc-muted">규칙은 iCRM에 저장되며, URL 생성·수집 실행은 iCRM에서 처리합니다.</p>
        </div>
        <a class="icc-btn icc-btn--primary" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'collect'))); ?>">+ 새 규칙 만들기</a>
    </div>

    <?php if (empty($rules_data['ok'])) { ?>
    <div class="icc-empty"><?php echo icc_h($rules_data['message'] ?? '규칙 목록을 불러오지 못했습니다.'); ?></div>
    <?php } elseif (empty($rules_data['items'])) { ?>
    <div class="icc-empty">저장된 수집 규칙이 없습니다. 수집 요청 탭에서 규칙을 저장하거나 아래에서 바로 만들 수 있습니다.</div>
    <?php } else { ?>
    <table class="icc-table">
        <thead><tr><th>규칙</th><th>매체</th><th>키워드/URL</th><th>상태</th><th>마지막 실행</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($rules_data['items'] as $rule) { ?>
        <tr>
            <td><strong><?php echo icc_h($rule['gcr_name']); ?></strong><br><span class="icc-muted"><?php echo icc_h($rule['gcr_bo_table']); ?> / <?php echo icc_h($rule['gcr_mb_id']); ?></span></td>
            <td><span class="icc-job-media <?php echo icc_h(icc_job_media_class($rule['gcr_media_type'])); ?>"><?php echo icc_h(strtoupper($rule['gcr_media_type'])); ?></span></td>
            <td class="icc-muted"><?php
                $hint = $rule['gcr_search_keyword'] !== '' ? $rule['gcr_search_keyword'] : ($rule['gcr_target_url'] !== '' ? $rule['gcr_target_url'] : $rule['gcr_rss_url']);
                echo icc_h(mb_strimwidth($hint, 0, 48, '…', 'UTF-8'));
            ?></td>
            <td><?php echo !empty($rule['gcr_is_active']) ? '<span class="icc-badge icc-badge--good">활성</span>' : '<span class="icc-badge icc-badge--muted">비활성</span>'; ?>
                <?php if ($rule['gcr_last_status'] !== '') { ?><br><span class="icc-muted"><?php echo icc_h($rule['gcr_last_status']); ?></span><?php } ?>
            </td>
            <td class="icc-muted"><?php echo icc_h($rule['gcr_last_run_at'] !== '' ? $rule['gcr_last_run_at'] : '-'); ?></td>
            <td class="icc-actions" style="white-space:nowrap">
                <button type="button" class="icc-btn icc-btn--sm icc_rule_run" data-gcr-id="<?php echo (int) $rule['gcr_id']; ?>">실행</button>
                <button type="button" class="icc-btn icc-btn--sm icc_rule_toggle" data-gcr-id="<?php echo (int) $rule['gcr_id']; ?>" data-active="<?php echo !empty($rule['gcr_is_active']) ? '0' : '1'; ?>"><?php echo !empty($rule['gcr_is_active']) ? '끄기' : '켜기'; ?></button>
                <button type="button" class="icc-btn icc-btn--sm icc-btn--danger icc_rule_delete" data-gcr-id="<?php echo (int) $rule['gcr_id']; ?>">삭제</button>
            </td>
        </tr>
        <?php } ?>
        </tbody>
    </table>
    <?php } ?>
    <div id="icc_rules_msg" class="icc-msg"></div>
</section>

<?php } elseif ($tab === 'collect') { ?>

<section class="icc-panel">
    <div class="icc-panel__head">
        <div>
            <a class="icc-guide" href="javascript:void(0)">입력 가이드 <strong>더보기</strong></a>
            <h2>콘텐츠 수집 설정</h2>
            <p>키워드·RSS·글 URL로 iCRM이 <strong>원문을 수집</strong>합니다. 피드·키워드는 여러 URL을 찾아 순차 수집하고, 결과는 <span class="icc-code"><?php echo icc_h($import_url); ?></span> 로 전달됩니다.</p>
        </div>
    </div>

    <form id="icc_collect_form">
        <input type="hidden" id="icc_source_url" name="source_url" value="">
        <div class="icc-steps">

            <div class="icc-step">
                <h3 class="icc-step__title"><span class="icc-step__num">1</span>기본 정보</h3>
                <p class="icc-collect-help">검색 키워드를 먼저 입력하면 수집 규칙 이름이 자동으로 생성됩니다.</p>
                <div class="icc-collect-grid">
                    <div class="icc-field">
                        <label for="icc_collect_keyword">검색 키워드</label>
                        <input type="text" class="icc-field" id="icc_collect_keyword" name="keyword" placeholder="브랜드명, 채널명, 주제 키워드">
                        <p class="icc-field__hint">예: 세부호텔, 여름 브이로그, 브랜드명</p>
                    </div>
                    <div class="icc-field">
                        <label for="icc_collect_name">수집 규칙 이름</label>
                        <input type="text" class="icc-field" id="icc_collect_name" name="rule_name" placeholder="예: 세부호텔 콘텐츠 모니터링">
                        <div class="icc-field__tools">
                            <button type="button" class="icc-btn" id="icc_generate_rule_name">자동생성</button>
                            <label class="icc-check">
                                <input type="checkbox" id="icc_append_date" checked> 이름 끝에 날짜(MMDD) 붙이기
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="icc-step">
                <h3 class="icc-step__title"><span class="icc-step__num">2</span>수집 대상</h3>
                <p class="icc-collect-help">매체를 고른 뒤 세부 URL·RSS·검색 조건을 입력합니다.</p>
                <div class="icc-collect-targets" id="icc_source_cards">
                    <label class="icc-source-card icc-source-card--youtube is-active" data-source="youtube">
                        <input type="radio" name="source_type" value="youtube" checked>
                        <span class="icc-source-card__head">
                            <span class="icc-source-card__title"><span class="icc-source-card__icon">▶</span>YouTube</span>
                            <span class="icc-source-card__badge">Video</span>
                        </span>
                        <p>키워드로 영상을 찾고 채널·영상 URL을 기준으로 추적합니다.</p>
                        <span class="icc-chip-row"><span class="icc-chip">키워드</span><span class="icc-chip">URL</span></span>
                    </label>
                    <label class="icc-source-card icc-source-card--rss" data-source="rss">
                        <input type="radio" name="source_type" value="rss">
                        <span class="icc-source-card__head">
                            <span class="icc-source-card__title"><span class="icc-source-card__icon">⎙</span>RSS</span>
                            <span class="icc-source-card__badge">Feed</span>
                        </span>
                        <p>RSS 주소를 직접 넣거나 키워드 기반 피드 후보를 탐색합니다.</p>
                        <span class="icc-chip-row"><span class="icc-chip">검증</span><span class="icc-chip">미리보기</span></span>
                    </label>
                    <label class="icc-source-card icc-source-card--web" data-source="web">
                        <input type="radio" name="source_type" value="web">
                        <span class="icc-source-card__head">
                            <span class="icc-source-card__title"><span class="icc-source-card__icon">◉</span>Web</span>
                            <span class="icc-source-card__badge">Web</span>
                        </span>
                        <p>블로그·카페·뉴스를 수집하고 이후 신규 글만 추적합니다.</p>
                        <span class="icc-chip-row"><span class="icc-chip">키워드</span><span class="icc-chip">URL</span><span class="icc-chip">목록</span></span>
                    </label>
                </div>

                <div class="icc-collect-mode-panel is-active" data-panel="youtube">
                    <div class="icc-option-grid">
                        <div class="icc-field">
                            <label for="icc_youtube_url">YouTube URL</label>
                            <input type="url" class="icc-field" id="icc_youtube_url" placeholder="https://www.youtube.com/@channel 또는 영상 URL">
                            <p class="icc-field__hint">비워두면 검색 키워드로 YouTube 관련 영상 URL을 RSS에서 찾습니다.</p>
                        </div>
                        <div class="icc-field">
                            <label>수집 방식</label>
                            <div class="icc-segmented">
                                <label><input type="radio" name="youtube_mode" value="keyword" checked><span>키워드 입력</span></label>
                                <label><input type="radio" name="youtube_mode" value="url"><span>URL 붙임</span></label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="icc-collect-mode-panel" data-panel="rss">
                    <div class="icc-field">
                        <label for="icc_rss_url">RSS 주소</label>
                        <input type="url" class="icc-field" id="icc_rss_url" placeholder="https://example.com/feed.xml">
                        <p class="icc-field__hint">피드 주소를 직접 넣거나 키워드만 입력해 RSS 후보 탐색 요청을 만들 수 있습니다.</p>
                    </div>
                </div>

                <div class="icc-collect-mode-panel" data-panel="web">
                    <div class="icc-web-panel">
                        <div class="icc-notice icc-notice--warn" id="icc_web_direct_notice">
                            <strong>Web 수집은 iCRM 콘텐츠 모니터 방식입니다.</strong>
                            키워드만 입력하면 Google News RSS로 관련 글 URL을 찾아 <em>원문을 수집</em>합니다.
                            개별 글 URL을 넣으면 해당 글만 수집합니다. 네이버 검색 결과 URL은 사용할 수 없습니다.
                        </div>
                        <div class="icc-field">
                            <label for="icc_web_url">글 URL <span class="icc-muted">(선택)</span></label>
                            <input type="url" class="icc-field" id="icc_web_url" placeholder="https://blog.naver.com/아이디/123456789012">
                            <p class="icc-field__hint">비워두면 검색 키워드로 RSS 피드에서 관련 글을 찾아 최대 10건을 수집합니다.</p>
                        </div>
                        <details class="icc-web-advanced">
                            <summary>수집 분류 (표시용)</summary>
                            <div class="icc-web-panel" style="margin-top:12px">
                                <div class="icc-field">
                                    <label>출처</label>
                                    <div class="icc-segmented">
                                        <label><input type="radio" name="web_engine" value="naver" checked><span>네이버</span></label>
                                        <label><input type="radio" name="web_engine" value="google"><span>구글</span></label>
                                    </div>
                                </div>
                                <div class="icc-field">
                                    <label>종류</label>
                                    <div class="icc-segmented">
                                        <label><input type="radio" name="web_type" value="blog" checked><span>블로그</span></label>
                                        <label><input type="radio" name="web_type" value="cafe"><span>카페</span></label>
                                        <label><input type="radio" name="web_type" value="news"><span>뉴스</span></label>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            </div>

            <div class="icc-step">
                <h3 class="icc-step__title"><span class="icc-step__num">3</span>저장 설정</h3>
                <div class="icc-collect-grid">
                    <div class="icc-field">
                        <label>수집 방식</label>
                        <div class="icc-segmented">
                            <label><input type="radio" name="collect_mode" value="source" checked><span>원문 수집</span></label>
                            <label><input type="radio" name="collect_mode" value="batch"><span>키워드·피드 다건</span></label>
                            <label><input type="radio" name="collect_mode" value="regenerate"><span>AI 재생성</span></label>
                        </div>
                        <p class="icc-field__hint">기본은 iCRM처럼 원문 수집입니다. AI 재생성은 포인트가 더 많이 사용됩니다.</p>
                    </div>
                    <div class="icc-field">
                        <label for="icc_max_items">최대 수집 건수</label>
                        <select class="icc-field" id="icc_max_items" name="max_items">
                            <?php foreach (array(5, 10, 15, 20) as $n) {
                                $sel = ($n === 10) ? ' selected' : '';
                                echo '<option value="' . $n . '"' . $sel . '>' . $n . '건</option>';
                            } ?>
                        </select>
                    </div>
                </div>
                <div class="icc-collect-grid" style="margin-top:16px">
                    <div class="icc-field">
                        <label for="icc_bo_table">게시판</label>
                        <select class="icc-field" id="icc_bo_table" name="bo_table" required>
                            <option value="">선택</option>
                            <?php foreach ($boards as $b) {
                                $sel = ($default_bo !== '' && $default_bo === $b['bo_table']) ? ' selected' : '';
                                echo '<option value="' . icc_h($b['bo_table']) . '"' . $sel . '>' . icc_h($b['bo_table'] . ' · ' . $b['bo_subject']) . '</option>';
                            } ?>
                        </select>
                    </div>
                    <div class="icc-field">
                        <label for="icc_mb_id">작성자 ID</label>
                        <input type="text" class="icc-field" id="icc_mb_id" name="mb_id" value="<?php echo icc_h($default_mb); ?>" placeholder="회원 아이디">
                    </div>
                </div>
            </div>

            <div class="icc-cta">
                <strong>수집 실행</strong>
                <p>iCRM이 URL에서 본문을 추출해 수집 콘텐츠 목록으로 전달합니다. 키워드·RSS는 여러 건을 순차 처리합니다.</p>
                <div class="icc-actions">
                    <button type="submit" class="icc-btn icc-btn--primary"<?php echo $license_set ? '' : ' disabled'; ?>>저장 후 바로 실행</button>
                    <button type="button" class="icc-btn icc-btn--ghost" id="icc_save_rule_only">규칙 저장</button>
                </div>
            </div>
        </div>
        <div id="icc_collect_msg" class="icc-msg"></div>
    </form>
</section>

<?php } elseif ($tab === 'jobs') { ?>

<section class="icc-panel icc-jobs-panel">
    <div class="icc-panel__head"><div><h2>수집 요청 이력</h2><p>매체·키워드 기준으로 iCRM 수집 요청 기록을 확인합니다.</p></div></div>
    <?php if (empty($jobs_data['items'])) { ?>
    <div class="icc-empty">요청 이력이 없습니다.</div>
    <?php } else { ?>
    <table class="icc-table">
        <thead><tr><th>매체</th><th>키워드 · 대상</th><th>게시판</th><th>상태</th><th>시간</th></tr></thead>
        <tbody>
        <?php foreach ($jobs_data['items'] as $job) { ?>
        <tr<?php echo in_array($job['status'], array('queued', 'processing'), true) ? ' class="icc-job-pending"' : ''; ?>>
            <td><span class="icc-job-media <?php echo icc_h(icc_job_media_class($job['source_type'])); ?>"><?php echo icc_h($job['media_label']); ?></span></td>
            <td>
                <?php if ($job['keyword'] !== '') { ?>
                <span class="icc-job-keyword"><?php echo icc_h($job['keyword']); ?></span>
                <?php } else { ?>
                <span class="icc-job-keyword icc-job-keyword--empty">(키워드 없음)</span>
                <?php } ?>
                <?php if ($job['source_url'] !== '') { ?>
                <a class="icc-job-url" href="<?php echo icc_h($job['source_url']); ?>" target="_blank" rel="noopener" title="<?php echo icc_h($job['source_url']); ?>"><?php echo icc_h(mb_strimwidth($job['source_url'], 0, 56, '…', 'UTF-8')); ?></a>
                <?php } ?>
            </td>
            <td><?php echo icc_h($job['bo_table']); ?></td>
            <td><span class="icc-badge <?php echo icc_h(icc_job_status_class($job['status'])); ?>"><?php echo icc_h($job['status_label']); ?></span>
                <?php if (!empty($job['status_hint'])) { ?><br><span class="icc-muted"><?php echo icc_h($job['status_hint']); ?></span><?php } ?>
                <?php if ($job['error_message'] !== '') { ?><br><span class="icc-muted"><?php echo icc_h($job['error_message']); ?></span><?php } ?>
            </td>
            <td class="icc-muted"><?php echo icc_h($job['created_at']); ?></td>
        </tr>
        <?php } ?>
        </tbody>
    </table>
    <?php } ?>
</section>

<?php } elseif ($tab === 'detail' && $detail) { ?>

<section class="icc-panel">
    <h2>초안 #<?php echo (int) $detail['ici_id']; ?> · <?php echo icc_h($detail['subject']); ?></h2>
    <p class="icc-muted">
        <span class="icc-badge <?php echo icc_status_class($detail['status']); ?>"><?php echo icc_h(icc_status_label($detail['status'])); ?></span>
        · <span class="icc-job-media <?php echo icc_h(icc_job_media_class($detail['source_type'])); ?>"><?php echo icc_h($detail['media_label']); ?></span>
        · 원문: <a href="<?php echo icc_h($detail['source_url']); ?>" target="_blank" rel="noopener"><?php echo icc_h(mb_strimwidth($detail['source_url'], 0, 60, '…', 'UTF-8')); ?></a>
        · <?php echo icc_h($detail['bo_table']); ?> / <?php echo icc_h($detail['mb_id']); ?>
        <?php if ($detail['collect_mode'] === 'regenerate') { ?> · AI 재생성<?php } ?>
        <?php if ($detail_geo_grade !== '') { ?> · GEO <?php echo icc_h($detail_geo_grade); ?> (<?php echo (int) $detail_geo_score; ?>점)<?php } ?>
        <?php if ($detail['points_charged'] > 0) { ?> · <?php echo number_format($detail['points_charged']); ?>P<?php } ?>
    </p>

    <?php if ($detail['status'] !== 'published') { ?>
    <h3 style="margin:16px 0 8px;font-size:14px">수집 본문 미리보기</h3>
    <div class="icc-preview"><?php echo $detail['content_html']; ?></div>
    <?php } ?>

    <?php if ($detail['status'] !== 'published') { ?>
    <form id="icc_draft_form">
        <input type="hidden" name="ici_id" value="<?php echo (int) $detail['ici_id']; ?>">
        <div class="icc-form-row">
            <label for="icc_subject">제목</label>
            <input type="text" id="icc_subject" name="subject" value="<?php echo icc_h($detail['subject']); ?>">
        </div>
        <div class="icc-form-row">
            <label for="icc_bo_table_edit">게시판</label>
            <select id="icc_bo_table_edit" name="bo_table">
                <?php foreach ($boards as $b) {
                    $sel = ($detail['bo_table'] === $b['bo_table']) ? ' selected' : '';
                    echo '<option value="' . icc_h($b['bo_table']) . '"' . $sel . '>' . icc_h($b['bo_table'] . ' · ' . $b['bo_subject']) . '</option>';
                } ?>
            </select>
        </div>
        <div class="icc-form-row">
            <label for="icc_content">본문 HTML</label>
            <textarea id="icc_content" name="content_html" rows="12"><?php echo icc_h($detail['content_html']); ?></textarea>
        </div>
        <div class="icc-actions">
            <button type="submit" class="icc-btn">초안 저장</button>
            <button type="button" class="icc-btn" id="icc_apply_geo_btn">GEO 패키지 적용</button>
            <label class="icc-check" style="margin-left:4px"><input type="checkbox" id="icc_geo_on_publish" checked> 발행 시 GEO 패키지</label>
            <button type="button" class="icc-btn icc-btn--primary" id="icc_publish_btn">게시판 발행</button>
            <button type="button" class="icc-btn icc-btn--danger" id="icc_reject_btn">반려</button>
            <a class="icc-btn" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'inbox'))); ?>">← 목록</a>
        </div>
        <div id="icc_detail_msg" class="icc-msg"></div>
    </form>
    <?php } else { ?>
    <p class="icc-muted">발행된 글: wr_id <?php echo (int) $detail['wr_id']; ?>
        <?php if (function_exists('get_pretty_url')) { ?>
        · <a href="<?php echo icc_h(get_pretty_url($detail['bo_table'], $detail['wr_id'])); ?>" target="_blank">글 보기</a>
        <?php } ?>
    </p>
    <div class="icc-preview"><?php echo $detail['content_html']; ?></div>
    <?php } ?>

    <?php if (!empty($detail['seo'])) { ?>
    <h3 style="margin-top:20px;font-size:14px">SEO 메타</h3>
    <ul class="icc-muted" style="margin:0;padding-left:18px">
        <?php if (!empty($detail['seo']['title'])) { ?><li>타이틀: <?php echo icc_h($detail['seo']['title']); ?></li><?php } ?>
        <?php if (!empty($detail['seo']['description'])) { ?><li>설명: <?php echo icc_h(mb_strimwidth($detail['seo']['description'], 0, 120, '…', 'UTF-8')); ?></li><?php } ?>
        <?php if (!empty($detail['seo']['keywords'])) { ?><li>키워드: <?php echo icc_h($detail['seo']['keywords']); ?></li><?php } ?>
        <?php if (!empty($detail['seo']['faq'])) { ?><li>FAQ <?php echo count($detail['seo']['faq']); ?>개</li><?php } ?>
    </ul>
    <?php } ?>

    <?php if (!empty($detail['rank_keywords'])) { ?>
    <h3 style="margin-top:12px;font-size:14px">순위체크 키워드</h3>
    <p class="icc-muted"><?php echo icc_h(implode(', ', $detail['rank_keywords'])); ?></p>
    <?php } ?>
</section>

<?php } elseif ($tab === 'detail' && $detail_id > 0 && !$detail) { ?>

<section class="icc-panel">
    <h2>초안을 찾을 수 없습니다</h2>
    <p class="icc-muted">초안 #<?php echo (int) $detail_id; ?>이(가) 없거나 삭제되었습니다.</p>
    <p class="icc-actions">
        <a class="icc-btn icc-btn--primary" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'inbox'))); ?>">수집 콘텐츠 목록으로</a>
    </p>
</section>

<?php } else { ?>

<section class="icc-panel">
    <div class="icc-panel__head"><div><h2>수집 콘텐츠 목록</h2><p>수집한 글을 확인하고, 여러 건을 선택해 한 번에 발행할 수 있습니다.</p></div></div>
    <form class="icc-toolbar" method="get" action="<?php echo icc_h(icrm_admin_page_url('content')); ?>">
        <input type="hidden" name="m" value="content">
        <input type="hidden" name="tab" value="inbox">
        <input type="text" name="q" value="<?php echo icc_h($filter_search); ?>" placeholder="제목 또는 URL 검색" style="min-width:180px">
        <select name="media" onchange="this.form.submit()">
            <option value="">전체 매체</option>
            <?php foreach (array('naver' => '네이버', 'web' => 'Web', 'rss' => 'RSS', 'youtube' => 'YouTube') as $val => $label) {
                $sel = ($filter_media === $val) ? ' selected' : '';
                echo '<option value="' . icc_h($val) . '"' . $sel . '>' . icc_h($label) . '</option>';
            } ?>
        </select>
        <select name="status" onchange="this.form.submit()">
            <?php foreach (array('review' => '검토 대기', 'published' => '발행됨', 'rejected' => '반려', 'all' => '전체') as $val => $label) {
                $sel = ($filter_status === $val) ? ' selected' : '';
                echo '<option value="' . icc_h($val) . '"' . $sel . '>' . icc_h($label) . '</option>';
            } ?>
        </select>
        <select name="bo_table" onchange="this.form.submit()">
            <option value="">전체 게시판</option>
            <?php foreach ($boards as $b) {
                $sel = ($filter_bo === $b['bo_table']) ? ' selected' : '';
                echo '<option value="' . icc_h($b['bo_table']) . '"' . $sel . '>' . icc_h($b['bo_table']) . '</option>';
            } ?>
        </select>
        <button type="submit" class="icc-btn">검색</button>
        <a class="icc-btn icc-btn--primary" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'collect'))); ?>">+ 수집 요청</a>
    </form>

    <?php if (empty($items_data['items'])) { ?>
    <div class="icc-empty">표시할 수집 콘텐츠가 없습니다. 키워드·RSS·글 URL로 수집 요청을 보내세요.</div>
    <?php } else {
        $inbox_has_publishable = false;
        foreach ($items_data['items'] as $item) {
            if ($item['status'] !== 'published' && $item['status'] !== 'rejected') {
                $inbox_has_publishable = true;
                break;
            }
        }
    ?>
    <?php if ($inbox_has_publishable) { ?>
    <div class="icc-bulk-bar" id="icc_bulk_bar" style="display:none">
        <strong><span id="icc_bulk_count">0</span>개 선택</strong>
        <label class="icc-check"><input type="checkbox" id="icc_bulk_geo" checked> GEO 패키지</label>
        <button type="button" class="icc-btn icc-btn--primary" id="icc_bulk_publish_btn">선택 발행</button>
        <span class="icc-msg" id="icc_bulk_msg"></span>
    </div>
    <?php } ?>
    <table class="icc-table">
        <thead><tr><?php if ($inbox_has_publishable) { ?><th style="width:36px"><input type="checkbox" id="icc_check_all" title="현재 페이지 전체 선택"></th><?php } ?><th>콘텐츠</th><th>매체</th><th>수집일</th><th>상태</th><th>관리</th></tr></thead>
        <tbody>
        <?php foreach ($items_data['items'] as $item) {
            $can_publish = ($item['status'] !== 'published' && $item['status'] !== 'rejected');
        ?>
        <tr>
            <?php if ($inbox_has_publishable) { ?>
            <td><?php if ($can_publish) { ?><input type="checkbox" class="icc-row-check" value="<?php echo (int) $item['ici_id']; ?>"><?php } ?></td>
            <?php } ?>
            <td>
                <a class="icc-content-title" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'detail', 'ici_id' => (int) $item['ici_id']))); ?>"><?php echo icc_h(mb_strimwidth($item['subject'], 0, 72, '…', 'UTF-8')); ?></a>
                <?php if ($item['source_host'] !== '') { ?>
                <span class="icc-content-host"><?php echo icc_h($item['source_host']); ?>
                    <?php if ($item['source_url'] !== '') { ?> · <a href="<?php echo icc_h($item['source_url']); ?>" target="_blank" rel="noopener">원문</a><?php } ?>
                </span>
                <?php } ?>
                <?php if ($item['excerpt'] !== '') { ?><div class="icc-content-excerpt"><?php echo icc_h(mb_strimwidth($item['excerpt'], 0, 120, '…', 'UTF-8')); ?></div><?php } ?>
            </td>
            <td><span class="icc-job-media <?php echo icc_h(icc_job_media_class($item['source_type'])); ?>"><?php echo icc_h($item['media_label']); ?></span></td>
            <td class="icc-muted"><?php echo icc_h($item['created_at']); ?></td>
            <td><span class="icc-badge <?php echo icc_status_class($item['status']); ?>"><?php echo icc_h(icc_status_label($item['status'])); ?></span></td>
            <td>
                <div class="icc-content-actions">
                    <a class="icc-btn icc-btn--primary" href="<?php echo icc_h(icrm_admin_page_url('content', array('tab' => 'detail', 'ici_id' => (int) $item['ici_id']))); ?>">상세보기</a>
                    <?php if ($item['status'] !== 'published') { ?>
                    <button type="button" class="icc-btn icc-recollect-btn" data-ici-id="<?php echo (int) $item['ici_id']; ?>">재수집</button>
                    <button type="button" class="icc-btn icc-btn--danger icc-delete-btn" data-ici-id="<?php echo (int) $item['ici_id']; ?>">삭제</button>
                    <?php } ?>
                </div>
            </td>
        </tr>
        <?php } ?>
        </tbody>
    </table>
    <?php
    $total_pages = max(1, (int) ceil($items_data['total'] / $items_data['per_page']));
    if ($total_pages > 1) {
        echo '<p class="icc-muted">페이지 ' . (int) $page . ' / ' . $total_pages . ' (총 ' . (int) $items_data['total'] . '건)</p>';
    }
    ?>
    <?php } ?>
</section>

<?php } ?>

</div>

<script>
var iccActionUrl = <?php echo json_encode($action_url); ?>;

function iccSetMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'icc-msg' + (ok === true ? ' icc-msg--ok' : (ok === false ? ' icc-msg--err' : ''));
}

var collectForm = document.getElementById('icc_collect_form');
if (collectForm) {
    var sourceCards = document.querySelectorAll('.icc-source-card');
    var sourcePanels = document.querySelectorAll('.icc-collect-mode-panel');
    var keywordInput = document.getElementById('icc_collect_keyword');
    var ruleNameInput = document.getElementById('icc_collect_name');
    var sourceUrlInput = document.getElementById('icc_source_url');
    var appendDateInput = document.getElementById('icc_append_date');

    function iccSelectedSource() {
        var checked = collectForm.querySelector('[name=source_type]:checked');
        return checked ? checked.value : 'youtube';
    }

    function iccMmdd() {
        var d = new Date();
        return String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    }

    function iccKeyword() {
        return (keywordInput && keywordInput.value ? keywordInput.value : '').trim();
    }

    function iccBuildRuleName() {
        var keyword = iccKeyword();
        var source = iccSelectedSource();
        var suffix = source === 'youtube' ? 'YouTube 수집' : (source === 'rss' ? 'RSS 수집' : '웹 수집');
        var name = keyword !== '' ? (keyword + ' ' + suffix) : suffix;
        if (appendDateInput && appendDateInput.checked) {
            name += ' ' + iccMmdd();
        }
        return name;
    }

    function iccSetSource(source) {
        sourceCards.forEach(function(card) {
            var active = card.getAttribute('data-source') === source;
            card.classList.toggle('is-active', active);
            var input = card.querySelector('input[type=radio]');
            if (input) input.checked = active;
        });
        sourcePanels.forEach(function(panel) {
            panel.classList.toggle('is-active', panel.getAttribute('data-panel') === source);
        });
    }

    function iccYoutubeMode() {
        var mode = collectForm.querySelector('[name=youtube_mode]:checked');
        return mode ? mode.value : 'keyword';
    }

    function iccBuildSourceUrl() {
        var source = iccSelectedSource();
        var keyword = iccKeyword();
        if (source === 'youtube') {
            var youtubeUrl = (document.getElementById('icc_youtube_url').value || '').trim();
            if (youtubeUrl !== '') return youtubeUrl;
            if (iccYoutubeMode() === 'keyword' && keyword !== '') {
                return 'https://news.google.com/rss/search?q=' + encodeURIComponent('site:youtube.com/watch inurl:watch ' + keyword) + '&hl=ko&gl=KR&ceid=KR:ko';
            }
            return '';
        }
        if (source === 'rss') {
            var rssUrl = (document.getElementById('icc_rss_url').value || '').trim();
            if (rssUrl !== '') return rssUrl;
            if (keyword !== '') return 'https://news.google.com/rss/search?q=' + encodeURIComponent(keyword) + '&hl=ko&gl=KR&ceid=KR:ko';
            return '';
        }
        var webUrl = (document.getElementById('icc_web_url').value || '').trim();
        if (webUrl !== '') return webUrl;
        if (keyword !== '') {
            var engineEl = collectForm.querySelector('[name=web_engine]:checked');
            var engine = engineEl ? engineEl.value : 'naver';
            var query = engine === 'naver' ? ('site:blog.naver.com ' + keyword) : keyword;
            return 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=ko&gl=KR&ceid=KR:ko';
        }
        return '';
    }

    function iccValidateCollectUrl(sourceUrl) {
        var url = (sourceUrl || '').toLowerCase();
        if (url.indexOf('search.naver.com') !== -1 || url.indexOf('m.search.naver.com') !== -1) {
            return '네이버 검색 URL은 수집할 수 없습니다. blog.naver.com 글 URL을 입력해 주세요.';
        }
        if (url.indexOf('google.com/search') !== -1 || url.indexOf('google.co.kr/search') !== -1) {
            return '구글 검색 URL은 수집할 수 없습니다. 개별 글 URL을 입력해 주세요.';
        }
        if (url.indexOf('youtube.com/results') !== -1 || url.indexOf('youtube.com/search') !== -1) {
            return 'YouTube 검색 결과 URL은 사용할 수 없습니다. 채널·영상 URL을 입력하거나 키워드 입력 방식을 사용해 주세요.';
        }
        return '';
    }

    sourceCards.forEach(function(card) {
        card.addEventListener('click', function() {
            iccSetSource(card.getAttribute('data-source'));
        });
    });

    var nameBtn = document.getElementById('icc_generate_rule_name');
    if (nameBtn) {
        nameBtn.addEventListener('click', function() {
            ruleNameInput.value = iccBuildRuleName();
        });
    }
    if (keywordInput && ruleNameInput) {
        keywordInput.addEventListener('blur', function() {
            if (ruleNameInput.value.trim() === '' && keywordInput.value.trim() !== '') {
                ruleNameInput.value = iccBuildRuleName();
            }
        });
    }

    function iccRuleFieldPayload() {
        var source = iccSelectedSource();
        var fd = new FormData();
        if (ruleNameInput && ruleNameInput.value.trim() === '') {
            ruleNameInput.value = iccBuildRuleName();
        }
        fd.append('gcr_name', ruleNameInput ? ruleNameInput.value.trim() : iccBuildRuleName());
        fd.append('gcr_media_type', source);
        fd.append('gcr_search_keyword', iccKeyword());
        fd.append('gcr_collect_mode', collectForm.querySelector('[name=collect_mode]') ? collectForm.querySelector('[name=collect_mode]').value : 'batch');
        fd.append('gcr_max_items', collectForm.querySelector('[name=max_items]') ? collectForm.querySelector('[name=max_items]').value : '10');
        fd.append('gcr_bo_table', collectForm.querySelector('[name=bo_table]') ? collectForm.querySelector('[name=bo_table]').value : '');
        fd.append('gcr_mb_id', collectForm.querySelector('[name=mb_id]') ? collectForm.querySelector('[name=mb_id]').value : '');
        fd.append('gcr_is_active', '1');
        if (source === 'youtube') {
            fd.append('gcr_target_url', (document.getElementById('icc_youtube_url').value || '').trim());
            fd.append('youtube_mode', iccYoutubeMode());
        } else if (source === 'rss') {
            fd.append('gcr_rss_url', (document.getElementById('icc_rss_url').value || '').trim());
        } else {
            fd.append('gcr_target_url', (document.getElementById('icc_web_url').value || '').trim());
            var engineEl = collectForm.querySelector('[name=web_engine]:checked');
            fd.append('web_engine', engineEl ? engineEl.value : 'naver');
        }
        return fd;
    }

    function iccValidateRuleFields() {
        var source = iccSelectedSource();
        var keyword = iccKeyword();
        if (source === 'youtube') {
            var yt = (document.getElementById('icc_youtube_url').value || '').trim();
            if (yt === '' && keyword === '') return 'YouTube URL 또는 검색 키워드를 입력해 주세요.';
        } else if (source === 'rss') {
            var rss = (document.getElementById('icc_rss_url').value || '').trim();
            if (rss === '' && keyword === '') return 'RSS URL 또는 키워드를 입력해 주세요.';
        } else {
            var web = (document.getElementById('icc_web_url').value || '').trim();
            if (web === '' && keyword === '') return '웹 URL 또는 키워드를 입력해 주세요.';
        }
        return '';
    }

    function iccSaveRuleToIcrm(runAfter) {
        var msg = document.getElementById('icc_collect_msg');
        var err = iccValidateRuleFields();
        if (err !== '') {
            iccSetMsg(msg, err, false);
            return Promise.reject(new Error(err));
        }
        var fd = iccRuleFieldPayload();
        fd.append('action', 'rules');
        fd.append('sub', 'save');
        if (runAfter) {
            fd.append('run_after', '1');
        }
        iccSetMsg(msg, runAfter ? 'iCRM에 규칙 저장·수집 실행 중…' : 'iCRM에 규칙 저장 중…');
        return fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.ok) throw new Error(res.message || '규칙 저장 실패');
                if (!runAfter) {
                    iccSetMsg(msg, res.message || '규칙을 저장했습니다.', true);
                    return res;
                }
                iccSetMsg(msg, res.message || (res.fallback ? '수집 요청 완료 (직접 수집)' : '수집 요청 완료'), true);
                setTimeout(function() {
                    location.href = <?php echo json_encode(icrm_admin_page_url('content', array('tab' => 'jobs'))); ?>;
                }, 700);
                return res;
            });
    }

    var saveOnlyBtn = document.getElementById('icc_save_rule_only');
    if (saveOnlyBtn) {
        saveOnlyBtn.addEventListener('click', function() {
            iccSaveRuleToIcrm(false).catch(function(e) {
                iccSetMsg(document.getElementById('icc_collect_msg'), e.message || '저장 실패', false);
            });
        });
    }

    collectForm.addEventListener('submit', function(e) {
        e.preventDefault();
        iccSaveRuleToIcrm(true).catch(function(err) {
            iccSetMsg(document.getElementById('icc_collect_msg'), err.message || '요청 실패', false);
        });
    });
}

var iccJobsPollTimer = null;
function iccJobsHasPending() {
    return !!document.querySelector('.icc-job-pending');
}
function iccStartJobsPoll() {
    if (iccJobsPollTimer || !iccJobsHasPending()) return;
    iccJobsPollTimer = setInterval(function() {
        if (!iccJobsHasPending()) {
            clearInterval(iccJobsPollTimer);
            iccJobsPollTimer = null;
            return;
        }
        location.reload();
    }, 12000);
}
if (document.querySelector('.icc-jobs-panel')) {
    iccStartJobsPoll();
}

var draftForm = document.getElementById('icc_draft_form');
if (draftForm) {
    draftForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var msg = document.getElementById('icc_detail_msg');
        var fd = new FormData(draftForm);
        fd.append('action', 'update_draft');
        iccSetMsg(msg, '저장 중…');
        fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) { iccSetMsg(msg, res.ok ? '초안을 저장했습니다.' : (res.error || '저장 실패'), res.ok); })
            .catch(function() { iccSetMsg(msg, '네트워크 오류', false); });
    });
}

var publishBtn = document.getElementById('icc_publish_btn');
if (publishBtn) {
    publishBtn.addEventListener('click', function() {
        if (!confirm('이 초안을 게시판에 발행할까요?')) return;
        var msg = document.getElementById('icc_detail_msg');
        var fd = new FormData();
        fd.append('action', 'publish');
        fd.append('ici_id', draftForm.querySelector('[name=ici_id]').value);
        var geoOnPublish = document.getElementById('icc_geo_on_publish');
        if (geoOnPublish && geoOnPublish.checked) {
            fd.append('geo_package', '1');
        }
        iccSetMsg(msg, '발행 중…');
        publishBtn.disabled = true;
        fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                iccSetMsg(msg, res.ok ? (res.message + (res.final_url ? ' ' + res.final_url : '')) : (res.message || res.error || '발행 실패'), res.ok);
                if (res.ok) setTimeout(function() { location.reload(); }, 800);
                else publishBtn.disabled = false;
            })
            .catch(function() { iccSetMsg(msg, '네트워크 오류', false); publishBtn.disabled = false; });
    });
}

var applyGeoBtn = document.getElementById('icc_apply_geo_btn');
if (applyGeoBtn && draftForm) {
    applyGeoBtn.addEventListener('click', function() {
        var msg = document.getElementById('icc_detail_msg');
        var fd = new FormData();
        fd.append('action', 'apply_geo');
        fd.append('ici_id', draftForm.querySelector('[name=ici_id]').value);
        iccSetMsg(msg, 'GEO 패키지 적용 중… (AI API 사용)');
        applyGeoBtn.disabled = true;
        fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                iccSetMsg(msg, res.ok ? (res.message + (res.geo_grade ? ' · ' + res.geo_grade + ' ' + res.geo_score + '점' : '')) : (res.message || res.error || '실패'), res.ok);
                applyGeoBtn.disabled = false;
                if (res.ok) setTimeout(function() { location.reload(); }, 900);
            })
            .catch(function() { iccSetMsg(msg, '네트워크 오류', false); applyGeoBtn.disabled = false; });
    });
}

var rejectBtn = document.getElementById('icc_reject_btn');
if (rejectBtn) {
    rejectBtn.addEventListener('click', function() {
        var reason = prompt('반려 사유 (선택)');
        if (reason === null) return;
        var msg = document.getElementById('icc_detail_msg');
        var fd = new FormData();
        fd.append('action', 'reject');
        fd.append('ici_id', draftForm.querySelector('[name=ici_id]').value);
        fd.append('reason', reason);
        iccSetMsg(msg, '처리 중…');
        fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                iccSetMsg(msg, res.ok ? res.message : (res.error || '실패'), res.ok);
                if (res.ok) setTimeout(function() { location.href = <?php echo json_encode(icrm_admin_page_url('content', array('tab' => 'inbox'))); ?>; }, 600);
            })
            .catch(function() { iccSetMsg(msg, '네트워크 오류', false); });
    });
}

function iccPostItemAction(action, iciId, okMessage) {
    var fd = new FormData();
    fd.append('action', action);
    fd.append('ici_id', iciId);
    return fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (!res.ok) {
                alert(res.message || res.error || '요청 실패');
                return res;
            }
            if (okMessage) alert(okMessage);
            location.reload();
            return res;
        });
}

document.querySelectorAll('.icc-recollect-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        if (!confirm('이 URL을 다시 수집할까요?')) return;
        iccPostItemAction('recollect', btn.getAttribute('data-ici-id'), '재수집 요청을 보냈습니다. 요청 이력에서 진행 상태를 확인하세요.');
    });
});

document.querySelectorAll('.icc-delete-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        if (!confirm('이 수집 콘텐츠를 삭제할까요?')) return;
        iccPostItemAction('delete_item', btn.getAttribute('data-ici-id'));
    });
});

(function() {
    var bulkBar = document.getElementById('icc_bulk_bar');
    if (!bulkBar) return;
    var checkAll = document.getElementById('icc_check_all');
    var bulkBtn = document.getElementById('icc_bulk_publish_btn');
    var bulkGeo = document.getElementById('icc_bulk_geo');
    var bulkCount = document.getElementById('icc_bulk_count');
    var bulkMsg = document.getElementById('icc_bulk_msg');

    function iccSelectedIds() {
        var ids = [];
        document.querySelectorAll('.icc-row-check:checked').forEach(function(el) {
            ids.push(parseInt(el.value, 10));
        });
        return ids;
    }

    function iccUpdateBulkBar() {
        var ids = iccSelectedIds();
        bulkBar.style.display = ids.length ? 'flex' : 'none';
        if (bulkCount) bulkCount.textContent = String(ids.length);
        if (checkAll) {
            var all = document.querySelectorAll('.icc-row-check');
            checkAll.checked = all.length > 0 && ids.length === all.length;
            checkAll.indeterminate = ids.length > 0 && ids.length < all.length;
        }
    }

    if (checkAll) {
        checkAll.addEventListener('change', function() {
            document.querySelectorAll('.icc-row-check').forEach(function(el) {
                el.checked = checkAll.checked;
            });
            iccUpdateBulkBar();
        });
    }
    document.querySelectorAll('.icc-row-check').forEach(function(el) {
        el.addEventListener('change', iccUpdateBulkBar);
    });

    if (bulkBtn) {
        bulkBtn.addEventListener('click', function() {
            var ids = iccSelectedIds();
            if (!ids.length) return;
            var geo = bulkGeo && bulkGeo.checked;
            var confirmMsg = geo
                ? '선택한 ' + ids.length + '건을 GEO 적용 후 발행할까요?\n(AI API가 사용되며 시간이 걸릴 수 있습니다.)'
                : '선택한 ' + ids.length + '건을 발행할까요?';
            if (!confirm(confirmMsg)) return;

            bulkBtn.disabled = true;
            if (checkAll) checkAll.disabled = true;
            document.querySelectorAll('.icc-row-check').forEach(function(el) { el.disabled = true; });

            var ok = 0;
            var fail = 0;

            function publishNext(idx) {
                if (idx >= ids.length) {
                    iccSetMsg(bulkMsg, ok + '건 발행 완료' + (fail ? ', ' + fail + '건 실패' : ''), fail === 0);
                    setTimeout(function() { location.reload(); }, fail ? 2000 : 800);
                    return;
                }
                iccSetMsg(bulkMsg, (idx + 1) + '/' + ids.length + ' 발행 중…');
                var fd = new FormData();
                fd.append('action', 'publish');
                fd.append('ici_id', String(ids[idx]));
                if (geo) fd.append('geo_package', '1');
                fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        if (res.ok) ok++;
                        else fail++;
                        publishNext(idx + 1);
                    })
                    .catch(function() { fail++; publishNext(idx + 1); });
            }
            publishNext(0);
        });
    }

    var settingsForm = document.getElementById('icc_settings_form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var msg = document.getElementById('icc_settings_msg');
            var fd = new FormData(settingsForm);
            fd.append('action', 'remote_settings');
            iccSetMsg(msg, '저장 중…');
            fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) { iccSetMsg(msg, res.ok ? (res.message || '저장했습니다.') : (res.message || '저장 실패'), res.ok); })
                .catch(function() { iccSetMsg(msg, '네트워크 오류', false); });
        });
    }

    function iccRuleAction(sub, gcrId, extra) {
        var msg = document.getElementById('icc_rules_msg');
        var fd = new FormData();
        fd.append('action', 'rules');
        fd.append('sub', sub);
        fd.append('gcr_id', String(gcrId));
        if (extra) {
            Object.keys(extra).forEach(function(k) { fd.append(k, extra[k]); });
        }
        iccSetMsg(msg, '처리 중…');
        return fetch(iccActionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                iccSetMsg(msg, res.ok ? (res.message || '완료') : (res.message || '실패'), res.ok);
                if (res.ok) setTimeout(function() { location.reload(); }, 600);
                return res;
            });
    }

    document.querySelectorAll('.icc_rule_run').forEach(function(btn) {
        btn.addEventListener('click', function() {
            iccRuleAction('run', btn.getAttribute('data-gcr-id'));
        });
    });
    document.querySelectorAll('.icc_rule_toggle').forEach(function(btn) {
        btn.addEventListener('click', function() {
            iccRuleAction('toggle', btn.getAttribute('data-gcr-id'), { gcr_is_active: btn.getAttribute('data-active') });
        });
    });
    document.querySelectorAll('.icc_rule_delete').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!confirm('이 수집 규칙을 삭제할까요?')) return;
            iccRuleAction('delete', btn.getAttribute('data-gcr-id'));
        });
    });
})();
</script>
