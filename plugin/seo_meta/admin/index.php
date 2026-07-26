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
    icrm_admin_redirect_to_hub('seo');
}

include_once G5_LIB_PATH . '/seo-meta.lib.php';
if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
    include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

$tab = isset($_GET['tab']) ? preg_replace('/[^a-z_]/', '', $_GET['tab']) : 'pages';
$health_bo = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
$health_gap = isset($_GET['gap']) ? preg_replace('/[^a-z_]/', '', $_GET['gap']) : 'all';
$health_page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
$edit_type = isset($_GET['type']) ? preg_replace('/[^a-z]/', '', $_GET['type']) : '';
$edit_key = isset($_GET['key']) ? trim((string) $_GET['key']) : '';

$action_url = G5_PLUGIN_URL . '/seo_meta/admin/action.php';
$license_set = g5b_seo_meta_is_ai_configured();
$api_base_url = g5b_seo_meta_get_api_base_url();
$site_domain = g5b_seo_meta_site_domain();
$shared_license = false;
if ($license_set && function_exists('auto_comment_get_setting')) {
    $seo_cfg = g5b_seo_meta_load_config();
    $seo_own_key = isset($seo_cfg['icrm_license_key']) ? trim((string) $seo_cfg['icrm_license_key']) : '';
    $shared_license = $seo_own_key === '' && trim(auto_comment_get_setting('icrm_license_key', '')) !== '';
}

function g5b_seo_admin_h($str)
{
    return htmlspecialchars((string) $str, ENT_QUOTES, 'UTF-8');
}

function g5b_seo_admin_meta_badge($type, $key)
{
    $meta = g5b_seo_meta_get($type, $key);

    return is_array($meta) && ($meta['title'] !== '' || $meta['description'] !== '') ? ' <span class="g5b-seo-badge">설정됨</span>' : '';
}
?>
<link rel="stylesheet" href="<?php echo G5_PLUGIN_URL; ?>/seo_meta/assets/seo-preview.css">
<link rel="stylesheet" href="<?php echo G5_PLUGIN_URL; ?>/seo_meta/assets/seo-admin.css">
<style>
.g5b-seo-admin .g5b-panel{background:var(--seo-surface,#fff);border:1px solid var(--seo-border,#e2e8f0);border-radius:14px;padding:24px 28px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 8px 28px rgba(15,23,42,.06)}
.g5b-seo-admin .g5b-seo-badge{display:inline-block;padding:3px 10px;font-size:11px;background:#ecfdf5;color:#059669;border-radius:999px;font-weight:700}
.g5b-seo-admin .g5b-seo-form .frm_input,.g5b-seo-admin .g5b-seo-form select.frm_input,.g5b-seo-admin .g5b-seo-form textarea.frm_input{width:100%;max-width:640px;padding:11px 14px;border:1px solid #e2e8f0;border-radius:10px;font:inherit;background:#f8fafc;transition:border-color .15s,box-shadow .15s}
.g5b-seo-admin .g5b-seo-form .frm_input:focus{outline:none;background:#fff;border-color:#93c5fd;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.g5b-seo-admin .g5b-seo-form .tbl_frm01{width:100%;border-collapse:collapse}
.g5b-seo-admin .g5b-seo-form .tbl_frm01 th{width:160px;padding:12px 10px;text-align:left;vertical-align:top;color:#64748b;font-size:13px;font-weight:600}
.g5b-seo-admin .g5b-seo-form .tbl_frm01 td{padding:10px}
.g5b-seo-admin .g5b-seo-actions{margin-top:1.25rem;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.g5b-seo-admin .g5b-seo-msg{margin-left:4px;color:#2563eb;font-size:13px;font-weight:500}
.g5b-seo-admin .g5b-seo-hint{color:#64748b;font-size:13px;margin:.5rem 0 1rem;line-height:1.6}
.g5b-seo-admin .g5b-seo-hint code{background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:12px}
.g5b-seo-admin .h2_frm{margin:0 0 12px;font-size:18px;font-weight:700;letter-spacing:-.02em}
.g5b-seo-admin .btn,.g5b-seo-admin .btn_submit,.g5b-seo-admin .btn_02,.g5b-seo-admin .btn_03{display:inline-flex;align-items:center;padding:10px 16px;border-radius:10px;font:inherit;font-weight:600;cursor:pointer;border:0;text-decoration:none;line-height:1.4;transition:transform .12s,box-shadow .15s}
.g5b-seo-admin .btn_submit,.g5b-seo-admin .btn{color:#fff;background:linear-gradient(135deg,#1e40af,#2563eb);box-shadow:0 2px 10px rgba(37,99,235,.3)}
.g5b-seo-admin .btn_02,.g5b-seo-admin .btn_03{background:#fff;color:#1d4ed8;border:1px solid #bfdbfe}
.g5b-seo-admin .btn_03{padding:7px 14px;font-size:13px}
.g5b-seo-admin .btn:disabled{opacity:.55;cursor:not-allowed}
.g5b-seo-admin .tbl_head01{width:100%;border-collapse:collapse;margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
.g5b-seo-admin .tbl_head01 th,.g5b-seo-admin .tbl_head01 td{padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:left;vertical-align:middle}
.g5b-seo-admin .tbl_head01 th{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;background:#f8fafc}
.g5b-seo-admin .tbl_head01 tr:hover td{background:#fafbfc}
.g5b-seo-admin .g5b-seo-bulk-progress{margin:1rem 0;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden}
.g5b-seo-admin .g5b-seo-bulk-progress__bar{height:100%;background:linear-gradient(90deg,#1e40af,#3b82f6);width:0;transition:width .3s}
.g5b-seo-admin .g5b-seo-bulk-log{max-height:200px;overflow-y:auto;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;padding:.875rem;border-radius:10px}
.g5b-seo-admin .g5b-seo-featured__controls .btn,.g5b-seo-admin .g5b-seo-featured__controls .btn_02{padding:8px 14px;font-size:13px}
.g5b-seo-admin .g5b-seo-tabs a.on{background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.35)}
.g5b-seo-health-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:22px}
.g5b-seo-health-stat{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;box-shadow:0 8px 24px rgba(15,23,42,.04)}
.g5b-seo-health-stat strong{display:block;font-size:26px;font-weight:800;color:#0f172a;line-height:1.1}
.g5b-seo-health-stat span{font-size:12px;color:#64748b;font-weight:600;margin-top:6px;display:block}
.g5b-seo-health-stat--accent strong{color:#2563eb}
.g5b-seo-health-stat--warn strong{color:#ea580c}
.g5b-seo-geo-grade{display:inline-flex;align-items:center;justify-content:center;min-width:34px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800;background:#eff6ff;color:#1d4ed8}
.g5b-seo-geo-grade--a{background:#ecfdf5;color:#047857}
.g5b-seo-geo-grade--c{background:#fff7ed;color:#c2410c}
.g5b-seo-geo-grade--d{background:#fef2f2;color:#b91c1c}
.g5b-seo-flag{display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;background:#f1f5f9;color:#475569}
.g5b-seo-health-bulk{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:14px 0;padding:12px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px}
.g5b-seo-health-bulk strong{color:#1d4ed8;font-size:14px}
.g5b-seo-health-chk{width:16px;height:16px;cursor:pointer}
<?php if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) { ?>
.g5b-seo-admin .g5b-seo-tabs a.on{background:var(--icrm-text);box-shadow:none}
<?php } ?>
</style>

<?php
if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) {
    icrm_admin_subnav_open();
    ?>
<nav class="icrm-subnav g5b-seo-tabs" aria-label="SEO 메뉴">
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'pages'))); ?>" class="<?php echo $tab === 'pages' && $edit_key === '' ? 'is-active on' : ''; ?>">페이지</a>
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'boards'))); ?>" class="<?php echo $tab === 'boards' && $edit_key === '' ? 'is-active on' : ''; ?>">게시판</a>
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'health'))); ?>" class="<?php echo $tab === 'health' ? 'is-active on' : ''; ?>">SEO·GEO 현황</a>
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'bulk'))); ?>" class="<?php echo $tab === 'bulk' ? 'is-active on' : ''; ?>">일괄 SEO</a>
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'settings'))); ?>" class="<?php echo $tab === 'settings' ? 'is-active on' : ''; ?>">iCRM 연동</a>
</nav>
    <?php
    icrm_admin_subnav_close();
}
?>

<div class="g5b-seo-admin">

<?php if (!defined('ICRM_HUB_ACTIVE') || !ICRM_HUB_ACTIVE) { ?>
<nav class="g5b-seo-tabs">
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'pages'))); ?>" class="<?php echo $tab === 'pages' && $edit_key === '' ? 'is-active on' : ''; ?>">페이지</a>
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'boards'))); ?>" class="<?php echo $tab === 'boards' && $edit_key === '' ? 'is-active on' : ''; ?>">게시판</a>
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'health'))); ?>" class="<?php echo $tab === 'health' ? 'is-active on' : ''; ?>">SEO·GEO 현황</a>
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'bulk'))); ?>" class="<?php echo $tab === 'bulk' ? 'is-active on' : ''; ?>">일괄 SEO</a>
    <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'settings'))); ?>" class="<?php echo $tab === 'settings' ? 'is-active on' : ''; ?>">iCRM 연동</a>
</nav>
<?php } ?>

<?php if ($tab === 'settings') { ?>
<section class="g5b-panel g5b-seo-form">
    <h2 class="h2_frm">온오프마케팅(iCRM) 연동</h2>
    <p class="g5b-seo-hint">AI SEO·GEO 생성은 iCRM 중앙 API를 사용합니다. 사이트별 OpenAI 키는 필요 없습니다. 라이선스 키는 <code>data/seo-meta.config.php</code>에 저장됩니다. Git·배포 ZIP에 포함하지 마세요.</p>
    <?php if ($shared_license) { ?>
    <p class="g5b-seo-hint">자동댓글 모듈에 저장된 iCRM 라이선스 키를 공유 사용 중입니다. 아래에서 별도 저장하면 SEO 전용 설정 파일로 분리됩니다.</p>
    <?php } ?>
    <?php if (function_exists('icrm_point_format_summary')) { ?>
    <p class="g5b-seo-hint"><strong>AI 포인트:</strong> <?php echo g5b_seo_admin_h(icrm_point_format_summary()); ?>
        · <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('points')); ?>">포인트 충전</a></p>
    <?php } ?>
    <form id="g5b_seo_settings_form">
        <table class="tbl_frm01">
            <tbody>
            <tr>
                <th><label for="icrm_license_key">iCRM 라이선스 키</label></th>
                <td>
                    <input type="password" name="icrm_license_key" id="icrm_license_key" class="frm_input" autocomplete="off"
                        placeholder="<?php echo $license_set ? '●●●●●● (변경 시 새 키 입력)' : 'iCRM에 사이트 등록 시 발급'; ?>">
                    <?php if ($license_set) { ?><span class="g5b-seo-badge">연동됨</span><?php } ?>
                </td>
            </tr>
            <tr>
                <th><label for="icrm_seo_api_base_url">API URL</label></th>
                <td>
                    <input type="text" name="icrm_seo_api_base_url" id="icrm_seo_api_base_url" class="frm_input"
                        value="<?php echo g5b_seo_admin_h($api_base_url); ?>" placeholder="https://icrm.co.kr/api/seo-meta">
                    <p class="g5b-seo-hint">기본값: <code>https://icrm.co.kr/api/seo-meta</code> · 연결 도메인: <code><?php echo g5b_seo_admin_h($site_domain ?: '(자동 감지 실패)'); ?></code></p>
                </td>
            </tr>
            </tbody>
        </table>
        <div class="g5b-seo-actions">
            <button type="submit" class="btn_submit btn">연동 설정 저장</button>
            <button type="button" class="btn btn_02" id="g5b_seo_test_icrm">연결 테스트</button>
            <span class="g5b-seo-msg" id="g5b_seo_settings_msg"></span>
        </div>
    </form>
</section>
<script>
document.getElementById('g5b_seo_settings_form').addEventListener('submit', function(e) {
    e.preventDefault();
    var msg = document.getElementById('g5b_seo_settings_msg');
    var fd = new FormData(this);
    fd.append('action', 'save_settings');
    msg.textContent = '저장 중…';
    fetch(<?php echo json_encode($action_url); ?>, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(res) { msg.textContent = res.ok ? (res.message || '저장됨') : (res.error || '실패'); })
        .catch(function() { msg.textContent = '네트워크 오류'; });
});
document.getElementById('g5b_seo_test_icrm').addEventListener('click', function() {
    var msg = document.getElementById('g5b_seo_settings_msg');
    var fd = new FormData(document.getElementById('g5b_seo_settings_form'));
    fd.append('action', 'test_icrm');
    msg.textContent = '연결 테스트 중…';
    fetch(<?php echo json_encode($action_url); ?>, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(res) { msg.textContent = res.ok ? (res.message || '연결 성공') : (res.error || res.message || '실패'); })
        .catch(function() { msg.textContent = '네트워크 오류'; });
});
</script>

<?php } elseif ($edit_type !== '' && $edit_key !== '') {
    $meta = g5b_seo_meta_get($edit_type, $edit_key);
    if (!is_array($meta)) {
        $meta = g5b_seo_meta_normalize_record(array());
    }
    $faq_items = !empty($meta['faq']) ? $meta['faq'] : array(array('q' => '', 'a' => ''));
    $edit_label = $edit_key;
    if ($edit_type === 'pages' && $edit_key !== '/') {
        $edit_label = '/' . $edit_key;
    } elseif ($edit_type === 'boards') {
        $edit_label = '게시판: ' . $edit_key;
    }

    $preview_url = g5b_seo_meta_build_preview_url($edit_type, $edit_key, $meta['canonical']);
    $site_name = function_exists('g5site_cfg') ? g5site_cfg('site_name', '') : '';
    $default_title = $meta['title'] !== '' ? $meta['title'] : $edit_label;
    $default_desc = $meta['description'] !== '' ? $meta['description'] : (function_exists('g5site_cfg') ? g5site_cfg('seo_description', g5site_cfg('site_desc', '')) : '');
    ?>
<section class="g5b-seo-editor">
    <header class="g5b-seo-editor__head">
        <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => $edit_type))); ?>" class="g5b-seo-back">← 목록으로</a>
        <div class="g5b-seo-editor__title-row">
            <h2>SEO 편집</h2>
            <span class="g5b-seo-path-badge"><?php echo g5b_seo_admin_h($edit_label); ?></span>
        </div>
        <p class="g5b-seo-editor__lead">타이틀·설명을 비우면 사이트 기본 SEO가 적용됩니다. 우측에서 네이버·구글·SNS 미리보기를 확인하세요.</p>
    </header>

    <div class="g5b-seo-layout">
    <div class="g5b-seo-layout__form">
    <form id="g5b_seo_meta_form">
        <input type="hidden" name="type" value="<?php echo g5b_seo_admin_h($edit_type); ?>">
        <input type="hidden" name="key" value="<?php echo g5b_seo_admin_h($edit_key); ?>">

        <div class="g5b-seo-section">
            <div class="g5b-seo-section__head">
                <span class="g5b-seo-section__icon" aria-hidden="true">T</span>
                <div>
                    <h3 class="g5b-seo-section__title">기본 메타</h3>
                    <p class="g5b-seo-section__sub">검색 결과에 표시되는 타이틀과 설명</p>
                </div>
            </div>
            <div class="g5b-seo-field">
                <div class="g5b-seo-field__label-row">
                    <label for="seo_title">SEO 타이틀</label>
                    <span class="g5b-seo-field__counter" id="seo_title_counter" aria-live="polite"></span>
                </div>
                <input type="text" name="title" id="seo_title" maxlength="120"
                    value="<?php echo g5b_seo_admin_h($meta['title']); ?>" placeholder="페이지 제목 (권장 60자 이내)">
            </div>
            <div class="g5b-seo-field">
                <div class="g5b-seo-field__label-row">
                    <label for="seo_description">SEO 설명</label>
                    <span class="g5b-seo-field__counter" id="seo_desc_counter" aria-live="polite"></span>
                </div>
                <textarea name="description" id="seo_description" rows="4" maxlength="320" placeholder="검색 스니펫에 노출될 설명 (권장 160자 이내)"><?php
                    echo g5b_seo_admin_h($meta['description']);
                ?></textarea>
            </div>
            <div class="g5b-seo-field">
                <label for="seo_keywords">키워드</label>
                <input type="text" name="keywords" id="seo_keywords"
                    value="<?php echo g5b_seo_admin_h($meta['keywords']); ?>" placeholder="예: 한의원, 두통, 맥락한의원">
                <p class="g5b-seo-field__help">쉼표(,)로 구분해 입력하세요.</p>
            </div>
        </div>

        <div class="g5b-seo-section">
            <div class="g5b-seo-section__head">
                <span class="g5b-seo-section__icon" aria-hidden="true">⚙</span>
                <div>
                    <h3 class="g5b-seo-section__title">색인 · 스키마</h3>
                    <p class="g5b-seo-section__sub">검색엔진 크롤링 및 구조화 데이터</p>
                </div>
            </div>
            <div class="g5b-seo-field-row">
                <div class="g5b-seo-field">
                    <label for="seo_robots">robots</label>
                    <select name="robots" id="seo_robots">
                        <?php
                        foreach (array('' => '기본값', 'index,follow' => 'index,follow', 'noindex,nofollow' => 'noindex,nofollow') as $val => $label) {
                            $sel = ($meta['robots'] === $val) ? ' selected' : '';
                            echo '<option value="' . g5b_seo_admin_h($val) . '"' . $sel . '>' . g5b_seo_admin_h($label) . '</option>';
                        }
                        ?>
                    </select>
                </div>
                <div class="g5b-seo-field">
                    <label for="seo_schema_type">Schema 유형</label>
                    <select name="schema_type" id="seo_schema_type">
                        <?php
                        foreach (array('' => '기본', 'WebPage' => 'WebPage', 'Article' => 'Article', 'LocalBusiness' => 'LocalBusiness', 'Organization' => 'Organization') as $val => $label) {
                            $sel = ($meta['schema_type'] === $val) ? ' selected' : '';
                            echo '<option value="' . g5b_seo_admin_h($val) . '"' . $sel . '>' . g5b_seo_admin_h($label) . '</option>';
                        }
                        ?>
                    </select>
                </div>
            </div>
            <div class="g5b-seo-field">
                <label for="seo_canonical">Canonical URL</label>
                <input type="url" name="canonical" id="seo_canonical"
                    value="<?php echo g5b_seo_admin_h($meta['canonical']); ?>" placeholder="https://example.com/page/about.php">
                <p class="g5b-seo-field__help">비우면 현재 페이지 URL이 사용됩니다.</p>
            </div>
        </div>

        <div class="g5b-seo-section">
            <div class="g5b-seo-section__head">
                <span class="g5b-seo-section__icon" aria-hidden="true">🖼</span>
                <div>
                    <h3 class="g5b-seo-section__title">공유 이미지</h3>
                    <p class="g5b-seo-section__sub">SNS·검색 썸네일 (권장 1200×630px)</p>
                </div>
            </div>
            <?php
            g5b_seo_meta_render_featured_image_field(array(
                'id_prefix'  => 'seo',
                'value'      => $meta['og_image'],
                'upload_url' => $action_url,
                'hide_label' => true,
            ));
            ?>
        </div>

        <div class="g5b-seo-section">
            <div class="g5b-seo-section__head">
                <span class="g5b-seo-section__icon" aria-hidden="true">?</span>
                <div>
                    <h3 class="g5b-seo-section__title">FAQ · GEO</h3>
                    <p class="g5b-seo-section__sub">AI 검색 엔진용 질문·답변 (Schema FAQPage)</p>
                </div>
            </div>
            <div class="g5b-seo-faq-list" id="g5b_seo_faq_list">
                <?php
                $faq_num = 0;
                foreach ($faq_items as $faq_row) {
                    $faq_num++;
                    ?>
                <div class="g5b-seo-faq-item">
                    <div class="g5b-seo-faq-item__head">
                        <span class="g5b-seo-faq-item__num">FAQ <?php echo (int) $faq_num; ?></span>
                    </div>
                    <div class="g5b-seo-field">
                        <label>질문</label>
                        <input type="text" name="faq_q[]" placeholder="자주 묻는 질문"
                            value="<?php echo g5b_seo_admin_h(isset($faq_row['q']) ? $faq_row['q'] : ''); ?>">
                    </div>
                    <div class="g5b-seo-field">
                        <label>답변</label>
                        <textarea name="faq_a[]" rows="2" placeholder="명확하고 간결한 답변"><?php
                            echo g5b_seo_admin_h(isset($faq_row['a']) ? $faq_row['a'] : '');
                        ?></textarea>
                    </div>
                </div>
                    <?php
                }
                ?>
            </div>
            <button type="button" class="g5b-seo-btn g5b-seo-btn--secondary g5b-seo-btn--sm g5b-seo-faq-add" id="g5b_seo_add_faq">+ FAQ 항목 추가</button>
        </div>

        <footer class="g5b-seo-editor__footer">
            <button type="submit" class="g5b-seo-btn g5b-seo-btn--primary">저장</button>
            <button type="button" class="g5b-seo-btn g5b-seo-btn--ai" id="g5b_seo_ai_btn">✦ AI SEO·GEO 생성</button>
            <button type="button" class="g5b-seo-btn g5b-seo-btn--secondary" id="g5b_seo_faq_btn">FAQ만 생성 (강화)</button>
            <span class="g5b-seo-msg" id="g5b_seo_form_msg"></span>
        </footer>
    </form>
    </div>

    <?php
    g5b_seo_meta_render_preview_panel(array(
        'id_prefix'           => 'seo',
        'preview_url'         => $preview_url,
        'default_title'       => $default_title,
        'default_description' => $default_desc,
        'default_image'       => $meta['og_image'] !== '' ? g5b_seo_meta_resolve_public_url($meta['og_image']) : g5b_seo_meta_default_og_image(),
        'site_name'           => $site_name,
        'upload_url'          => $action_url,
    ));
    ?>
    </div>
</section>
<script src="<?php echo G5_PLUGIN_URL; ?>/seo_meta/assets/seo-preview.js"></script>
<script>
(function() {
    var actionUrl = <?php echo json_encode($action_url); ?>;
    var editType = <?php echo json_encode($edit_type); ?>;
    var editKey = <?php echo json_encode($edit_key); ?>;

    function g5bSeoUpdateCounter(input, counterEl, max, warnAt) {
        if (!input || !counterEl) return;
        var len = (input.value || '').length;
        counterEl.textContent = len + '/' + max + '자';
        counterEl.classList.remove('is-warn', 'is-over');
        if (len > max) counterEl.classList.add('is-over');
        else if (len > warnAt) counterEl.classList.add('is-warn');
    }

    function g5bSeoBindCounters() {
        var titleEl = document.getElementById('seo_title');
        var descEl = document.getElementById('seo_description');
        var titleCounter = document.getElementById('seo_title_counter');
        var descCounter = document.getElementById('seo_desc_counter');
        function refresh() {
            g5bSeoUpdateCounter(titleEl, titleCounter, 60, 50);
            g5bSeoUpdateCounter(descEl, descCounter, 160, 140);
        }
        if (titleEl) titleEl.addEventListener('input', refresh);
        if (descEl) descEl.addEventListener('input', refresh);
        refresh();
    }
    g5bSeoBindCounters();

    function g5bSeoCreateFaqRow(q, a, num) {
        var row = document.createElement('div');
        row.className = 'g5b-seo-faq-item';
        row.innerHTML = '<div class="g5b-seo-faq-item__head"><span class="g5b-seo-faq-item__num">FAQ ' + num + '</span></div>'
            + '<div class="g5b-seo-field"><label>질문</label><input type="text" name="faq_q[]" placeholder="자주 묻는 질문"></div>'
            + '<div class="g5b-seo-field"><label>답변</label><textarea name="faq_a[]" rows="2" placeholder="명확하고 간결한 답변"></textarea></div>';
        row.querySelector('input').value = q || '';
        row.querySelector('textarea').value = a || '';
        return row;
    }

    function g5bSeoRenumberFaq() {
        document.querySelectorAll('#g5b_seo_faq_list .g5b-seo-faq-item__num').forEach(function(el, i) {
            el.textContent = 'FAQ ' + (i + 1);
        });
    }

    document.getElementById('g5b_seo_add_faq').addEventListener('click', function() {
        var list = document.getElementById('g5b_seo_faq_list');
        var num = list.querySelectorAll('.g5b-seo-faq-item').length + 1;
        list.appendChild(g5bSeoCreateFaqRow('', '', num));
    });

    document.getElementById('g5b_seo_meta_form').addEventListener('submit', function(e) {
        e.preventDefault();
        var msg = document.getElementById('g5b_seo_form_msg');
        var fd = new FormData(this);
        fd.append('action', 'save_meta');
        msg.textContent = '저장 중…';
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) { msg.textContent = res.ok ? (res.message || '저장됨') : (res.error || '실패'); })
            .catch(function() { msg.textContent = '네트워크 오류'; });
    });

    document.getElementById('g5b_seo_ai_btn').addEventListener('click', function() {
        var msg = document.getElementById('g5b_seo_form_msg');
        var btn = this;
        btn.disabled = true;
        msg.textContent = 'AI 생성 중… (10~30초)';

        var fd = new FormData();
        fd.append('action', 'ai_generate');
        fd.append('type', editType);
        fd.append('key', editKey);

        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                btn.disabled = false;
                if (!res.ok) {
                    msg.textContent = res.error || '생성 실패';
                    return;
                }
                var d = res.data || {};
                if (d.title) document.getElementById('seo_title').value = d.title;
                if (d.description) document.getElementById('seo_description').value = d.description;
                if (d.keywords) document.getElementById('seo_keywords').value = d.keywords;
                if (d.robots) document.getElementById('seo_robots').value = d.robots;
                if (d.schema_type) document.getElementById('seo_schema_type').value = d.schema_type;
                ['seo_title', 'seo_description'].forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
                });

                var previewRoot = document.getElementById('seo_serp_preview');
                if (previewRoot && previewRoot.g5bSeoPreviewRefresh) previewRoot.g5bSeoPreviewRefresh();

                if (d.faq && d.faq.length) {
                    var list = document.getElementById('g5b_seo_faq_list');
                    list.innerHTML = '';
                    d.faq.forEach(function(item, i) {
                        list.appendChild(g5bSeoCreateFaqRow(item.q, item.a, i + 1));
                    });
                }
                g5bSeoBindCounters();
                msg.textContent = 'AI 생성 완료 — 확인 후 저장하세요.';
            })
            .catch(function() {
                btn.disabled = false;
                msg.textContent = '네트워크 오류';
            });
    });

    document.getElementById('g5b_seo_faq_btn').addEventListener('click', function() {
        var msg = document.getElementById('g5b_seo_form_msg');
        var btn = this;
        btn.disabled = true;
        msg.textContent = 'FAQ 생성 중… (강화 6개)';

        var fd = new FormData();
        fd.append('action', 'ai_faq');
        fd.append('type', editType);
        fd.append('key', editKey);
        fd.append('count', '6');

        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                btn.disabled = false;
                if (!res.ok) { msg.textContent = res.error || 'FAQ 생성 실패'; return; }
                var faq = (res.data && res.data.faq) ? res.data.faq : [];
                var list = document.getElementById('g5b_seo_faq_list');
                list.innerHTML = '';
                faq.forEach(function(item, i) {
                    list.appendChild(g5bSeoCreateFaqRow(item.q, item.a, i + 1));
                });
                msg.textContent = 'FAQ ' + faq.length + '개 생성 — 확인 후 저장하세요.';
            })
            .catch(function() { btn.disabled = false; msg.textContent = '네트워크 오류'; });
    });
})();
</script>

<?php } elseif ($tab === 'health') {
    $health_summary = function_exists('g5b_seo_geo_health_get_summary')
        ? g5b_seo_geo_health_get_summary($health_bo)
        : array('ok' => false);
    $health_gaps = function_exists('g5b_seo_geo_health_fetch_gaps')
        ? g5b_seo_geo_health_fetch_gaps($health_bo, $health_gap, $health_page, 25)
        : array('ok' => false, 'items' => array(), 'total' => 0);
    $hs = isset($health_summary['stats']) ? $health_summary['stats'] : array();
    $health_has_items = !empty($health_gaps['items']);
    $health_ai_ready = !empty($health_summary['ai_configured']);
    $health_bulk_url = icrm_admin_page_url('seo', array(
        'tab'          => 'bulk',
        'bo_table'     => $health_bo,
        'from_health'  => '1',
        'gap'          => $health_gap,
    ));
    $flag_labels = array(
        'meta_missing' => '메타 없음',
        'faq_missing'  => 'FAQ 부족',
        'rank_missing' => '순위 미등록',
    );
    $board_res = sql_query(" select bo_table, bo_subject from {$g5['board_table']} order by bo_table ");
    ?>
<section class="g5b-panel">
    <h2 class="h2_frm">SEO · GEO 현황</h2>
    <p class="g5b-seo-hint">최근 글의 SEO·FAQ·순위 상태를 확인합니다. 부족한 글은 선택 후 <strong>SEO 보완</strong>을 누르세요.</p>

    <form method="get" action="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo')); ?>" class="g5b-seo-actions" style="margin-bottom:18px">
        <input type="hidden" name="m" value="seo">
        <input type="hidden" name="tab" value="health">
        <select name="bo_table" class="frm_input" onchange="this.form.submit()">
            <option value="">전체 게시판</option>
            <?php while ($b = sql_fetch_array($board_res)) {
                $sel = ($health_bo === $b['bo_table']) ? ' selected' : '';
                echo '<option value="' . g5b_seo_admin_h($b['bo_table']) . '"' . $sel . '>' . g5b_seo_admin_h($b['bo_table'] . ' · ' . $b['bo_subject']) . '</option>';
            } ?>
        </select>
        <select name="gap" class="frm_input" onchange="this.form.submit()">
            <?php foreach (array('all' => '보완 필요', 'meta_missing' => '메타 없음', 'faq_missing' => 'FAQ 부족', 'rank_missing' => '순위 미등록') as $val => $label) {
                $sel = ($health_gap === $val) ? ' selected' : '';
                echo '<option value="' . g5b_seo_admin_h($val) . '"' . $sel . '>' . g5b_seo_admin_h($label) . '</option>';
            } ?>
        </select>
        <?php if ($health_bo !== '') { ?>
        <a class="btn btn_02" href="<?php echo g5b_seo_admin_h($health_bulk_url); ?>">일괄 SEO 열기</a>
        <?php } ?>
        <a class="btn btn_02" href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('content', array('tab' => 'inbox'))); ?>">수집 콘텐츠</a>
    </form>

    <?php if (empty($health_summary['ok'])) { ?>
    <p class="g5b-seo-hint">SEO·GEO 헬스 모듈을 불러올 수 없습니다.</p>
    <?php } else { ?>
    <div class="g5b-seo-health-grid">
        <div class="g5b-seo-health-stat g5b-seo-health-stat--accent"><strong><?php echo (int) ($hs['avg_geo_score'] ?? 0); ?></strong><span>평균 GEO 점수</span></div>
        <div class="g5b-seo-health-stat g5b-seo-health-stat--warn"><strong><?php echo (int) ($hs['gap_meta'] ?? 0); ?></strong><span>메타 보완</span></div>
        <div class="g5b-seo-health-stat g5b-seo-health-stat--warn"><strong><?php echo (int) ($hs['gap_faq'] ?? 0); ?></strong><span>FAQ 보완</span></div>
        <div class="g5b-seo-health-stat g5b-seo-health-stat--warn"><strong><?php echo (int) ($hs['gap_rank'] ?? 0); ?></strong><span>순위 미등록</span></div>
    </div>
    <?php if (!$health_ai_ready) { ?>
    <p class="g5b-seo-hint"><strong>AI 미연동:</strong> <a href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'settings'))); ?>">iCRM 연동</a> 후 SEO 보완을 사용할 수 있습니다.</p>
    <?php } ?>

    <h3 class="h2_frm" style="margin-top:24px">보완할 글</h3>
    <?php if (!$health_has_items) { ?>
    <p class="g5b-seo-hint">선택한 조건에 해당하는 글이 없습니다.</p>
    <?php } else { ?>
    <?php if ($health_ai_ready) { ?>
    <div class="g5b-seo-health-bulk" id="g5b_health_bulk_bar" style="display:none">
        <strong><span id="g5b_health_bulk_count">0</span>개 선택</strong>
        <button type="button" class="btn btn_submit btn" id="g5b_health_fix_btn">SEO 보완</button>
        <span class="g5b-seo-msg" id="g5b_health_bulk_msg"></span>
    </div>
    <?php } ?>
    <table class="tbl_head01">
        <thead><tr><?php if ($health_ai_ready) { ?><th style="width:36px"><input type="checkbox" id="g5b_health_check_all" title="현재 목록 전체"></th><?php } ?><th>GEO</th><th>글</th><th>게시판</th><th>상태</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($health_gaps['items'] as $row) {
            $grade = strtolower((string) ($row['geo_grade'] ?? 'd'));
            $write_url = G5_BBS_URL . '/write.php?bo_table=' . urlencode($row['bo_table']) . '&w=u&wr_id=' . (int) $row['wr_id'];
            $visible_flags = array();
            foreach ((array) ($row['flags'] ?? array()) as $flag) {
                if (isset($flag_labels[$flag])) {
                    $visible_flags[] = $flag;
                }
            }
            ?>
        <tr>
            <?php if ($health_ai_ready) { ?>
            <td><input type="checkbox" class="g5b-seo-health-chk" value="<?php echo (int) $row['wr_id']; ?>" data-bo-table="<?php echo g5b_seo_admin_h($row['bo_table']); ?>"></td>
            <?php } ?>
            <td><span class="g5b-seo-geo-grade g5b-seo-geo-grade--<?php echo g5b_seo_admin_h($grade); ?>"><?php echo g5b_seo_admin_h($row['geo_grade']); ?> <?php echo (int) $row['geo_score']; ?></span></td>
            <td><strong><?php echo g5b_seo_admin_h(mb_strimwidth($row['subject'], 0, 48, '…', 'UTF-8')); ?></strong><br><span class="g5b-seo-hint">#<?php echo (int) $row['wr_id']; ?></span></td>
            <td><?php echo g5b_seo_admin_h($row['bo_table']); ?></td>
            <td><?php foreach ($visible_flags as $flag) {
                echo '<span class="g5b-seo-flag">' . g5b_seo_admin_h($flag_labels[$flag]) . '</span>';
            } ?></td>
            <td><a class="btn btn_03" href="<?php echo g5b_seo_admin_h($write_url); ?>" target="_blank" rel="noopener">글 SEO</a></td>
        </tr>
        <?php } ?>
        </tbody>
    </table>
    <?php
    $gap_pages = max(1, (int) ceil(((int) ($health_gaps['total'] ?? 0)) / 25));
    if ($gap_pages > 1) {
        echo '<p class="g5b-seo-hint">페이지 ' . (int) $health_page . ' / ' . $gap_pages . '</p>';
    }
    ?>
    <?php if ($health_ai_ready) { ?>
<script>
(function() {
    var actionUrl = <?php echo json_encode($action_url); ?>;
    var bulkBar = document.getElementById('g5b_health_bulk_bar');
    var checkAll = document.getElementById('g5b_health_check_all');
    var fixBtn = document.getElementById('g5b_health_fix_btn');
    var bulkCount = document.getElementById('g5b_health_bulk_count');
    var bulkMsg = document.getElementById('g5b_health_bulk_msg');

    function selectedPosts() {
        var posts = [];
        document.querySelectorAll('.g5b-seo-health-chk:checked').forEach(function(el) {
            posts.push({ bo_table: el.getAttribute('data-bo-table'), wr_id: parseInt(el.value, 10) });
        });
        return posts;
    }

    function updateBulkBar() {
        var posts = selectedPosts();
        bulkBar.style.display = posts.length ? 'flex' : 'none';
        bulkCount.textContent = String(posts.length);
        if (checkAll) {
            var all = document.querySelectorAll('.g5b-seo-health-chk');
            checkAll.checked = all.length > 0 && posts.length === all.length;
            checkAll.indeterminate = posts.length > 0 && posts.length < all.length;
        }
    }

    if (checkAll) {
        checkAll.addEventListener('change', function() {
            document.querySelectorAll('.g5b-seo-health-chk').forEach(function(el) {
                el.checked = checkAll.checked;
            });
            updateBulkBar();
        });
    }
    document.querySelectorAll('.g5b-seo-health-chk').forEach(function(el) {
        el.addEventListener('change', updateBulkBar);
    });

    if (fixBtn) {
        fixBtn.addEventListener('click', function() {
            var posts = selectedPosts();
            if (!posts.length) return;
            if (!confirm('선택한 ' + posts.length + '건의 SEO·FAQ·순위를 AI로 보완할까요?')) return;

            fixBtn.disabled = true;
            if (checkAll) checkAll.disabled = true;
            document.querySelectorAll('.g5b-seo-health-chk').forEach(function(el) { el.disabled = true; });

            var ok = 0;
            var fail = 0;

            function next(i) {
                if (i >= posts.length) {
                    bulkMsg.textContent = ok + '건 완료' + (fail ? ', ' + fail + '건 실패' : '');
                    setTimeout(function() { location.reload(); }, fail ? 2000 : 800);
                    return;
                }
                bulkMsg.textContent = (i + 1) + '/' + posts.length + ' 보완 중…';
                var fd = new FormData();
                fd.append('action', 'geo_fix_post');
                fd.append('bo_table', posts[i].bo_table);
                fd.append('wr_id', String(posts[i].wr_id));
                fd.append('include_faq', '1');
                fd.append('include_rank', '1');
                fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        if (res.ok) ok++; else fail++;
                        next(i + 1);
                    })
                    .catch(function() { fail++; next(i + 1); });
            }
            next(0);
        });
    }
})();
</script>
    <?php } ?>
    <?php } ?>
    <?php } ?>
</section>

<?php } elseif ($tab === 'bulk') {
    $bulk_bo = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
    $bulk_from_health = !empty($_GET['from_health']);
    $bulk_gap = isset($_GET['gap']) ? preg_replace('/[^a-z_]/', '', $_GET['gap']) : 'all';
    $bulk_prefill = array();
    if ($bulk_from_health && $bulk_bo !== '' && function_exists('g5b_seo_geo_health_fetch_gaps')) {
        $prefill_res = g5b_seo_geo_health_fetch_gaps($bulk_bo, $bulk_gap, 1, 50);
        if (!empty($prefill_res['items'])) {
            $bulk_prefill = $prefill_res['items'];
        }
    }
    $sql = " select bo_table, bo_subject from {$g5['board_table']} order by bo_table ";
    $board_result = sql_query($sql);
    ?>
<section class="g5b-panel g5b-seo-form">
    <h2 class="h2_frm">일괄 SEO 생성</h2>
    <p class="g5b-seo-hint">게시판 글에 SEO·FAQ를 AI로 생성합니다. <?php if ($bulk_from_health && !empty($bulk_prefill)) { ?>현황에서 <?php echo count($bulk_prefill); ?>건을 불러왔습니다.<?php } ?></p>

    <table class="tbl_frm01">
        <tbody>
        <tr>
            <th>게시판 선택</th>
            <td>
                <select id="bulk_bo_table" class="frm_input">
                    <option value="">— 선택 —</option>
                    <?php
                    sql_data_seek($board_result, 0);
                    while ($brow = sql_fetch_array($board_result)) {
                        $sel = ($bulk_bo === $brow['bo_table']) ? ' selected' : '';
                        echo '<option value="' . g5b_seo_admin_h($brow['bo_table']) . '"' . $sel . '>'
                            . g5b_seo_admin_h($brow['bo_table'] . ' — ' . get_text($brow['bo_subject'])) . '</option>';
                    } ?>
                </select>
                <label style="margin-left:1rem;"><input type="checkbox" id="bulk_only_missing" checked> SEO 미설정 글만</label>
                <label style="margin-left:1rem;"><input type="checkbox" id="bulk_include_faq" checked> FAQ 포함</label>
                <label style="margin-left:1rem;"><input type="checkbox" id="bulk_include_rank" checked> 순위도 등록</label>
            </td>
        </tr>
        </tbody>
    </table>

    <div class="g5b-seo-actions">
        <button type="button" class="btn btn_02" id="bulk_load_btn">글 목록 불러오기</button>
        <button type="button" class="btn_submit btn" id="bulk_run_btn" disabled>선택 글 SEO 생성</button>
        <a class="btn btn_02" href="<?php echo g5b_seo_admin_h(icrm_admin_page_url('seo', array('tab' => 'health'))); ?>">← SEO·GEO 현황</a>
    </div>

    <div class="g5b-seo-bulk-progress" id="bulk_progress_wrap" hidden>
        <div class="g5b-seo-bulk-progress__bar" id="bulk_progress_bar"></div>
    </div>
    <p class="g5b-seo-msg" id="bulk_status"></p>

    <table class="tbl_head01" id="bulk_posts_table" style="margin-top:1rem;" hidden>
        <thead>
        <tr>
            <th><input type="checkbox" id="bulk_check_all"></th>
            <th>wr_id</th>
            <th>제목</th>
            <th>작성일</th>
            <th>SEO</th>
        </tr>
        </thead>
        <tbody id="bulk_posts_body"></tbody>
    </table>

    <div class="g5b-seo-bulk-log" id="bulk_log" hidden></div>
</section>
<script>
(function() {
    var actionUrl = <?php echo json_encode($action_url); ?>;
    var bulkPrefill = <?php echo json_encode($bulk_prefill, JSON_UNESCAPED_UNICODE); ?>;
    var loadBtn = document.getElementById('bulk_load_btn');
    var runBtn = document.getElementById('bulk_run_btn');
    var tbody = document.getElementById('bulk_posts_body');
    var table = document.getElementById('bulk_posts_table');
    var status = document.getElementById('bulk_status');
    var log = document.getElementById('bulk_log');
    var progressWrap = document.getElementById('bulk_progress_wrap');
    var progressBar = document.getElementById('bulk_progress_bar');

    function logLine(msg) {
        log.hidden = false;
        log.innerHTML += msg + '<br>';
        log.scrollTop = log.scrollHeight;
    }

    function appendBulkRow(item, checked) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td><input type="checkbox" class="bulk_chk" value="' + item.wr_id + '"' + (checked ? ' checked' : '') + '></td>'
            + '<td>' + item.wr_id + '</td>'
            + '<td>' + (item.subject || '').replace(/</g,'&lt;') + '</td>'
            + '<td>' + (item.datetime || '') + '</td>'
            + '<td>' + (item.has_seo ? '설정됨' : '—') + '</td>';
        tbody.appendChild(tr);
    }

    function showBulkTable(items) {
        tbody.innerHTML = '';
        (items || []).forEach(function(item) {
            appendBulkRow(item, true);
        });
        table.hidden = false;
        runBtn.disabled = !(items && items.length);
        status.textContent = (items ? items.length : 0) + '건';
    }

    if (bulkPrefill && bulkPrefill.length) {
        var mapped = bulkPrefill.map(function(item) {
            return {
                wr_id: item.wr_id,
                subject: item.subject || '',
                datetime: item.datetime || '',
                has_seo: false
            };
        });
        showBulkTable(mapped);
    }

    loadBtn.addEventListener('click', function() {
        var bo = document.getElementById('bulk_bo_table').value;
        if (!bo) { status.textContent = '게시판을 선택해 주세요.'; return; }
        var onlyMissing = document.getElementById('bulk_only_missing').checked ? '1' : '0';
        status.textContent = '목록 불러오는 중…';
        fetch(actionUrl + '?action=bulk_list&bo_table=' + encodeURIComponent(bo) + '&only_missing=' + onlyMissing, { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.ok) { status.textContent = res.error || '불러오기 실패'; return; }
                showBulkTable(res.items || []);
                if (res.total) {
                    status.textContent = (res.items ? res.items.length : 0) + '건 (전체 ' + res.total + '건)';
                }
            })
            .catch(function() { status.textContent = '네트워크 오류'; });
    });

    document.getElementById('bulk_check_all').addEventListener('change', function() {
        document.querySelectorAll('.bulk_chk').forEach(function(c) { c.checked = this.checked; }.bind(this));
    });

    runBtn.addEventListener('click', function() {
        var bo = document.getElementById('bulk_bo_table').value;
        var ids = [];
        document.querySelectorAll('.bulk_chk:checked').forEach(function(c) { ids.push(c.value); });
        if (!bo) { status.textContent = '게시판을 선택해 주세요.'; return; }
        if (!ids.length) { status.textContent = '글을 선택해 주세요.'; return; }

        runBtn.disabled = true;
        loadBtn.disabled = true;
        progressWrap.hidden = false;
        log.innerHTML = '';
        log.hidden = false;
        var includeFaq = document.getElementById('bulk_include_faq').checked;
        var includeRank = document.getElementById('bulk_include_rank').checked;
        var done = 0;
        var fail = 0;

        function next(i) {
            if (i >= ids.length) {
                runBtn.disabled = false;
                loadBtn.disabled = false;
                status.textContent = '완료: 성공 ' + (done - fail) + ' / 실패 ' + fail + ' / 전체 ' + ids.length;
                return;
            }
            var wrId = ids[i];
            progressBar.style.width = Math.round((i / ids.length) * 100) + '%';
            status.textContent = '처리 중… ' + (i + 1) + '/' + ids.length + ' (wr_id=' + wrId + ')';

            var fd = new FormData();
            fd.append('action', includeRank ? 'geo_fix_post' : 'bulk_run');
            fd.append('bo_table', bo);
            fd.append('wr_id', wrId);
            fd.append('include_faq', includeFaq ? '1' : '0');
            if (includeRank) {
                fd.append('include_rank', '1');
            }

            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    done++;
                    if (res.ok) {
                        logLine('✓ wr_id=' + wrId + ' ' + (res.subject || ''));
                    } else {
                        fail++;
                        logLine('✗ wr_id=' + wrId + ' ' + (res.message || res.error || '실패'));
                    }
                    next(i + 1);
                })
                .catch(function() {
                    done++;
                    fail++;
                    logLine('✗ wr_id=' + wrId + ' 네트워크 오류');
                    next(i + 1);
                });
        }
        next(0);
    });
})();
</script>

<?php } elseif ($tab === 'boards') {
    $sql = " select bo_table, bo_subject from {$g5['board_table']} order by bo_table ";
    $result = sql_query($sql);
    ?>
<section class="g5b-panel">
    <h2 class="h2_frm">게시판 SEO</h2>
    <p class="g5b-seo-hint">게시판 목록 페이지에 적용됩니다. 개별 글은 글쓰기 화면에서 설정하세요.</p>
    <table class="tbl_head01">
        <thead>
        <tr>
            <th>게시판 ID</th>
            <th>제목</th>
            <th>관리</th>
        </tr>
        </thead>
        <tbody>
        <?php
        while ($row = sql_fetch_array($result)) {
            $key = $row['bo_table'];
            $edit_url = icrm_admin_page_url('seo', array('type' => 'boards', 'key' => $key));
            ?>
        <tr>
            <td><?php echo g5b_seo_admin_h($key); ?></td>
            <td><?php echo g5b_seo_admin_h(get_text($row['bo_subject'])); ?><?php echo g5b_seo_admin_meta_badge('boards', $key); ?></td>
            <td><a href="<?php echo g5b_seo_admin_h($edit_url); ?>" class="btn btn_03">SEO 설정</a></td>
        </tr>
            <?php
        }
        ?>
        </tbody>
    </table>
</section>

<?php } else {
    $pages = g5b_seo_meta_list_pages();
    ?>
<section class="g5b-panel">
    <h2 class="h2_frm">페이지 SEO</h2>
    <p class="g5b-seo-hint">정적 페이지(/page/*.php)와 메인(index)의 title·description을 수동 설정합니다.</p>
    <table class="tbl_head01">
        <thead>
        <tr>
            <th>경로</th>
            <th>이름</th>
            <th>관리</th>
        </tr>
        </thead>
        <tbody>
        <?php foreach ($pages as $page) {
            $key = $page['key'];
            $edit_url = icrm_admin_page_url('seo', array('type' => 'pages', 'key' => $key));
            ?>
        <tr>
            <td><?php echo g5b_seo_admin_h($page['path']); ?></td>
            <td><?php echo g5b_seo_admin_h($page['label']); ?><?php echo g5b_seo_admin_meta_badge('pages', $key); ?></td>
            <td><a href="<?php echo g5b_seo_admin_h($edit_url); ?>" class="btn btn_03">SEO 설정</a></td>
        </tr>
        <?php } ?>
        </tbody>
    </table>
</section>
<?php } ?>

</div><!-- .g5b-seo-admin -->
