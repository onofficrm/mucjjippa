<?php
if (!defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

$modules = icrm_member_modules();
$license_ok = function_exists('icrm_admin_shell_license_ok') ? icrm_admin_shell_license_ok() : false;
$quick_icons = array(
    'home' => '⌂',
    'design' => '▣',
    'points' => '＋',
    'report' => '▤',
    'update' => '↻',
);
?>
<?php include __DIR__ . '/_panel_onboarding.php'; ?>

<div class="icrm-member-dash ob-quick-grid">
    <?php foreach ($modules as $key => $item) {
        if ($key === 'update' && !icrm_member_can_access()) {
            continue;
        }
        $can = icrm_member_can_module($key);
        $lock_reason = $can ? '' : icrm_member_module_lock_reason($key);
        ?>
    <div class="icrm-member-card ob-card ob-quick-card<?php echo $can ? '' : ' is-locked'; ?>">
        <div class="ob-quick-card__icon" aria-hidden="true"><?php echo icrm_member_h(isset($quick_icons[$key]) ? $quick_icons[$key] : '•'); ?></div>
        <div class="icrm-member-card__body">
            <div class="ob-quick-card__head">
                <h3><?php echo icrm_member_h($item['label']); ?></h3>
                <?php if ($can) { ?>
                <span class="ob-badge ob-badge-success">사용 가능</span>
                <?php } else { ?>
                <span class="ob-badge ob-badge-warning">잠김</span>
                <?php } ?>
            </div>
            <p><?php echo icrm_member_h($item['desc']); ?></p>
        </div>
        <?php if ($can) { ?>
        <div class="icrm-member-card__footer">
            <a class="icc-btn icc-btn--primary ob-btn ob-btn-primary" href="<?php echo icrm_member_h(icrm_member_url($key)); ?>">
                <?php echo $key === 'home' ? '바로가기' : '열기'; ?>
            </a>
        </div>
        <?php } else { ?>
        <p class="icrm-member-card__lock"><?php echo icrm_member_h($lock_reason); ?></p>
        <?php } ?>
    </div>
    <?php } ?>
</div>

<div class="icrm-member-dash-status ob-alert ob-alert-info">
    <strong>온오프빌더 연동</strong>
    <?php if ($license_ok) { ?>
    <span class="ob-inline-success"> · 연동됨</span>
    <?php } else { ?>
    <span class="ob-inline-warning"> · 미설정 (관리자에게 문의)</span>
    <?php } ?>
    <?php if (icrm_member_can_update()) { ?>
    <span style="color:#64748b"> · 이 화면은 디자인 배포와 업데이트만 관리합니다.</span>
    <?php } elseif (icrm_member_can_access()) { ?>
    <span style="color:#64748b"> · 디자인 배포와 업데이트만 간단하게 관리합니다.</span>
    <?php } ?>
</div>
