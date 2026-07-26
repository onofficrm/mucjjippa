<?php
/**
 * iCRM 통합 관리 허브 — 게시판관리 단일 메뉴
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_PATH . '/_site.config.php')) {
    include_once G5_PATH . '/_site.config.php';
}

if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('icrm_hub_enabled', true)) {
    return;
}

if (!is_file(G5_LIB_PATH . '/icrm-admin-shell.lib.php')) {
    return;
}

if (!function_exists('icrm_hub_admin_menu')) {
    function icrm_hub_admin_menu($admin_menu)
    {
        if (defined('G5_PLUGIN_URL')) {
            $admin_menu['menu300'][] = array(
                '300900',
                'iCRM AI 관리',
                G5_PLUGIN_URL . '/icrm_hub/admin/index.php',
                'icrm_hub',
            );
        }

        return $admin_menu;
    }
}

if (function_exists('add_replace')) {
    add_replace('admin_menu', 'icrm_hub_admin_menu', 19, 1);
}

if (!function_exists('icrm_hub_geo_url')) {
    function icrm_hub_geo_url()
    {
        return defined('G5_PLUGIN_URL')
            ? G5_PLUGIN_URL . '/icrm_hub/admin/index.php?m=seo&tab=health'
            : '';
    }
}

if (!function_exists('icrm_hub_show_geo_button')) {
    function icrm_hub_show_geo_button()
    {
        global $is_admin;

        if ($is_admin !== 'super') {
            return false;
        }
        if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('icrm_hub_geo_button', true)) {
            return false;
        }
        if (!defined('G5_PLUGIN_PATH') || !is_file(G5_PLUGIN_PATH . '/icrm_hub/admin/index.php')) {
            return false;
        }

        return icrm_hub_geo_url() !== '';
    }
}

if (!function_exists('icrm_hub_on_admin_common')) {
    function icrm_hub_on_admin_common()
    {
        if (!defined('G5_IS_ADMIN') || !G5_IS_ADMIN || !icrm_hub_show_geo_button()) {
            return;
        }

        static $done = false;
        if ($done) {
            return;
        }
        $done = true;

        $url = icrm_hub_geo_url();
        add_stylesheet('<link rel="stylesheet" href="' . G5_URL . '/css/icrm-template.css?ver=1">', 50);
        add_javascript('<script>
document.addEventListener("DOMContentLoaded",function(){
  var logout=document.getElementById("tnb_logout");
  if(!logout||document.getElementById("icrm-hub-geo-btn"))return;
  var li=document.createElement("li");
  li.id="icrm-hub-geo-btn";
  var a=document.createElement("a");
  a.href=' . json_encode($url) . ';
  a.className="icrm-hub-geo-link";
  a.textContent="GEO도우미";
  li.appendChild(a);
  logout.parentNode.insertBefore(li,logout);
});
</script>', 50);
    }
}

if (function_exists('add_event')) {
    add_event('admin_common', 'icrm_hub_on_admin_common', 15, 0);
    add_event('tail_sub', 'icrm_hub_on_tail_sub', 15, 0);
}

if (!function_exists('icrm_hub_on_tail_sub')) {
    function icrm_hub_on_tail_sub()
    {
        if (defined('G5_IS_ADMIN') && G5_IS_ADMIN) {
            return;
        }
        if (!icrm_hub_show_geo_button()) {
            return;
        }

        $url = icrm_hub_geo_url();
        echo '<script>
(function(){
  var url=' . json_encode($url) . ';
  function inject(after){
    if(!after||after.parentNode.querySelector(".site-header__geo-link"))return;
    var link=document.createElement("a");
    link.href=url;
    link.className="site-header__geo-link";
    link.textContent="GEO도우미";
    if(after.nextSibling) after.parentNode.insertBefore(link,after.nextSibling);
    else after.parentNode.appendChild(link);
  }
  document.querySelectorAll(\'a[href*="logout.php"]\').forEach(function(a){
    if(a.closest(".site-header__account")||a.closest(".site-header__mobile-account")) inject(a);
  });
})();
</script>';
    }
}
