<?php
/**
 * 게시글 AI 초안 작성 (관리자 글쓰기)
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

$g5b_ai_action_url = G5_PLUGIN_URL . '/seo_meta/admin/action.php';
$g5b_ai_board_name = isset($board['bo_subject']) ? get_text($board['bo_subject']) : '';
?>

<div class="board-write-form__row write_div g5b-ai-draft-panel" id="g5b_ai_draft_panel">
    <h3 class="board-write-form__label">AI 글 초안 작성</h3>
    <p class="g5b-ai-draft-panel__hint">주제와 키워드를 입력하면 제목·본문 초안을 생성합니다. 생성 후 내용을 확인·수정한 뒤 저장하세요.</p>

    <div class="g5b-ai-draft-panel__grid">
        <div class="g5b-ai-draft-panel__field">
            <label for="g5b_ai_topic">글 주제 <strong class="required">필수</strong></label>
            <input type="text" id="g5b_ai_topic" class="frm_input full_input" placeholder="예: 강남 피부과 여드름 흉터 치료 안내">
        </div>
        <div class="g5b-ai-draft-panel__field">
            <label for="g5b_ai_keywords">추가 키워드</label>
            <input type="text" id="g5b_ai_keywords" class="frm_input full_input" placeholder="쉼표로 구분 (예: 레이저, 흉터, 상담)">
        </div>
        <div class="g5b-ai-draft-panel__field g5b-ai-draft-panel__field--half">
            <label for="g5b_ai_tone">톤</label>
            <select id="g5b_ai_tone" class="frm_input">
                <option value="professional">전문적</option>
                <option value="friendly">친근한</option>
                <option value="informative">정보 전달</option>
            </select>
        </div>
        <div class="g5b-ai-draft-panel__field g5b-ai-draft-panel__field--half">
            <label for="g5b_ai_length">분량</label>
            <select id="g5b_ai_length" class="frm_input">
                <option value="short">짧게 (400~600자)</option>
                <option value="medium" selected>보통 (800~1200자)</option>
                <option value="long">길게 (1500~2000자)</option>
            </select>
        </div>
    </div>

    <div class="g5b-ai-draft-panel__actions">
        <button type="button" class="btn btn-outline" id="g5b_ai_draft_btn">AI 초안 생성</button>
        <span class="g5b-ai-draft-panel__status" id="g5b_ai_draft_status" aria-live="polite"></span>
    </div>
</div>

<style>
.g5b-ai-draft-panel { margin: 1rem 0; padding: 1rem; border: 1px solid #dbeafe; border-radius: 8px; background: #eff6ff; }
.g5b-ai-draft-panel__hint { margin: 0 0 1rem; font-size: 0.875rem; color: #64748b; }
.g5b-ai-draft-panel__grid { display: grid; gap: 0.75rem; }
.g5b-ai-draft-panel__field label { display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem; }
.g5b-ai-draft-panel__field--half { display: inline-block; width: calc(50% - 0.5rem); vertical-align: top; }
.g5b-ai-draft-panel__actions { margin-top: 0.75rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.g5b-ai-draft-panel__status { font-size: 0.875rem; color: #2563eb; }
</style>

<script>
(function() {
    var btn = document.getElementById('g5b_ai_draft_btn');
    if (!btn) return;

    btn.addEventListener('click', function() {
        var status = document.getElementById('g5b_ai_draft_status');
        var topic = document.getElementById('g5b_ai_topic').value.trim();
        if (!topic) {
            status.textContent = '글 주제를 입력해 주세요.';
            return;
        }

        status.textContent = 'AI 초안 생성 중… (20~40초)';
        btn.disabled = true;

        var fd = new FormData();
        fd.append('action', 'ai_draft');
        fd.append('topic', topic);
        fd.append('keywords', document.getElementById('g5b_ai_keywords').value);
        fd.append('tone', document.getElementById('g5b_ai_tone').value);
        fd.append('length', document.getElementById('g5b_ai_length').value);
        fd.append('board_name', <?php echo json_encode($g5b_ai_board_name, JSON_UNESCAPED_UNICODE); ?>);

        fetch(<?php echo json_encode($g5b_ai_action_url); ?>, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                btn.disabled = false;
                if (!res.ok) {
                    status.textContent = res.error || '생성 실패';
                    return;
                }
                var d = res.data || {};
                var subjectEl = document.getElementById('wr_subject');
                if (d.subject && subjectEl) {
                    subjectEl.value = d.subject;
                    subjectEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (d.content) {
                    if (typeof ed_wr_content !== 'undefined' && ed_wr_content && typeof ed_wr_content.setContents === 'function') {
                        ed_wr_content.setContents(d.content);
                    } else {
                        var contentEl = document.getElementById('wr_content');
                        if (contentEl) contentEl.value = d.content;
                    }
                }
                status.textContent = '초안 생성 완료 — 내용 확인 후 저장하세요.';
            })
            .catch(function() {
                btn.disabled = false;
                status.textContent = '네트워크 오류';
            });
    });
})();
</script>
