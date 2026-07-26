<?php
/**
 * iCRM g5-update pull CLI
 *
 * Usage:
 *   php icrm/update-pull.php
 *   php icrm/update-pull.php --dry-run
 *   php icrm/update-pull.php --bundle=icrm-full
 */
$isCli = (PHP_SAPI === 'cli');

if (!$isCli) {
    header('HTTP/1.1 403 Forbidden');
    echo 'CLI only';
    exit;
}

$g5_root = dirname(__DIR__);
if (!is_file($g5_root . '/common.php')) {
    fwrite(STDERR, "GnuBoard root not found: {$g5_root}\n");
    exit(1);
}

include_once $g5_root . '/common.php';

if (!is_file(G5_LIB_PATH . '/icrm-update.lib.php')) {
    fwrite(STDERR, "icrm-update.lib.php not found. Run local apply --package=icrm-update once.\n");
    exit(1);
}

include_once G5_LIB_PATH . '/icrm-update.lib.php';

$dryRun = in_array('--dry-run', $argv, true);
$bundle = null;

foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--dry-run') {
        continue;
    }
    if (strpos($arg, '--bundle=') === 0) {
        $bundle = substr($arg, 9);
    }
}

$result = icrm_update_pull($dryRun, $bundle);

echo ($result['message'] ?? 'done') . PHP_EOL;

if (!empty($result['release_id'])) {
    echo 'Release: ' . $result['release_id'] . PHP_EOL;
}

if (!empty($result['changed']) && is_array($result['changed'])) {
    echo 'Changed: ' . count($result['changed']) . PHP_EOL;
    foreach ($result['changed'] as $item) {
        echo '  - ' . $item . PHP_EOL;
    }
}

if (!empty($result['skipped']) && is_array($result['skipped'])) {
    echo 'Skipped: ' . count($result['skipped']) . PHP_EOL;
    foreach ($result['skipped'] as $item) {
        echo '  - ' . $item . PHP_EOL;
    }
}

if (!empty($result['backup'])) {
    echo 'Backup: ' . $result['backup'] . PHP_EOL;
}

exit(!empty($result['success']) ? 0 : 1);
