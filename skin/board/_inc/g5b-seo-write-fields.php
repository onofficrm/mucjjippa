<?php
/**
 * 게시글 작성/수정 — SEO 메타 필드 + 검색 미리보기 (관리자)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (empty($is_admin) || ($is_admin !== 'super' && $is_admin !== 'group' && $is_admin !== 'board')) {
    return;
}

if (!is_file(G5_LIB_PATH . '/seo-meta.lib.php')) {
    return;
}

include_once G5_LIB_PATH . '/seo-meta.lib.php';

$g5b_seo_post_meta = array();
if ($w === 'u' && !empty($bo_table) && !empty($wr_id)) {
    $g5b_seo_post_meta = g5b_seo_meta_get_post_record($bo_table, $wr_id);
}

$g5b_seo_action_url = G5_PLUGIN_URL . '/seo_meta/admin/action.php';
$g5b_seo_ai_type = 'posts';
$g5b_seo_ai_key = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table) . ':' . (int) $wr_id;
$g5b_seo_preview_url = g5b_seo_meta_build_preview_url('posts', $g5b_seo_ai_key, isset($g5b_seo_post_meta['canonical']) ? $g5b_seo_post_meta['canonical'] : '');
$g5b_seo_site_name = function_exists('g5site_cfg') ? g5site_cfg('site_name', '') : '';
$g5b_seo_default_title = !empty($g5b_seo_post_meta['title']) ? $g5b_seo_post_meta['title'] : (isset($write['wr_subject']) ? get_text(strip_tags($write['wr_subject'])) : '');
$g5b_seo_default_desc = !empty($g5b_seo_post_meta['description']) ? $g5b_seo_post_meta['description'] : '';
$g5b_seo_default_image = !empty($g5b_seo_post_meta['og_image']) ? g5b_seo_meta_resolve_public_url($g5b_seo_post_meta['og_image']) : g5b_seo_meta_default_og_image();

$g5b_seo_existing_files = array();
if ($w === 'u' && !empty($bo_table) && !empty($wr_id)) {
    $g5b_seo_existing_files = g5b_seo_meta_get_post_files($bo_table, $wr_id);
}

g5b_seo_meta_preview_assets();
?>

<div class="board-write-form__row write_div g5b-seo-meta-panel" id="g5b_seo_meta_panel">
    <details class="g5b-seo-meta-panel__details">
    <summary class="g5b-seo-meta-panel__summary">
        <span>
            <strong class="board-write-form__label">SEO 메타 (수동 · AI · 미리보기)</strong>
            <span class="g5b-seo-meta-panel__summary-hint">클릭해서 SEO 입력, AI 생성, 검색/SNS 미리보기를 열고 닫습니다.</span>
        </span>
        <span class="g5b-seo-meta-panel__summary-icon" aria-hidden="true"></span>
    </summary>
    <p class="g5b-seo-meta-panel__hint">비워 두면 자동 메타가 적용됩니다. 대표 이미지·타이틀·설명 입력 시 네이버·구글 검색 미리보기처럼 표시됩니다.</p>
    <input type="hidden" name="g5b_seo_meta_enabled" value="1">

    <div class="g5b-seo-layout">
    <div class="g5b-seo-layout__form">
    <div class="g5b-seo-meta-panel__grid">
        <div class="g5b-seo-meta-panel__field">
            <label for="g5b_seo_title">SEO 타이틀</label>
            <input type="text" name="g5b_seo_title" id="g5b_seo_title" class="frm_input full_input"
                value="<?php echo htmlspecialchars(isset($g5b_seo_post_meta['title']) ? $g5b_seo_post_meta['title'] : '', ENT_QUOTES, 'UTF-8'); ?>"
                maxlength="120" placeholder="검색 결과에 표시될 제목 (예: 강남피부과 | ○○피부과의원)">
        </div>
        <div class="g5b-seo-meta-panel__field">
            <label for="g5b_seo_description">SEO 설명 (description)</label>
            <textarea name="g5b_seo_description" id="g5b_seo_description" class="frm_input full_input" rows="3"
                maxlength="320" placeholder="검색 결과 설명 (권장 160자 이내)"><?php
                echo htmlspecialchars(isset($g5b_seo_post_meta['description']) ? $g5b_seo_post_meta['description'] : '', ENT_QUOTES, 'UTF-8');
            ?></textarea>
        </div>
        <div class="g5b-seo-meta-panel__field">
            <label for="g5b_seo_keywords">키워드</label>
            <input type="text" name="g5b_seo_keywords" id="g5b_seo_keywords" class="frm_input full_input"
                value="<?php echo htmlspecialchars(isset($g5b_seo_post_meta['keywords']) ? $g5b_seo_post_meta['keywords'] : '', ENT_QUOTES, 'UTF-8'); ?>"
                placeholder="쉼표로 구분">
        </div>
        <div class="g5b-seo-meta-panel__field g5b-seo-meta-panel__field--half">
            <label for="g5b_seo_robots">robots</label>
            <select name="g5b_seo_robots" id="g5b_seo_robots" class="frm_input">
                <?php
                $robots_val = isset($g5b_seo_post_meta['robots']) ? $g5b_seo_post_meta['robots'] : '';
                foreach (array('' => '기본값', 'index,follow' => 'index,follow', 'noindex,nofollow' => 'noindex,nofollow') as $val => $label) {
                    $sel = ($robots_val === $val) ? ' selected' : '';
                    echo '<option value="' . htmlspecialchars($val, ENT_QUOTES, 'UTF-8') . '"' . $sel . '>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</option>';
                }
                ?>
            </select>
        </div>
        <div class="g5b-seo-meta-panel__field g5b-seo-meta-panel__field--half">
            <label for="g5b_seo_schema_type">Schema 유형</label>
            <select name="g5b_seo_schema_type" id="g5b_seo_schema_type" class="frm_input">
                <?php
                $schema_val = isset($g5b_seo_post_meta['schema_type']) ? $g5b_seo_post_meta['schema_type'] : '';
                foreach (array('' => '기본', 'Article' => 'Article', 'WebPage' => 'WebPage', 'LocalBusiness' => 'LocalBusiness') as $val => $label) {
                    $sel = ($schema_val === $val) ? ' selected' : '';
                    echo '<option value="' . htmlspecialchars($val, ENT_QUOTES, 'UTF-8') . '"' . $sel . '>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</option>';
                }
                ?>
            </select>
        </div>
        <div class="g5b-seo-meta-panel__field">
            <?php
            g5b_seo_meta_render_featured_image_field(array(
                'id_prefix'  => 'g5b_seo',
                'value'      => isset($g5b_seo_post_meta['og_image']) ? $g5b_seo_post_meta['og_image'] : '',
                'upload_url' => $g5b_seo_action_url,
            ));
            ?>
        </div>
        <div class="g5b-seo-meta-panel__field">
            <label for="g5b_seo_canonical">Canonical URL</label>
            <input type="text" name="g5b_seo_canonical" id="g5b_seo_canonical" class="frm_input full_input"
                value="<?php echo htmlspecialchars(isset($g5b_seo_post_meta['canonical']) ? $g5b_seo_post_meta['canonical'] : '', ENT_QUOTES, 'UTF-8'); ?>"
                placeholder="비우면 현재 URL">
        </div>
    </div>

    <div class="g5b-seo-meta-panel__faq" id="g5b_seo_faq_wrap">
        <p class="g5b-seo-meta-panel__sub">FAQ (GEO — AI 검색용)</p>
        <?php
        $faq_items = !empty($g5b_seo_post_meta['faq']) ? $g5b_seo_post_meta['faq'] : array(array('q' => '', 'a' => ''));
        foreach ($faq_items as $fi => $faq_row) {
            ?>
        <div class="g5b-seo-meta-panel__faq-row">
            <input type="text" name="g5b_seo_faq_q[]" class="frm_input" placeholder="질문"
                value="<?php echo htmlspecialchars(isset($faq_row['q']) ? $faq_row['q'] : '', ENT_QUOTES, 'UTF-8'); ?>">
            <textarea name="g5b_seo_faq_a[]" class="frm_input" rows="2" placeholder="답변"><?php
                echo htmlspecialchars(isset($faq_row['a']) ? $faq_row['a'] : '', ENT_QUOTES, 'UTF-8');
            ?></textarea>
        </div>
            <?php
        }
        ?>
    </div>

    <div class="g5b-seo-meta-panel__actions">
        <button type="button" class="btn btn-outline" id="g5b_seo_score_btn">1. SEO 점수</button>
        <button type="button" class="btn btn-outline" id="g5b_seo_keyword_btn">2. 키워드 추천</button>
        <button type="button" class="btn btn-outline" id="g5b_seo_internal_links_btn">내부링크 추천</button>
        <button type="button" class="btn btn-outline" id="g5b_seo_ai_btn">AI SEO·GEO 생성</button>
        <button type="button" class="btn btn-outline" id="g5b_seo_faq_btn">3. GEO FAQ 생성</button>
        <button type="button" class="btn btn-outline" id="g5b_seo_alt_btn">이미지 ALT 생성</button>
        <button type="button" class="btn btn-outline" id="g5b_seo_checklist_btn">4. 발행 체크리스트</button>
        <span class="g5b-seo-meta-panel__status" id="g5b_seo_ai_status" aria-live="polite"></span>
    </div>
    <div class="g5b-seo-assist" id="g5b_seo_assist" hidden></div>
    </div>

    <?php
    g5b_seo_meta_render_preview_panel(array(
        'id_prefix'           => 'g5b_seo',
        'preview_url'         => $g5b_seo_preview_url,
        'default_title'       => $g5b_seo_default_title,
        'default_description' => $g5b_seo_default_desc,
        'default_image'       => $g5b_seo_default_image,
        'site_name'           => $g5b_seo_site_name,
        'upload_url'          => $g5b_seo_action_url,
    ));
    ?>
    </div>
    </details>
</div>

<style>
.g5b-seo-meta-panel { margin-top: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
.g5b-seo-meta-panel__details { display: block; }
.g5b-seo-meta-panel__summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: -1rem; padding: 1rem; border-radius: 8px; cursor: pointer; list-style: none; user-select: none; }
.g5b-seo-meta-panel__summary::-webkit-details-marker { display: none; }
.g5b-seo-meta-panel__summary:hover { background: #f1f5f9; }
.g5b-seo-meta-panel__summary .board-write-form__label { display: block; margin: 0; }
.g5b-seo-meta-panel__summary-hint { display: block; margin-top: 0.25rem; font-size: 0.8125rem; font-weight: 400; color: #64748b; }
.g5b-seo-meta-panel__summary-icon { flex: 0 0 auto; width: 2rem; height: 2rem; border-radius: 999px; background: #fff; border: 1px solid #cbd5e1; position: relative; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
.g5b-seo-meta-panel__summary-icon:before,
.g5b-seo-meta-panel__summary-icon:after { content: ""; position: absolute; top: 50%; left: 50%; width: 0.75rem; height: 2px; background: #334155; border-radius: 999px; transform: translate(-50%, -50%); transition: transform 0.15s; }
.g5b-seo-meta-panel__summary-icon:after { transform: translate(-50%, -50%) rotate(90deg); }
.g5b-seo-meta-panel__details[open] > .g5b-seo-meta-panel__summary { margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; border-radius: 8px 8px 0 0; background: #fff; }
.g5b-seo-meta-panel__details[open] .g5b-seo-meta-panel__summary-icon:after { transform: translate(-50%, -50%) rotate(0deg); }
.g5b-seo-meta-panel__hint { margin: 0 0 1rem; font-size: 0.875rem; color: #64748b; }
.g5b-seo-meta-panel__grid { display: grid; gap: 0.75rem; }
.g5b-seo-meta-panel__field label { display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem; }
.g5b-seo-meta-panel__field--half { display: inline-block; width: calc(50% - 0.5rem); vertical-align: top; }
.g5b-seo-meta-panel__sub { font-weight: 600; margin: 1rem 0 0.5rem; }
.g5b-seo-meta-panel__faq-row { display: grid; gap: 0.5rem; margin-bottom: 0.75rem; }
.g5b-seo-meta-panel__actions { margin-top: 1rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.g5b-seo-meta-panel__status { font-size: 0.875rem; color: #2563eb; }
.g5b-seo-assist { margin-top: 1rem; padding: 1rem; border: 1px solid #dbeafe; border-radius: 8px; background: #eff6ff; }
.g5b-seo-assist__title { margin: 0 0 0.5rem; font-weight: 700; color: #1e40af; }
.g5b-seo-assist__score { display: inline-flex; align-items: center; justify-content: center; width: 58px; height: 58px; margin-right: 0.75rem; border-radius: 999px; background: #2563eb; color: #fff; font-size: 1.25rem; font-weight: 700; vertical-align: middle; }
.g5b-seo-assist__list { margin: 0.5rem 0 0; padding-left: 1.2rem; }
.g5b-seo-assist__chip { display: inline-block; margin: 0.25rem 0.25rem 0 0; padding: 0.35rem 0.65rem; border: 1px solid #bfdbfe; border-radius: 999px; background: #fff; color: #1d4ed8; cursor: pointer; font-size: 0.875rem; }
.g5b-seo-assist__chip:hover { background: #dbeafe; }
.g5b-seo-assist__link-row { display:flex; flex-wrap:wrap; gap:0.5rem; align-items:flex-start; margin-top:0.5rem; padding:0.65rem 0; border-bottom:1px solid #dbeafe; }
.g5b-seo-assist__link-row:last-child { border-bottom:0; }
.g5b-seo-assist__link-meta { flex:1 1 220px; font-size:0.875rem; }
.g5b-seo-assist__actions { margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
@media (min-width: 900px) {
    .g5b-seo-meta-panel .g5b-seo-layout { grid-template-columns: minmax(0, 1fr) 320px; }
}
</style>

<script>
(function() {
    var actionUrl = <?php echo json_encode($g5b_seo_action_url); ?>;
    var aiType = <?php echo json_encode($g5b_seo_ai_type); ?>;
    var aiKey = <?php echo json_encode($g5b_seo_ai_key); ?>;
    var boTable = <?php echo json_encode($bo_table); ?>;
    var wrId = <?php echo (int) $wr_id; ?>;
    var canSaveAlt = <?php echo ($w === 'u' && $wr_id > 0) ? 'true' : 'false'; ?>;

    function getContent() {
        var contentEl = document.getElementById('wr_content');
        var content = contentEl ? contentEl.value : '';
        if (typeof ed_wr_content !== 'undefined' && ed_wr_content && typeof ed_wr_content.getContents === 'function') {
            content = ed_wr_content.getContents();
        }
        return content;
    }

    function setContent(html) {
        if (typeof ed_wr_content !== 'undefined' && ed_wr_content && typeof ed_wr_content.setContents === 'function') {
            ed_wr_content.setContents(html);
        } else {
            var contentEl = document.getElementById('wr_content');
            if (contentEl) contentEl.value = html;
        }
    }

    function getSubject() {
        var subjectEl = document.getElementById('wr_subject');
        return subjectEl ? subjectEl.value : '';
    }

    function fillFaq(faq) {
        if (!faq || !faq.length) return;
        var wrap = document.getElementById('g5b_seo_faq_wrap');
        var rows = wrap.querySelectorAll('.g5b-seo-meta-panel__faq-row');
        for (var i = 0; i < rows.length; i++) rows[i].remove();
        faq.forEach(function(item) {
            var row = document.createElement('div');
            row.className = 'g5b-seo-meta-panel__faq-row';
            row.innerHTML = '<input type="text" name="g5b_seo_faq_q[]" class="frm_input" placeholder="질문">'
                + '<textarea name="g5b_seo_faq_a[]" class="frm_input" rows="2" placeholder="답변"></textarea>';
            row.querySelector('input').value = item.q || '';
            row.querySelector('textarea').value = item.a || '';
            wrap.appendChild(row);
        });
    }

    function collectFileMeta() {
        var names = [];
        var alts = [];
        var altInputs = document.querySelectorAll('input[name="bf_content[]"]');
        var fileInputs = document.querySelectorAll('input[name="bf_file[]"]');
        for (var i = 0; i < altInputs.length; i++) {
            alts.push(altInputs[i].value || '');
            var name = 'image_' + (i + 1);
            if (fileInputs[i] && fileInputs[i].files && fileInputs[i].files[0]) {
                name = fileInputs[i].files[0].name;
            }
            names.push(name);
        }
        return { names: names, alts: alts };
    }

    function refreshPreview() {
        var root = document.getElementById('g5b_seo_serp_preview');
        if (root && root.g5bSeoPreviewRefresh) root.g5bSeoPreviewRefresh();
    }

    function esc(text) {
        return String(text || '').replace(/[&<>"']/g, function(ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch];
        });
    }

    function getSeoField(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    }

    function faqCount() {
        var count = 0;
        document.querySelectorAll('input[name="g5b_seo_faq_q[]"]').forEach(function(input) {
            if ((input.value || '').trim()) count++;
        });
        return count;
    }

    function assistRoot(title) {
        var root = document.getElementById('g5b_seo_assist');
        root.hidden = false;
        root.innerHTML = '<p class="g5b-seo-assist__title">' + title + '</p>';
        return root;
    }

    function appendKeyword(keyword) {
        var input = document.getElementById('g5b_seo_keywords');
        if (!input || !keyword) return;
        var parts = input.value.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
        if (parts.indexOf(keyword) === -1) {
            parts.push(keyword);
            input.value = parts.join(', ');
            refreshPreview();
        }
    }

    function buildInternalLinkHtml(item) {
        if (item.html_snippet) return item.html_snippet;
        var url = item.url || '';
        var anchor = item.anchor_text || '';
        if (!url || !anchor) return '';
        return '<a href="' + esc(url) + '">' + esc(anchor) + '</a>';
    }

    function insertInternalLink(item, asBlock) {
        var html = buildInternalLinkHtml(item);
        if (!html) return false;
        var block = asBlock ? ('<p>' + html + '</p>') : html;
        var content = getContent();
        if (content && content.slice(-4) !== '</p>' && asBlock) {
            setContent(content + block);
        } else if (content) {
            setContent(content + (asBlock ? block : (' ' + block)));
        } else {
            setContent(asBlock ? block : ('<p>' + html + '</p>'));
        }
        return true;
    }

    function insertAllInternalLinks(links) {
        if (!links || !links.length) return;
        var html = links.map(function(item) {
            var link = buildInternalLinkHtml(item);
            return link ? ('<p>' + link + '</p>') : '';
        }).filter(Boolean).join('');
        if (!html) return;
        var content = getContent();
        setContent((content || '') + html);
    }

    function currentSeoPayload(action) {
        var fd = new FormData();
        fd.append('action', action);
        fd.append('subject', getSubject());
        fd.append('content', getContent());
        fd.append('seo_title', getSeoField('g5b_seo_title'));
        fd.append('description', getSeoField('g5b_seo_description'));
        fd.append('keywords', getSeoField('g5b_seo_keywords'));
        fd.append('faq_count', String(faqCount()));
        return fd;
    }

    var subjectEl = document.getElementById('wr_subject');
    if (subjectEl) subjectEl.addEventListener('input', refreshPreview);

    var seoBtn = document.getElementById('g5b_seo_ai_btn');
    if (seoBtn) {
        seoBtn.addEventListener('click', function() {
            var status = document.getElementById('g5b_seo_ai_status');
            status.textContent = 'AI SEO 생성 중…';
            seoBtn.disabled = true;
            var fd = new FormData();
            fd.append('action', 'ai_generate');
            fd.append('type', aiType);
            fd.append('key', aiKey);
            fd.append('subject', getSubject());
            fd.append('content', getContent());
            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    seoBtn.disabled = false;
                    if (!res.ok) { status.textContent = res.error || '생성 실패'; return; }
                    var d = res.data || {};
                    if (d.title) document.getElementById('g5b_seo_title').value = d.title;
                    if (d.description) document.getElementById('g5b_seo_description').value = d.description;
                    if (d.keywords) document.getElementById('g5b_seo_keywords').value = d.keywords;
                    if (d.robots) document.getElementById('g5b_seo_robots').value = d.robots;
                    if (d.schema_type) document.getElementById('g5b_seo_schema_type').value = d.schema_type;
                    fillFaq(d.faq);
                    refreshPreview();
                    status.textContent = 'SEO 생성 완료 — 저장 후 반영됩니다.';
                })
                .catch(function() { seoBtn.disabled = false; status.textContent = '네트워크 오류'; });
        });
    }

    var scoreBtn = document.getElementById('g5b_seo_score_btn');
    if (scoreBtn) {
        scoreBtn.addEventListener('click', function() {
            var status = document.getElementById('g5b_seo_ai_status');
            status.textContent = 'iCRM에서 SEO 점수 분석 중…';
            scoreBtn.disabled = true;
            fetch(actionUrl, { method: 'POST', body: currentSeoPayload('ai_score'), credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    scoreBtn.disabled = false;
                    if (!res.ok) { status.textContent = res.error || '점수 분석 실패'; return; }
                    var d = res.data || {};
                    var root = assistRoot('1. 글쓰기 SEO 점수');
                    var html = '<div><span class="g5b-seo-assist__score">' + esc(d.score || 0) + '</span>'
                        + '<strong>' + esc(d.grade || '') + '</strong> ' + esc(d.summary || '') + '</div>';
                    if (d.checks && d.checks.length) {
                        html += '<ul class="g5b-seo-assist__list">';
                        d.checks.forEach(function(item) {
                            html += '<li><strong>' + esc(item.label || '') + '</strong> — ' + esc(item.hint || item.status || '') + '</li>';
                        });
                        html += '</ul>';
                    }
                    if (d.tips && d.tips.length) {
                        html += '<ul class="g5b-seo-assist__list">';
                        d.tips.forEach(function(tip) { html += '<li>' + esc(tip) + '</li>'; });
                        html += '</ul>';
                    }
                    root.innerHTML += html;
                    status.textContent = 'SEO 점수 확인 완료';
                })
                .catch(function() { scoreBtn.disabled = false; status.textContent = '네트워크 오류'; });
        });
    }

    var keywordBtn = document.getElementById('g5b_seo_keyword_btn');
    if (keywordBtn) {
        keywordBtn.addEventListener('click', function() {
            var status = document.getElementById('g5b_seo_ai_status');
            status.textContent = 'iCRM에서 키워드 추천 중…';
            keywordBtn.disabled = true;
            var fd = currentSeoPayload('ai_keywords');
            fd.append('board_name', <?php echo json_encode(isset($board['bo_subject']) ? get_text($board['bo_subject']) : '', JSON_UNESCAPED_UNICODE); ?>);
            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    keywordBtn.disabled = false;
                    if (!res.ok) { status.textContent = res.error || '키워드 추천 실패'; return; }
                    var list = (res.data && res.data.keywords) ? res.data.keywords : [];
                    var root = assistRoot('2. 키워드 추천');
                    var html = '<p class="g5b-seo-meta-panel__hint">클릭하면 SEO 키워드에 추가됩니다.</p>';
                    list.forEach(function(item) {
                        var kw = item.keyword || '';
                        html += '<span class="g5b-seo-assist__chip" data-keyword="' + esc(kw) + '">' + esc(kw) + '</span>';
                    });
                    if (canSaveAlt && wrId > 0) {
                        html += '<div class="g5b-seo-assist__actions"><button type="button" class="btn btn-outline" id="g5b_rank_register_btn">추천 키워드 순위체크 등록</button></div>';
                    } else {
                        html += '<p class="g5b-seo-meta-panel__hint">순위체크 등록은 글 저장 후 가능합니다.</p>';
                    }
                    root.innerHTML += html;
                    root.querySelectorAll('[data-keyword]').forEach(function(chip) {
                        chip.addEventListener('click', function() { appendKeyword(chip.getAttribute('data-keyword')); });
                    });
                    var rankBtn = document.getElementById('g5b_rank_register_btn');
                    if (rankBtn) {
                        rankBtn.addEventListener('click', function() {
                            var fdRank = new FormData();
                            fdRank.append('action', 'rank_register');
                            fdRank.append('bo_table', boTable);
                            fdRank.append('wr_id', String(wrId));
                            fdRank.append('keywords', list.map(function(item) { return item.keyword || ''; }).filter(Boolean).join("\n"));
                            status.textContent = '순위체크 키워드 등록 중…';
                            fetch(actionUrl, { method: 'POST', body: fdRank, credentials: 'same-origin' })
                                .then(function(r) { return r.json(); })
                                .then(function(rankRes) { status.textContent = rankRes.ok ? '순위체크 키워드 등록 완료' : (rankRes.error || '등록 실패'); });
                        });
                    }
                    status.textContent = '키워드 추천 완료';
                })
                .catch(function() { keywordBtn.disabled = false; status.textContent = '네트워크 오류'; });
        });
    }

    var internalLinksBtn = document.getElementById('g5b_seo_internal_links_btn');
    if (internalLinksBtn) {
        internalLinksBtn.addEventListener('click', function() {
            var status = document.getElementById('g5b_seo_ai_status');
            status.textContent = 'iCRM에서 내부링크 추천 중…';
            internalLinksBtn.disabled = true;
            var fd = currentSeoPayload('ai_internal_links');
            fd.append('bo_table', boTable);
            fd.append('wr_id', String(wrId));
            fd.append('board_name', <?php echo json_encode(isset($board['bo_subject']) ? get_text($board['bo_subject']) : '', JSON_UNESCAPED_UNICODE); ?>);
            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    internalLinksBtn.disabled = false;
                    if (!res.ok) { status.textContent = res.error || '내부링크 추천 실패'; return; }
                    var list = (res.data && res.data.links) ? res.data.links : [];
                    var root = assistRoot('내부링크 추천');
                    var html = '<p class="g5b-seo-meta-panel__hint">후보 ' + esc(res.data.candidate_count || 0) + '건 중 ' + list.length + '개 추천 · 삽입 후 문맥에 맞게 수정하세요.</p>';
                    if (!list.length) {
                        html += '<p class="g5b-seo-meta-panel__hint">추천할 링크가 없습니다.</p>';
                    }
                    list.forEach(function(item, idx) {
                        html += '<div class="g5b-seo-assist__link-row">'
                            + '<div class="g5b-seo-assist__link-meta"><strong>' + esc(item.anchor_text || '') + '</strong><br>'
                            + '<span class="g5b-seo-meta-panel__hint">' + esc(item.url || '') + '</span>'
                            + (item.reason ? ('<br><span class="g5b-seo-meta-panel__hint">' + esc(item.reason) + '</span>') : '')
                            + (item.context_hint ? ('<br><span class="g5b-seo-meta-panel__hint">위치: ' + esc(item.context_hint) + '</span>') : '')
                            + '</div>'
                            + '<button type="button" class="btn btn-outline g5b-internal-link-insert" data-index="' + idx + '">본문 삽입</button>'
                            + '</div>';
                    });
                    if (list.length) {
                        html += '<div class="g5b-seo-assist__actions"><button type="button" class="btn btn-outline" id="g5b_internal_links_insert_all">전체 본문 하단 삽입</button></div>';
                    }
                    root.innerHTML += html;
                    root.querySelectorAll('.g5b-internal-link-insert').forEach(function(btn) {
                        btn.addEventListener('click', function() {
                            var idx = parseInt(btn.getAttribute('data-index'), 10);
                            if (insertInternalLink(list[idx], true)) {
                                status.textContent = '내부링크를 본문에 삽입했습니다.';
                            }
                        });
                    });
                    var insertAllBtn = document.getElementById('g5b_internal_links_insert_all');
                    if (insertAllBtn) {
                        insertAllBtn.addEventListener('click', function() {
                            insertAllInternalLinks(list);
                            status.textContent = '추천 내부링크 ' + list.length + '개를 본문 하단에 삽입했습니다.';
                        });
                    }
                    status.textContent = '내부링크 추천 완료';
                })
                .catch(function() { internalLinksBtn.disabled = false; status.textContent = '네트워크 오류'; });
        });
    }

    var faqBtn = document.getElementById('g5b_seo_faq_btn');
    if (faqBtn) {
        faqBtn.addEventListener('click', function() {
            var status = document.getElementById('g5b_seo_ai_status');
            status.textContent = 'FAQ 생성 중… (강화 모드)';
            faqBtn.disabled = true;
            var fd = new FormData();
            fd.append('action', 'ai_faq');
            fd.append('type', aiType);
            fd.append('key', aiKey);
            fd.append('count', '6');
            fd.append('subject', getSubject());
            fd.append('content', getContent());
            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    faqBtn.disabled = false;
                    if (!res.ok) { status.textContent = res.error || 'FAQ 생성 실패'; return; }
                    fillFaq((res.data && res.data.faq) ? res.data.faq : []);
                    status.textContent = 'FAQ ' + ((res.data && res.data.faq) ? res.data.faq.length : 0) + '개 생성 — 저장 후 반영됩니다.';
                })
                .catch(function() { faqBtn.disabled = false; status.textContent = '네트워크 오류'; });
        });
    }

    var altBtn = document.getElementById('g5b_seo_alt_btn');
    if (altBtn) {
        altBtn.addEventListener('click', function() {
            var status = document.getElementById('g5b_seo_ai_status');
            status.textContent = '이미지 ALT 생성 중…';
            altBtn.disabled = true;
            var files = collectFileMeta();
            var fd = new FormData();
            fd.append('action', 'ai_image_alt');
            fd.append('subject', getSubject());
            fd.append('content', getContent());
            fd.append('bo_table', boTable);
            fd.append('wr_id', String(wrId));
            if (canSaveAlt) fd.append('save', '1');
            files.names.forEach(function(n, i) {
                fd.append('file_names[]', n);
                fd.append('file_alts[]', files.alts[i] || '');
            });
            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    altBtn.disabled = false;
                    if (!res.ok) { status.textContent = res.error || 'ALT 생성 실패'; return; }
                    var d = res.data || {};
                    if (d.content) setContent(d.content);
                    if (d.file_alts && d.file_alts.length) {
                        var altInputs = document.querySelectorAll('input[name="bf_content[]"]');
                        d.file_alts.forEach(function(alt, i) {
                            if (altInputs[i]) altInputs[i].value = alt;
                        });
                    }
                    status.textContent = canSaveAlt
                        ? 'ALT 생성·저장 완료 (첨부 설명 + 본문 img)'
                        : 'ALT 생성 완료 — 글 저장 시 첨부 설명도 함께 저장하세요.';
                })
                .catch(function() { altBtn.disabled = false; status.textContent = '네트워크 오류'; });
        });
    }

    var checklistBtn = document.getElementById('g5b_seo_checklist_btn');
    if (checklistBtn) {
        checklistBtn.addEventListener('click', function() {
            var status = document.getElementById('g5b_seo_ai_status');
            status.textContent = 'iCRM에서 발행 체크리스트 확인 중…';
            checklistBtn.disabled = true;
            fetch(actionUrl, { method: 'POST', body: currentSeoPayload('ai_publish_checklist'), credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    checklistBtn.disabled = false;
                    if (!res.ok) { status.textContent = res.error || '체크리스트 실패'; return; }
                    var d = res.data || {};
                    var root = assistRoot('4. 발행 전 체크리스트');
                    var html = d.summary ? '<p>' + esc(d.summary) + '</p>' : '';
                    if (d.items && d.items.length) {
                        html += '<ul class="g5b-seo-assist__list">';
                        d.items.forEach(function(item) {
                            html += '<li><strong>' + esc(item.status || '') + '</strong> ' + esc(item.label || '') + (item.action ? ' — ' + esc(item.action) : '') + '</li>';
                        });
                        html += '</ul>';
                    }
                    root.innerHTML += html;
                    status.textContent = '발행 체크리스트 확인 완료';
                })
                .catch(function() { checklistBtn.disabled = false; status.textContent = '네트워크 오류'; });
        });
    }
})();
</script>
