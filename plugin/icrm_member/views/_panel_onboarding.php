<?php
if (!defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

global $member;

$onboarding = icrm_member_onboarding_checklist(!empty($member['mb_id']) ? $member['mb_id'] : '');
if (empty($onboarding['steps'])) {
    return;
}
?>
<section class="icrm-member-onboarding<?php echo !empty($onboarding['complete']) ? ' is-complete' : ''; ?>" aria-label="시작하기 체크리스트">
    <div class="icrm-member-onboarding__head">
        <div>
            <h2 class="icrm-member-onboarding__title">시작하기</h2>
            <p class="icrm-member-onboarding__lead">
                <?php if (!empty($onboarding['complete'])) { ?>
                모든 준비가 끝났습니다. 아래 메뉴에서 계속 운영하세요.
                <?php } else { ?>
                아래 순서대로 진행하면 홈페이지 디자인을 적용할 수 있습니다.
                <?php } ?>
            </p>
        </div>
        <div class="icrm-member-onboarding__progress-wrap">
            <span class="icrm-member-onboarding__count">
                <?php echo (int) $onboarding['done_count']; ?> / <?php echo (int) $onboarding['total_count']; ?> 완료
            </span>
            <div class="icrm-member-onboarding__bar" role="progressbar" aria-valuenow="<?php echo (int) $onboarding['progress_pct']; ?>" aria-valuemin="0" aria-valuemax="100">
                <span class="icrm-member-onboarding__bar-fill" style="width:<?php echo (int) $onboarding['progress_pct']; ?>%"></span>
            </div>
        </div>
    </div>

    <ol class="icrm-member-onboarding__steps">
        <?php foreach ($onboarding['steps'] as $idx => $step) {
            $classes = array('icrm-member-onboarding__step');
            if (!empty($step['done'])) {
                $classes[] = 'is-done';
            } elseif (!empty($step['current'])) {
                $classes[] = 'is-current';
            }
            ?>
        <li class="<?php echo icrm_member_h(implode(' ', $classes)); ?>">
            <span class="icrm-member-onboarding__marker" aria-hidden="true">
                <?php if (!empty($step['done'])) { ?>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>
                <?php } else { ?>
                <?php echo (int) ($idx + 1); ?>
                <?php } ?>
            </span>
            <div class="icrm-member-onboarding__body">
                <div class="icrm-member-onboarding__row">
                    <strong><?php echo icrm_member_h($step['label']); ?></strong>
                    <?php if (!empty($step['done'])) { ?>
                    <span class="icrm-member-onboarding__badge is-done">완료</span>
                    <?php } elseif (!empty($step['current'])) { ?>
                    <span class="icrm-member-onboarding__badge is-current">다음</span>
                    <?php } ?>
                </div>
                <p class="icrm-member-onboarding__desc"><?php echo icrm_member_h($step['desc']); ?></p>
                <p class="icrm-member-onboarding__status"><?php echo icrm_member_h($step['status_text']); ?></p>
            </div>
            <?php if (empty($step['done']) && !empty($step['url'])) { ?>
            <div class="icrm-member-onboarding__action">
                <a class="icc-btn<?php echo !empty($step['current']) ? ' icc-btn--primary' : ' icc-btn--ghost'; ?>" href="<?php echo icrm_member_h($step['url']); ?>">
                    <?php echo !empty($step['current']) ? '진행하기' : '열기'; ?>
                </a>
            </div>
            <?php } ?>
        </li>
        <?php } ?>
    </ol>
</section>
