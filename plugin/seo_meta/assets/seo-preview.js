(function (global) {
    'use strict';

    function $(id) {
        return document.getElementById(id);
    }

    function resolveImageUrl(path, defaultImage) {
        path = (path || '').trim();
        if (path) {
            if (/^https?:\/\//i.test(path)) return path;
            if (path.charAt(0) === '/') {
                var base = (global.g5_url || '').replace(/\/$/, '');
                if (path.indexOf('/data/') === 0 && global.g5_data_url) {
                    return global.g5_data_url + path.replace(/^\/data/, '');
                }
                return base + path;
            }
            return (global.g5_url || '') + '/' + path.replace(/^\//, '');
        }
        return defaultImage || '';
    }

    function previewDomain(url) {
        try {
            var u = new URL(url);
            return u.hostname || 'www.example.com';
        } catch (e) {
            return 'www.example.com';
        }
    }

    function truncate(str, len) {
        str = (str || '').replace(/\s+/g, ' ').trim();
        if (str.length <= len) return str;
        return str.slice(0, len - 1) + '…';
    }

    function bindTabs(root) {
        var tabs = root.querySelectorAll('.g5b-serp-preview__tab');
        var panes = root.querySelectorAll('.g5b-serp-preview__pane');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var name = tab.getAttribute('data-tab');
                tabs.forEach(function (t) {
                    t.classList.toggle('is-active', t === tab);
                    t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
                });
                panes.forEach(function (pane) {
                    var show = pane.getAttribute('data-pane') === name;
                    pane.classList.toggle('is-active', show);
                    pane.hidden = !show;
                });
            });
        });
    }

    function updatePreview(root, cfg) {
        var titleEl = $(cfg.titleField);
        var descEl = $(cfg.descriptionField);
        var imageEl = $(cfg.imageField);
        var canonicalEl = cfg.canonicalField ? $(cfg.canonicalField) : null;

        var title = titleEl && titleEl.value ? titleEl.value.trim() : '';
        var desc = descEl && descEl.value ? descEl.value.trim() : '';
        var imagePath = imageEl && imageEl.value ? imageEl.value.trim() : '';
        var previewUrl = cfg.previewUrl || '';

        if (canonicalEl && canonicalEl.value.trim()) {
            previewUrl = canonicalEl.value.trim();
            if (!/^https?:\/\//i.test(previewUrl) && global.g5_url) {
                previewUrl = global.g5_url.replace(/\/$/, '') + '/' + previewUrl.replace(/^\//, '');
            }
        }

        if (!title) title = cfg.defaultTitle || cfg.siteName || '페이지 제목';
        if (!desc) desc = cfg.defaultDescription || '검색 결과에 표시될 설명을 입력하세요.';

        var domain = previewDomain(previewUrl);
        var imageUrl = resolveImageUrl(imagePath, cfg.defaultImage);

        root.querySelectorAll('[data-preview="domain"]').forEach(function (el) {
            var isSns = el.closest('.g5b-serp-sns');
            el.textContent = isSns ? domain.toUpperCase() : domain;
        });
        root.querySelectorAll('[data-preview="title"]').forEach(function (el) {
            el.textContent = truncate(title, 70);
        });
        root.querySelectorAll('[data-preview="description"]').forEach(function (el) {
            el.textContent = truncate(desc, 160);
        });

        root.querySelectorAll('[data-preview="thumb-wrap"]').forEach(function (wrap) {
            var img = wrap.querySelector('[data-preview="thumb"]');
            if (imageUrl) {
                wrap.hidden = false;
                if (img) img.src = imageUrl;
            } else {
                wrap.hidden = true;
                if (img) img.removeAttribute('src');
            }
        });

        var snsWrap = root.querySelector('[data-preview="sns-image-wrap"]');
        var snsImg = root.querySelector('[data-preview="sns-image"]');
        if (snsWrap && snsImg) {
            if (imageUrl) {
                snsWrap.classList.add('has-image');
                snsImg.src = imageUrl;
                snsImg.style.display = 'block';
            } else {
                snsWrap.classList.remove('has-image');
                snsImg.removeAttribute('src');
                snsImg.style.display = 'none';
            }
        }

        var titleCount = root.querySelector('[data-preview="title-count"]');
        var descCount = root.querySelector('[data-preview="desc-count"]');
        var titleLen = (titleEl && titleEl.value.trim()) ? titleEl.value.trim().length : title.length;
        var descLen = (descEl && descEl.value.trim()) ? descEl.value.trim().length : desc.length;
        if (titleCount) {
            titleCount.textContent = String(titleLen);
            titleCount.parentElement.classList.toggle('is-warn', titleLen > 60);
        }
        if (descCount) {
            descCount.textContent = String(descLen);
            descCount.parentElement.classList.toggle('is-warn', descLen > 160);
        }
    }

    function g5bSeoPreviewInit(cfg) {
        var root = document.getElementById(cfg.prefix + '_serp_preview');
        if (!root) return;

        bindTabs(root);
        updatePreview(root, cfg);

        ['titleField', 'descriptionField', 'imageField', 'canonicalField'].forEach(function (key) {
            if (!cfg[key]) return;
            var el = $(cfg[key]);
            if (!el) return;
            el.addEventListener('input', function () { updatePreview(root, cfg); });
            el.addEventListener('change', function () { updatePreview(root, cfg); });
        });

        root.g5bSeoPreviewRefresh = function () { updatePreview(root, cfg); };
    }

    function g5bSeoFeaturedInit(opts) {
        var input = $(opts.inputId);
        var fileInput = $(opts.fileId);
        var preview = $(opts.previewId);
        if (!input || !fileInput || !preview) return;

        var uploadBtn = preview.closest('.g5b-seo-featured');
        if (uploadBtn) {
            uploadBtn = uploadBtn.querySelector('.g5b-seo-featured__upload');
        }
        var removeBtn = preview.closest('.g5b-seo-featured');
        if (removeBtn) {
            removeBtn = removeBtn.querySelector('.g5b-seo-featured__remove');
        }

        function setPreview(url) {
            preview.innerHTML = '';
            if (url) {
                var img = document.createElement('img');
                img.src = url;
                img.alt = '대표 이미지 미리보기';
                preview.appendChild(img);
            } else {
                var span = document.createElement('span');
                span.className = 'g5b-seo-featured__empty';
                span.textContent = '이미지 없음';
                preview.appendChild(span);
            }
            var previewRoot = opts.previewRootId ? document.getElementById(opts.previewRootId) : null;
            if (previewRoot && previewRoot.g5bSeoPreviewRefresh) {
                previewRoot.g5bSeoPreviewRefresh();
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', function () { fileInput.click(); });
        }

        fileInput.addEventListener('change', function () {
            if (!fileInput.files || !fileInput.files[0]) return;
            if (!opts.uploadUrl) {
                alert('업로드 URL이 설정되지 않았습니다.');
                return;
            }
            var fd = new FormData();
            fd.append('action', 'upload_image');
            fd.append('image', fileInput.files[0]);

            uploadBtn.disabled = true;
            fetch(opts.uploadUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    uploadBtn.disabled = false;
                    fileInput.value = '';
                    if (!res.ok) {
                        alert(res.error || '업로드 실패');
                        return;
                    }
                    input.value = res.path || '';
                    setPreview(res.url || resolveImageUrl(res.path, ''));
                })
                .catch(function () {
                    uploadBtn.disabled = false;
                    alert('네트워크 오류');
                });
        });

        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                input.value = '';
                setPreview('');
            });
        }

        input.addEventListener('change', function () {
            setPreview(resolveImageUrl(input.value, ''));
        });
    }

    global.g5bSeoPreviewInit = g5bSeoPreviewInit;
    global.g5bSeoFeaturedInit = g5bSeoFeaturedInit;
})(typeof window !== 'undefined' ? window : this);
