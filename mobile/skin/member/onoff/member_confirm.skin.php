<?php
if (!defined('_GNUBOARD_')) exit;

include_once G5_SKIN_PATH . '/_inc/onoff-platform.php';
onoff_platform_member_styles($member_skin_url);

$onoff_confirm_label = ($url === 'member_leave.php') ? '회원탈퇴' : '정보수정';
?>

<!-- 회원 비밀번호 확인 시작 { -->
<div class="onoff-platform onoff-platform--member">
<?php onoff_platform_member_top_bar(); ?>
<div id="mb_confirm" class="mbskin onoff-platform__card">
    <?php onoff_platform_member_brand($onoff_confirm_label); ?>

    <p>
        <strong>비밀번호를 한번 더 입력해주세요.</strong><br>
        <?php if ($url === 'member_leave.php') { ?>
        비밀번호를 입력하시면 회원탈퇴가 완료됩니다.
        <?php } else { ?>
        회원님의 정보를 안전하게 보호하기 위해 비밀번호를 한번 더 확인합니다.
        <?php } ?>
    </p>

    <form name="fmemberconfirm" action="<?php echo $url ?>" onsubmit="return fmemberconfirm_submit(this);" method="post">
    <input type="hidden" name="mb_id" value="<?php echo $member['mb_id'] ?>">
    <input type="hidden" name="w" value="u">

    <fieldset>
        <span class="confirm_id">회원아이디</span>
        <span id="mb_confirm_id"><?php echo $member['mb_id'] ?></span>
        <label for="confirm_mb_password" class="sound_only">비밀번호<strong>필수</strong></label>
        <input type="password" name="mb_password" id="confirm_mb_password" required class="required frm_input" size="15" maxLength="20" placeholder="비밀번호">
        <button type="submit" id="btn_submit" class="btn_submit">확인</button>
    </fieldset>

    </form>
</div>
<?php onoff_platform_member_footer(); ?>
</div>

<script>
function fmemberconfirm_submit(f)
{
    document.getElementById("btn_submit").disabled = true;

    return true;
}
</script>
<!-- } 회원 비밀번호 확인 끝 -->
