(function () {
  'use strict';

  var msgEl = document.getElementById('obb-member-msg');
  var actionUrl = document.body.getAttribute('data-action-url') || '';

  function showMsg(text, type) {
    if (!msgEl) {
      return;
    }
    msgEl.textContent = text;
    msgEl.className = 'onoff-builder-member__msg is-' + (type || 'busy');
    msgEl.hidden = !text;
  }

  function postAction(action, extra) {
    if (!actionUrl) {
      return Promise.reject(new Error('action URL missing'));
    }
    var fd = new FormData();
    fd.append('action', action);
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        fd.append(k, extra[k]);
      });
    }
    return fetch(actionUrl, {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'manual',
      body: fd,
    }).then(function (r) {
      if (r.type === 'opaqueredirect' || r.status === 301 || r.status === 302) {
        throw new Error('로그인이 필요합니다. 페이지를 새로고침한 뒤 다시 로그인해 주세요.');
      }
      var ct = (r.headers.get('content-type') || '').toLowerCase();
      if (ct.indexOf('json') === -1) {
        return r.text().then(function (text) {
          var preview = (text || '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 180);
          throw new Error(preview ? '서버 응답 오류: ' + preview : '서버 응답 오류입니다. 잠시 후 다시 시도해 주세요.');
        });
      }
      return r.json().catch(function () {
        throw new Error('서버 JSON 응답을 해석하지 못했습니다.');
      });
    });
  }

  var publishBtn = document.getElementById('obb-publish-apply');
  if (publishBtn) {
    publishBtn.addEventListener('click', function () {
      var projectId = publishBtn.getAttribute('data-project-id') || '';
      if (!projectId) {
        return;
      }
      var sel = document.getElementById('obb-project-select');
      var opt = sel && sel.options[sel.selectedIndex];
      var needsBuild = opt && opt.getAttribute('data-needs-build') === '1';
      if (!window.confirm(needsBuild
        ? '온오프빌더에서 빌드한 뒤 디자인을 사이트에 바로 적용할까요? (1~3분 소요될 수 있습니다)'
        : '디자인을 배포하고 사이트에 바로 적용할까요?')) {
        return;
      }
      publishBtn.disabled = true;
      showMsg(needsBuild ? '온오프빌더 빌드 및 적용 중입니다. 잠시만 기다려 주세요…' : '배포 및 적용 중입니다. 잠시만 기다려 주세요…', 'busy');
      postAction('publish_apply', {
        project_id: projectId,
      })
        .then(function (data) {
          if (!data.ok) {
            throw new Error((data.error || (data.result && data.result.message)) || '실패');
          }
          var result = data.result || {};
          var lines = [result.message || '완료'];
          if (result.page_url) {
            lines.push('미리보기: ' + result.page_url);
          }
          if (result.home_url) {
            lines.push('홈: ' + result.home_url);
          }
          showMsg(lines.join(' · '), 'ok');
          setTimeout(function () {
            window.location.reload();
          }, 1200);
        })
        .catch(function (err) {
          showMsg(err.message || '요청 실패', 'err');
          publishBtn.disabled = false;
        });
    });
  }

  var buildBtn = document.getElementById('obb-build-source');
  if (buildBtn) {
    buildBtn.addEventListener('click', function () {
      var projectId = buildBtn.getAttribute('data-project-id') || '';
      if (!projectId) {
        return;
      }
      if (!window.confirm('온오프빌더 서버에서 빌드를 실행할까요? (1~3분 소요될 수 있습니다)')) {
        return;
      }
      buildBtn.disabled = true;
      showMsg('온오프빌더에서 빌드 중입니다. 잠시만 기다려 주세요…', 'busy');
      postAction('builder_source_build', { project_id: projectId })
        .then(function (data) {
          if (!data.ok) {
            throw new Error((data.error || (data.result && data.result.message)) || '실패');
          }
          showMsg((data.result && data.result.message) || '빌드 완료', 'ok');
          setTimeout(function () {
            window.location.reload();
          }, 1200);
        })
        .catch(function (err) {
          showMsg(err.message || '요청 실패', 'err');
          buildBtn.disabled = false;
        });
    });
  }

  var rollbackBtn = document.getElementById('obb-rollback');
  if (rollbackBtn) {
    rollbackBtn.addEventListener('click', function () {
      if (!window.confirm('직전 디자인으로 복구할까요?')) {
        return;
      }
      rollbackBtn.disabled = true;
      showMsg('복구 중…', 'busy');
      postAction('builder_rollback', {})
        .then(function (data) {
          if (!data.ok) {
            throw new Error((data.error || (data.result && data.result.message)) || '실패');
          }
          showMsg((data.result && data.result.message) || '복구 완료', 'ok');
          setTimeout(function () {
            window.location.reload();
          }, 1000);
        })
        .catch(function (err) {
          showMsg(err.message || '요청 실패', 'err');
          rollbackBtn.disabled = false;
        });
    });
  }

  var resetBtn = document.getElementById('obb-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!window.confirm('사이트에 적용된 빌더 디자인 연결을 초기화할까요? 업로드한 디자인 파일은 삭제되지 않습니다.')) {
        return;
      }
      resetBtn.disabled = true;
      showMsg('사이트 적용 상태를 초기화하는 중…', 'busy');
      postAction('builder_reset', {})
        .then(function (data) {
          if (!data.ok) {
            throw new Error((data.error || (data.result && data.result.message)) || '실패');
          }
          showMsg((data.result && data.result.message) || '초기화 완료', 'ok');
          setTimeout(function () {
            window.location.reload();
          }, 1000);
        })
        .catch(function (err) {
          showMsg(err.message || '요청 실패', 'err');
          resetBtn.disabled = false;
        });
    });
  }
})();
