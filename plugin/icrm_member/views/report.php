<?php
if (!defined('_GNUBOARD_') || !defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

if (is_file(G5_LIB_PATH . '/icrm-point.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-point.lib.php';
}
if (is_file(G5_LIB_PATH . '/icrm-rank.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-rank.lib.php';
}

function icrm_report_h($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

function icrm_report_table_exists($table)
{
    $row = sql_fetch(" show tables like '" . sql_escape_string((string) $table) . "' ", false);
    return is_array($row) && count($row) > 0;
}

function icrm_report_range($ym)
{
    if (!preg_match('/^\d{4}-\d{2}$/', (string) $ym)) {
        $ym = date('Y-m');
    }
    $ts = strtotime($ym . '-01 00:00:00');
    if ($ts === false) {
        $ts = strtotime(date('Y-m') . '-01 00:00:00');
    }
    return array(
        'ym' => date('Y-m', $ts),
        'label' => date('Y년 n월', $ts),
        'start_date' => date('Y-m-01', $ts),
        'end_date' => date('Y-m-t', $ts),
        'start_dt' => date('Y-m-01 00:00:00', $ts),
        'end_dt' => date('Y-m-t 23:59:59', $ts),
        'prev_ym' => date('Y-m', strtotime('-1 month', $ts)),
        'next_ym' => date('Y-m', strtotime('+1 month', $ts)),
    );
}

function icrm_report_visits($range)
{
    global $g5;
    $table = isset($g5['visit_table']) ? $g5['visit_table'] : (defined('G5_TABLE_PREFIX') ? G5_TABLE_PREFIX . 'visit' : 'g5_visit');
    if (!icrm_report_table_exists($table)) {
        return array('total' => 0, 'unique_ip' => 0);
    }
    $row = sql_fetch(" select count(*) as total, count(distinct vi_ip) as unique_ip
                         from {$table}
                        where vi_date between '" . sql_escape_string($range['start_date']) . "' and '" . sql_escape_string($range['end_date']) . "' ", false);
    return array('total' => (int) ($row['total'] ?? 0), 'unique_ip' => (int) ($row['unique_ip'] ?? 0));
}

function icrm_report_posts($range)
{
    global $g5;
    $board_table = isset($g5['board_table']) ? $g5['board_table'] : (defined('G5_TABLE_PREFIX') ? G5_TABLE_PREFIX . 'board' : 'g5_board');
    if (!icrm_report_table_exists($board_table)) {
        return array('total' => 0, 'boards' => array());
    }
    $total = 0;
    $boards = array();
    $res = sql_query(" select bo_table, bo_subject from {$board_table} order by bo_order, bo_table ", false);
    if ($res) {
        while ($board = sql_fetch_array($res)) {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) ($board['bo_table'] ?? ''));
            if ($bo_table === '') continue;
            $write_table = (isset($g5['write_prefix']) ? $g5['write_prefix'] : (defined('G5_TABLE_PREFIX') ? G5_TABLE_PREFIX . 'write_' : 'g5_write_')) . $bo_table;
            if (!icrm_report_table_exists($write_table)) continue;
            $row = sql_fetch(" select count(*) as cnt from {$write_table}
                                where wr_is_comment = 0
                                  and wr_datetime between '" . sql_escape_string($range['start_dt']) . "' and '" . sql_escape_string($range['end_dt']) . "' ", false);
            $cnt = (int) ($row['cnt'] ?? 0);
            if ($cnt <= 0) continue;
            $total += $cnt;
            $boards[] = array('bo_table' => $bo_table, 'bo_subject' => (string) ($board['bo_subject'] ?? $bo_table), 'count' => $cnt);
        }
    }
    usort($boards, function ($a, $b) { return (int) $b['count'] - (int) $a['count']; });
    return array('total' => $total, 'boards' => array_slice($boards, 0, 8));
}

function icrm_report_ai($range)
{
    if (!function_exists('icrm_point_table')) {
        return array('total' => 0, 'success' => 0, 'failed' => 0, 'points' => 0, 'cost_krw' => 0, 'services' => array());
    }
    $table = icrm_point_table('usage');
    if (!icrm_report_table_exists($table)) {
        return array('total' => 0, 'success' => 0, 'failed' => 0, 'points' => 0, 'cost_krw' => 0, 'services' => array());
    }
    $row = sql_fetch(" select count(*) as total,
                              sum(case when ipu_status = 'success' then 1 else 0 end) as success_count,
                              sum(case when ipu_status <> 'success' then 1 else 0 end) as failed_count,
                              coalesce(sum(ipu_points_charged), 0) as points,
                              coalesce(sum(ipu_cost_krw), 0) as cost_krw
                         from {$table}
                        where ipu_created_at between '" . sql_escape_string($range['start_dt']) . "' and '" . sql_escape_string($range['end_dt']) . "' ", false);
    $services = array();
    $res = sql_query(" select ipu_service, count(*) as cnt, coalesce(sum(ipu_points_charged), 0) as points
                         from {$table}
                        where ipu_created_at between '" . sql_escape_string($range['start_dt']) . "' and '" . sql_escape_string($range['end_dt']) . "'
                        group by ipu_service order by cnt desc limit 8 ", false);
    if ($res) {
        while ($svc = sql_fetch_array($res)) {
            $services[] = array('service' => (string) ($svc['ipu_service'] ?? ''), 'count' => (int) ($svc['cnt'] ?? 0), 'points' => (int) ($svc['points'] ?? 0));
        }
    }
    return array(
        'total' => (int) ($row['total'] ?? 0),
        'success' => (int) ($row['success_count'] ?? 0),
        'failed' => (int) ($row['failed_count'] ?? 0),
        'points' => (int) ($row['points'] ?? 0),
        'cost_krw' => (float) ($row['cost_krw'] ?? 0),
        'services' => $services,
    );
}

function icrm_report_rank($range)
{
    if (!function_exists('icrm_rank_table')) {
        return array('checked' => 0, 'improved' => 0, 'worsened' => 0, 'top10' => 0, 'items' => array());
    }
    if (function_exists('icrm_rank_bootstrap')) icrm_rank_bootstrap();
    $table = icrm_rank_table('results');
    if (!icrm_report_table_exists($table)) {
        return array('checked' => 0, 'improved' => 0, 'worsened' => 0, 'top10' => 0, 'items' => array());
    }
    $row = sql_fetch(" select count(*) as checked_count,
                              sum(case when rank_prev > 0 and rank_pos > 0 and rank_pos < rank_prev then 1 else 0 end) as improved,
                              sum(case when rank_prev > 0 and rank_pos > 0 and rank_pos > rank_prev then 1 else 0 end) as worsened,
                              sum(case when rank_pos > 0 and rank_pos <= 10 then 1 else 0 end) as top10
                         from {$table}
                        where checked_at between '" . sql_escape_string($range['start_dt']) . "' and '" . sql_escape_string($range['end_dt']) . "' ", false);
    $items = array();
    $res = sql_query(" select bo_table, wr_id, keyword, engine, rank_pos, rank_prev, status, checked_at
                         from {$table}
                        where checked_at between '" . sql_escape_string($range['start_dt']) . "' and '" . sql_escape_string($range['end_dt']) . "'
                        order by checked_at desc, irr_id desc limit 12 ", false);
    if ($res) {
        while ($it = sql_fetch_array($res)) $items[] = $it;
    }
    return array('checked' => (int) ($row['checked_count'] ?? 0), 'improved' => (int) ($row['improved'] ?? 0), 'worsened' => (int) ($row['worsened'] ?? 0), 'top10' => (int) ($row['top10'] ?? 0), 'items' => $items);
}

$range = icrm_report_range(isset($_GET['ym']) ? (string) $_GET['ym'] : date('Y-m'));
$visits = icrm_report_visits($range);
$posts = icrm_report_posts($range);
$ai = icrm_report_ai($range);
$rank = icrm_report_rank($range);
$prev_url = function_exists('icrm_member_url') ? icrm_member_url('report', array('ym' => $range['prev_ym'])) : '?m=report&ym=' . $range['prev_ym'];
$next_url = function_exists('icrm_member_url') ? icrm_member_url('report', array('ym' => $range['next_ym'])) : '?m=report&ym=' . $range['next_ym'];
?>
<style>
.ob-report-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:18px}.ob-report-head h2{margin:0;font-size:22px;font-weight:900;color:#0f172a}.ob-report-head p{margin:6px 0 0;color:#64748b;font-size:13px;line-height:1.6}.ob-report-nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ob-report-nav a,.ob-report-nav span{display:inline-flex;align-items:center;border-radius:999px;border:1px solid #dbe4ee;background:#fff;padding:8px 13px;color:#334155;text-decoration:none;font-size:12px;font-weight:800}.ob-report-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px}.ob-report-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;box-shadow:0 8px 24px rgba(15,23,42,.04)}.ob-report-card strong{display:block;font-size:12px;color:#64748b;margin-bottom:8px}.ob-report-card b{display:block;font-size:26px;color:#0f172a}.ob-report-card em{display:block;margin-top:6px;font-style:normal;color:#94a3b8;font-size:12px}.ob-report-panel{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 8px 24px rgba(15,23,42,.04)}.ob-report-panel h3{margin:0 0 12px;font-size:16px;color:#0f172a}.ob-report-row{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid #eef2f7;border-radius:12px;padding:12px 14px;background:#fbfdff;margin-top:8px}.ob-report-row span{color:#475569;font-size:13px}.ob-report-row strong{color:#0f172a;font-size:13px}.ob-report-table{width:100%;border-collapse:collapse}.ob-report-table th,.ob-report-table td{padding:10px;border-bottom:1px solid #eef2f7;text-align:left;font-size:13px}.ob-report-table th{background:#f8fafc;color:#64748b;font-size:12px}.ob-report-empty{padding:24px;border-radius:12px;background:#f8fafc;color:#94a3b8;text-align:center;font-size:13px}
</style>

<div class="ob-report-head">
    <div>
        <h2>온오프빌더 월간 리포트</h2>
        <p><?php echo icrm_report_h($range['label']); ?> 기준 방문자, 게시글, AI 사용량, 포인트 사용량, 검색 순위 변동을 요약합니다.</p>
    </div>
    <div class="ob-report-nav">
        <a href="<?php echo icrm_report_h($prev_url); ?>">이전 달</a>
        <span><?php echo icrm_report_h($range['ym']); ?></span>
        <a href="<?php echo icrm_report_h($next_url); ?>">다음 달</a>
    </div>
</div>

<div class="ob-report-grid">
    <div class="ob-report-card"><strong>월간 방문자</strong><b><?php echo number_format($visits['total']); ?></b><em>고유 IP <?php echo number_format($visits['unique_ip']); ?>명</em></div>
    <div class="ob-report-card"><strong>게시글 수</strong><b><?php echo number_format($posts['total']); ?></b><em>댓글 제외 · 게시판 합산</em></div>
    <div class="ob-report-card"><strong>AI 사용량</strong><b><?php echo number_format($ai['total']); ?></b><em>성공 <?php echo number_format($ai['success']); ?>건 · 실패 <?php echo number_format($ai['failed']); ?>건</em></div>
    <div class="ob-report-card"><strong>포인트 사용량</strong><b><?php echo number_format($ai['points']); ?>P</b><em>실제 API 사용료 <?php echo number_format($ai['cost_krw']); ?>원 기준</em></div>
    <div class="ob-report-card"><strong>검색 순위 변동</strong><b><?php echo number_format($rank['checked']); ?></b><em>상승 <?php echo number_format($rank['improved']); ?> · 하락 <?php echo number_format($rank['worsened']); ?> · Top10 <?php echo number_format($rank['top10']); ?></em></div>
</div>

<section class="ob-report-panel">
    <h3>게시판별 게시글</h3>
    <?php if (empty($posts['boards'])) { ?><div class="ob-report-empty">이번 달 작성된 게시글이 없습니다.</div><?php } ?>
    <?php foreach ($posts['boards'] as $row) { ?>
    <div class="ob-report-row"><span><?php echo icrm_report_h($row['bo_subject']); ?> <code><?php echo icrm_report_h($row['bo_table']); ?></code></span><strong><?php echo number_format((int) $row['count']); ?>건</strong></div>
    <?php } ?>
</section>

<section class="ob-report-panel">
    <h3>AI 기능별 사용량</h3>
    <?php if (empty($ai['services'])) { ?><div class="ob-report-empty">이번 달 AI 사용 기록이 없습니다.</div><?php } ?>
    <?php foreach ($ai['services'] as $row) { ?>
    <div class="ob-report-row"><span><?php echo icrm_report_h(function_exists('icrm_point_usage_service_label') ? icrm_point_usage_service_label($row['service']) : $row['service']); ?></span><strong><?php echo number_format((int) $row['count']); ?>건 · <?php echo number_format((int) $row['points']); ?>P</strong></div>
    <?php } ?>
</section>

<section class="ob-report-panel">
    <h3>검색 순위 최근 변동</h3>
    <?php if (empty($rank['items'])) { ?><div class="ob-report-empty">이번 달 검색 순위 체크 기록이 없습니다.</div><?php } else { ?>
    <div style="overflow-x:auto">
        <table class="ob-report-table">
            <thead><tr><th>일시</th><th>키워드</th><th>검색엔진</th><th>게시글</th><th>순위</th><th>변동</th></tr></thead>
            <tbody>
            <?php foreach ($rank['items'] as $row) {
                $cur = (int) ($row['rank_pos'] ?? 0);
                $prev = (int) ($row['rank_prev'] ?? 0);
                $delta = '-';
                if ($prev > 0 && $cur > 0) {
                    $diff = $prev - $cur;
                    $delta = $diff > 0 ? '+' . $diff : (string) $diff;
                }
                ?>
                <tr>
                    <td><?php echo icrm_report_h(substr((string) ($row['checked_at'] ?? ''), 0, 16)); ?></td>
                    <td><?php echo icrm_report_h($row['keyword'] ?? ''); ?></td>
                    <td><?php echo icrm_report_h($row['engine'] ?? ''); ?></td>
                    <td><code><?php echo icrm_report_h(($row['bo_table'] ?? '') . ':' . (int) ($row['wr_id'] ?? 0)); ?></code></td>
                    <td><?php echo $cur > 0 ? number_format($cur) . '위' : icrm_report_h($row['status'] ?? '-'); ?></td>
                    <td><?php echo icrm_report_h($delta); ?></td>
                </tr>
            <?php } ?>
            </tbody>
        </table>
    </div>
    <?php } ?>
</section>
