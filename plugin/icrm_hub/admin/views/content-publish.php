<?php
if (!defined('_GNUBOARD_') || !defined('ICRM_HUB_ACTIVE')) {
    exit;
}

global $member;

if (is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-content.lib.php';
}
icrm_content_bootstrap();

if (defined('ICRM_MEMBER_PUBLISH') && ICRM_MEMBER_PUBLISH) {
    $action_url = isset($action_url) && $action_url !== ''
        ? $action_url
        : G5_PLUGIN_URL . '/icrm_member/action.php';
} else {
    $action_url = G5_PLUGIN_URL . '/content_collector/admin/action.php';
}
$icrm_member_publish_mode = defined('ICRM_MEMBER_PUBLISH') && ICRM_MEMBER_PUBLISH;

if ($icrm_member_publish_mode) {
    if (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
        include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
    }
    $boards = function_exists('icrm_member_board_list_publishable')
        ? icrm_member_board_list_publishable(!empty($member['mb_id']) ? $member['mb_id'] : '')
        : (function_exists('icrm_member_board_list_manageable')
            ? icrm_member_board_list_manageable(!empty($member['mb_id']) ? $member['mb_id'] : '')
            : array());
    $boards_blocked = array();
    if (function_exists('icrm_member_board_list_manageable') && function_exists('icrm_member_board_publish_block_reason')) {
        foreach (icrm_member_board_list_manageable(!empty($member['mb_id']) ? $member['mb_id'] : '') as $row) {
            if (empty($row['bo_table'])) {
                continue;
            }
            $reason = icrm_member_board_publish_block_reason($row['bo_table'], !empty($member['mb_id']) ? $member['mb_id'] : '');
            if ($reason !== '') {
                $boards_blocked[] = array(
                    'bo_table'   => $row['bo_table'],
                    'bo_subject' => $row['bo_subject'],
                    'reason'     => $reason,
                );
            }
        }
    }
    $boards = array_map(function ($row) {
        return array(
            'bo_table'       => $row['bo_table'],
            'bo_subject'     => $row['bo_subject'],
            'bo_write_level' => isset($row['bo_write_level']) ? (int) $row['bo_write_level'] : 0,
        );
    }, $boards);
} else {
    $boards = array();
    $board_res = sql_query(" select bo_table, bo_subject from {$g5['board_table']} order by bo_table ");
    while ($b = sql_fetch_array($board_res)) {
        $boards[] = $b;
    }
}

$default_bo = '';
if ($icrm_member_publish_mode) {
    $requested_bo = isset($publish_bo_table) ? (string) $publish_bo_table : '';
    if ($requested_bo !== '' && function_exists('icrm_member_board_can_publish_to') && icrm_member_board_can_publish_to($requested_bo)) {
        $default_bo = $requested_bo;
    } elseif ($boards !== array()) {
        $default_bo = (string) $boards[0]['bo_table'];
    }
} else {
    $default_bo = icrm_content_get_default_bo_table();
}

$default_mb = ($icrm_member_publish_mode && !empty($member['mb_id']))
    ? (string) $member['mb_id']
    : icrm_content_get_default_mb_id();

$board_meta = array();
if ($icrm_member_publish_mode && function_exists('icrm_member_board_categories')) {
    foreach ($boards as $b) {
        $bt = (string) $b['bo_table'];
        $board_meta[$bt] = array(
            'categories' => icrm_member_board_categories($bt),
        );
    }
}
$license_ok = function_exists('icrm_admin_shell_license_ok') ? icrm_admin_shell_license_ok() : false;
$ai_ready = function_exists('g5b_seo_meta_is_ai_configured') ? g5b_seo_meta_is_ai_configured() : false;
$geo_enabled = function_exists('g5site_cfg_bool') ? g5site_cfg_bool('icrm_hub_geo_button', true) : true;

$icp_preload_item = (isset($icp_preload_item) && is_array($icp_preload_item)) ? $icp_preload_item : null;
$icp_initial_ici_id = $icp_preload_item ? (int) ($icp_preload_item['ici_id'] ?? 0) : 0;
$icp_initial_topic = $icp_preload_item ? (string) ($icp_preload_item['source_title'] ?? '') : '';
$icp_initial_keywords = $icp_preload_item ? implode(', ', (array) ($icp_preload_item['rank_keywords'] ?? array())) : '';
$icp_initial_bo_table = $icp_preload_item ? (string) ($icp_preload_item['bo_table'] ?? '') : '';
$icp_initial_subject = $icp_preload_item ? (string) ($icp_preload_item['subject'] ?? '') : '';
$icp_initial_content = $icp_preload_item ? (string) ($icp_preload_item['content_html'] ?? '') : '';
$icp_initial_ca_name = $icp_preload_item ? (string) ($icp_preload_item['ca_name'] ?? '') : '';

if ($icp_initial_bo_table !== '') {
    $default_bo = $icp_initial_bo_table;
}

$icp_use_editor = false;
if (!empty($config['cf_editor']) && defined('G5_EDITOR_LIB') && is_file(G5_EDITOR_LIB)) {
    include_once G5_EDITOR_LIB;
    $icp_use_editor = function_exists('editor_html');
}
$icp_editor_id = 'content_html';

function icp_h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
?>

<?php if ($icp_use_editor) { ?>
<script src="<?php echo icp_h(G5_JS_URL); ?>/jquery-1.12.4.min.js"></script>
<script src="<?php echo icp_h(G5_JS_URL); ?>/jquery-migrate-1.4.1.min.js"></script>
<?php } ?>

<div class="icc-module icp-compose">
    <header class="icp-compose__head">
        <div class="icp-compose__head-text">
            <h2 class="icp-compose__title">콘텐츠 발행</h2>
            <p class="icp-compose__sub">주제를 입력하고 AI가 제목을 추천합니다. 제목을 선택한 뒤 분량·스타일에 맞춰 풍부한 본문을 생성할 수 있습니다.</p>
        </div>
    </header>

    <?php if ($icrm_member_publish_mode && $icp_preload_item) { ?>
    <p class="icp-compose__alert" style="border-color:#99f6e4;background:#f0fdfa;color:#0f766e">
        초안 #<?php echo (int) $icp_preload_item['ici_id']; ?>을(를) 불러왔습니다. 수정 후 저장하거나 발행하세요.
        <a href="<?php echo icp_h(function_exists('icrm_member_url') ? icrm_member_url(array('m' => 'publish', 'tab' => 'drafts')) : '#'); ?>" style="margin-left:8px;color:#0f766e">내 초안 목록</a>
    </p>
    <?php } ?>

    <?php if (!$license_ok) { ?>
    <p class="icp-compose__alert"><?php echo $icrm_member_publish_mode
        ? 'iCRM 연동이 필요합니다. 사이트 관리자에게 라이선스 설정을 요청해 주세요.'
        : 'iCRM 연동이 필요합니다. <a href="' . icp_h(icrm_admin_page_url('seo', array('tab' => 'settings'))) . '">연동 설정</a>'; ?></p>
    <?php } elseif (!$ai_ready) { ?>
    <p class="icp-compose__alert"><?php echo $icrm_member_publish_mode
        ? 'AI 초안 생성을 쓰려면 사이트 관리자에게 SEO API 연결을 요청해 주세요. 직접 작성 후 발행은 가능합니다.'
        : 'AI 초안 생성을 쓰려면 <a href="' . icp_h(icrm_admin_page_url('seo', array('tab' => 'settings'))) . '">SEO API 연결</a>을 확인해 주세요. 직접 작성 후 발행은 가능합니다.'; ?></p>
    <?php } elseif ($icrm_member_publish_mode && $boards === array()) { ?>
    <p class="icp-compose__alert">
      <?php if (!empty($boards_blocked)) { ?>
      발행 가능한 게시판이 없습니다. 아래 게시판은 글쓰기 레벨 조건을 충족하지 못합니다.
      <?php } else { ?>
      발행할 게시판이 없습니다. <a href="<?php echo icp_h(function_exists('icrm_member_url') ? icrm_member_url('boards') : '#'); ?>">게시판</a> 메뉴에서 먼저 게시판을 만드세요.
      <?php } ?>
    </p>
    <?php if (!empty($boards_blocked)) { ?>
    <ul class="icp-compose__blocked" style="margin:0 0 24px;padding:0 0 0 18px;font-size:13px;line-height:1.7;color:#9a3412">
      <?php foreach ($boards_blocked as $blocked) { ?>
      <li><strong><?php echo icp_h($blocked['bo_subject']); ?></strong> (<?php echo icp_h($blocked['bo_table']); ?>) — <?php echo icp_h($blocked['reason']); ?></li>
      <?php } ?>
    </ul>
    <?php } ?>
    <?php } ?>

    <form id="icp_compose_form" class="icp-compose__layout" autocomplete="off">
        <input type="hidden" name="ici_id" id="icp_ici_id" value="<?php echo (int) $icp_initial_ici_id; ?>">

        <aside class="icp-compose__aside">
            <section class="icp-compose__panel">
                <div class="icp-panel__head">
                    <span class="icp-panel__step">1</span>
                    <h3 class="icp-panel__title">주제 · 설정</h3>
                </div>

                <div class="icp-field">
                    <label class="icp-label" for="icp_topic">주제 / 키워드</label>
                    <input type="text" class="icp-input" id="icp_topic" name="topic" value="<?php echo icp_h($icp_initial_topic); ?>" placeholder="예: 두통 원인과 예방법" required>
                </div>

                <div class="icp-field">
                    <label class="icp-label" for="icp_keywords">추가 키워드</label>
                    <input type="text" class="icp-input" id="icp_keywords" name="keywords" value="<?php echo icp_h($icp_initial_keywords); ?>" placeholder="두통, 편두통, 스트레스">
                    <p class="icp-help">쉼표로 구분 · SEO·순위 키워드에 반영</p>
                </div>

                <div class="icp-field-row">
                    <div class="icp-field icp-field--half">
                        <label class="icp-label" for="icp_style">글 스타일</label>
                        <select class="icp-input icp-select" id="icp_style" name="style">
                            <option value="expert" selected>전문가 분석</option>
                            <option value="guide">정보 가이드</option>
                            <option value="friendly">친근한 블로그</option>
                            <option value="review">생생한 후기</option>
                            <option value="news">뉴스/기사형</option>
                        </select>
                    </div>
                    <div class="icp-field icp-field--half">
                        <label class="icp-label" for="icp_length">목표 분량</label>
                        <select class="icp-input icp-select" id="icp_length" name="length">
                            <option value="short">짧게 (약 1,000자)</option>
                            <option value="medium" selected>보통 (약 1,800자)</option>
                            <option value="long">길게 (약 2,500자)</option>
                            <option value="xlong">전문 글 (약 3,500자)</option>
                        </select>
                    </div>
                </div>

                <div class="icp-field">
                    <label class="icp-label" for="icp_bo_table">게시판</label>
                    <select class="icp-input icp-select" id="icp_bo_table" name="bo_table" required<?php echo ($icrm_member_publish_mode && $boards === array()) ? ' disabled' : ''; ?>>
                        <option value="">선택</option>
                        <?php foreach ($boards as $b) { ?>
                        <option value="<?php echo icp_h($b['bo_table']); ?>"<?php echo $default_bo === $b['bo_table'] ? ' selected' : ''; ?>>
                            <?php echo icp_h($b['bo_subject']); ?> (<?php echo icp_h($b['bo_table']); ?><?php if (!empty($b['bo_write_level'])) { ?>, Lv.<?php echo (int) $b['bo_write_level']; ?>+<?php } ?>)
                        </option>
                        <?php } ?>
                    </select>
                    <?php if ($icrm_member_publish_mode) { ?>
                    <p class="icp-help">내 게시판 중 글쓰기 레벨(bo_write_level)을 충족하는 게시판만 표시됩니다.</p>
                    <?php } ?>
                </div>

                <div class="icp-field" id="icp_ca_wrap" hidden>
                    <label class="icp-label" for="icp_ca_name">카테고리</label>
                    <select class="icp-input icp-select" id="icp_ca_name" name="ca_name">
                        <option value="">선택</option>
                    </select>
                </div>

                <div class="icp-field">
                    <label class="icp-label" for="icp_mb_id">작성자 ID</label>
                    <input type="text" class="icp-input" id="icp_mb_id" name="mb_id" value="<?php echo icp_h($default_mb); ?>" required<?php echo !empty($icrm_member_publish_mode) ? ' readonly' : ''; ?>>
                    <?php if (!empty($icrm_member_publish_mode)) { ?>
                    <p class="icp-help">로그인한 회원 계정으로 발행됩니다.</p>
                    <?php } ?>
                </div>

                <div class="icp-aside__actions">
                    <button type="button" class="icc-btn icc-btn--primary icp-btn-block" id="icp_titles_btn"<?php echo (!$license_ok || !$ai_ready) ? ' disabled' : ''; ?>>제목 추천</button>
                    <p class="icp-help icp-help--center">제목을 고른 뒤 본문이 자동 생성됩니다</p>
                    <p class="icp-msg" id="icp_ai_msg" role="status"></p>
                </div>

                <div class="icp-titles" id="icp_titles_panel" hidden>
                    <div class="icp-titles__head">
                        <h4 class="icp-titles__title">추천 제목</h4>
                        <span class="icp-titles__hint">클릭하면 선택한 분량·스타일로 본문 생성</span>
                    </div>
                    <ul class="icp-titles__list" id="icp_titles_list"></ul>
                </div>
            </section>
        </aside>

        <div class="icp-compose__main">
            <section class="icp-compose__panel icp-compose__panel--editor">
                <div class="icp-panel__head icp-panel__head--row">
                    <div>
                        <span class="icp-panel__step">2</span>
                        <h3 class="icp-panel__title">제목 · 본문</h3>
                    </div>
                    <?php if ($icp_use_editor) { ?>
                    <span class="icp-editor-badge">SmartEditor2 · HTML 탭</span>
                    <?php } ?>
                </div>

                <div class="icp-field">
                    <label class="icp-label" for="icp_subject">제목</label>
                    <input type="text" class="icp-input icp-input--lg" id="icp_subject" name="subject" value="<?php echo icp_h($icp_initial_subject); ?>" placeholder="게시글 제목을 입력하세요">
                </div>

                <div class="icp-field icp-field--editor">
                    <div class="icp-label-row">
                        <label class="icp-label" for="<?php echo icp_h($icp_editor_id); ?>">본문</label>
                        <?php if ($icp_use_editor) { ?>
                        <span class="icp-help icp-help--inline">에디터 상단 <strong>HTML</strong> 탭 · 이미지·링크 모달 지원</span>
                        <?php } ?>
                    </div>
                    <div class="icp-expand" id="icp_expand_bar" hidden>
                        <span class="icp-expand__label">AI 콘텐츠 확장</span>
                        <div class="icp-expand__chips" id="icp_expand_chips"></div>
                    </div>
                    <div class="icp-editor-box<?php echo $icp_use_editor ? ' icp-editor-box--se2' : ''; ?>">
                        <?php if ($icp_use_editor) { ?>
                            <?php echo editor_html($icp_editor_id, $icp_initial_content, true); ?>
                        <?php } else { ?>
                            <textarea class="icp-textarea" id="<?php echo icp_h($icp_editor_id); ?>" name="<?php echo icp_h($icp_editor_id); ?>" rows="18" placeholder="직접 작성하거나 AI 초안 생성 결과를 수정하세요."><?php echo icp_h($icp_initial_content); ?></textarea>
                        <?php } ?>
                    </div>
                </div>

                <?php if ($geo_enabled) { ?>
                <label class="icp-check">
                    <input type="checkbox" name="geo_package" id="icp_geo" value="1" checked>
                    <span>발행 시 GEO 패키지 적용 <span class="icp-muted">(SEO 메타 · FAQ · 순위 키워드)</span></span>
                </label>
                <?php } ?>

                <div class="icp-compose__footer">
                    <div class="icp-actions">
                        <button type="button" class="icc-btn" id="icp_save_btn">초안 저장</button>
                        <button type="button" class="icc-btn icc-btn--primary" id="icp_publish_btn">게시판 발행</button>
                    </div>
                    <p class="icp-msg" id="icp_compose_msg" role="status"></p>
                </div>
            </section>
        </div>
    </form>
</div>

<style>
.icp-compose{--icp-gap:24px;--icp-field-gap:20px;--icp-panel-pad:28px}
.icp-compose__head{margin-bottom:var(--icp-gap)}
.icp-compose__title{margin:0;font-size:24px;font-weight:800;letter-spacing:-.03em;line-height:1.25}
.icp-compose__sub{margin:10px 0 0;color:var(--icc-muted,var(--icrm-muted));font-size:14px;line-height:1.65;max-width:720px}
.icp-compose__alert{margin:0 0 var(--icp-gap);padding:14px 18px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;line-height:1.6}
.icp-compose__layout{display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);gap:var(--icp-gap);align-items:start}
.icp-compose__panel{background:var(--icc-panel,var(--icrm-surface));border:1px solid var(--icc-border,var(--icrm-border));border-radius:16px;padding:var(--icp-panel-pad);box-shadow:var(--icc-shadow,var(--icrm-shadow-xs))}
.icp-compose__panel--editor{min-height:560px;display:flex;flex-direction:column}
.icp-panel__head{display:flex;align-items:center;gap:12px;margin-bottom:22px}
.icp-panel__head--row{justify-content:space-between;flex-wrap:wrap;gap:10px}
.icp-panel__step{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#0f172a;color:#fff;font-size:13px;font-weight:800;flex-shrink:0}
.icp-panel__title{margin:0;font-size:16px;font-weight:800;letter-spacing:-.02em}
.icp-editor-badge{font-size:11px;font-weight:700;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:6px 12px;white-space:nowrap}
.icp-field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 var(--icp-field-gap)}
.icp-field{margin:0 0 var(--icp-field-gap)}
.icp-field-row .icp-field{margin-bottom:0}
.icp-field--half{display:block;width:auto}
.icp-field:last-child{margin-bottom:0}
.icp-field--editor{margin-bottom:18px;flex:1;display:flex;flex-direction:column;min-height:0}
.icp-label{display:block;margin-bottom:8px;font-size:13px;font-weight:700;color:#1e293b;letter-spacing:-.01em}
.icp-label-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.icp-label-row .icp-label{margin-bottom:0}
.icp-input,.icp-select,.icp-textarea{width:100%;padding:12px 14px;border:1px solid var(--icc-border,var(--icrm-border));border-radius:12px;font-size:14px;background:#fff;color:#0f172a;transition:border-color .15s,box-shadow .15s}
.icp-input:focus,.icp-select:focus,.icp-textarea:focus{outline:none;border-color:#94a3b8;box-shadow:0 0 0 3px rgba(148,163,184,.25)}
.icp-input--lg{font-size:15px;font-weight:600;padding:13px 14px}
.icp-textarea{resize:vertical;min-height:360px;line-height:1.7;font-family:inherit}
.icp-help{margin:8px 0 0;font-size:12px;line-height:1.5;color:var(--icc-muted,var(--icrm-muted))}
.icp-help--inline{margin:0;font-size:12px;color:#64748b}
.icp-muted{font-weight:500;color:var(--icc-muted,var(--icrm-muted))}
.icp-help--center{text-align:center;margin-top:10px}
.icp-aside__actions{margin-top:8px;padding-top:20px;border-top:1px solid var(--icc-border,var(--icrm-border))}
.icp-titles{margin-top:22px;padding-top:20px;border-top:1px dashed var(--icc-border,var(--icrm-border))}
.icp-titles__head{margin-bottom:12px}
.icp-titles__title{margin:0 0 4px;font-size:14px;font-weight:800;color:#0f172a}
.icp-titles__hint{font-size:12px;color:var(--icc-muted,var(--icrm-muted))}
.icp-titles__list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;max-height:320px;overflow:auto}
.icp-titles__item{margin:0}
.icp-titles__btn{width:100%;text-align:left;padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#0f172a;font-size:13px;line-height:1.55;cursor:pointer;transition:border-color .15s,background .15s,box-shadow .15s}
.icp-titles__btn:hover{border-color:#94a3b8;background:#f8fafc}
.icp-titles__btn.is-active{border-color:#0f172a;background:#f1f5f9;box-shadow:0 0 0 2px rgba(15,23,42,.08)}
.icp-titles__btn:disabled{opacity:.55;cursor:wait}
.icp-expand{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
.icp-expand__label{font-size:12px;font-weight:700;color:#475569;white-space:nowrap}
.icp-expand__chips{display:flex;flex-wrap:wrap;gap:8px}
.icp-expand__chip{padding:7px 12px;border:1px solid #dbeafe;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;cursor:pointer;transition:background .15s,border-color .15s}
.icp-expand__chip:hover{background:#dbeafe}
.icp-expand__chip:disabled{opacity:.55;cursor:wait}
.icp-btn-block{width:100%;justify-content:center}
.icp-check{display:flex;align-items:flex-start;gap:10px;margin:0 0 20px;font-size:13px;line-height:1.55;color:#475569;cursor:pointer}
.icp-check input{margin-top:3px;flex-shrink:0}
.icp-editor-box{border:1px solid var(--icc-border,var(--icrm-border));border-radius:12px;background:#fff;overflow:hidden;flex:1;min-height:420px}
.icp-editor-box--se2{padding:0;border:none;background:transparent;overflow:visible}
.icp-editor-box--se2 .cke_sc{margin:0 0 8px}
.icp-editor-box--se2 .btn_cke_sc{font-size:12px;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;cursor:pointer}
.icp-editor-box--se2 textarea.smarteditor2{display:none}
.icp-compose__footer{margin-top:auto;padding-top:22px;border-top:1px solid var(--icc-border,var(--icrm-border))}
.icp-actions{display:flex;gap:12px;flex-wrap:wrap}
.icp-msg{margin:14px 0 0;min-height:20px;font-size:13px;font-weight:600;line-height:1.5;color:var(--icc-muted,var(--icrm-muted))}
.icp-msg.is-ok{color:var(--icc-good,var(--icrm-success))}
.icp-msg.is-err{color:var(--icc-bad,#dc2626)}
/* SmartEditor2 모달·팝업이 Hub 레이아웃 위에 표시되도록 */
.icp-compose .se2_inputarea{z-index:1}
.icp-compose .husky_seditor_ui_fontName,
.icp-compose .husky_seditor_ui_hyperlink,
.icp-compose .husky_seditor_ui_photo_attach,
.icp-compose .se2_layer,
.icp-compose .se2_popup,
.icp-compose #smart_editor2_content iframe{max-width:100%}
body .se2_photo_quickUpload,
body .se2_photo_attach,
body .husky_se2_dialog,
body .se2_layer{display:block}
@media (max-width:1080px){.icp-compose__layout{grid-template-columns:1fr}.icp-field-row{grid-template-columns:1fr}}
@media (max-width:640px){.icp-compose{--icp-panel-pad:20px;--icp-field-gap:16px}.icp-compose__title{font-size:20px}}
</style>

<script>
(function() {
    var actionUrl = <?php echo json_encode($action_url); ?>;
    var inboxUrl = <?php echo json_encode(!empty($icrm_member_publish_mode) ? '' : icrm_admin_page_url('content', array('tab' => 'inbox'))); ?>;
    var icrmMemberPublish = <?php echo !empty($icrm_member_publish_mode) ? 'true' : 'false'; ?>;
    var boardMeta = <?php echo json_encode($board_meta, JSON_UNESCAPED_UNICODE); ?>;
    var icpEditorId = <?php echo json_encode($icp_editor_id); ?>;
    var icpUseEditor = <?php echo $icp_use_editor ? 'true' : 'false'; ?>;
    var icpPreload = <?php echo json_encode($icp_preload_item ? array(
        'ici_id'       => (int) $icp_preload_item['ici_id'],
        'topic'        => (string) ($icp_preload_item['source_title'] ?? ''),
        'keywords'     => implode(', ', (array) ($icp_preload_item['rank_keywords'] ?? array())),
        'bo_table'     => (string) ($icp_preload_item['bo_table'] ?? ''),
        'subject'      => (string) ($icp_preload_item['subject'] ?? ''),
        'content_html' => (string) ($icp_preload_item['content_html'] ?? ''),
        'ca_name'      => (string) ($icp_preload_item['ca_name'] ?? ''),
    ) : null, JSON_UNESCAPED_UNICODE); ?>;
    var icpMemberDraftsUrl = <?php echo json_encode($icrm_member_publish_mode && function_exists('icrm_member_url') ? icrm_member_url(array('m' => 'publish', 'tab' => 'drafts')) : ''); ?>;
    var icpMemberPublishedUrl = <?php echo json_encode($icrm_member_publish_mode && function_exists('icrm_member_url') ? icrm_member_url(array('m' => 'publish', 'tab' => 'published')) : ''); ?>;

    function icpSyncCategoryField() {
        var boEl = document.getElementById('icp_bo_table');
        var wrap = document.getElementById('icp_ca_wrap');
        var caEl = document.getElementById('icp_ca_name');
        if (!boEl || !wrap || !caEl) return;
        var bt = boEl.value || '';
        var meta = boardMeta && boardMeta[bt] ? boardMeta[bt] : null;
        var cats = meta && meta.categories ? meta.categories : [];
        caEl.innerHTML = '<option value="">선택</option>';
        if (!cats.length) {
            wrap.hidden = true;
            caEl.value = '';
            return;
        }
        cats.forEach(function(cat) {
            var opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            caEl.appendChild(opt);
        });
        wrap.hidden = false;
        if (icpPreload && icpPreload.ca_name) {
            caEl.value = icpPreload.ca_name;
        }
    }

    function setMsg(el, text, ok) {
        if (!el) return;
        el.textContent = text || '';
        el.classList.remove('is-ok', 'is-err');
        if (text === '') return;
        el.classList.add(ok ? 'is-ok' : 'is-err');
    }

    function icpSyncEditor() {
        if (!icpUseEditor || typeof oEditors === 'undefined' || !oEditors.getById || !oEditors.getById[icpEditorId]) {
            return;
        }
        oEditors.getById[icpEditorId].exec('UPDATE_CONTENTS_FIELD', []);
    }

    function icpGetContent() {
        icpSyncEditor();
        var el = document.getElementById(icpEditorId);
        return el ? String(el.value || '').trim() : '';
    }

    function icpTextToHtml(text) {
        text = String(text || '').trim();
        if (text === '') return '';
        if (/<[a-z][\s\S]*>/i.test(text)) return text;
        var parts = text.split(/\n{2,}/);
        return parts.map(function(p) {
            var safe = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            return '<p>' + safe + '</p>';
        }).join('');
    }

    function icpSetContent(raw) {
        var html = icpTextToHtml(raw);
        if (icpUseEditor && typeof oEditors !== 'undefined' && oEditors.getById && oEditors.getById[icpEditorId]) {
            var ed = oEditors.getById[icpEditorId];
            ed.exec('SET_IR', [html]);
            ed.exec('UPDATE_CONTENTS_FIELD', []);
            return;
        }
        var el = document.getElementById(icpEditorId);
        if (el) el.value = html || raw || '';
    }

    function icpSetContentWhenEditorReady(raw, attempts) {
        attempts = attempts || 0;
        if (!icpUseEditor) {
            icpSetContent(raw);
            return;
        }
        if (typeof oEditors !== 'undefined' && oEditors.getById && oEditors.getById[icpEditorId]) {
            icpSetContent(raw);
            return;
        }
        if (attempts > 30) {
            var el = document.getElementById(icpEditorId);
            if (el) el.value = icpTextToHtml(raw) || raw || '';
            return;
        }
        setTimeout(function() {
            icpSetContentWhenEditorReady(raw, attempts + 1);
        }, 100);
    }

    function icpContentIsEmpty(content) {
        if (!content) return true;
        var normalized = content.toLowerCase().replace(/^\s*|\s*$/g, '');
        var emptyValues = ['&nbsp;', '<p>&nbsp;</p>', '<p><br></p>', '<div><br></div>', '<p></p>', '<br>', ''];
        return emptyValues.indexOf(normalized) !== -1;
    }

    function formFields() {
        icpSyncEditor();
        var fd = new FormData();
        ['ici_id', 'topic', 'keywords', 'bo_table', 'mb_id', 'subject', 'ca_name'].forEach(function(name) {
            var el = document.querySelector('[name="' + name + '"]');
            if (el) fd.append(name, el.value);
        });
        fd.append('content_html', icpGetContent());
        var geo = document.getElementById('icp_geo');
        if (geo && geo.checked) fd.append('geo_package', '1');
        return fd;
    }

    function validateCompose(requireBody) {
        var topic = document.getElementById('icp_topic').value.trim();
        var subject = document.getElementById('icp_subject').value.trim();
        var content = icpGetContent();
        var bo = document.getElementById('icp_bo_table').value.trim();
        var mb = document.getElementById('icp_mb_id').value.trim();
        if (!bo) return '게시판을 선택해 주세요.';
        if (!mb) return '작성자 ID를 입력해 주세요.';
        if (requireBody) {
            if (!subject) return '제목을 입력해 주세요.';
            if (icpContentIsEmpty(content)) return '본문을 입력해 주세요.';
        }
        if (!requireBody && !topic) return '주제를 입력해 주세요.';
        return '';
    }

    function icpAppendContent(raw) {
        var html = icpTextToHtml(raw);
        if (!html) return;
        var current = icpGetContent();
        icpSetContent(current ? (current + html) : html);
    }

    function icpShowExpandBar(show) {
        var bar = document.getElementById('icp_expand_bar');
        if (bar) bar.hidden = !show;
    }

    function icpRenderTitles(titles) {
        var panel = document.getElementById('icp_titles_panel');
        var list = document.getElementById('icp_titles_list');
        if (!panel || !list) return;
        list.innerHTML = '';
        if (!titles || !titles.length) {
            panel.hidden = true;
            return;
        }
        titles.forEach(function(title) {
            var li = document.createElement('li');
            li.className = 'icp-titles__item';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icp-titles__btn';
            btn.textContent = title;
            btn.addEventListener('click', function() { icpGenerateFromTitle(title, btn); });
            li.appendChild(btn);
            list.appendChild(li);
        });
        panel.hidden = false;
    }

    function icpComposeBaseFields() {
        var fd = new FormData();
        fd.append('topic', document.getElementById('icp_topic').value.trim());
        fd.append('keywords', document.getElementById('icp_keywords').value.trim());
        fd.append('style', document.getElementById('icp_style').value);
        fd.append('length', document.getElementById('icp_length').value);
        return fd;
    }

    function icpLoadExpandPresets() {
        var chips = document.getElementById('icp_expand_chips');
        if (!chips || chips.dataset.loaded === '1') return;
        var fd = new FormData();
        fd.append('action', 'compose_expand_presets');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.ok || !res.presets) return;
                chips.innerHTML = '';
                res.presets.forEach(function(p) {
                    if (!p.key) return;
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'icp-expand__chip';
                    btn.textContent = p.label_ko || p.key;
                    btn.addEventListener('click', function() { icpExpandContent(p.key, btn); });
                    chips.appendChild(btn);
                });
                chips.dataset.loaded = '1';
            })
            .catch(function() {});
    }

    function icpExpandContent(type, btn) {
        var msg = document.getElementById('icp_compose_msg');
        var content = icpGetContent();
        if (icpContentIsEmpty(content)) {
            setMsg(msg, '본문을 먼저 생성하거나 입력해 주세요.', false);
            return;
        }
        var fd = new FormData();
        fd.append('action', 'compose_expand');
        fd.append('type', type);
        fd.append('subject', document.getElementById('icp_subject').value.trim());
        fd.append('content_html', content);
        if (btn) btn.disabled = true;
        setMsg(msg, 'AI 콘텐츠 확장 중…');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.ok && res.content) {
                    icpSetContent(res.content);
                    setMsg(msg, res.message || '본문을 확장했습니다.', true);
                } else {
                    setMsg(msg, res.message || res.error || '확장 실패', false);
                }
            })
            .catch(function() { setMsg(msg, '네트워크 오류', false); })
            .finally(function() { if (btn) btn.disabled = false; });
    }

    function icpGenerateFromTitle(title, btn) {
        var msg = document.getElementById('icp_ai_msg');
        var err = validateCompose(false);
        if (err) { setMsg(msg, err, false); return; }
        document.querySelectorAll('.icp-titles__btn').forEach(function(el) {
            el.classList.remove('is-active');
            el.disabled = true;
        });
        if (btn) btn.classList.add('is-active');
        var fd = icpComposeBaseFields();
        fd.append('action', 'compose_generate_draft');
        fd.append('title', title);
        setMsg(msg, '본문 생성 중… (분량에 따라 30~90초)');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.ok) {
                    document.getElementById('icp_subject').value = res.subject || title;
                    if (res.content) icpSetContent(res.content);
                    icpShowExpandBar(true);
                    icpLoadExpandPresets();
                    setMsg(msg, res.message || '본문을 생성했습니다. 확인 후 발행하세요.', true);
                } else {
                    setMsg(msg, res.message || res.error || '생성 실패', false);
                }
            })
            .catch(function() { setMsg(msg, '네트워크 오류', false); })
            .finally(function() {
                document.querySelectorAll('.icp-titles__btn').forEach(function(el) { el.disabled = false; });
            });
    }

    var titlesBtn = document.getElementById('icp_titles_btn');
    if (titlesBtn) {
        titlesBtn.addEventListener('click', function() {
            var msg = document.getElementById('icp_ai_msg');
            var err = validateCompose(false);
            if (err) { setMsg(msg, err, false); return; }
            var fd = icpComposeBaseFields();
            fd.append('action', 'compose_suggest_titles');
            titlesBtn.disabled = true;
            setMsg(msg, '제목 추천 중… (포인트가 차감될 수 있습니다)');
            fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    if (res.ok) {
                        icpRenderTitles(res.titles || []);
                        setMsg(msg, res.message || '제목을 선택해 본문을 생성하세요.', true);
                    } else {
                        setMsg(msg, res.message || res.error || '제목 추천 실패', false);
                    }
                })
                .catch(function() { setMsg(msg, '네트워크 오류', false); })
                .finally(function() { titlesBtn.disabled = false; });
        });
    }

    function postCompose(action, msgEl, confirmText, onSuccess) {
        var err = validateCompose(true);
        if (err) { setMsg(msgEl, err, false); return; }
        if (confirmText && !confirm(confirmText)) return;
        icpSyncEditor();
        var fd = formFields();
        fd.append('action', action);
        setMsg(msgEl, action === 'compose_publish' ? '발행 중…' : '저장 중…');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.ok) {
                    var errMsg = res.message || res.error || '실패';
                    if (res.error === 'forbidden_board' || res.error === 'write_level') {
                        errMsg += ' (게시판·레벨 확인)';
                    }
                    setMsg(msgEl, errMsg, false);
                    return;
                }
                if (res.ici_id) document.getElementById('icp_ici_id').value = res.ici_id;
                setMsg(msgEl, res.message || (action === 'compose_publish' ? '발행 완료' : '저장 완료'), true);
                if (typeof onSuccess === 'function') onSuccess(res);
            })
            .catch(function() { setMsg(msgEl, '네트워크 오류', false); });
    }

    var saveBtn = document.getElementById('icp_save_btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            postCompose('compose_save', document.getElementById('icp_compose_msg'), '', function(res) {
                if (!res.ici_id) return;
                if (icrmMemberPublish) {
                    setMsg(document.getElementById('icp_compose_msg'), (res.message || '저장 완료') + ' · 내 초안에서 이어서 작성할 수 있습니다.', true);
                    return;
                }
                setTimeout(function() {
                    location.href = inboxUrl + '&ici_id=' + res.ici_id + '&tab=detail';
                }, 600);
            });
        });
    }

    var publishBtn = document.getElementById('icp_publish_btn');
    if (publishBtn) {
        publishBtn.addEventListener('click', function() {
            postCompose('compose_publish', document.getElementById('icp_compose_msg'), '게시판에 발행할까요?', function(res) {
                if (res.final_url) {
                    setTimeout(function() { window.open(res.final_url, '_blank'); }, 400);
                }
                if (icrmMemberPublish && icpMemberPublishedUrl) {
                    setTimeout(function() {
                        if (confirm((res.message || '발행 완료') + '\n\n발행 완료 목록을 볼까요?')) {
                            location.href = icpMemberPublishedUrl;
                        }
                    }, 500);
                }
            });
        });
    }

    var boTableEl = document.getElementById('icp_bo_table');
    if (boTableEl) {
        boTableEl.addEventListener('change', icpSyncCategoryField);
        icpSyncCategoryField();
    }

    if (icpPreload && icpPreload.ici_id) {
        var preloadFields = {
            icp_ici_id: icpPreload.ici_id,
            icp_topic: icpPreload.topic || '',
            icp_keywords: icpPreload.keywords || '',
            icp_subject: icpPreload.subject || '',
            icp_bo_table: icpPreload.bo_table || ''
        };
        Object.keys(preloadFields).forEach(function(id) {
            var el = document.getElementById(id);
            if (el && preloadFields[id] !== '') el.value = preloadFields[id];
        });
        if (icpPreload.content_html) {
            icpSetContentWhenEditorReady(icpPreload.content_html);
            icpShowExpandBar(true);
            icpLoadExpandPresets();
        }
        icpSyncCategoryField();
    }
})();
</script>
