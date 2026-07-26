<?php
if (!defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

global $member;

define('ICRM_HUB_ACTIVE', true);
define('ICRM_MEMBER_PUBLISH', true);

$action_url = G5_PLUGIN_URL . '/icrm_member/action.php';
$publish_bo_table = isset($_GET['bo_table']) ? preg_replace('/[^a-z0-9_]/', '', strtolower((string) $_GET['bo_table'])) : '';
$publish_tab = isset($_GET['tab']) ? preg_replace('/[^a-z_]/', '', (string) $_GET['tab']) : 'write';
if (!in_array($publish_tab, array('write', 'drafts', 'published'), true)) {
    $publish_tab = 'write';
}

if (is_file(G5_LIB_PATH . '/icrm-member-board.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-member-board.lib.php';
}

if (is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-content.lib.php';
}
icrm_content_bootstrap();

$member_mb_id = !empty($member['mb_id']) ? (string) $member['mb_id'] : '';
$drafts_data = icrm_content_fetch_member_compose_items($member_mb_id, 'review', 1, 15);
$published_data = icrm_content_fetch_member_compose_items($member_mb_id, 'published', 1, 15);
$draft_count = isset($drafts_data['total']) ? (int) $drafts_data['total'] : 0;
$published_count = isset($published_data['total']) ? (int) $published_data['total'] : 0;

$icp_preload_item = null;
$ici_load_id = isset($_GET['ici_id']) ? (int) $_GET['ici_id'] : 0;
if ($ici_load_id > 0 && function_exists('icrm_content_member_can_access_item') && icrm_content_member_can_access_item($ici_load_id, $member_mb_id)) {
    $icp_preload_item = icrm_content_get_item($ici_load_id);
    if ($icp_preload_item) {
        $publish_tab = 'write';
    }
}

$publish_board_labels = array();
if (function_exists('icrm_member_board_list_manageable')) {
    foreach (icrm_member_board_list_manageable($member_mb_id) as $row) {
        if (!empty($row['bo_table'])) {
            $publish_board_labels[$row['bo_table']] = (string) ($row['bo_subject'] ?? $row['bo_table']);
        }
    }
}

?>
<nav class="icrm-member-publish-tabs" aria-label="콘텐츠 발행 메뉴">
    <a class="icrm-member-publish-tabs__link<?php echo $publish_tab === 'write' ? ' is-active' : ''; ?>" href="<?php echo icrm_member_h(icrm_member_url(array('m' => 'publish', 'tab' => 'write'))); ?>">새 글 작성</a>
    <a class="icrm-member-publish-tabs__link<?php echo $publish_tab === 'drafts' ? ' is-active' : ''; ?>" href="<?php echo icrm_member_h(icrm_member_url(array('m' => 'publish', 'tab' => 'drafts'))); ?>">
        내 초안<?php if ($draft_count > 0) { ?><span class="icrm-member-publish-tabs__badge"><?php echo (int) $draft_count; ?></span><?php } ?>
    </a>
    <a class="icrm-member-publish-tabs__link<?php echo $publish_tab === 'published' ? ' is-active' : ''; ?>" href="<?php echo icrm_member_h(icrm_member_url(array('m' => 'publish', 'tab' => 'published'))); ?>">
        발행 완료<?php if ($published_count > 0) { ?><span class="icrm-member-publish-tabs__badge"><?php echo (int) $published_count; ?></span><?php } ?>
    </a>
</nav>

<?php
if ($publish_tab === 'drafts') {
    $publish_history_items = isset($drafts_data['items']) ? $drafts_data['items'] : array();
    $publish_history_total = $draft_count;
    include __DIR__ . '/_panel_publish_history.php';
} elseif ($publish_tab === 'published') {
    $publish_history_items = isset($published_data['items']) ? $published_data['items'] : array();
    $publish_history_total = $published_count;
    include __DIR__ . '/_panel_publish_history.php';
} else {
    include G5_PLUGIN_PATH . '/icrm_hub/admin/views/content-publish.php';
}
