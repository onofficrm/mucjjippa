<?php
if (!defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

$tab = isset($publish_tab) ? (string) $publish_tab : 'drafts';
$items = isset($publish_history_items) && is_array($publish_history_items) ? $publish_history_items : array();
$history_total = isset($publish_history_total) ? (int) $publish_history_total : count($items);
$is_drafts = ($tab === 'drafts');
?>
<section class="icrm-member-publish-history">
    <header class="icrm-member-publish-history__head">
        <h2 class="icrm-member-publish-history__title"><?php echo $is_drafts ? '내 초안' : '발행 완료'; ?></h2>
        <p class="icrm-member-publish-history__sub">
            <?php if ($is_drafts) { ?>
            저장만 하고 발행하지 않은 글입니다. 「이어서 작성」으로 편집을 계속할 수 있습니다.
            <?php } else { ?>
            회원 포털에서 발행한 글 목록입니다.
            <?php } ?>
        </p>
    </header>

    <?php if ($items === array()) { ?>
    <p class="icrm-member-publish-history__empty">
        <?php echo $is_drafts ? '저장된 초안이 없습니다.' : '아직 발행한 글이 없습니다.'; ?>
        <a href="<?php echo icrm_member_h(icrm_member_url(array('m' => 'publish', 'tab' => 'write'))); ?>">새 글 작성</a>
    </p>
    <?php } else { ?>
    <ul class="icrm-member-publish-history__list">
        <?php foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $ici_id = (int) ($item['ici_id'] ?? 0);
            $subject = (string) ($item['subject'] ?? '');
            $bo_table = (string) ($item['bo_table'] ?? '');
            $bo_label = $bo_table;
            if ($bo_table !== '' && isset($publish_board_labels[$bo_table])) {
                $bo_label = (string) $publish_board_labels[$bo_table];
            }
            $when = $is_drafts
                ? (string) ($item['updated_at'] ?: $item['created_at'])
                : (string) ($item['published_at'] ?: $item['updated_at']);
            $post_url = function_exists('icrm_content_member_item_post_url')
                ? icrm_content_member_item_post_url($item)
                : '';
            $edit_url = function_exists('icrm_content_member_item_edit_url')
                ? icrm_content_member_item_edit_url($item)
                : '';
            ?>
        <li class="icrm-member-publish-history__item">
            <div class="icrm-member-publish-history__body">
                <strong><?php echo icrm_member_h($subject !== '' ? $subject : '(제목 없음)'); ?></strong>
                <span class="icrm-member-publish-history__meta">
                    <?php if ($bo_label !== '') { ?>
                    <code><?php echo icrm_member_h($bo_label); ?></code> ·
                    <?php } ?>
                    <?php echo icrm_member_h($when); ?>
                </span>
            </div>
            <div class="icrm-member-publish-history__actions">
                <?php if ($is_drafts) { ?>
                <a class="icc-btn icc-btn--sm icc-btn--primary" href="<?php echo icrm_member_h(icrm_member_url(array('m' => 'publish', 'tab' => 'write', 'ici_id' => $ici_id))); ?>">이어서 작성</a>
                <button type="button" class="icc-btn icc-btn--sm icrm-member-draft-delete" data-ici-id="<?php echo (int) $ici_id; ?>">삭제</button>
                <?php } else { ?>
                <?php if ($edit_url !== '') { ?>
                <a class="icc-btn icc-btn--sm icc-btn--primary" href="<?php echo icrm_member_h($edit_url); ?>">수정</a>
                <?php } ?>
                <?php if ($post_url !== '') { ?>
                <a class="icc-btn icc-btn--sm icc-btn--primary" href="<?php echo icrm_member_h($post_url); ?>" target="_blank" rel="noopener">글 보기</a>
                <?php } ?>
                <?php } ?>
            </div>
        </li>
        <?php } ?>
    </ul>
    <?php if ($history_total > count($items)) { ?>
    <p class="icrm-member-publish-history__more">최근 <?php echo count($items); ?>건만 표시 · 전체 <?php echo (int) $history_total; ?>건</p>
    <?php } ?>
    <?php } ?>
</section>

<script>
(function() {
    var actionUrl = <?php echo json_encode(icrm_member_action_url()); ?>;
    document.querySelectorAll('.icrm-member-draft-delete').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var iciId = btn.getAttribute('data-ici-id');
            if (!iciId || !confirm('이 초안을 삭제할까요?')) return;
            var fd = new FormData();
            fd.append('action', 'compose_delete');
            fd.append('ici_id', iciId);
            btn.disabled = true;
            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    if (!res.ok) throw new Error(res.message || res.error || '삭제 실패');
                    location.reload();
                })
                .catch(function(err) {
                    alert(err.message || '삭제 실패');
                    btn.disabled = false;
                });
        });
    });
})();
</script>
