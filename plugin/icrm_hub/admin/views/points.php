<?php
if (!defined('_GNUBOARD_') || !defined('ICRM_HUB_ACTIVE')) {
    exit;
}

if (!isset($action_url) || $action_url === '') {
    $action_url = G5_PLUGIN_URL . '/seo_meta/admin/action.php';
}
$mb_id = function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : '';
if (function_exists('icrm_point_maybe_auto_sync')) {
    icrm_point_maybe_auto_sync();
}
$member_label = function_exists('icrm_point_get_member_label') ? icrm_point_get_member_label($mb_id) : $mb_id;
$balance = function_exists('icrm_point_get_balance') ? icrm_point_get_balance($mb_id) : 0;
$charge_rows = function_exists('icrm_point_recent_charge_requests') ? icrm_point_recent_charge_requests(15, $mb_id) : array();
$point_history = function_exists('icrm_point_recent_member_history') ? icrm_point_recent_member_history($mb_id, 20) : array();
$usage_page = isset($_GET['usage_page']) ? max(1, (int) $_GET['usage_page']) : 1;
$usage_data = function_exists('icrm_point_fetch_usage_history')
    ? icrm_point_fetch_usage_history($mb_id, $usage_page, 20)
    : array('items' => array(), 'total' => 0, 'page' => 1, 'per_page' => 20, 'total_pages' => 1);
$member_form_url = G5_ADMIN_URL . '/member_form.php?w=u&mb_id=' . urlencode($mb_id);
$bank_info = function_exists('icrm_point_fetch_bank_info_from_icrm')
    ? icrm_point_fetch_bank_info_from_icrm()
    : array('bank_name' => '', 'account_no' => '', 'holder_name' => '', 'extra_note' => '');
$amount_presets = array(10000, 50000, 100000, 300000, 500000);
$has_bank_info = trim((string) ($bank_info['bank_name'] ?? '')) !== ''
    || trim((string) ($bank_info['account_no'] ?? '')) !== ''
    || trim((string) ($bank_info['holder_name'] ?? '')) !== '';

function icrm_pts_h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function icrm_pts_usage_page_url($page)
{
    return function_exists('icrm_admin_page_url')
        ? icrm_admin_page_url('points', array('usage_page' => (int) $page))
        : ('?m=points&usage_page=' . (int) $page);
}
?>
<style>
.icrm-pts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px}
.icrm-pts-card{background:var(--icrm-panel,#fff);border:1px solid var(--icrm-border,#d7dee8);border-radius:12px;padding:18px 20px}
.icrm-pts-card strong{display:block;font-size:12px;color:var(--icrm-muted,#64748b);margin-bottom:6px}
.icrm-pts-card span{font-size:28px;font-weight:800;color:#0f172a}
.icrm-pts-panel{background:var(--icrm-panel,#fff);border:1px solid var(--icrm-border,#d7dee8);border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 8px 24px rgba(15,23,42,.04)}
.icrm-pts-panel h2{margin:0 0 12px;font-size:17px;font-weight:700}
.icrm-pts-hint{color:var(--icrm-muted,#64748b);font-size:13px;margin:0 0 14px;line-height:1.6}
.icrm-pts-hint code{background:#f1f5f9;padding:1px 6px;border-radius:4px;font-size:12px}
.icrm-pts-form .frm_input{width:100%;max-width:420px;padding:8px 10px;border:1px solid var(--icrm-border,#d7dee8);border-radius:8px;font:inherit}
.icrm-pts-form textarea.frm_input{min-height:80px;resize:vertical}
.icrm-pts-form .tbl_frm01{width:100%;border-collapse:collapse}
.icrm-pts-form .tbl_frm01 th{width:140px;padding:10px;text-align:left;color:var(--icrm-muted,#64748b);font-size:13px;vertical-align:top}
.icrm-pts-form .tbl_frm01 td{padding:10px}
.icrm-pts-btn{display:inline-block;padding:9px 16px;border:0;border-radius:8px;background:var(--icrm-accent,#2563eb);color:#fff;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
.icrm-pts-btn--ghost{background:#fff;color:#334155;border:1px solid var(--icrm-border,#d7dee8)}
.icrm-pts-msg{margin-left:8px;color:var(--icrm-accent,#2563eb);font-size:13px}
.icrm-pts-table{width:100%;border-collapse:collapse;margin-top:8px}
.icrm-pts-table th,.icrm-pts-table td{padding:10px;border-bottom:1px solid #e8edf3;text-align:left;font-size:13px;vertical-align:top}
.icrm-pts-table th{color:var(--icrm-muted,#64748b);background:#f8fafc;font-size:12px}
.icrm-pts-point-plus{color:#15803d;font-weight:700;text-align:right;white-space:nowrap}
.icrm-pts-point-minus{color:#dc2626;font-weight:700;text-align:right;white-space:nowrap}
.icrm-pts-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700}
.icrm-pts-badge--ok{background:#dcfce7;color:#15803d}
.icrm-pts-badge--fail{background:#fee2e2;color:#dc2626}
.icrm-pts-badge--warn{background:#fef3c7;color:#b45309}
.icrm-pts-badge--muted{background:#f1f5f9;color:#64748b}
.icrm-pts-muted{color:var(--icrm-muted,#64748b);font-size:12px}
.icrm-pts-pager{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center}
.icrm-pts-pager a,.icrm-pts-pager span{display:inline-block;padding:6px 12px;border-radius:8px;border:1px solid var(--icrm-border,#d7dee8);font-size:13px;text-decoration:none;color:#334155}
.icrm-pts-pager a.on{background:var(--icrm-top,#1e293b);color:#fff;border-color:var(--icrm-top,#1e293b)}
.icrm-pts-empty{padding:24px;text-align:center;color:var(--icrm-muted,#64748b);font-size:13px}
.icrm-pts-bank{background:linear-gradient(135deg,#eff6ff 0%,#eef2ff 100%);border:1px solid #bfdbfe;border-radius:14px;padding:18px 20px;margin-bottom:16px}
.icrm-pts-bank h3{margin:0 0 12px;font-size:14px;font-weight:800;color:#0f172a}
.icrm-pts-bank-card{background:#fff;border:1px solid #dbeafe;border-radius:10px;padding:14px 16px;margin-bottom:10px}
.icrm-pts-bank-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.icrm-pts-bank-badge{display:inline-block;padding:6px 12px;border-radius:8px;background:#2563eb;color:#fff;font-size:12px;font-weight:800}
.icrm-pts-bank-no{font-size:18px;font-weight:800;color:#0f172a;letter-spacing:.02em}
.icrm-pts-bank-copy{padding:6px 12px;border:0;border-radius:8px;background:#f1f5f9;color:#475569;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.icrm-pts-bank-copy:hover{background:#e2e8f0}
.icrm-pts-bank-holder{margin:8px 0 0;font-size:12px;font-weight:700;color:#64748b}
.icrm-pts-bank-note{margin:8px 0 0;font-size:12px;color:#1d4ed8;font-weight:600;line-height:1.5}
.icrm-pts-bank-foot{margin:8px 0 0;font-size:11px;color:#94a3b8;line-height:1.5}
.icrm-pts-amount-btns{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.icrm-pts-amount-btn{padding:7px 14px;border:1px solid var(--icrm-border,#d7dee8);border-radius:999px;background:#fff;color:#334155;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.icrm-pts-amount-btn:hover,.icrm-pts-amount-btn.on{border-color:var(--icrm-accent,#2563eb);background:#eff6ff;color:#1d4ed8}
.icrm-pts-msg--err{color:#dc2626}
</style>

<div class="icrm-pts-grid">
    <div class="icrm-pts-card">
        <strong>로그인 회원</strong>
        <span style="font-size:18px;font-weight:700"><?php echo icrm_pts_h($member_label); ?></span>
    </div>
    <div class="icrm-pts-card">
        <strong>온오프빌더 포인트 잔액</strong>
        <span><?php echo number_format($balance); ?>P</span>
    </div>
    <div class="icrm-pts-card">
        <strong>사용료 기록</strong>
        <span style="font-size:22px"><?php echo number_format((int) $usage_data['total']); ?>건</span>
    </div>
</div>

<p class="icrm-pts-hint" style="margin:-6px 0 16px">
    온오프빌더 AI 기능 사용 시 <strong>로그인한 회원</strong>의 그누보드 포인트가 차감됩니다.
    사용료는 중앙 iCRM API에서 계산한 실제 API 사용료의 <strong><?php echo function_exists('icrm_point_get_multiplier') ? (int) icrm_point_get_multiplier() : 5; ?>배</strong> 기준입니다.
    상단 잔액은 차감 반영 후 현재 보유 포인트이며, 사용 내역의 잔액은 해당 시점 기록입니다.
    포인트 충전·동기화는 포인트가 0일 때 또는 수동 동기화 시에만 반영됩니다.
    <?php global $is_admin; if ($mb_id !== '' && $is_admin === 'super') { ?>
    · <a href="<?php echo icrm_pts_h($member_form_url); ?>">회원관리에서 포인트 조정</a>
    <?php } ?>
</p>

<section class="icrm-pts-panel">
    <h2>온오프빌더 사용료 확인</h2>
    <p class="icrm-pts-hint">SEO 메타 · 순위체크 · 콘텐츠 수집 · 자동댓글 등 중앙 iCRM AI API 호출과 포인트 차감 기록입니다. (회원 <code><?php echo icrm_pts_h($mb_id); ?></code>)</p>

    <?php if (empty($usage_data['items'])) { ?>
    <div class="icrm-pts-empty">아직 AI 사용 내역이 없습니다.</div>
    <?php } else { ?>
    <table class="icrm-pts-table">
        <thead>
        <tr>
            <th>일시</th>
            <th>기능</th>
            <th>작업</th>
            <th>상태</th>
            <th style="text-align:right">차감</th>
            <th style="text-align:right">잔액</th>
            <th>비고</th>
        </tr>
        </thead>
        <tbody>
        <?php foreach ($usage_data['items'] as $row) {
            $status = (string) ($row['ipu_status'] ?? '');
            $badge_class = 'icrm-pts-badge--muted';
            if ($status === 'success') {
                $badge_class = 'icrm-pts-badge--ok';
            } elseif ($status === 'point_insufficient') {
                $badge_class = 'icrm-pts-badge--warn';
            } elseif ($status === 'failed') {
                $badge_class = 'icrm-pts-badge--fail';
            }
            $charged = (int) ($row['ipu_points_charged'] ?? 0);
            $note = trim((string) ($row['ipu_error'] ?? ''));
            if ($note === '' && !empty($row['ipu_model'])) {
                $note = (string) $row['ipu_model'];
            }
            ?>
        <tr>
            <td><?php echo icrm_pts_h($row['ipu_created_at'] ?? ''); ?></td>
            <td><?php echo icrm_pts_h(icrm_point_usage_service_label($row['ipu_service'] ?? '')); ?></td>
            <td><?php echo icrm_pts_h(icrm_point_usage_task_label($row['ipu_task'] ?? '')); ?></td>
            <td><span class="icrm-pts-badge <?php echo $badge_class; ?>"><?php echo icrm_pts_h(icrm_point_usage_status_label($status)); ?></span></td>
            <td class="<?php echo $charged > 0 ? 'icrm-pts-point-minus' : 'icrm-pts-muted'; ?>" style="text-align:right">
                <?php echo $charged > 0 ? '-' . number_format($charged) . 'P' : '-'; ?>
            </td>
            <td style="text-align:right"><?php echo number_format((int) ($row['ipu_point_balance'] ?? 0)); ?>P</td>
            <td class="icrm-pts-muted"><?php echo icrm_pts_h($note !== '' ? $note : '-'); ?></td>
        </tr>
        <?php } ?>
        </tbody>
    </table>

    <?php if ((int) $usage_data['total_pages'] > 1) { ?>
    <nav class="icrm-pts-pager" aria-label="사용 내역 페이지">
        <?php if ($usage_page > 1) { ?>
        <a href="<?php echo icrm_pts_h(icrm_pts_usage_page_url($usage_page - 1)); ?>">← 이전</a>
        <?php } ?>
        <span>페이지 <?php echo (int) $usage_page; ?> / <?php echo (int) $usage_data['total_pages']; ?> (총 <?php echo number_format((int) $usage_data['total']); ?>건)</span>
        <?php if ($usage_page < (int) $usage_data['total_pages']) { ?>
        <a href="<?php echo icrm_pts_h(icrm_pts_usage_page_url($usage_page + 1)); ?>">다음 →</a>
        <?php } ?>
    </nav>
    <?php } ?>
    <?php } ?>
</section>

<section class="icrm-pts-panel icrm-pts-form">
    <h2>온오프빌더 포인트 충전</h2>
    <p class="icrm-pts-hint">승인 시 <code><?php echo icrm_pts_h($mb_id); ?></code> 회원 계정에 포인트가 반영됩니다.</p>
    <?php if (!function_exists('icrm_point_request_charge')) { ?>
    <p class="icrm-pts-hint">포인트 모듈을 사용할 수 없습니다.</p>
    <?php } else { ?>
    <?php if ($has_bank_info) { ?>
    <div class="icrm-pts-bank">
        <h3>입금 계좌 안내</h3>
        <div class="icrm-pts-bank-card">
            <div class="icrm-pts-bank-row">
                <?php if (trim((string) ($bank_info['bank_name'] ?? '')) !== '') { ?>
                <span class="icrm-pts-bank-badge"><?php echo icrm_pts_h($bank_info['bank_name']); ?></span>
                <?php } ?>
                <?php if (trim((string) ($bank_info['account_no'] ?? '')) !== '') { ?>
                <span class="icrm-pts-bank-no" id="icrm_pts_bank_account"><?php echo icrm_pts_h($bank_info['account_no']); ?></span>
                <button type="button" class="icrm-pts-bank-copy" id="icrm_pts_bank_copy">복사</button>
                <?php } ?>
            </div>
            <?php if (trim((string) ($bank_info['holder_name'] ?? '')) !== '') { ?>
            <p class="icrm-pts-bank-holder">예금주: <?php echo icrm_pts_h($bank_info['holder_name']); ?></p>
            <?php } ?>
        </div>
        <?php if (trim((string) ($bank_info['extra_note'] ?? '')) !== '') { ?>
        <p class="icrm-pts-bank-note"><?php echo nl2br(icrm_pts_h($bank_info['extra_note'])); ?></p>
        <?php } else { ?>
        <p class="icrm-pts-bank-note">입금 후 충전 신청을 해 주세요. 입금자명을 정확히 입력하면 확인이 빠릅니다.</p>
        <?php } ?>
        <p class="icrm-pts-bank-foot">* 충전 요청 즉시 포인트가 먼저 지급되며, 입금이 확인되지 않으면 나중에 회수될 수 있습니다.</p>
    </div>
    <?php } else { ?>
    <p class="icrm-pts-hint">iCRM에 입금 계좌가 설정되지 않았습니다. iCRM 관리자에게 계좌 등록을 요청해 주세요.</p>
    <?php } ?>

    <form id="icrm_point_charge_form">
        <table class="tbl_frm01">
            <tbody>
            <tr>
                <th><label for="point_amount_krw">충전 금액</label></th>
                <td>
                    <div class="icrm-pts-amount-btns" role="group" aria-label="충전 금액 빠른 선택">
                        <?php foreach ($amount_presets as $preset) { ?>
                        <button type="button" class="icrm-pts-amount-btn" data-amount="<?php echo (int) $preset; ?>">
                            <?php echo number_format($preset); ?>원
                        </button>
                        <?php } ?>
                    </div>
                    <input type="number" name="amount_krw" id="point_amount_krw" class="frm_input" min="10000" step="1000" placeholder="직접 입력 (예: 50000)" required>
                    <p class="icrm-pts-hint">최소 10,000원 · iCRM과 동일하게 보너스가 적용됩니다. 선지급 후 입금 확인은 iCRM 승인센터에서 처리됩니다.</p>
                </td>
            </tr>
            <tr>
                <th><label for="point_depositor">입금자명</label></th>
                <td><input type="text" name="depositor" id="point_depositor" class="frm_input" placeholder="입금자명 또는 업체명"></td>
            </tr>
            <tr>
                <th><label for="point_memo">메모</label></th>
                <td><textarea name="memo" id="point_memo" class="frm_input" rows="3" placeholder="세금계산서, 요청사항 등"></textarea></td>
            </tr>
            </tbody>
        </table>
        <div style="margin-top:12px">
            <button type="submit" class="icrm-pts-btn">충전 신청</button>
            <span class="icrm-pts-msg" id="icrm_point_charge_msg"></span>
        </div>
    </form>
    <?php } ?>
</section>

<section class="icrm-pts-panel">
    <h2>온오프빌더 포인트 적립·차감 내역</h2>
    <p class="icrm-pts-hint">그누보드 회원관리와 동일한 포인트 장부입니다. (충전·수동 조정·AI 차감 포함)</p>

    <?php if (empty($point_history)) { ?>
    <div class="icrm-pts-empty">포인트 내역이 없습니다.</div>
    <?php } else { ?>
    <table class="icrm-pts-table">
        <thead>
        <tr><th>일시</th><th>내용</th><th style="text-align:right">포인트</th><th style="text-align:right">잔액</th></tr>
        </thead>
        <tbody>
        <?php foreach ($point_history as $row) {
            $pt = (int) $row['po_point'];
            $cls = $pt >= 0 ? 'icrm-pts-point-plus' : 'icrm-pts-point-minus';
            $sign = $pt >= 0 ? '+' : '';
            ?>
        <tr>
            <td><?php echo icrm_pts_h($row['po_datetime']); ?></td>
            <td><?php echo icrm_pts_h($row['po_content']); ?></td>
            <td class="<?php echo $cls; ?>"><?php echo $sign . number_format($pt); ?>P</td>
            <td style="text-align:right"><?php echo number_format((int) $row['po_mb_point']); ?>P</td>
        </tr>
        <?php } ?>
        </tbody>
    </table>
    <?php } ?>
</section>

<?php if ($charge_rows) { ?>
<section class="icrm-pts-panel">
    <h2>최근 충전 신청</h2>
    <table class="icrm-pts-table">
        <thead>
        <tr><th>신청일</th><th>금액</th><th>포인트</th><th>입금자</th><th>상태</th><th>iCRM 메시지</th></tr>
        </thead>
        <tbody>
        <?php foreach ($charge_rows as $row) { ?>
        <tr>
            <td><?php echo icrm_pts_h($row['ipcr_created_at']); ?></td>
            <td><?php echo number_format((int) $row['ipcr_amount_krw']); ?>원</td>
            <td><?php echo number_format((int) $row['ipcr_requested_points']); ?>P</td>
            <td><?php echo icrm_pts_h($row['ipcr_depositor']); ?></td>
            <td><?php echo icrm_pts_h($row['ipcr_status']); ?></td>
            <td><?php echo icrm_pts_h($row['ipcr_icrm_message']); ?></td>
        </tr>
        <?php } ?>
        </tbody>
    </table>
</section>
<?php } ?>

<script>
(function() {
    var copyBtn = document.getElementById('icrm_pts_bank_copy');
    var accountEl = document.getElementById('icrm_pts_bank_account');
    if (copyBtn && accountEl) {
        copyBtn.addEventListener('click', function() {
            var txt = accountEl.textContent.trim();
            if (!txt) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).then(function() { alert('계좌번호가 복사되었습니다.'); });
                return;
            }
            var ta = document.createElement('textarea');
            ta.value = txt;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            alert('계좌번호가 복사되었습니다.');
        });
    }

    var form = document.getElementById('icrm_point_charge_form');
    if (!form) return;
    var actionUrl = <?php echo json_encode($action_url); ?>;
    var amountInput = document.getElementById('point_amount_krw');
    var amountButtons = form.querySelectorAll('.icrm-pts-amount-btn');

    function syncAmountButtons(value) {
        var num = parseInt(value, 10) || 0;
        amountButtons.forEach(function(btn) {
            var active = parseInt(btn.getAttribute('data-amount'), 10) === num;
            btn.classList.toggle('on', active);
        });
    }

    amountButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var amount = btn.getAttribute('data-amount') || '';
            if (amountInput) {
                amountInput.value = amount;
                amountInput.focus();
            }
            syncAmountButtons(amount);
        });
    });

    if (amountInput) {
        amountInput.addEventListener('input', function() {
            syncAmountButtons(amountInput.value);
        });
        syncAmountButtons(amountInput.value);
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var msg = document.getElementById('icrm_point_charge_msg');
        var fd = new FormData(form);
        fd.append('action', 'request_point_charge');
        msg.textContent = 'iCRM에 충전 신청 전송 중…';
        msg.classList.remove('icrm-pts-msg--err');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) {
                return r.text().then(function(text) {
                    var res = null;
                    try { res = JSON.parse(text); } catch (err) { res = null; }
                    if (!res) {
                        throw new Error('서버 응답 오류 (HTTP ' + r.status + ')');
                    }
                    if (!r.ok && !res.error) {
                        res.error = '요청 실패 (HTTP ' + r.status + ')';
                    }
                    return res;
                });
            })
            .then(function(res) {
                if (res.ok) {
                    msg.textContent = '신청 완료 · ' + (res.requested_points || 0).toLocaleString() + 'P · iCRM 승인 대기';
                    setTimeout(function() { location.reload(); }, 1000);
                    return;
                }
                msg.textContent = res.error || res.message || '신청 실패';
                msg.classList.add('icrm-pts-msg--err');
            })
            .catch(function(err) {
                msg.textContent = err && err.message ? err.message : '네트워크 오류';
                msg.classList.add('icrm-pts-msg--err');
            });
    });
})();
</script>
