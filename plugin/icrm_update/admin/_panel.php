<?php
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('icu_h')) {
    function icu_h($s)
    {
        return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    }
}

if (!isset($action_url) || $action_url === '') {
    $action_url = G5_PLUGIN_URL . '/icrm_update/admin/action.php';
}
if (!isset($status) || !is_array($status)) {
    $status = function_exists('icrm_update_check_status') ? icrm_update_check_status() : array(
        'ready' => false,
        'message' => '업데이트 모듈이 없습니다.',
    );
}
if (!isset($builder_status) || !is_array($builder_status)) {
    $builder_status = function_exists('icrm_builder_deploy_check_status') ? icrm_builder_deploy_check_status() : array(
        'ready' => false,
        'message' => '빌더 배포 모듈이 없습니다.',
    );
}

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

$ob_license_saved = function_exists('onoff_builder_config_license_key') && onoff_builder_config_license_key() !== '';
?>
<div class="icrm-update-panel ob-update-panel">
    <div class="icu-card ob-card ob-key-card">
        <div class="ob-card-header">
            <div>
                <h2 class="ob-card-title">온오프빌더 라이선스 설정</h2>
                <p class="ob-card-desc">이 사이트에서는 온오프빌더 iCRM 라이선스 키만 저장합니다. Gemini API 키와 AI 과금 설정은 중앙 iCRM 배포단에서 관리됩니다.</p>
            </div>
            <?php if ($ob_license_saved) { ?>
            <span class="ob-badge ob-badge-success">라이선스 저장됨</span>
            <?php } else { ?>
            <span class="ob-badge ob-badge-warning">라이선스 필요</span>
            <?php } ?>
        </div>
        <form id="ob-key-form" class="ob-key-form" autocomplete="off">
            <div class="ob-form-grid">
                <label class="ob-form-field">
                    <span>온오프빌더 라이선스 키 <b>*</b></span>
                    <input type="password" name="license_key" class="ob-input" placeholder="<?php echo $ob_license_saved ? '저장됨 - 변경할 때만 새 키 입력' : '라이선스 키 입력'; ?>" autocomplete="new-password">
                    <em>업데이트, 디자인 배포, SEO 메타, 자동댓글, 포인트 과금이 이 라이선스를 함께 사용합니다.</em>
                </label>
            </div>
            <div class="icu-actions ob-actions">
                <button type="submit" class="icu-btn icu-btn--primary ob-btn ob-btn-primary">라이선스 저장</button>
                <button type="button" class="icu-btn icu-btn--ghost ob-btn ob-btn-outline" id="ob-key-refresh">저장 후 상태 확인</button>
            </div>
            <div class="icu-msg" id="ob-key-msg"></div>
        </form>
    </div>

    <div class="icu-card ob-card ob-update-card">
        <div class="ob-card-header">
            <div>
                <h2 class="ob-card-title">기능 업데이트</h2>
                <p class="ob-card-desc">온오프빌더 중앙 서버에서 최신 기능을 받아옵니다. 버튼 한 번이면 됩니다.</p>
            </div>
            <?php if (!empty($status['update_available'])) { ?>
            <span class="ob-badge ob-badge-warning">새 버전 있음</span>
            <?php } elseif (!empty($status['ready'])) { ?>
            <span class="ob-badge ob-badge-success">최신</span>
            <?php } else { ?>
            <span class="ob-badge ob-badge-danger">확인 필요</span>
            <?php } ?>
        </div>

        <div class="icu-row ob-status-row">
            <span class="icu-label">라이선스</span>
            <span class="icu-val">
                <?php if (!empty($status['license_ok'])) { ?>
                    <span class="icu-badge icu-badge--ok ob-badge ob-badge-success">연결됨</span>
                <?php } else { ?>
                    <span class="icu-badge icu-badge--warn ob-badge ob-badge-warning">미설정</span>
                <?php } ?>
            </span>
        </div>
        <div class="icu-row ob-status-row">
            <span class="icu-label">이 사이트 버전</span>
            <span class="icu-val"><code><?php echo icu_h($status['local_release'] ?: '(없음)'); ?></code></span>
        </div>
        <div class="icu-row ob-status-row">
            <span class="icu-label">온오프빌더 최신 버전</span>
            <span class="icu-val"><code><?php echo icu_h($status['remote_release'] ?: '-'); ?></code></span>
        </div>
        <div class="icu-row ob-status-row">
            <span class="icu-label">업데이트</span>
            <span class="icu-val">
                <?php if (!empty($status['update_available'])) { ?>
                    <span class="icu-badge icu-badge--warn ob-badge ob-badge-warning">새 버전 있음</span>
                <?php } elseif (!empty($status['ready'])) { ?>
                    <span class="icu-badge icu-badge--ok ob-badge ob-badge-success">최신</span>
                <?php } else { ?>
                    <span class="icu-badge icu-badge--muted ob-badge ob-badge-danger">확인 불가</span>
                <?php } ?>
            </span>
        </div>

        <?php if (empty($status['license_ok'])) { ?>
        <p class="icu-hint" style="margin-top:12px;color:#b45309">먼저 온오프빌더 라이선스 키를 저장하세요. 기존 SEO 메타 또는 자동댓글에 저장된 키도 함께 사용됩니다.</p>
        <?php } elseif (empty($status['ready']) && !empty($status['message'])) { ?>
        <p class="icu-hint" style="margin-top:12px;color:#b45309"><?php echo icu_h($status['message']); ?></p>
        <?php if (strpos((string) $status['message'], '파싱') !== false || strpos((string) $status['message'], '연결') !== false) { ?>
        <p class="icu-hint" style="margin-top:8px;line-height:1.6">`_site.config.php`의 <code>icrm_update_api_base_url</code>이 <code>https://icrm.co.kr/api/g5-update</code>인지, 호스팅에서 icrm.co.kr HTTPS 아웃바운드가 허용되는지 확인하세요.</p>
        <?php } ?>
        <?php } ?>

        <div class="icu-actions ob-actions">
            <button type="button" class="icu-btn icu-btn--primary ob-btn ob-btn-primary" id="icu-pull" <?php echo empty($status['ready']) ? 'disabled' : ''; ?>>
                <?php echo !empty($status['update_available']) ? '지금 업데이트' : '다시 확인 · 업데이트'; ?>
            </button>
            <button type="button" class="icu-btn icu-btn--ghost ob-btn ob-btn-outline" id="icu-refresh">상태 새로고침</button>
        </div>

        <div class="icu-msg" id="icu-msg"></div>
        <pre class="icu-log" id="icu-log"></pre>
    </div>

    <div class="icu-card ob-card ob-alert ob-alert-info">
        <h2 class="ob-card-title">자동 업데이트</h2>
        <p class="icu-hint">기본값 켜짐 — 최고관리자가 <?php echo icu_h(function_exists('icrm_update_check_interval_hours') ? icrm_update_check_interval_hours() : 24); ?>시간마다 로그인하면 자동으로 최신 버전을 적용합니다.</p>
    </div>

    <div class="icu-card ob-card ob-builder-sync-card">
        <div class="ob-card-header">
            <div>
                <h2 class="ob-card-title">빌더 디자인 동기화</h2>
                <p class="ob-card-desc">온오프빌더에 등록된 디자인을 이 사이트에 받아 적용합니다. (회원이 올린 ZIP과 별도로 중앙 서버 기준 동기화)</p>
            </div>
        </div>

        <div class="icu-row ob-status-row">
            <span class="icu-label">적용된 디자인</span>
            <span class="icu-val"><code><?php echo icu_h($builder_status['local_release'] ?: '(없음)'); ?></code></span>
        </div>
        <div class="icu-row ob-status-row">
            <span class="icu-label">온오프빌더 최신 디자인</span>
            <span class="icu-val"><code><?php echo icu_h($builder_status['remote_release'] ?: '-'); ?></code></span>
        </div>
        <?php if (!empty($builder_status['project_name'])) { ?>
        <div class="icu-row ob-status-row">
            <span class="icu-label">프로젝트</span>
            <span class="icu-val"><?php echo icu_h($builder_status['project_name']); ?> <code><?php echo icu_h($builder_status['project_id']); ?></code></span>
        </div>
        <?php } ?>
        <div class="icu-row ob-status-row">
            <span class="icu-label">상태</span>
            <span class="icu-val">
                <?php if (!empty($builder_status['update_available'])) { ?>
                    <span class="icu-badge icu-badge--warn ob-badge ob-badge-warning">새 디자인 있음</span>
                <?php } elseif (!empty($builder_status['ready'])) { ?>
                    <span class="icu-badge icu-badge--ok ob-badge ob-badge-success">최신</span>
                <?php } else { ?>
                    <span class="icu-badge icu-badge--muted ob-badge ob-badge-danger">확인 불가</span>
                <?php } ?>
            </span>
        </div>
        <?php if (!empty($builder_status['page_url'])) { ?>
        <div class="icu-row ob-status-row">
            <span class="icu-label">미리보기 URL</span>
            <span class="icu-val"><a href="<?php echo icu_h($builder_status['page_url']); ?>" target="_blank" rel="noopener"><?php echo icu_h($builder_status['page_url']); ?></a></span>
        </div>
        <?php } ?>
        <?php if (!empty($builder_status['home_url'])) { ?>
        <div class="icu-row ob-status-row">
            <span class="icu-label">홈 URL</span>
            <span class="icu-val"><a href="<?php echo icu_h($builder_status['home_url']); ?>" target="_blank" rel="noopener"><?php echo icu_h($builder_status['home_url']); ?></a></span>
        </div>
        <?php } ?>
        <?php if (!empty($builder_status['remote_release']) && !empty($builder_status['preview_url'])) { ?>
        <div class="icu-row ob-status-row">
            <span class="icu-label">새 디자인 미리보기</span>
            <span class="icu-val"><a href="<?php echo icu_h($builder_status['preview_url']); ?>" target="_blank" rel="noopener">적용 전 미리보기 ↗</a></span>
        </div>
        <?php } ?>
        <?php if (!empty($builder_status['history']) && is_array($builder_status['history'])) { ?>
        <div class="icu-row ob-changelog">
            <span class="icu-label">이전 릴리스</span>
            <ul>
                <?php foreach (array_slice($builder_status['history'], 0, 5) as $hist) {
                    if (empty($hist['release_id'])) {
                        continue;
                    }
                    ?>
                <li><code><?php echo icu_h($hist['release_id']); ?></code>
                    <?php if (!empty($hist['project_name'])) { ?> — <?php echo icu_h($hist['project_name']); ?><?php } ?>
                </li>
                <?php } ?>
            </ul>
        </div>
        <?php } ?>

        <?php if (empty($builder_status['license_ok'])) { ?>
        <p class="icu-hint" style="margin-top:12px;color:#b45309">먼저 온오프빌더 라이선스를 설정하세요.</p>
        <?php } elseif (empty($builder_status['ready']) && !empty($builder_status['message'])) { ?>
        <p class="icu-hint" style="margin-top:12px;color:#b45309"><?php echo icu_h($builder_status['message']); ?></p>
        <?php } ?>

        <div class="icu-actions ob-actions">
            <button type="button" class="icu-btn icu-btn--primary ob-btn ob-btn-primary" id="icb-pull" <?php echo empty($builder_status['ready']) || empty($builder_status['update_available']) ? 'disabled' : ''; ?>>
                빌더 디자인 적용
            </button>
            <button type="button" class="icu-btn icu-btn--ghost ob-btn ob-btn-outline" id="icb-rollback" <?php echo empty($builder_status['history']) ? 'disabled' : ''; ?>>이전 버전 복구</button>
            <button type="button" class="icu-btn icu-btn--ghost ob-btn ob-btn-secondary" id="icb-refresh">상태 새로고침</button>
        </div>

        <div class="icu-msg" id="icb-msg"></div>
        <pre class="icu-log" id="icb-log"></pre>
    </div>
</div>

<script>
(function () {
    var actionUrl = <?php echo json_encode($action_url, JSON_UNESCAPED_UNICODE); ?>;

    function showKeyMsg(text, ok) {
        var el = document.getElementById('ob-key-msg');
        if (!el) return;
        el.textContent = text;
        el.className = 'icu-msg on ' + (ok ? 'icu-msg--ok' : 'icu-msg--err');
    }

    function setKeyBusy(busy) {
        var form = document.getElementById('ob-key-form');
        if (!form) return;
        form.querySelectorAll('button, input').forEach(function (el) {
            el.disabled = busy;
        });
    }

    function saveKeys(e) {
        e.preventDefault();
        var form = document.getElementById('ob-key-form');
        if (!form) return;
        setKeyBusy(true);
        showKeyMsg('라이선스 저장 중...', true);
        var fd = new FormData(form);
        fd.append('action', 'save_keys');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    showKeyMsg(data.message || '저장되었습니다.', true);
                    setTimeout(function () { location.reload(); }, 900);
                } else {
                    showKeyMsg(data.error || '저장 실패', false);
                }
            })
            .catch(function () { showKeyMsg('네트워크 오류', false); })
            .finally(function () { setKeyBusy(false); });
    }

    var keyForm = document.getElementById('ob-key-form');
    var keyRefresh = document.getElementById('ob-key-refresh');
    if (keyForm) keyForm.addEventListener('submit', saveKeys);
    if (keyRefresh) keyRefresh.addEventListener('click', function () { location.reload(); });

    function showMsg(text, ok) {
        var el = document.getElementById('icu-msg');
        if (!el) return;
        el.textContent = text;
        el.className = 'icu-msg on ' + (ok ? 'icu-msg--ok' : 'icu-msg--err');
    }

    function setBusy(busy) {
        var pull = document.getElementById('icu-pull');
        var refresh = document.getElementById('icu-refresh');
        if (pull) pull.disabled = busy;
        if (refresh) refresh.disabled = busy;
    }

    function refreshStatus() {
        setBusy(true);
        fetch(actionUrl + '?action=status', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.ok) {
                    showMsg(data.error || '상태 확인 실패', false);
                    return;
                }
                var st = data.status || {};
                if (st.ready) {
                    location.reload();
                    return;
                }
                showMsg(st.message || '온오프빌더 중앙 서버에 연결할 수 없습니다.', false);
            })
            .catch(function () { showMsg('네트워크 오류', false); })
            .finally(function () { setBusy(false); });
    }

    function runPull() {
        if (!confirm('온오프빌더에서 최신 파일을 받아 적용합니다. 계속할까요?')) {
            return;
        }
        setBusy(true);
        showMsg('업데이트 진행 중…', true);
        var fd = new FormData();
        fd.append('action', 'pull');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var res = data.result || {};
                var log = document.getElementById('icu-log');
                if (log && res.changed && res.changed.length) {
                    log.textContent = res.changed.join('\n');
                    log.className = 'icu-log on';
                }
                if (data.ok) {
                    showMsg(res.message || '완료', true);
                    setTimeout(function () { location.reload(); }, 1200);
                } else {
                    showMsg(res.message || data.error || '실패', false);
                }
            })
            .catch(function () { showMsg('네트워크 오류', false); })
            .finally(function () { setBusy(false); });
    }

    var icuPull = document.getElementById('icu-pull');
    var icuRefresh = document.getElementById('icu-refresh');
    if (icuPull) icuPull.addEventListener('click', runPull);
    if (icuRefresh) icuRefresh.addEventListener('click', refreshStatus);

    function showBuilderMsg(text, ok) {
        var el = document.getElementById('icb-msg');
        if (!el) return;
        el.textContent = text;
        el.className = 'icu-msg on ' + (ok ? 'icu-msg--ok' : 'icu-msg--err');
    }

    function setBuilderBusy(busy) {
        var pull = document.getElementById('icb-pull');
        var refresh = document.getElementById('icb-refresh');
        var rollback = document.getElementById('icb-rollback');
        if (pull) pull.disabled = busy;
        if (refresh) refresh.disabled = busy;
        if (rollback) rollback.disabled = busy;
    }

    function refreshBuilderStatus() {
        setBuilderBusy(true);
        fetch(actionUrl + '?action=builder_status', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.ok) {
                    showBuilderMsg(data.error || '상태 확인 실패', false);
                    return;
                }
                location.reload();
            })
            .catch(function () { showBuilderMsg('네트워크 오류', false); })
            .finally(function () { setBuilderBusy(false); });
    }

    function runBuilderPull() {
        if (!confirm('온오프빌더에서 빌더 디자인을 받아 적용합니다. 계속할까요?')) {
            return;
        }
        setBuilderBusy(true);
        showBuilderMsg('빌더 디자인 적용 중…', true);
        var fd = new FormData();
        fd.append('action', 'builder_pull');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var res = data.result || {};
                var log = document.getElementById('icb-log');
                if (log && res.changed && res.changed.length) {
                    log.textContent = res.changed.join('\n');
                    log.className = 'icu-log on';
                }
                if (data.ok) {
                    var msg = res.message || '완료';
                    if (res.page_url) {
                        msg += ' — ' + res.page_url;
                    }
                    showBuilderMsg(msg, true);
                    setTimeout(function () { location.reload(); }, 1500);
                } else {
                    showBuilderMsg(res.message || data.error || '실패', false);
                }
            })
            .catch(function () { showBuilderMsg('네트워크 오류', false); })
            .finally(function () { setBuilderBusy(false); });
    }

    var icbPull = document.getElementById('icb-pull');
    var icbRefresh = document.getElementById('icb-refresh');
    if (icbPull) icbPull.addEventListener('click', runBuilderPull);

    function runBuilderRollback() {
        if (!confirm('직전에 적용했던 빌더 디자인으로 복구합니다. 계속할까요?')) {
            return;
        }
        setBuilderBusy(true);
        showBuilderMsg('복구 진행 중…', true);
        var fd = new FormData();
        fd.append('action', 'builder_rollback');
        fetch(actionUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var res = data.result || {};
                if (data.ok) {
                    showBuilderMsg(res.message || '복구 완료', true);
                    setTimeout(function () { location.reload(); }, 1500);
                } else {
                    showBuilderMsg(res.message || data.error || '복구 실패', false);
                }
            })
            .catch(function () { showBuilderMsg('네트워크 오류', false); })
            .finally(function () { setBuilderBusy(false); });
    }

    var icbRollback = document.getElementById('icb-rollback');
    if (icbRollback) icbRollback.addEventListener('click', runBuilderRollback);
    if (icbRefresh) icbRefresh.addEventListener('click', refreshBuilderStatus);
})();
</script>
