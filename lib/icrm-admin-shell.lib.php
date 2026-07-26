<?php
/**
 * iCRM 통합 관리 화면 — 공유 셸 (순위체크 · 콘텐츠 수집 · SEO · 포인트)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('icrm_admin_hub_base')) {
    function icrm_admin_hub_base()
    {
        return G5_PLUGIN_URL . '/icrm_hub/admin/index.php';
    }
}

if (!function_exists('icrm_admin_modules')) {
    function icrm_admin_modules()
    {
        return array(
            'home'    => array('label' => '대시보드', 'icon' => 'home', 'desc' => '한눈에 보기'),
            'rank'    => array('label' => '순위체크', 'icon' => 'rank', 'desc' => '네이버·구글 순위'),
            'publish' => array('label' => '콘텐츠 발행', 'icon' => 'publish', 'desc' => 'AI 작성 · 게시판 발행'),
            'content' => array('label' => '콘텐츠 수집', 'icon' => 'content', 'desc' => 'YouTube·RSS·Web'),
            'comment' => array('label' => '자동댓글', 'icon' => 'comment', 'desc' => 'AI 댓글·예약'),
            'seo'     => array('label' => 'SEO 메타', 'icon' => 'seo', 'desc' => 'SEO · GEO · FAQ'),
            'points'  => array('label' => '포인트 충전', 'icon' => 'points', 'desc' => 'AI 포인트'),
        );
    }
}

if (!function_exists('icrm_admin_url')) {
    function icrm_admin_url($module, array $params = array())
    {
        $module = preg_replace('/[^a-z_]/', '', (string) $module);
        $params['m'] = $module;

        return icrm_admin_hub_base() . '?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }
}

if (!function_exists('icrm_admin_page_url')) {
    function icrm_admin_page_url($module, array $params = array())
    {
        return icrm_admin_url($module, $params);
    }
}

if (!function_exists('icrm_admin_redirect_to_hub')) {
    function icrm_admin_redirect_to_hub($module)
    {
        if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) {
            return;
        }

        $params = $_GET;
        unset($params['m']);
        $params['m'] = preg_replace('/[^a-z_]/', '', (string) $module);

        goto_url(icrm_admin_url($module, $params));
    }
}

if (!function_exists('icrm_admin_shell_h')) {
    function icrm_admin_shell_h($str)
    {
        return htmlspecialchars((string) $str, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('icrm_admin_shell_point_summary')) {
    function icrm_admin_shell_point_summary()
    {
        if (!function_exists('icrm_point_format_summary')) {
            return '';
        }

        return icrm_point_format_summary();
    }
}

if (!function_exists('icrm_admin_shell_license_ok')) {
    function icrm_admin_shell_license_ok()
    {
        if (function_exists('g5b_seo_meta_get_license_key') && trim(g5b_seo_meta_get_license_key()) !== '') {
            return true;
        }
        if (function_exists('icrm_point_get_license_key') && trim(icrm_point_get_license_key()) !== '') {
            return true;
        }
        if (function_exists('auto_comment_get_setting') && trim(auto_comment_get_setting('icrm_license_key', '')) !== '') {
            return true;
        }

        return false;
    }
}

if (!function_exists('icrm_admin_shell_icon')) {
    function icrm_admin_shell_icon($name)
    {
        $icons = array(
            'home' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
            'rank' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 5 5-9"/></svg>',
            'publish' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
            'content' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
            'comment' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
            'seo' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
            'points' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H9m0 3h5a1.5 1.5 0 0 0 0-3H9"/></svg>',
        );

        return isset($icons[$name]) ? $icons[$name] : $icons['rank'];
    }
}

if (!function_exists('icrm_admin_subnav_open')) {
    function icrm_admin_subnav_open()
    {
        echo '<div class="icrm-subnav-bar"><nav class="icrm-subnav" aria-label="하위 메뉴">';
    }
}

if (!function_exists('icrm_admin_subnav_close')) {
    function icrm_admin_subnav_close()
    {
        echo '</nav></div>';
    }
}

if (!function_exists('icrm_admin_sidebar_badges')) {
    function icrm_admin_sidebar_badges()
    {
        $badges = array(
            'content' => 0,
            'seo'     => 0,
            'rank'    => 0,
        );

        if (is_file(G5_LIB_PATH . '/icrm-content.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-content.lib.php';
            if (function_exists('icrm_content_bootstrap')) {
                icrm_content_bootstrap();
            }
            if (function_exists('icrm_content_get_stats')) {
                $cstats = icrm_content_get_stats();
                $badges['content'] = (int) ($cstats['review'] ?? 0);
            }
        }

        if (is_file(G5_LIB_PATH . '/seo-geo-health.lib.php')) {
            include_once G5_LIB_PATH . '/seo-geo-health.lib.php';
            if (function_exists('g5b_seo_geo_health_get_summary')) {
                $health = g5b_seo_geo_health_get_summary('');
                if (!empty($health['stats'])) {
                    $badges['seo'] = (int) ($health['stats']['gap_meta'] ?? 0)
                        + (int) ($health['stats']['gap_faq'] ?? 0);
                }
            }
        }

        if (is_file(G5_LIB_PATH . '/icrm-rank.lib.php')) {
            include_once G5_LIB_PATH . '/icrm-rank.lib.php';
            if (function_exists('icrm_rank_get_dashboard_stats')) {
                $rstats = icrm_rank_get_dashboard_stats();
                $badges['rank'] = (int) ($rstats['never_checked'] ?? 0);
            }
        }

        return $badges;
    }
}

if (!function_exists('icrm_admin_shell_begin')) {
    function icrm_admin_shell_begin($active_module)
    {
        $active_module = preg_replace('/[^a-z_]/', '', (string) $active_module);
        $modules = icrm_admin_modules();
        if (!isset($modules[$active_module])) {
            $active_module = 'home';
        }

        $point_summary = icrm_admin_shell_point_summary();
        $license_ok = icrm_admin_shell_license_ok();
        $sidebar_badges = icrm_admin_sidebar_badges();
        $pretendard_css = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
        $tokens_css = G5_URL . '/css/icrm-design-tokens.css';
        $shell_css = G5_URL . '/css/icrm-admin-shell.css';
        $dash_css = G5_URL . '/css/icrm-dashboard.css';
        $active_label = $modules[$active_module]['label'];
        ?>
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iCRM AI · <?php echo icrm_admin_shell_h($active_label); ?></title>
<link rel="stylesheet" href="<?php echo icrm_admin_shell_h($pretendard_css); ?>">
<link rel="stylesheet" href="<?php echo icrm_admin_shell_h($tokens_css); ?>">
<link rel="stylesheet" href="<?php echo icrm_admin_shell_h($shell_css); ?>">
<?php if ($active_module === 'home') { ?>
<link rel="stylesheet" href="<?php echo icrm_admin_shell_h($dash_css); ?>">
<?php } ?>
</head>
<body class="icrm-app">
<div class="icrm-sidebar-backdrop" id="icrm_sidebar_backdrop" hidden></div>
<div class="icrm-app__layout">
<aside class="icrm-sidebar" id="icrm_sidebar" aria-label="주 메뉴">
    <div class="icrm-sidebar__brand">
        <a href="<?php echo icrm_admin_shell_h(icrm_admin_url('home')); ?>" class="icrm-sidebar__brand-link">
            <span class="icrm-sidebar__logo">iC</span>
            <div class="icrm-sidebar__title-wrap">
                <span class="icrm-sidebar__title">iCRM AI Hub</span>
                <span class="icrm-sidebar__sub">온오프마케팅</span>
            </div>
        </a>
    </div>
    <nav class="icrm-sidebar__nav">
        <div class="icrm-sidebar__label">메뉴</div>
        <?php foreach ($modules as $key => $item) {
            $class = ($key === $active_module) ? ' is-active' : '';
            $badge = isset($sidebar_badges[$key]) ? (int) $sidebar_badges[$key] : 0;
            ?>
        <a href="<?php echo icrm_admin_shell_h(icrm_admin_url($key)); ?>" class="icrm-sidebar__link<?php echo $class; ?>">
            <span class="icrm-sidebar__icon" aria-hidden="true"><?php echo icrm_admin_shell_icon($item['icon']); ?></span>
            <span class="icrm-sidebar__link-text"><?php echo icrm_admin_shell_h($item['label']); ?></span>
            <?php if ($badge > 0) { ?>
            <span class="icrm-sidebar__badge"><?php echo (int) $badge; ?></span>
            <?php } ?>
        </a>
            <?php
        } ?>
    </nav>
    <div class="icrm-sidebar__foot">
        <div class="icrm-sidebar__status">
            <span class="icrm-sidebar__dot<?php echo $license_ok ? ' is-on' : ''; ?>" aria-hidden="true"></span>
            iCRM <?php echo $license_ok ? '연동됨' : '미설정'; ?>
        </div>
    </div>
</aside>
<div class="icrm-main">
<header class="icrm-topbar">
    <div class="icrm-topbar__left">
        <button type="button" class="icrm-topbar__menu-btn" id="icrm_menu_toggle" aria-label="메뉴 열기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <h1 class="icrm-topbar__title"><?php echo icrm_admin_shell_h($active_label); ?></h1>
    </div>
    <div class="icrm-topbar__right">
        <?php if ($point_summary !== '') { ?>
        <span class="icrm-topbar__points"><?php echo icrm_admin_shell_h($point_summary); ?></span>
        <?php } ?>
        <div class="icrm-topbar__links">
            <a href="<?php echo icrm_admin_shell_h(G5_ADMIN_URL); ?>">관리자 홈</a>
            <a href="<?php echo icrm_admin_shell_h(G5_URL); ?>" target="_blank" rel="noopener">사이트 보기</a>
        </div>
    </div>
</header>
<main class="icrm-content">
<div class="icrm-module-body">
        <?php
    }
}

if (!function_exists('icrm_admin_shell_end')) {
    function icrm_admin_shell_end()
    {
        if (defined('ICRM_HUB_ACTIVE') && ICRM_HUB_ACTIVE) {
            $quiet_css = G5_URL . '/css/icrm-module-quiet.css';
            echo '<link rel="stylesheet" href="' . icrm_admin_shell_h($quiet_css) . '">';
        }
        ?>
</div>
</main>
</div>
</div>
<script>
(function() {
    var sidebar = document.getElementById('icrm_sidebar');
    var backdrop = document.getElementById('icrm_sidebar_backdrop');
    var toggle = document.getElementById('icrm_menu_toggle');
    if (!sidebar || !toggle) return;
    function openSidebar() {
        sidebar.classList.add('is-open');
        if (backdrop) { backdrop.hidden = false; backdrop.classList.add('is-visible'); }
    }
    function closeSidebar() {
        sidebar.classList.remove('is-open');
        if (backdrop) { backdrop.classList.remove('is-visible'); backdrop.hidden = true; }
    }
    toggle.addEventListener('click', function() {
        sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
    });
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
})();
</script>
</body>
</html>
        <?php
    }
}
