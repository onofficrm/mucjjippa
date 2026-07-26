<?php
if (!defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

$msg = isset($_GET['msg']) ? trim(strip_tags($_GET['msg'])) : '';
define('ICRM_MEMBER_DESIGN_EMBED', true);

if (is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {
    include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';
}

$design_status_label = '준비 중';
if (is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';
    if (function_exists('icrm_builder_deploy_read_state')) {
        $state = icrm_builder_deploy_read_state();
        if (!empty($state['release_id'])) {
            $design_status_label = (string) $state['release_id'];
        }
    }
}
?>
<section class="ob-hero ob-design-hero" aria-label="디자인 배포 안내">
    <div>
        <span class="ob-eyebrow">DESIGN DEPLOY</span>
        <h2>디자인 배포</h2>
        <p>빌더에서 다운로드한 ZIP 파일을 업로드하면 사이트 첫 화면에 바로 적용됩니다.</p>
    </div>
    <div class="ob-hero__status">
        <span>현재 적용 디자인</span>
        <strong><?php echo icrm_member_h($design_status_label); ?></strong>
    </div>
</section>

<section class="icrm-member-simple-guide ob-guide" aria-label="디자인 배포 사용방법">
    <div class="ob-card-header">
        <div>
            <h2 class="ob-card-title">1분 안에 이해하는 배포 순서</h2>
            <p class="ob-card-desc">압축을 풀지 않고 ZIP 그대로 올리면 됩니다.</p>
        </div>
    </div>
    <div class="ob-step-grid">
        <article class="ob-step-card">
            <span class="ob-step-card__icon">01</span>
            <h3>빌더에서 ZIP 다운로드</h3>
            <p>구글 스튜디오 빌더 또는 온오프빌더에서 완성한 화면을 ZIP 파일로 다운로드하세요.</p>
            <small>Tip. dist ZIP 또는 원본 프로젝트 ZIP 모두 사용할 수 있습니다.</small>
        </article>
        <article class="ob-step-card">
            <span class="ob-step-card__icon">02</span>
            <h3>ZIP 파일 업로드</h3>
            <p>압축을 해제하지 말고 그대로 업로드하세요. 프로젝트 ID와 이름은 자동 입력값을 사용해도 됩니다.</p>
            <small>Tip. 한 사이트의 기본 ID는 보통 <code>onoff</code>입니다.</small>
        </article>
        <article class="ob-step-card">
            <span class="ob-step-card__icon">03</span>
            <h3>사이트에 적용</h3>
            <p>업로드된 디자인을 선택한 뒤 사이트에 바로 적용하면 방문자 화면에 반영됩니다.</p>
            <small>Tip. 적용 후 미리보기와 사이트 보기를 확인하세요.</small>
        </article>
    </div>
</section>
<div class="icrm-member-embed">
<?php
include G5_PLUGIN_PATH . '/onoff-builder-bridge/member/_panel_design.php';
?>
</div>
<link rel="stylesheet" href="<?php echo icrm_member_h(G5_PLUGIN_URL . '/onoff-builder-bridge/assets/css/admin.css'); ?>">
<link rel="stylesheet" href="<?php echo icrm_member_h(G5_PLUGIN_URL . '/onoff-builder-bridge/assets/css/member.css'); ?>">
<script src="<?php echo icrm_member_h(G5_PLUGIN_URL . '/onoff-builder-bridge/assets/js/member.js'); ?>"></script>
<script>
document.body.setAttribute('data-action-url', <?php echo json_encode(function_exists('icrm_member_action_url') ? icrm_member_action_url() : G5_PLUGIN_URL . '/icrm_member/action.php'); ?>);
</script>
