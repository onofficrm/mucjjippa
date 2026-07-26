<?php
/**
 * onoff-g5-base 업데이트 적용 엔진 (로컬 CLI · iCRM pull 공용)
 */
if (!class_exists('OnoffUpdateApplier', false)) {
    class OnoffUpdateApplier
    {
        /** @var string */
        private $sourceRoot;

        /** @var string */
        private $targetRoot;

        /** @var bool */
        private $dryRun;

        /** @var string */
        private $backupRoot;

        /** @var array */
        private $changed = array();

        /** @var array */
        private $skipped = array();

        /** @var array */
        private $configKeys = array();

        /** @var array */
        private $patchHandlers = array();

        public function __construct($sourceRoot, $targetRoot, $dryRun = false)
        {
            $this->sourceRoot = rtrim(str_replace('\\', '/', (string) $sourceRoot), '/');
            $this->targetRoot = rtrim(str_replace('\\', '/', (string) $targetRoot), '/');
            $this->dryRun = (bool) $dryRun;
            $this->backupRoot = $this->targetRoot . '/_backup/onoff-update-' . date('Ymd-His');

            $this->registerDefaultPatchHandlers();
        }

        public function getChanged()
        {
            return $this->changed;
        }

        public function getSkipped()
        {
            return $this->skipped;
        }

        public function getBackupRoot()
        {
            return $this->backupRoot;
        }

        /**
         * @param array $packages
         */
        public function applyPackages(array $packages)
        {
            $this->configKeys = array();

            foreach ($packages as $package) {
                foreach ($package['config_keys'] as $key => $line) {
                    $this->configKeys[$key] = $line;
                }
            }

            foreach ($packages as $package) {
                $this->applyPackageFiles($package);
            }

            if ($this->configKeys) {
                $this->applyPatch(array(
                    'handler' => 'site_config_keys',
                    'keys'    => $this->configKeys,
                ));
            }

            foreach ($packages as $package) {
                foreach ($package['patches'] as $patch) {
                    if (!is_array($patch)) {
                        continue;
                    }
                    if (isset($patch['handler']) && $patch['handler'] === 'site_config_keys') {
                        continue;
                    }
                    $this->applyPatch($patch);
                }
            }
        }

        /**
         * @param array $packages
         * @param array $meta release_id, source (local|icrm)
         */
        public function writeState(array $packages, array $meta = array())
        {
            if ($this->dryRun) {
                return;
            }

            $state = array(
                'updated_at' => date('c'),
                'source'     => isset($meta['source']) ? (string) $meta['source'] : 'local',
                'packages'   => array(),
            );

            if (!empty($meta['release_id'])) {
                $state['release_id'] = (string) $meta['release_id'];
            }

            $stateFile = $this->targetRoot . '/.onoff-update-state.json';
            if (is_file($stateFile)) {
                $existing = json_decode((string) file_get_contents($stateFile), true);
                if (is_array($existing) && !empty($existing['packages']) && is_array($existing['packages'])) {
                    $state['packages'] = $existing['packages'];
                }
            }

            foreach ($packages as $package) {
                $state['packages'][$package['id']] = array(
                    'version'    => $package['version'],
                    'applied_at' => date('c'),
                    'title'      => isset($package['title']) ? $package['title'] : $package['id'],
                );
            }

            file_put_contents(
                $stateFile,
                json_encode($state, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
                LOCK_EX
            );
        }

        private function applyPackageFiles(array $package)
        {
            foreach ($package['files'] as $relative) {
                $relative = ltrim(str_replace('\\', '/', (string) $relative), '/');
                if ($relative === '') {
                    continue;
                }
                $this->copyFeatureFile($relative, $package['id']);
            }
        }

        private function copyFeatureFile($relative, $packageId)
        {
            $source = $this->sourceRoot . '/' . $relative;
            $target = $this->targetRoot . '/' . $relative;

            if (!is_file($source)) {
                $this->skipped[] = $relative . ' (source missing)';
                return;
            }

            $this->writeFile($target, file_get_contents($source), '[' . $packageId . '] copy ' . $relative);
        }

        private function applyPatch(array $patch)
        {
            $handler = isset($patch['handler']) ? (string) $patch['handler'] : '';
            if ($handler === '' || !isset($this->patchHandlers[$handler])) {
                $this->skipped[] = 'patch handler missing: ' . $handler;
                return;
            }

            call_user_func($this->patchHandlers[$handler], $patch);
        }

        private function registerDefaultPatchHandlers()
        {
            $self = $this;

            $this->patchHandlers['head_sub_before_event'] = function () use ($self) {
                $self->patchTextFile('head.sub.php', function ($contents) {
                    if (strpos($contents, "run_event('head_sub_before')") !== false) {
                        return $contents;
                    }

                    $needle = "if (!defined('_GNUBOARD_')) exit; // 개별 페이지 접근 불가\n";
                    if (strpos($contents, $needle) === false) {
                        return null;
                    }

                    return str_replace($needle, $needle . "\nrun_event('head_sub_before');\n", $contents);
                });
            };

            $this->patchHandlers['common_board_skin_fallback'] = function () use ($self) {
                $self->patchTextFile('common.php', function ($contents) {
                    if (strpos($contents, 'icrm_ensure_board_skin') !== false) {
                        return $contents;
                    }

                    $needle = "//==============================================================================\n// 스킨경로\n//------------------------------------------------------------------------------\n";
                    $insert = $needle
                        . "if (!empty(\$board['bo_table']) && is_file(G5_LIB_PATH.'/icrm.lib.php')) {\n"
                        . "    include_once G5_LIB_PATH.'/icrm.lib.php';\n"
                        . "    if (function_exists('icrm_ensure_board_skin')) {\n"
                        . "        icrm_ensure_board_skin(\$board);\n"
                        . "    }\n"
                        . "}\n";

                    if (strpos($contents, $needle) === false) {
                        return null;
                    }

                    return str_replace($needle, $insert, $contents);
                });
            };

            $this->patchHandlers['bbs_list_rss_url'] = function () use ($self) {
                $self->patchTextFile('bbs/list.php', function ($contents) {
                    if (strpos($contents, 'get_list_rss_url') !== false) {
                        return $contents;
                    }

                    $needle = "\$rss_href = G5_BBS_URL.'/rss.php?bo_table='.\$bo_table;\n";
                    if (strpos($contents, $needle) === false) {
                        return null;
                    }

                    return str_replace(
                        $needle,
                        $needle . "    \$rss_href = run_replace('get_list_rss_url', \$rss_href, \$board, \$bo_table);\n",
                        $contents
                    );
                });
            };

            $this->patchHandlers['index_builder_home'] = function () use ($self) {
                $self->patchTextFile('index.php', function ($contents) {
                    if (strpos($contents, 'onoff_builder_maybe_render_home') !== false) {
                        return $contents;
                    }

                    $needle = "include_once('./_common.php');\n";
                    $insert = $needle
                        . "\nif (is_file(G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php')) {\n"
                        . "    include_once G5_PLUGIN_PATH . '/onoff-builder-bridge/bootstrap.php';\n"
                        . "    if (function_exists('onoff_builder_maybe_render_home') && onoff_builder_maybe_render_home()) {\n"
                        . "        return;\n"
                        . "    }\n"
                        . "}\n";

                    if (strpos($contents, $needle) === false) {
                        return null;
                    }

                    return str_replace($needle, $insert, $contents);
                });
            };

            $this->patchHandlers['site_config_keys'] = function ($patch) use ($self) {
                $pairs = isset($patch['keys']) && is_array($patch['keys']) ? $patch['keys'] : array();
                if (!$pairs) {
                    return;
                }

                $self->patchTextFile('_site.config.php', function ($contents) use ($pairs) {
                    $missing = array();
                    foreach ($pairs as $key => $line) {
                        if (strpos($contents, (string) $key) === false) {
                            $missing[] = $line;
                        }
                    }

                    if (!$missing) {
                        return $contents;
                    }

                    $block = "\n    /* onoff-update */\n" . implode("\n", $missing) . "\n";
                    $marker = "\n);\n\n/**";
                    if (strpos($contents, $marker) !== false) {
                        return str_replace($marker, $block . $marker, $contents);
                    }

                    $pos = strrpos($contents, "\n);");
                    if ($pos === false) {
                        return null;
                    }

                    return substr($contents, 0, $pos) . $block . substr($contents, $pos);
                });
            };

            $this->patchHandlers['board_write_skins_seo'] = function () use ($self) {
                $files = glob($self->targetRoot . '/skin/board/*/write.skin.php');
                if (!$files) {
                    $self->skipped[] = 'skin/board/*/write.skin.php (none found)';
                    return;
                }

                $ai_insert = "    <?php\n"
                    . "    \$g5b_ai_write_inc = dirname(__FILE__) . '/../_inc/g5b-seo-ai-write-tools.php';\n"
                    . "    if (is_file(\$g5b_ai_write_inc)) {\n"
                    . "        include_once \$g5b_ai_write_inc;\n"
                    . "    }\n"
                    . "    ?>\n\n";

                $seo_insert = "    <?php\n"
                    . "    \$g5b_seo_write_inc = dirname(__FILE__) . '/../_inc/g5b-seo-write-fields.php';\n"
                    . "    if (is_file(\$g5b_seo_write_inc)) {\n"
                    . "        include_once \$g5b_seo_write_inc;\n"
                    . "    }\n"
                    . "    ?>\n\n";

                foreach ($files as $path) {
                    $relative = ltrim(substr(str_replace('\\', '/', $path), strlen($self->targetRoot)), '/');
                    $contents = file_get_contents($path);
                    $changed = false;

                    if (strpos($contents, 'g5b-seo-ai-write-tools.php') === false) {
                        $subject_needle = '<div class="board-write-form__row bo_w_tit write_div">';
                        if (strpos($contents, $subject_needle) !== false) {
                            $contents = str_replace($subject_needle, $ai_insert . $subject_needle, $contents);
                            $changed = true;
                        } else {
                            $self->skipped[] = $relative . ' (AI draft: subject block not found)';
                        }
                    }

                    if (strpos($contents, 'g5b-seo-write-fields.php') === false) {
                        $submit_needle = '    <div class="btn_confirm write_div';
                        if (strpos($contents, $submit_needle) !== false) {
                            $contents = str_replace($submit_needle, $seo_insert . $submit_needle, $contents);
                            $changed = true;
                        } else {
                            $self->skipped[] = $relative . ' (SEO panel: submit block not found)';
                        }
                    }

                    if ($changed) {
                        $self->writeFile($path, $contents, 'patch ' . $relative);
                    }
                }
            };

            $this->patchHandlers['insert_point_super_admin_skip'] = function () use ($self) {
                $needle = "    if (!\$mb['mb_id']) { return 0; }\n\n    // 회원포인트\n";
                $insert = "    if (!\$mb['mb_id']) { return 0; }\n\n"
                    . "    // 최고관리자: 로그인·글·댓글 등 일반 활동 포인트 미적용 (iCRM·수동조정·쇼핑 정산은 허용)\n"
                    . "    if (\$point != 0 && is_admin(\$mb_id) === 'super') {\n"
                    . "        \$icrm_super_point_allow = array('@passive', '@icrm', '@shop_order', '@delivery');\n"
                    . "        if (!in_array((string) \$rel_table, \$icrm_super_point_allow, true)) {\n"
                    . "            return 0;\n"
                    . "        }\n"
                    . "    }\n\n"
                    . "    // 회원포인트\n";

                $self->patchTextFile('lib/common.lib.php', function ($contents) use ($needle, $insert) {
                    if (strpos($contents, 'icrm_super_point_allow') !== false) {
                        return $contents;
                    }
                    if (strpos($contents, $needle) === false) {
                        return null;
                    }

                    return str_replace($needle, $insert, $contents);
                });
            };

            $this->patchHandlers['board_view_skins_seo'] = function () use ($self) {
                $files = array_merge(
                    (array) glob($self->targetRoot . '/skin/board/*/view.skin.php'),
                    (array) glob($self->targetRoot . '/mobile/skin/board/*/view.skin.php')
                );
                if (!$files) {
                    $self->skipped[] = 'skin/board/*/view.skin.php (none found)';
                    return;
                }

                $insert = "include_once(G5_SKIN_PATH.'/board/_inc/g5b-seo-view.php');\n";
                $needle = "include_once(G5_LIB_PATH.'/thumbnail.lib.php');\n";

                foreach ($files as $path) {
                    $relative = ltrim(substr(str_replace('\\', '/', $path), strlen($self->targetRoot)), '/');
                    $contents = file_get_contents($path);

                    if (strpos($contents, 'g5b-seo-view.php') !== false) {
                        continue;
                    }
                    if (strpos($contents, $needle) === false) {
                        $self->skipped[] = $relative . ' (view: thumbnail include not found)';
                        continue;
                    }

                    $contents = str_replace($needle, $needle . $insert, $contents);
                    $self->writeFile($path, $contents, 'patch ' . $relative);
                }
            };
        }

        private function patchTextFile($relative, callable $callback)
        {
            $path = $this->targetRoot . '/' . ltrim($relative, '/');
            if (!is_file($path)) {
                $this->skipped[] = $relative . ' (missing on target)';
                return;
            }

            $before = file_get_contents($path);
            $after = $callback($before);

            if ($after === null) {
                $this->skipped[] = $relative . ' (pattern not found)';
                return;
            }

            $this->writeFile($path, $after, 'patch ' . $relative);
        }

        private function writeFile($path, $contents, $label)
        {
            if (is_file($path) && file_get_contents($path) === $contents) {
                return;
            }

            $this->changed[] = $label;
            if ($this->dryRun) {
                return;
            }

            $this->backupFile($path);
            $this->ensureDir(dirname($path));
            file_put_contents($path, $contents, LOCK_EX);
        }

        private function backupFile($path)
        {
            if (!is_file($path)) {
                return;
            }

            if ($this->dryRun) {
                return;
            }

            $relative = ltrim(substr(str_replace('\\', '/', $path), strlen($this->targetRoot)), '/');
            $backupPath = $this->backupRoot . '/' . $relative;
            $this->ensureDir(dirname($backupPath));
            copy($path, $backupPath);
        }

        private function ensureDir($dir)
        {
            if (is_dir($dir) || $this->dryRun) {
                return true;
            }

            return mkdir($dir, 0755, true);
        }
    }
}

if (!function_exists('onoff_update_normalize_package')) {
    function onoff_update_normalize_package(array $package, $fallbackId = '')
    {
        $id = isset($package['id']) ? (string) $package['id'] : (string) $fallbackId;
        $package['id'] = $id;
        $package['version'] = isset($package['version']) ? (string) $package['version'] : '0.0.0';
        $package['title'] = isset($package['title']) ? (string) $package['title'] : $id;
        $package['files'] = isset($package['files']) && is_array($package['files']) ? $package['files'] : array();
        $package['depends'] = isset($package['depends']) && is_array($package['depends']) ? $package['depends'] : array();
        $package['patches'] = isset($package['patches']) && is_array($package['patches']) ? $package['patches'] : array();
        $package['config_keys'] = isset($package['config_keys']) && is_array($package['config_keys']) ? $package['config_keys'] : array();

        return $package;
    }
}

if (!function_exists('onoff_update_resolve_packages_from_manifest')) {
    /**
     * iCRM manifest.json 기준 패키지 해석
     *
     * @param array $manifest
     * @param array $ids
     * @return array
     */
    function onoff_update_resolve_packages_from_manifest(array $manifest, array $ids)
    {
        $map = isset($manifest['packages']) && is_array($manifest['packages']) ? $manifest['packages'] : array();
        $resolved = array();
        $resolved_ids = array();

        $visit = function ($id) use (&$visit, &$resolved, &$resolved_ids, $map) {
            $id = preg_replace('/[^a-z0-9_-]/', '', (string) $id);
            if ($id === '' || in_array($id, $resolved_ids, true)) {
                return;
            }

            if (!isset($map[$id]) || !is_array($map[$id])) {
                throw new RuntimeException('Unknown update package in manifest: ' . $id);
            }

            $package = onoff_update_normalize_package($map[$id], $id);

            foreach ($package['depends'] as $dep) {
                $visit($dep);
            }

            $resolved_ids[] = $id;
            $resolved[] = $package;
        };

        foreach ($ids as $id) {
            $visit($id);
        }

        return $resolved;
    }
}

if (!function_exists('onoff_update_read_state')) {
    function onoff_update_read_state($targetRoot)
    {
        $file = rtrim(str_replace('\\', '/', (string) $targetRoot), '/') . '/.onoff-update-state.json';
        if (!is_file($file)) {
            return array();
        }

        $decoded = json_decode((string) file_get_contents($file), true);

        return is_array($decoded) ? $decoded : array();
    }
}
