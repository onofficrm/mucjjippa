<?php
if (!defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

global $member;

if (function_exists('icrm_member_board_bootstrap_existing')) {
    icrm_member_board_bootstrap_existing(!empty($member['mb_id']) ? (string) $member['mb_id'] : '');
}

$templates = icrm_member_board_templates();
$boards = icrm_member_board_list_for_design(!empty($member['mb_id']) ? (string) $member['mb_id'] : '');
$action_url = icrm_member_action_url();
$hub_url = G5_PLUGIN_URL . '/icrm_hub/admin/index.php';
?>
<div class="icc-module icrm-board-design">
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800">게시판 디자인 관리</h2>
    <p class="icc-muted" style="margin:0 0 20px;line-height:1.65">
        생성된 게시판별로 디자인을 매핑합니다. 게시판목록·글쓰기·수정하기를 한 세트로 미리 본 뒤 변경된 게시판만 적용할 수 있습니다.
    </p>

    <?php if ($boards === array()) { ?>
    <p class="icc-muted" style="margin:0 0 16px;line-height:1.65">
        아직 생성된 게시판이 없습니다. 그누보드 관리자에서 게시판을 먼저 만든 뒤 디자인을 선택할 수 있습니다.
    </p>
    <a class="icc-btn icc-btn--primary" href="<?php echo icrm_member_h($hub_url); ?>">iCRM AI 관리로 이동</a>
    <?php if (function_exists('icrm_member_can_update') && icrm_member_can_update()) { ?>
    <p class="icc-muted" style="margin:16px 0 0;line-height:1.6;font-size:13px">
      게시판이 관리자에 있는데 목록이 비어 있으면 <a href="<?php echo icrm_member_h(icrm_member_url('update')); ?>">사이트 업데이트</a>를 먼저 적용해 주세요.
    </p>
    <?php } ?>
    <?php } else { ?>
    <p class="icc-muted" style="margin:0 0 16px;line-height:1.65;font-size:13px">
        그누보드에 이미 있는 게시판도 자동으로 표시됩니다. iCRM 연결 없이 디자인만 바로 적용할 수 있습니다.
    </p>

    <form id="icrm-board-design-form" autocomplete="off">
        <div class="icrm-board-design-list">
            <?php foreach ($boards as $row) {
                $bt = (string) ($row['bo_table'] ?? '');
                $subject = (string) ($row['bo_subject'] ?? $bt);
                $template = (string) ($row['template'] ?? 'column');
                $skin = (string) ($row['bo_skin'] ?? '');
                $linked = !empty($row['linked']);
                ?>
            <article class="icrm-board-design-item" data-bo-table="<?php echo icrm_member_h($bt); ?>" data-initial-template="<?php echo icrm_member_h($template); ?>">
                <div class="icrm-board-design-item__head">
                    <div>
                        <strong><?php echo icrm_member_h($subject); ?></strong>
                        <span class="icrm-board-design-item__meta">
                            <code><?php echo icrm_member_h($bt); ?></code>
                            · 현재 스킨 <code><?php echo icrm_member_h($skin !== '' ? $skin : '-'); ?></code>
                            <?php if ($linked) { ?>
                            · <span style="color:#0f766e">iCRM 연결됨</span>
                            <?php } else { ?>
                            · <span style="color:#64748b">기존 게시판</span>
                            <?php } ?>
                        </span>
                    </div>
                    <label class="icrm-board-design-item__check">
                        <input type="checkbox" class="icrm-board-design-apply-check" value="1">
                        적용 대상
                    </label>
                </div>
                <div class="icrm-board-design-item__body">
                    <div class="icrm-field" style="margin:0">
                        <label for="bd_template_<?php echo icrm_member_h($bt); ?>">디자인 템플릿</label>
                        <select id="bd_template_<?php echo icrm_member_h($bt); ?>" class="icrm-board-design-template" data-bo-table="<?php echo icrm_member_h($bt); ?>">
                            <?php foreach ($templates as $key => $tpl) {
                                $selected = ($key === $template) ? ' selected' : '';
                                ?>
                            <option value="<?php echo icrm_member_h($key); ?>"<?php echo $selected; ?>><?php echo icrm_member_h($tpl['label']); ?></option>
                            <?php } ?>
                        </select>
                    </div>
                    <div class="icrm-board-design-item__actions">
                        <?php if (!empty($row['list_url'])) { ?>
                        <a class="icc-btn icc-btn--sm" href="<?php echo icrm_member_h($row['list_url']); ?>" target="_blank" rel="noopener">목록 미리보기</a>
                        <?php } ?>
                        <?php if (!empty($row['write_url'])) { ?>
                        <a class="icc-btn icc-btn--sm" href="<?php echo icrm_member_h($row['write_url']); ?>" target="_blank" rel="noopener">글쓰기 미리보기</a>
                        <?php } ?>
                    </div>
                </div>
            </article>
            <?php } ?>
        </div>

        <div class="icrm-board-design-form-actions" style="margin-top:20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">
            <button type="button" class="icc-btn icc-btn--primary" id="icrm-board-design-apply">변경된 게시판만 적용</button>
            <button type="button" class="icc-btn" id="icrm-board-design-apply-all">전체 게시판 적용</button>
            <button type="button" class="icc-btn" id="icrm-board-design-apply-defaults">기본 게시판 스킨 일괄 적용</button>
            <a class="icc-btn" href="<?php echo icrm_member_h($hub_url); ?>">iCRM AI 관리로 이동</a>
        </div>
        <p class="icp-msg" id="icrm_board_design_msg" role="status" style="margin-top:12px"></p>
    </form>
    <?php } ?>
</div>

<style>
.icrm-board-design-list { display: grid; gap: 14px; }
.icrm-board-design-item {
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #fff;
    padding: 16px 18px;
}
.icrm-board-design-item.is-changed {
    border-color: #99f6e4;
    box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.08);
}
.icrm-board-design-item__head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 14px;
}
.icrm-board-design-item__meta {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    color: #64748b;
    line-height: 1.6;
}
.icrm-board-design-item__check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #334155;
    white-space: nowrap;
}
.icrm-board-design-item__body {
    display: grid;
    gap: 12px;
}
@media (min-width: 720px) {
    .icrm-board-design-item__body {
        grid-template-columns: minmax(220px, 280px) 1fr;
        align-items: end;
    }
}
.icrm-board-design-item__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
</style>

<script>
(function () {
    var form = document.getElementById('icrm-board-design-form');
    if (!form) return;

  var applyBtn = document.getElementById('icrm-board-design-apply');
  var applyAllBtn = document.getElementById('icrm-board-design-apply-all');
  var applyDefaultsBtn = document.getElementById('icrm-board-design-apply-defaults');
    var msg = document.getElementById('icrm_board_design_msg');
    var actionUrl = <?php echo json_encode($action_url); ?>;

    function markChanged(item) {
        var initial = item.getAttribute('data-initial-template') || '';
        var select = item.querySelector('.icrm-board-design-template');
        var check = item.querySelector('.icrm-board-design-apply-check');
        var changed = select && select.value !== initial;
        item.classList.toggle('is-changed', !!changed);
        if (check && changed) {
            check.checked = true;
        }
    }

    form.querySelectorAll('.icrm-board-design-item').forEach(function (item) {
        var select = item.querySelector('.icrm-board-design-template');
        if (!select) return;
        select.addEventListener('change', function () {
            markChanged(item);
        });
        markChanged(item);
    });

    function collectBoards(onlyChanged) {
        var boards = [];
        form.querySelectorAll('.icrm-board-design-item').forEach(function (item) {
            var select = item.querySelector('.icrm-board-design-template');
            var check = item.querySelector('.icrm-board-design-apply-check');
            if (!select) return;
            var initial = item.getAttribute('data-initial-template') || '';
            var changed = select.value !== initial;
            if (onlyChanged && !changed && !(check && check.checked)) {
                return;
            }
            if (!onlyChanged || changed || (check && check.checked)) {
                boards.push({
                    bo_table: item.getAttribute('data-bo-table') || '',
                    template: select.value
                });
            }
        });
        return boards;
    }

    function submitBoards(boards, label) {
        if (!boards.length) {
            if (msg) {
                msg.textContent = '적용할 게시판을 선택하거나 템플릿을 변경해 주세요.';
                msg.className = 'icp-msg is-err';
            }
            return;
        }
        if (!window.confirm(label + ' (' + boards.length + '개)')) return;

        if (applyBtn) applyBtn.disabled = true;
        if (applyAllBtn) applyAllBtn.disabled = true;
        if (applyDefaultsBtn) applyDefaultsBtn.disabled = true;
        if (msg) {
            msg.textContent = '적용 중…';
            msg.className = 'icp-msg';
        }

        var fd = new FormData();
        fd.append('action', 'board_design_apply');
        fd.append('boards', JSON.stringify(boards));

        fetch(actionUrl, { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.ok) throw new Error(data.error || (data.result && data.result.message) || '실패');
                if (msg) {
                    msg.textContent = (data.result && data.result.message) || '완료';
                    msg.className = 'icp-msg is-ok';
                }
                setTimeout(function () { location.reload(); }, 900);
            })
            .catch(function (err) {
                if (applyBtn) applyBtn.disabled = false;
                if (applyAllBtn) applyAllBtn.disabled = false;
                if (applyDefaultsBtn) applyDefaultsBtn.disabled = false;
                if (msg) {
                    msg.textContent = err.message || '요청 실패';
                    msg.className = 'icp-msg is-err';
                }
            });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', function () {
            submitBoards(collectBoards(true), '변경된 게시판 디자인을 적용할까요');
        });
    }
    if (applyAllBtn) {
        applyAllBtn.addEventListener('click', function () {
            submitBoards(collectBoards(false), '모든 게시판 디자인을 적용할까요');
        });
    }
    if (applyDefaultsBtn) {
        applyDefaultsBtn.addEventListener('click', function () {
            if (!window.confirm('basic/gallery 등 기본 스킨 게시판에 온오프 디자인을 일괄 적용할까요?')) return;
            applyDefaultsBtn.disabled = true;
            if (msg) { msg.textContent = '적용 중…'; msg.className = 'icp-msg'; }
            var fd = new FormData();
            fd.append('action', 'board_design_apply_defaults');
            fetch(actionUrl, { method: 'POST', credentials: 'same-origin', body: fd })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (!data.ok) throw new Error(data.error || (data.result && data.result.message) || '실패');
                    if (msg) {
                        msg.textContent = (data.result && data.result.message) || '완료';
                        msg.className = 'icp-msg is-ok';
                    }
                    setTimeout(function () { location.reload(); }, 900);
                })
                .catch(function (err) {
                    applyDefaultsBtn.disabled = false;
                    if (msg) {
                        msg.textContent = err.message || '요청 실패';
                        msg.className = 'icp-msg is-err';
                    }
                });
        });
    }
})();
</script>
