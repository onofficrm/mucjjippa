<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

include_once G5_SKIN_PATH . '/_inc/onoff-platform.php';
onoff_platform_outlogin_styles($outlogin_skin_url);
?>

<!-- 로그인 전 아웃로그인 { -->
<section id="ol_before" class="ol onoff-platform onoff-platform--outlogin">
    <div id="ol_be_cate" class="onoff-platform__outlogin-head">
        <h2><span class="sound_only">회원</span>로그인</h2>
        <a href="<?php echo G5_BBS_URL ?>/register.php" class="join">회원가입</a>
    </div>
    <form name="foutlogin" action="<?php echo $outlogin_action_url ?>" onsubmit="return fhead_submit(this);" method="post" autocomplete="off">
        <fieldset>
            <div class="ol_wr">
                <input type="hidden" name="url" value="<?php echo $outlogin_url ?>">
                <label for="ol_id" id="ol_idlabel" class="sound_only">회원아이디<strong>필수</strong></label>
                <input type="text" id="ol_id" name="mb_id" required maxlength="20" placeholder="아이디" class="frm_input">
                <label for="ol_pw" id="ol_pwlabel" class="sound_only">비밀번호<strong>필수</strong></label>
                <input type="password" name="mb_password" id="ol_pw" required maxlength="20" placeholder="비밀번호" class="frm_input">
                <input type="submit" id="ol_submit" value="로그인" class="btn_submit">
            </div>
            <div class="ol_auto_wr">
                <div id="ol_auto" class="chk_box">
                    <input type="checkbox" name="auto_login" value="1" id="auto_login" class="selec_chk">
                    <label for="auto_login" id="auto_login_label"><span></span>자동로그인</label>
                </div>
                <div id="ol_svc">
                    <a href="<?php echo G5_BBS_URL ?>/password_lost.php">ID/PW 찾기</a>
                </div>
            </div>
            <?php @include_once(get_social_skin_path() . '/social_login.skin.php'); ?>
        </fieldset>
    </form>
</section>

<script>
jQuery(function($) {
    var $omi = $('#ol_id'),
        $omp = $('#ol_pw'),
        $omi_label = $('#ol_idlabel'),
        $omp_label = $('#ol_pwlabel');

    $omi_label.addClass('ol_idlabel');
    $omp_label.addClass('ol_pwlabel');

    $("#auto_login").click(function() {
        if ($(this).is(":checked")) {
            if (!confirm("자동로그인을 사용하시면 다음부터 회원아이디와 비밀번호를 입력하실 필요가 없습니다.\n\n공공장소에서는 개인정보가 유출될 수 있으니 사용을 자제하여 주십시오.\n\n자동로그인을 사용하시겠습니까?")) {
                return false;
            }
        }
    });
});

function fhead_submit(f)
{
    if ($(document.body).triggerHandler('outlogin1', [f, 'foutlogin']) !== false) {
        return true;
    }
    return false;
}
</script>
<!-- } 로그인 전 아웃로그인 -->
