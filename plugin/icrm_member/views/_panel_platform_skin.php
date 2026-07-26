<?php
if (!defined('ICRM_MEMBER_ACTIVE')) {
    exit;
}

if (is_file(G5_LIB_PATH . '/onoff-platform-skin.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-platform-skin.lib.php';
}

$ps = function_exists('onoff_platform_skin_get_status') ? onoff_platform_skin_get_status() : array(
    'ready' => false,
    'member_applied' => false,
);
$can_apply = function_exists('onoff_platform_skin_can_apply') && onoff_platform_skin_can_apply();
$action_url = icrm_member_action_url();
?>
<section class="onoff-builder-member__step icrm-platform-skin-panel" id="icrm-platform-skin" style="margin-top:24px">
  <h2>3. 플랫폼 스킨</h2>
  <p class="onoff-builder-admin__hint" style="margin:0 0 14px;line-height:1.6">
    로그인·회원가입·게시판 화면을 온오프 플랫폼 기본 디자인으로 통일합니다.
    빌더 랜딩 페이지와 별도로, 그누보드 회원·게시판 영역에 적용됩니다.
  </p>

  <dl class="onoff-builder-member__status">
    <dt>스킨 파일</dt>
    <dd>
      <?php if (!empty($ps['ready'])) { ?>
      <span style="color:#0f766e;font-weight:700">설치됨</span>
      <?php } else { ?>
      <span style="color:#b45309">없음 — 온오프빌더 업데이트 후 다시 확인</span>
      <?php } ?>
    </dd>
    <dt>회원 스킨</dt>
    <dd><code><?php echo icrm_member_h($ps['member_skin'] ?? 'onoff'); ?></code>
      PC · 모바일
      <?php echo !empty($ps['member_applied']) ? ' · <span style="color:#0f766e">적용됨</span>' : ' · 미적용'; ?>
      <?php if (empty($ps['member_files_ok'])) { ?>
      · <span style="color:#b45309">PC/모바일 파일 없음</span>
      <?php } ?>
    </dd>
    <dt>아웃로그인</dt>
    <dd><code><?php echo icrm_member_h($ps['outlogin_skin'] ?? 'onoff'); ?></code>
      <?php if (!empty($ps['outlogin_files_ok'])) { ?>
      · <span style="color:#0f766e">설치됨</span>
      <?php } else { ?>
      · <span style="color:#b45309">없음</span>
      <?php } ?>
      (사이드·모바일 메뉴)
    </dd>
    <dt>게시판 스킨</dt>
    <dd>
      <?php if (!empty($ps['board_templates']) && is_array($ps['board_templates'])) { ?>
      <ul style="margin:0;padding:0;list-style:none;line-height:1.7">
        <?php foreach ($ps['board_templates'] as $tpl_key => $tpl_row) { ?>
        <li>
          <?php echo icrm_member_h($tpl_row['label'] ?? $tpl_key); ?>
          · <code><?php echo icrm_member_h($tpl_row['skin'] ?? ''); ?></code>
          <?php if (!empty($tpl_row['exists'])) { ?>
          <span style="color:#0f766e">설치됨</span>
          <?php } else { ?>
          <span style="color:#b45309">없음</span>
          <?php } ?>
        </li>
        <?php } ?>
      </ul>
      <?php } else { ?>
      <code><?php echo icrm_member_h($ps['board_skin'] ?? 'onoff-column'); ?></code>
      <?php } ?>
      (내 게시판 <?php echo (int) ($ps['board_log_count'] ?? 0); ?>개 연동 가능)
    </dd>
    <?php if (!empty($ps['brand_color'])) { ?>
    <dt>브랜드 컬러</dt>
    <dd><code><?php echo icrm_member_h($ps['brand_color']); ?></code>
      → <code>--onoff-accent</code> (플랫폼 스킨 적용 시)
    </dd>
    <?php } ?>
    <dt>테마 연동</dt>
    <dd>
      <?php if (!empty($ps['theme_ready'])) { ?>
      <span style="color:#0f766e">theme/basic · 루트 레이아웃</span> 아웃로그인 onoff 연동
      <?php } else { ?>
      플랫폼 스킨 적용 후 테마·사이드바에 자동 반영
      <?php } ?>
    </dd>
    <?php if (!empty($ps['applied_at'])) { ?>
    <dt>마지막 적용</dt>
    <dd><?php echo icrm_member_h($ps['applied_at']); ?></dd>
    <?php } ?>
  </dl>

  <?php if (!$can_apply) { ?>
  <p class="onoff-builder-admin__alert">플랫폼 스킨 적용은 <strong>최고관리자</strong>만 할 수 있습니다. 로그인·게시판 미리보기는 아래 링크로 확인하세요.</p>
  <?php } ?>

  <div class="onoff-builder-admin__form-actions">
    <button type="button" class="onoff-builder-admin__btn onoff-builder-admin__btn--primary" id="icrm-platform-skin-apply"
      <?php echo ($can_apply && !empty($ps['ready'])) ? '' : 'disabled'; ?>>
      플랫폼 스킨 적용
    </button>
    <?php if (!empty($ps['login_url'])) { ?>
    <a class="onoff-builder-admin__btn" href="<?php echo icrm_member_h($ps['login_url']); ?>" target="_blank" rel="noopener">로그인 미리보기</a>
    <?php } ?>
    <?php if (!empty($ps['register_url'])) { ?>
    <a class="onoff-builder-admin__btn" href="<?php echo icrm_member_h($ps['register_url']); ?>" target="_blank" rel="noopener">회원가입 미리보기</a>
    <?php } ?>
  </div>
  <p class="icp-msg" id="icrm_platform_skin_msg" role="status" style="margin-top:12px"></p>
</section>

<script>
(function() {
  var btn = document.getElementById('icrm-platform-skin-apply');
  var msg = document.getElementById('icrm_platform_skin_msg');
  var actionUrl = <?php echo json_encode($action_url); ?>;
  if (!btn) return;
  btn.addEventListener('click', function() {
    if (!confirm('회원·아웃로그인·템플릿별 게시판 스킨(PC·모바일)을 적용합니다. 계속할까요?')) return;
    btn.disabled = true;
    if (msg) { msg.textContent = '적용 중…'; msg.className = 'icp-msg'; }
    var fd = new FormData();
    fd.append('action', 'platform_skin_apply');
    fetch(actionUrl, { method: 'POST', credentials: 'same-origin', body: fd })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.ok) throw new Error(data.error || (data.result && data.result.message) || '실패');
        if (msg) {
          msg.textContent = (data.result && data.result.message) || '완료';
          msg.className = 'icp-msg is-ok';
        }
        setTimeout(function() { location.reload(); }, 900);
      })
      .catch(function(err) {
        btn.disabled = false;
        if (msg) {
          msg.textContent = err.message || '요청 실패';
          msg.className = 'icp-msg is-err';
        }
      });
  });
})();
</script>
