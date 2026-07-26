<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

global $member;

$zip_ok = class_exists('ZipArchive');
$msg = isset($_GET['msg']) ? trim(strip_tags($_GET['msg'])) : '';
$projects = onoff_builder_get_imports();
$default_project_id = '';
$default_project_name = '';

if (function_exists('g5site_cfg')) {
    $default_project_id = trim(g5site_cfg('home_builder_bridge_id', ''));
}
if ($default_project_id === '' && $projects !== array()) {
    $default_project_id = isset($projects[0]['id']) ? (string) $projects[0]['id'] : '';
}
if ($default_project_id !== '' && onoff_builder_project_exists($default_project_id)) {
    $row = onoff_builder_get_import($default_project_id);
    if (is_array($row) && !empty($row['name'])) {
        $default_project_name = (string) $row['name'];
    }
}

$default_project_needs_build = false;
if ($default_project_id !== '' && function_exists('onoff_builder_project_needs_build')) {
    $default_project_needs_build = onoff_builder_project_needs_build($default_project_id);
}

$needs_build_projects = array();
foreach ($projects as $proj) {
    $pid = isset($proj['id']) ? (string) $proj['id'] : '';
    if ($pid !== '' && function_exists('onoff_builder_project_needs_build') && onoff_builder_project_needs_build($pid, $proj)) {
        $needs_build_projects[] = $proj;
    }
}

$license_ok = false;
$deploy_ready = false;
$deploy_message = '';
$central_error = '';
$builder_status = array(
    'local_release'    => '',
    'remote_release'   => '',
    'update_available' => false,
    'page_url'         => '',
    'home_url'         => '',
    'preview_url'      => '',
    'history'          => array(),
    'project_id'       => '',
    'project_name'     => '',
);

if (is_file(G5_LIB_PATH . '/icrm-builder-deploy.lib.php')) {
    include_once G5_LIB_PATH . '/icrm-builder-deploy.lib.php';
    if (function_exists('icrm_builder_deploy_get_license_key')) {
        $license_ok = icrm_builder_deploy_get_license_key() !== '';
    }
    if ($license_ok && function_exists('icrm_builder_deploy_check_status')) {
        $builder_status = icrm_builder_deploy_check_status();
        $deploy_ready = !empty($builder_status['ready']) || !empty($builder_status['license_ok']);
        $deploy_message = isset($builder_status['message']) ? (string) $builder_status['message'] : '';
        $central_error = isset($builder_status['central_error']) ? (string) $builder_status['central_error'] : '';
    } elseif (!$license_ok) {
        $deploy_message = '온오프빌더 라이선스가 아직 설정되지 않았습니다. 관리자에게 문의하세요.';
    }
}

$local_preview_url = '';
if ($default_project_id !== '' && onoff_builder_project_exists($default_project_id)) {
    $local_preview_url = G5_PLUGIN_URL . '/onoff-builder-bridge/page.php?id=' . rawurlencode($default_project_id);
}
$member_preview_url = (defined('ICRM_MEMBER_DESIGN_EMBED') && $local_preview_url !== '')
    ? $local_preview_url
    : (isset($builder_status['preview_url']) ? (string) $builder_status['preview_url'] : '');

$upload_action = defined('ICRM_MEMBER_DESIGN_EMBED')
    ? G5_PLUGIN_URL . '/onoff-builder-bridge/member/upload_update.php'
    : onoff_builder_member_url('upload_update.php');

$design_action_url = defined('ICRM_MEMBER_DESIGN_EMBED') && function_exists('icrm_member_action_url')
    ? icrm_member_action_url()
    : onoff_builder_member_url('action.php');
?>

<?php if (!defined('ICRM_MEMBER_DESIGN_EMBED')) { ?>
<div class="onoff-builder-admin__page-head">
  <h1>디자인 배포</h1>
  <p class="onoff-builder-admin__lead">ZIP을 올리고, 적용 버튼을 누르면 사이트 첫 화면이 바뀝니다.</p>
  <?php if (!empty($member['mb_nick'])) { ?>
  <p class="onoff-builder-admin__hint">로그인: <?php echo onoff_builder_escape($member['mb_nick']); ?> (레벨 <?php echo (int) $member['mb_level']; ?>)</p>
  <?php } ?>
</div>
<?php } ?>

<?php if ($msg !== '') { ?>
<p class="onoff-builder-admin__notice"><?php echo onoff_builder_escape($msg); ?></p>
<?php } ?>

<div id="obb-member-msg" class="onoff-builder-member__msg" hidden></div>

<div class="onoff-builder-member__steps ob-design-stack">
  <section class="onoff-builder-member__step ob-card ob-upload-card">
    <div class="ob-card-header">
      <div>
        <h2 class="ob-card-title">ZIP 업로드</h2>
        <p class="ob-card-desc">빌더에서 받은 ZIP 파일을 선택하세요. 프로젝트 ID와 이름은 기본값을 그대로 사용해도 됩니다.</p>
      </div>
      <span class="ob-badge <?php echo $zip_ok ? 'ob-badge-success' : 'ob-badge-danger'; ?>"><?php echo $zip_ok ? '업로드 가능' : 'ZipArchive 없음'; ?></span>
    </div>
    <?php if (!$zip_ok) { ?>
    <p class="onoff-builder-admin__alert ob-alert ob-alert-danger">서버에 ZipArchive가 없어 업로드를 사용할 수 없습니다.</p>
    <?php } else { ?>
    <form class="onoff-builder-admin__form ob-form-card" method="post" action="<?php echo onoff_builder_escape($upload_action); ?>" enctype="multipart/form-data">
      <div class="onoff-builder-admin__field ob-form-group">
        <label for="project_id">프로젝트 ID</label>
        <input class="ob-input" type="text" name="project_id" id="project_id" required pattern="[a-z0-9_-]{2,50}" maxlength="50" value="<?php echo onoff_builder_escape($default_project_id); ?>" placeholder="headnerve-main">
        <p class="onoff-builder-admin__hint ob-help-text">영문/숫자로 된 구분값입니다. 잘 모르겠으면 자동 입력된 값을 그대로 두세요.</p>
      </div>
      <div class="onoff-builder-admin__field ob-form-group">
        <label for="project_name">프로젝트 이름</label>
        <input class="ob-input" type="text" name="project_name" id="project_name" required maxlength="100" value="<?php echo onoff_builder_escape($default_project_name); ?>" placeholder="메인 홈페이지">
        <p class="onoff-builder-admin__hint ob-help-text">관리 화면에서 알아보기 쉬운 이름입니다. 예: 메인 홈페이지</p>
      </div>
      <div class="onoff-builder-admin__field ob-form-group">
        <label for="zip_file">ZIP 파일</label>
        <label class="ob-upload-drop" for="zip_file">
          <span class="ob-upload-drop__icon">ZIP</span>
          <span class="ob-upload-drop__text"><strong>ZIP 파일 선택</strong><em>압축 해제 없이 그대로 업로드하세요.</em></span>
          <input type="file" name="zip_file" id="zip_file" accept=".zip,application/zip" required>
        </label>
        <p class="onoff-builder-admin__hint ob-help-text">빌더에서 내려받은 ZIP 파일을 압축 해제하지 말고 그대로 올리세요.</p>
      </div>
      <div class="onoff-builder-admin__form-actions ob-actions">
        <button type="submit" class="onoff-builder-admin__btn onoff-builder-admin__btn--primary ob-btn ob-btn-primary">ZIP 업로드하고 바로 적용</button>
      </div>
    </form>
    <?php } ?>
  </section>

  <?php if (false && $needs_build_projects !== array() && $zip_ok) { ?>
  <section class="onoff-builder-member__step" id="obb-build-step">
    <h2>1-2. 빌드 (원본 ZIP 업로드 후)</h2>
    <p>원본 프로젝트가 저장된 경우, 온오프빌더에서 빌드하거나 로컬에서 <code>npm run build</code> 후 dist ZIP을 별도로 업로드할 수 있습니다.</p>

    <div class="onoff-builder-admin__form-actions" style="margin-bottom:16px">
      <button type="button" class="onoff-builder-admin__btn onoff-builder-admin__btn--primary" id="obb-build-source"
        data-project-id="<?php echo onoff_builder_escape($default_project_id); ?>"
        <?php echo ($license_ok && $default_project_needs_build && function_exists('icrm_builder_deploy_build_source_project')) ? '' : 'disabled'; ?>>
        온오프빌더에서 빌드
      </button>
    </div>

    <form class="onoff-builder-admin__form" method="post" action="<?php echo onoff_builder_escape($upload_action); ?>" enctype="multipart/form-data">
      <input type="hidden" name="dist_only" value="1">
      <div class="onoff-builder-admin__field">
        <label for="dist_project_id">프로젝트 ID</label>
        <select name="project_id" id="dist_project_id" required>
          <?php foreach ($needs_build_projects as $proj) {
              $pid = isset($proj['id']) ? (string) $proj['id'] : '';
              $pname = isset($proj['name']) ? (string) $proj['name'] : $pid;
              $selected = ($pid === $default_project_id) ? ' selected' : '';
              ?>
          <option value="<?php echo onoff_builder_escape($pid); ?>"<?php echo $selected; ?>><?php echo onoff_builder_escape($pname); ?> (<?php echo onoff_builder_escape($pid); ?>)</option>
          <?php } ?>
        </select>
      </div>
      <div class="onoff-builder-admin__field">
        <label for="dist_project_name">프로젝트 이름</label>
        <input type="text" name="project_name" id="dist_project_name" required maxlength="100" value="<?php echo onoff_builder_escape($default_project_name); ?>">
      </div>
      <div class="onoff-builder-admin__field">
        <label for="dist_zip_file">dist ZIP (별도 업로드)</label>
        <input type="file" name="zip_file" id="dist_zip_file" accept=".zip,application/zip" required>
      </div>
      <div class="onoff-builder-admin__form-actions">
        <button type="submit" class="onoff-builder-admin__btn">dist ZIP 업로드</button>
      </div>
    </form>
  </section>
  <?php } ?>

  <section class="onoff-builder-member__step ob-card ob-apply-card">
    <div class="ob-card-header">
      <div>
        <h2 class="ob-card-title">사이트에 적용</h2>
        <p class="ob-card-desc">업로드한 디자인을 실제 사이트 첫 화면에 반영합니다. 이 버튼을 눌러야 방문자에게 새 디자인이 보입니다.</p>
      </div>
      <?php if (!empty($builder_status['update_available'])) { ?>
      <span class="ob-badge ob-badge-warning">새 디자인 있음</span>
      <?php } else { ?>
      <span class="ob-badge ob-badge-success">대기 중</span>
      <?php } ?>
    </div>

    <?php if ($projects === array()) { ?>
    <p class="onoff-builder-admin__hint ob-empty">먼저 위에서 ZIP을 업로드하세요.</p>
    <?php } else { ?>
    <div class="onoff-builder-admin__field ob-form-group">
      <label for="obb-project-select">적용할 디자인</label>
      <select id="obb-project-select" class="ob-input" disabled style="max-width:100%">
        <?php foreach ($projects as $p) {
            $pid = isset($p['id']) ? $p['id'] : '';
            $pname = isset($p['name']) ? $p['name'] : $pid;
            $selected = ($pid === $default_project_id) ? ' selected' : '';
            $needs_build = function_exists('onoff_builder_project_needs_build')
                && onoff_builder_project_needs_build($pid, $p) ? ' data-needs-build="1"' : '';
            ?>
        <option value="<?php echo onoff_builder_escape($pid); ?>"<?php echo $selected . $needs_build; ?>><?php echo onoff_builder_escape($pname); ?><?php echo $needs_build !== '' ? ' (빌드 필요)' : ''; ?> (<?php echo onoff_builder_escape($pid); ?>)</option>
        <?php } ?>
      </select>
    </div>

    <dl class="onoff-builder-member__status ob-status-grid">
      <div class="ob-status-row"><dt>사이트 적용 버전</dt>
      <dd><code><?php echo onoff_builder_escape($builder_status['local_release'] ?: '(없음)'); ?></code></dd></div>
      <div class="ob-status-row"><dt>최신 디자인</dt>
      <dd><code><?php echo onoff_builder_escape($builder_status['remote_release'] ?: '-'); ?></code></dd></div>
      <?php if (!empty($builder_status['page_url'])) { ?>
      <div class="ob-status-row ob-status-row--url"><dt>페이지 URL</dt>
      <dd><a href="<?php echo onoff_builder_escape($builder_status['page_url']); ?>" target="_blank" rel="noopener"><?php echo onoff_builder_escape($builder_status['page_url']); ?></a>
        <button type="button" class="ob-copy-btn" data-copy="<?php echo onoff_builder_escape($builder_status['page_url']); ?>">복사</button>
      </dd></div>
      <?php } ?>
    </dl>

    <?php if ($deploy_message !== '' && (!$license_ok || !$deploy_ready)) { ?>
    <p class="onoff-builder-admin__alert ob-alert ob-alert-danger"><?php echo onoff_builder_escape($deploy_message); ?></p>
    <?php } elseif ($central_error !== '') { ?>
    <p class="onoff-builder-admin__hint ob-alert ob-alert-info"><?php echo onoff_builder_escape($deploy_message); ?></p>
    <?php } ?>

    <?php if ($default_project_needs_build) { ?>
    <p class="onoff-builder-admin__alert ob-alert ob-alert-info">원본 프로젝트입니다. <strong>사이트에 바로 적용</strong>을 누르면 온오프빌더가 자동 빌드 후 적용합니다. 1~3분 정도 걸릴 수 있습니다.</p>
    <?php } ?>

    <div class="onoff-builder-admin__form-actions ob-actions">
      <button type="button" class="onoff-builder-admin__btn onoff-builder-admin__btn--primary ob-btn ob-btn-primary" id="obb-publish-apply"
        data-project-id="<?php echo onoff_builder_escape($default_project_id); ?>"
        <?php echo ($license_ok && $default_project_id !== '' && function_exists('icrm_builder_deploy_publish_and_apply')) ? '' : 'disabled'; ?>>
        사이트에 바로 적용
      </button>
      <?php if ($member_preview_url !== '') { ?>
      <a class="onoff-builder-admin__btn ob-btn ob-btn-secondary" href="<?php echo onoff_builder_escape($member_preview_url); ?>" target="_blank" rel="noopener"><?php echo (defined('ICRM_MEMBER_DESIGN_EMBED') && $local_preview_url !== '') ? '업로드본 미리보기' : '적용 전 미리보기'; ?></a>
      <?php } ?>
      <button type="button" class="onoff-builder-admin__btn ob-btn ob-btn-outline" id="obb-rollback" <?php echo empty($builder_status['history']) ? 'disabled' : ''; ?>>이전 디자인으로 되돌리기</button>
      <button type="button" class="onoff-builder-admin__btn ob-btn ob-btn-outline" id="obb-reset" <?php echo empty($builder_status['local_release']) && empty($builder_status['project_id']) ? 'disabled' : ''; ?>>사이트 적용 초기화</button>
    </div>
    <p class="ob-alert ob-alert-info ob-safe-note">디자인 배포는 사이트 첫 화면 디자인만 변경합니다. 게시판, 회원, DB 데이터는 삭제되지 않습니다.</p>
    <?php } ?>
  </section>
</div>

<script>
document.body.setAttribute('data-action-url', <?php echo json_encode($design_action_url); ?>);
(function(){
  var sel=document.getElementById('obb-project-select');
  var btn=document.getElementById('obb-publish-apply');
  var buildBtn=document.getElementById('obb-build-source');
  if(!sel)return;
  sel.disabled=false;
  function syncProject(){
    var opt=sel.options[sel.selectedIndex];
    var pid=sel.value||'';
    var needsBuild=opt&&opt.getAttribute('data-needs-build')==='1';
    if(btn){
      btn.setAttribute('data-project-id',pid);
      btn.disabled=!pid;
    }
    if(buildBtn){
      buildBtn.setAttribute('data-project-id',pid);
      buildBtn.disabled=!pid||!needsBuild;
    }
  }
  sel.addEventListener('change',syncProject);
  syncProject();
  document.querySelectorAll('.ob-copy-btn[data-copy]').forEach(function(copyBtn){
    copyBtn.addEventListener('click', function(){
      var text = copyBtn.getAttribute('data-copy') || '';
      if (!text) return;
      function done(){
        var old = copyBtn.textContent;
        copyBtn.textContent = '복사됨';
        setTimeout(function(){ copyBtn.textContent = old; }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function(){});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch(e) {}
        document.body.removeChild(ta);
      }
    });
  });
})();
</script>
