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
    icrm_admin_redirect_to_hub('rank');
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}

include_once G5_LIB_PATH . '/icrm-rank.lib.php';
icrm_rank_bootstrap();

$tab = isset($_GET['tab']) ? preg_replace('/[^a-z_]/', '', $_GET['tab']) : 'dashboard';
if ($tab === 'settings') {
    $tab = 'dashboard';
}
$filter_bo = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['bo_table']) : '';
$filter_type = isset($_GET['filter']) ? preg_replace('/[^a-z_]/', '', $_GET['filter']) : 'all';
$detail_bo = isset($_GET['detail_bo']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['detail_bo']) : '';
$detail_wr = isset($_GET['detail_wr']) ? (int) $_GET['detail_wr'] : 0;

$action_url = G5_PLUGIN_URL . '/rank_check/admin/action.php';
$stats = icrm_rank_get_dashboard_stats();

function icrk_h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function icrk_rank_badge($row, $engine)
{
    if (!$row) {
        return '<span class="icrk-badge icrk-badge--muted">-</span>';
    }

    $rank = (int) $row['rank_pos'];
    $delta = icrm_rank_rank_delta($rank, (int) $row['rank_prev']);
    $label = icrm_rank_rank_label($rank, $row['status']);
    $class = 'icrk-badge';
    if ($rank > 0 && $rank <= 10) {
        $class .= ' icrk-badge--good';
    } elseif ($rank <= 0) {
        $class .= ' icrk-badge--muted';
    }

    $html = '<span class="' . $class . '">' . icrk_h($label) . '</span>';
    if ($delta > 0) {
        $html .= ' <span class="icrk-delta icrk-delta--up">▲' . (int) $delta . '</span>';
    } elseif ($delta < 0) {
        $html .= ' <span class="icrk-delta icrk-delta--down">▼' . abs((int) $delta) . '</span>';
    }

    return $html;
}

$boards = array();
$board_res = sql_query(" select bo_table, bo_subject from {$g5['board_table']} order by bo_table ");
while ($b = sql_fetch_array($board_res)) {
    $boards[] = $b;
}

$posts_data = icrm_rank_fetch_posts($filter_bo, isset($_GET['page']) ? (int) $_GET['page'] : 1, 30, $filter_type);
$detail = null;
if ($tab === 'detail' && $detail_bo !== '' && $detail_wr > 0) {
    $detail = icrm_rank_get_post_detail($detail_bo, $detail_wr);
}
?>
<style>
<?php if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) { ?>
:root{--icrk-bg:var(--icrm-canvas);--icrk-panel:var(--icrm-surface);--icrk-top:var(--icrm-text);--icrk-accent:var(--icrm-accent);--icrk-accent-soft:var(--icrm-accent-soft);--icrk-border:var(--icrm-border);--icrk-muted:var(--icrm-muted);--icrk-good:var(--icrm-success);--icrk-bad:#dc2626}
<?php } else { ?>
:root{--icrk-bg:#eef2f7;--icrk-panel:#fff;--icrk-top:#1e293b;--icrk-accent:#2563eb;--icrk-accent-soft:#dbeafe;--icrk-border:#d7dee8;--icrk-muted:#64748b;--icrk-good:#15803d;--icrk-bad:#dc2626}
<?php } ?>
<?php if (!defined('ICRM_HUB_ACTIVE')) { ?>
*{box-sizing:border-box}
body{margin:0;background:var(--icrk-bg);color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Malgun Gothic',sans-serif;font-size:14px;line-height:1.5}
a{color:var(--icrk-accent);text-decoration:none}
.icrk-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 24px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;box-shadow:0 2px 12px rgba(15,23,42,.18)}
.icrk-top__brand h1{margin:0;font-size:20px;font-weight:700}
.icrk-top__brand p{margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.72)}
.icrk-top__meta{text-align:right;font-size:12px;color:rgba(255,255,255,.85)}
.icrk-wrap{padding:20px 0 40px}
.icrk-container{max-width:1480px;margin:0 auto;padding:0 18px}
.icrk-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.icrk-tabs a{display:inline-block;padding:10px 14px;border:1px solid var(--icrk-border);background:var(--icrk-panel);color:#334155;border-radius:8px;font-weight:600}
.icrk-tabs a.on{background:var(--icrk-top);color:#fff;border-color:var(--icrk-top)}
<?php } ?>
.icrk-panel{background:var(--icrk-panel);border:1px solid var(--icrk-border);border-radius:12px;padding:20px;box-shadow:0 8px 24px rgba(15,23,42,.04)}
.icrk-help{margin:0 0 14px;color:var(--icrk-muted)}
.icrk-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
.icrk-card{padding:16px;border:1px solid var(--icrk-border);border-radius:10px;background:#f8fafc}
.icrk-card strong{display:block;font-size:12px;color:var(--icrk-muted);margin-bottom:6px}
.icrk-card span{font-size:26px;font-weight:700;color:#0f172a}
.icrk-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 16px}
.icrk-input,.icrk-select{padding:8px 10px;border:1px solid var(--icrk-border);border-radius:8px;background:#fff;font:inherit}
.icrk-btn{display:inline-block;padding:9px 14px;border:0;border-radius:8px;background:var(--icrk-accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}
.icrk-btn:hover{filter:brightness(.95)}
.icrk-btn--light{background:#fff;color:#334155;border:1px solid var(--icrk-border)}
.icrk-btn--danger{background:#dc2626}
.icrk-table{width:100%;border-collapse:collapse}
.icrk-table th,.icrk-table td{padding:11px 10px;border-bottom:1px solid #e8edf3;text-align:left;vertical-align:middle}
.icrk-table th{font-size:12px;color:var(--icrk-muted);background:#f8fafc}
.icrk-table tr:hover td{background:#fbfdff}
.icrk-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;background:var(--icrk-accent-soft);color:var(--icrk-accent)}
.icrk-badge--good{background:#dcfce7;color:var(--icrk-good)}
.icrk-badge--muted{background:#e2e8f0;color:#64748b}
.icrk-delta{font-size:11px;font-weight:700;margin-left:4px}
.icrk-delta--up{color:var(--icrk-good)}
.icrk-delta--down{color:var(--icrk-bad)}
.icrk-msg{margin-left:8px;color:var(--icrk-accent);font-size:13px}
.icrk-muted{color:var(--icrk-muted)}
.icrk-subject{font-weight:600;color:#0f172a}
.icrk-kw{display:block;font-size:12px;color:var(--icrk-muted);margin-top:4px;white-space:pre-line}
.icrk-detail-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:18px}
.icrk-textarea{width:100%;min-height:120px;padding:10px;border:1px solid var(--icrk-border);border-radius:8px;font:inherit;resize:vertical}
.icrk-suggest{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}
.icrk-chip{display:inline-block;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;cursor:pointer;border:1px solid #bfdbfe}
.icrk-history{max-height:320px;overflow:auto;border:1px solid var(--icrk-border);border-radius:8px}
@media (max-width:980px){.icrk-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.icrk-detail-grid{grid-template-columns:1fr}}
</style>

<?php
if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) {
    icrm_admin_subnav_open();
} else {
    echo '<nav class="icrk-tabs" aria-label="순위체크 메뉴">';
}
?>
    <a href="<?php echo icrk_h(icrm_admin_page_url('rank', array('tab' => 'dashboard'))); ?>" class="<?php echo $tab === 'dashboard' ? 'is-active on' : ''; ?>">대시보드</a>
    <a href="<?php echo icrk_h(icrm_admin_page_url('rank', array('tab' => 'posts'))); ?>" class="<?php echo $tab === 'posts' ? 'is-active on' : ''; ?>">게시글 순위</a>
<?php
if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) {
    icrm_admin_subnav_close();
} else {
    echo '</nav>';
}
?>

<?php if ($tab === 'dashboard') { ?>
<section class="icrk-panel">
    <p class="icrk-help">iCRM 중앙 API가 네이버·구글 순위를 수집하고, 이 화면에는 결과만 표시합니다. 게시글마다 키워드를 등록한 뒤 순위체크를 실행하세요.</p>
    <div class="icrk-grid">
        <div class="icrk-card"><strong>등록 게시글</strong><span><?php echo number_format($stats['targets_total']); ?></span></div>
        <div class="icrk-card"><strong>활성 추적</strong><span><?php echo number_format($stats['targets_enabled']); ?></span></div>
        <div class="icrk-card"><strong>미체크</strong><span><?php echo number_format($stats['never_checked']); ?></span></div>
        <div class="icrk-card"><strong>오늘 체크</strong><span><?php echo number_format($stats['checked_today']); ?></span></div>
    </div>
    <div class="icrk-toolbar">
        <a class="icrk-btn" href="<?php echo icrk_h(icrm_admin_page_url('rank', array('tab' => 'posts'))); ?>">게시글 목록</a>
        <button type="button" class="icrk-btn icrk-btn--light" id="icrk_run_all">전체 활성 글 순위체크</button>
        <span class="icrk-msg" id="icrk_dashboard_msg"></span>
    </div>
</section>

<?php } elseif ($tab === 'posts') { ?>
<section class="icrk-panel">
    <form method="get" action="<?php echo icrk_h(icrm_admin_page_url('rank')); ?>" class="icrk-toolbar">
        <input type="hidden" name="m" value="rank">
        <input type="hidden" name="tab" value="posts">
        <select name="bo_table" class="icrk-select">
            <option value="">전체 게시판</option>
            <?php foreach ($boards as $b) {
                $sel = $filter_bo === $b['bo_table'] ? ' selected' : '';
                echo '<option value="' . icrk_h($b['bo_table']) . '"' . $sel . '>' . icrk_h($b['bo_table'] . ' — ' . $b['bo_subject']) . '</option>';
            } ?>
        </select>
        <select name="filter" class="icrk-select">
            <?php
            $filters = array('all' => '전체', 'tracked' => '추적 중', 'unchecked' => '미체크', 'top10' => '10위권', 'dropped' => '순위 하락');
            foreach ($filters as $k => $label) {
                $sel = $filter_type === $k ? ' selected' : '';
                echo '<option value="' . icrk_h($k) . '"' . $sel . '>' . icrk_h($label) . '</option>';
            }
            ?>
        </select>
        <button type="submit" class="icrk-btn icrk-btn--light">필터</button>
        <button type="button" class="icrk-btn" id="icrk_run_filtered">선택 필터 일괄체크</button>
        <span class="icrk-msg" id="icrk_posts_msg"></span>
    </form>

    <table class="icrk-table">
        <thead>
        <tr>
            <th><input type="checkbox" id="icrk_check_all"></th>
            <th>게시판</th>
            <th>글</th>
            <th>키워드</th>
            <th>네이버</th>
            <th>구글</th>
            <th>마지막 체크</th>
            <th>관리</th>
        </tr>
        </thead>
        <tbody>
        <?php if (empty($posts_data['items'])) { ?>
        <tr><td colspan="8" class="icrk-muted">표시할 게시글이 없습니다.</td></tr>
        <?php } else {
            foreach ($posts_data['items'] as $post) {
                $bo = $post['bo_table'];
                $wr = (int) $post['wr_id'];
                $detail_url = icrm_admin_page_url('rank', array(
                    'tab'       => 'detail',
                    'detail_bo' => $bo,
                    'detail_wr' => $wr,
                ));
                ?>
        <tr>
            <td><input type="checkbox" class="icrk-row-check" value="<?php echo $wr; ?>" data-bo="<?php echo icrk_h($bo); ?>"></td>
            <td><?php echo icrk_h($post['bo_table']); ?></td>
            <td>
                <a class="icrk-subject" href="<?php echo icrk_h($detail_url); ?>"><?php echo icrk_h(get_text(strip_tags($post['wr_subject']))); ?></a>
                <span class="icrk-muted">#<?php echo $wr; ?></span>
            </td>
            <td>
                <?php if (!empty($post['keyword_list'])) { ?>
                <span class="icrk-kw"><?php echo icrk_h(implode("\n", $post['keyword_list'])); ?></span>
                <?php } else { ?>
                <span class="icrk-muted">미등록</span>
                <?php } ?>
            </td>
            <td><?php echo icrk_rank_badge($post['naver'], 'naver'); ?></td>
            <td><?php echo icrk_rank_badge($post['google'], 'google'); ?></td>
            <td><?php echo !empty($post['last_checked_at']) && $post['last_checked_at'] !== '0000-00-00 00:00:00' ? icrk_h($post['last_checked_at']) : '<span class="icrk-muted">-</span>'; ?></td>
            <td>
                <a href="<?php echo icrk_h($detail_url); ?>">설정</a>
                <?php if ($post['tracked']) { ?>
                · <button type="button" class="icrk-btn icrk-btn--light icrk-run-one" data-bo="<?php echo icrk_h($bo); ?>" data-wr="<?php echo $wr; ?>">체크</button>
                <?php } ?>
            </td>
        </tr>
        <?php }
        } ?>
        </tbody>
    </table>
    <p class="icrk-muted">총 <?php echo number_format($posts_data['total']); ?>건</p>
</section>

<?php } elseif ($tab === 'detail' && is_array($detail) && !empty($detail['ok'])) {
    $write = $detail['write'];
    $target = $detail['target'];
    $keywords_text = $target ? icrm_rank_keywords_to_text($target['keywords']) : icrm_rank_keywords_to_text($detail['suggested']);
    ?>
<section class="icrk-panel">
    <p class="icrk-help">
        <a href="<?php echo icrk_h(icrm_admin_page_url('rank', array('tab' => 'posts'))); ?>">← 게시글 목록</a>
        · <?php echo icrk_h($detail_bo); ?> #<?php echo (int) $detail_wr; ?>
    </p>
    <h2 style="margin:0 0 8px;font-size:18px;"><?php echo icrk_h(get_text(strip_tags($write['wr_subject']))); ?></h2>
    <p class="icrk-muted">대상 URL: <a href="<?php echo icrk_h($detail['target_url']); ?>" target="_blank" rel="noopener"><?php echo icrk_h($detail['target_url']); ?></a></p>

    <div class="icrk-detail-grid">
        <div>
            <h3>키워드 설정</h3>
            <p class="icrk-help">한 줄에 키워드 1개 (최대 10개). iCRM API가 네이버·구글 순위를 수집합니다.</p>
            <?php if (!empty($detail['suggested'])) { ?>
            <div class="icrk-suggest" id="icrk_suggest">
                <?php foreach ($detail['suggested'] as $kw) {
                    echo '<span class="icrk-chip" data-kw="' . icrk_h($kw) . '">+ ' . icrk_h($kw) . '</span>';
                } ?>
            </div>
            <?php } ?>
            <form id="icrk_target_form">
                <input type="hidden" name="bo_table" value="<?php echo icrk_h($detail_bo); ?>">
                <input type="hidden" name="wr_id" value="<?php echo (int) $detail_wr; ?>">
                <textarea name="keywords" id="icrk_keywords" class="icrk-textarea" placeholder="강남 임플란트&#10;임플란트 비용"><?php echo icrk_h($keywords_text); ?></textarea>
                <div class="icrk-toolbar" style="margin-top:12px;">
                    <label><input type="checkbox" name="enabled" value="1" <?php echo (!$target || !empty($target['enabled'])) ? 'checked' : ''; ?>> 순위 추적 활성</label>
                    <button type="submit" class="icrk-btn">키워드 저장</button>
                    <button type="button" class="icrk-btn icrk-btn--light" id="icrk_run_detail">지금 순위체크</button>
                    <?php if ($target) { ?>
                    <button type="button" class="icrk-btn icrk-btn--danger" id="icrk_delete_target">추적 해제</button>
                    <?php } ?>
                    <span class="icrk-msg" id="icrk_detail_msg"></span>
                </div>
            </form>
        </div>
        <div>
            <h3>최근 결과</h3>
            <table class="icrk-table">
                <thead><tr><th>키워드</th><th>엔진</th><th>순위</th><th>URL</th><th>체크</th></tr></thead>
                <tbody>
                <?php if (empty($detail['latest'])) { ?>
                <tr><td colspan="5" class="icrk-muted">아직 결과가 없습니다.</td></tr>
                <?php } else {
                    foreach ($detail['latest'] as $row) { ?>
                <tr>
                    <td><?php echo icrk_h($row['keyword']); ?></td>
                    <td><?php echo icrk_h($row['engine']); ?></td>
                    <td><?php echo icrk_rank_badge($row, $row['engine']); ?></td>
                    <td><span class="icrk-muted" style="font-size:12px;word-break:break-all;"><?php echo icrk_h($row['matched_url']); ?></span></td>
                    <td><?php echo icrk_h($row['checked_at']); ?></td>
                </tr>
                <?php }
                } ?>
                </tbody>
            </table>
        </div>
    </div>

    <?php if (!empty($detail['history'])) { ?>
    <h3 style="margin-top:24px;">체크 이력</h3>
    <div class="icrk-history">
        <table class="icrk-table">
            <thead><tr><th>일시</th><th>키워드</th><th>엔진</th><th>순위</th><th>이전</th></tr></thead>
            <tbody>
            <?php foreach ($detail['history'] as $h) { ?>
            <tr>
                <td><?php echo icrk_h($h['checked_at']); ?></td>
                <td><?php echo icrk_h($h['keyword']); ?></td>
                <td><?php echo icrk_h($h['engine']); ?></td>
                <td><?php echo icrk_h(icrm_rank_rank_label((int) $h['rank_pos'], $h['status'])); ?></td>
                <td><?php echo (int) $h['rank_prev'] > 0 ? (int) $h['rank_prev'] . '위' : '-'; ?></td>
            </tr>
            <?php } ?>
            </tbody>
        </table>
    </div>
    <?php } ?>
</section>

<?php } elseif ($tab === 'detail') { ?>
<section class="icrk-panel"><p class="icrk-muted">게시글을 찾을 수 없습니다. <a href="<?php echo icrk_h(icrm_admin_page_url('rank', array('tab' => 'posts'))); ?>">목록으로</a></p></section>
<?php } ?>

<script>
(function() {
    var actionUrl = <?php echo json_encode($action_url); ?>;
    var filterBo = <?php echo json_encode($filter_bo); ?>;

    function postAction(action, data) {
        var fd = new FormData();
        fd.append('action', action);
        if (data) {
            Object.keys(data).forEach(function(k) {
                if (Array.isArray(data[k])) {
                    data[k].forEach(function(v) { fd.append(k + '[]', v); });
                } else {
                    fd.append(k, data[k]);
                }
            });
        }
        return fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' }).then(function(r) { return r.json(); });
    }

    function runCheck(bo, wrIds, msgEl) {
        if (msgEl) msgEl.textContent = '순위체크 요청 중… (iCRM API)';
        return postAction('run_check', { bo_table: bo || '', wr_ids: wrIds || [] }).then(function(res) {
            if (msgEl) {
                msgEl.textContent = res.ok
                    ? ('완료 · ' + (res.saved || 0) + '건 저장 · ' + (res.points_charged || 0) + 'P 차감')
                    : (res.error || '실패');
            }
            if (res.ok) setTimeout(function() { location.reload(); }, 900);
            return res;
        }).catch(function() { if (msgEl) msgEl.textContent = '네트워크 오류'; });
    }

    var runAll = document.getElementById('icrk_run_all');
    if (runAll) {
        runAll.addEventListener('click', function() {
            runCheck('', [], document.getElementById('icrk_dashboard_msg'));
        });
    }

    var runFiltered = document.getElementById('icrk_run_filtered');
    if (runFiltered) {
        runFiltered.addEventListener('click', function() {
            var checks = document.querySelectorAll('.icrk-row-check:checked');
            var ids = [];
            var bo = filterBo;
            checks.forEach(function(el) {
                ids.push(el.value);
                if (!bo) bo = el.getAttribute('data-bo');
            });
            if (!ids.length) {
                runCheck(filterBo, [], document.getElementById('icrk_posts_msg'));
            } else {
                runCheck(bo, ids, document.getElementById('icrk_posts_msg'));
            }
        });
    }

    document.querySelectorAll('.icrk-run-one').forEach(function(btn) {
        btn.addEventListener('click', function() {
            runCheck(btn.getAttribute('data-bo'), [btn.getAttribute('data-wr')], document.getElementById('icrk_posts_msg'));
        });
    });

    var checkAll = document.getElementById('icrk_check_all');
    if (checkAll) {
        checkAll.addEventListener('change', function() {
            document.querySelectorAll('.icrk-row-check').forEach(function(el) { el.checked = checkAll.checked; });
        });
    }

    var targetForm = document.getElementById('icrk_target_form');
    if (targetForm) {
        targetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var msg = document.getElementById('icrk_detail_msg');
            var fd = new FormData(targetForm);
            fd.append('action', 'save_target');
            fd.append('enabled', targetForm.querySelector('[name=enabled]').checked ? '1' : '0');
            msg.textContent = '저장 중…';
            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    msg.textContent = res.ok ? '저장됨' : (res.error || '실패');
                    if (res.ok) setTimeout(function() { location.reload(); }, 600);
                });
        });
    }

    var runDetail = document.getElementById('icrk_run_detail');
    if (runDetail) {
        runDetail.addEventListener('click', function() {
            var bo = <?php echo json_encode($detail_bo); ?>;
            var wr = <?php echo (int) $detail_wr; ?>;
            runCheck(bo, [wr], document.getElementById('icrk_detail_msg'));
        });
    }

    var delBtn = document.getElementById('icrk_delete_target');
    if (delBtn) {
        delBtn.addEventListener('click', function() {
            if (!confirm('이 게시글의 순위 추적 설정을 삭제할까요?')) return;
            postAction('delete_target', { bo_table: <?php echo json_encode($detail_bo); ?>, wr_id: <?php echo (int) $detail_wr; ?> })
                .then(function() { location.href = <?php echo json_encode(icrm_admin_page_url('rank', array('tab' => 'posts'))); ?>; });
        });
    }

    document.querySelectorAll('.icrk-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            var ta = document.getElementById('icrk_keywords');
            var kw = chip.getAttribute('data-kw');
            var lines = ta.value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
            if (lines.indexOf(kw) === -1) lines.push(kw);
            ta.value = lines.join('\n');
        });
    });

})();
</script>
