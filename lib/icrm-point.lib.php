<?php
/**
 * iCRM ↔ 그누보드 회원 포인트 연동 · AI API 과금 (실제 API 원가 × 5배)
 * 포인트는 로그인 회원의 mb_point 기준 (그누보드 회원관리와 동일)
 * 최고관리자(cf_admin)는 insert_point 에서 로그인·글·댓글 등 일반 활동 포인트 제외
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

if (!function_exists('icrm_point_get_multiplier')) {
    function icrm_point_get_multiplier()
    {
        static $mult = null;

        if ($mult !== null) {
            return $mult;
        }

        $mult = 5;
        if (function_exists('g5site_cfg')) {
            $cfg = g5site_cfg('icrm_point_cost_multiplier', '5');
            if ($cfg !== '' && is_numeric($cfg)) {
                $mult = max(1, (int) $cfg);
            }
        }

        return $mult;
    }
}

if (!function_exists('icrm_point_is_enabled')) {
    function icrm_point_is_enabled()
    {
        if (function_exists('g5site_cfg_bool') && !g5site_cfg_bool('icrm_point_billing_enabled', true)) {
            return false;
        }

        return icrm_point_get_license_key() !== '';
    }
}

if (!function_exists('icrm_point_get_license_key')) {
    function icrm_point_get_license_key()
    {
        if (function_exists('onoff_builder_config_license_key')) {
            $key = onoff_builder_config_license_key();
            if ($key !== '') {
                return $key;
            }
        }

        if (is_file(G5_DATA_PATH . '/icrm-update.config.php')) {
            include_once G5_DATA_PATH . '/icrm-update.config.php';
            if (defined('ICRM_UPDATE_LICENSE_KEY')) {
                $key = trim((string) ICRM_UPDATE_LICENSE_KEY);
                if ($key !== '') {
                    return $key;
                }
            }
        }

        if (function_exists('g5b_seo_meta_get_license_key')) {
            $key = trim(g5b_seo_meta_get_license_key());
            if ($key !== '') {
                return $key;
            }
        }

        if (function_exists('auto_comment_get_setting')) {
            return trim(auto_comment_get_setting('icrm_license_key', ''));
        }

        if (function_exists('g5site_cfg')) {
            return trim(g5site_cfg('icrm_license_key', ''));
        }

        return '';
    }
}

if (!function_exists('icrm_point_get_api_base_url')) {
    function icrm_point_get_api_base_url()
    {
        $url = '';
        if (function_exists('onoff_builder_config_api_base_url')) {
            $url = onoff_builder_config_api_base_url('point_api_base_url', '');
        }
        if (function_exists('g5site_cfg')) {
            $url = $url !== '' ? $url : trim(g5site_cfg('icrm_point_api_base_url', ''));
        }
        if ($url === '') {
            $url = 'https://icrm.co.kr/api/site';
        }

        return rtrim($url, '/');
    }
}

if (!function_exists('icrm_point_get_admin_mb_id')) {
    /** iCRM 사이트 등록용 기본 회원 (환경설정 cf_admin) */
    function icrm_point_get_admin_mb_id()
    {
        global $config;

        return isset($config['cf_admin']) ? trim((string) $config['cf_admin']) : '';
    }
}

if (!function_exists('icrm_point_get_billing_mb_id')) {
    /**
     * AI 과금·잔액 조회 대상 회원 — 로그인 회원 우선, 없으면 cf_admin
     *
     * @param string|null $explicit_mb_id
     * @return string
     */
    function icrm_point_get_billing_mb_id($explicit_mb_id = null)
    {
        if ($explicit_mb_id !== null && $explicit_mb_id !== '') {
            return preg_replace('/[^a-z0-9_]/i', '', (string) $explicit_mb_id);
        }

        global $member, $is_member;
        if (!empty($is_member) && isset($member['mb_id']) && trim((string) $member['mb_id']) !== '') {
            return trim((string) $member['mb_id']);
        }

        return icrm_point_get_admin_mb_id();
    }
}

if (!function_exists('icrm_point_get_member_label')) {
    function icrm_point_get_member_label($mb_id)
    {
        $mb_id = trim((string) $mb_id);
        if ($mb_id === '') {
            return '';
        }

        global $g5;
        $row = sql_fetch(" select mb_nick, mb_name from {$g5['member_table']} where mb_id = '" . sql_escape_string($mb_id) . "' ");
        if (!$row) {
            return $mb_id;
        }

        $nick = trim((string) $row['mb_nick']);
        if ($nick !== '') {
            return $nick . ' (' . $mb_id . ')';
        }

        $name = trim((string) $row['mb_name']);
        if ($name !== '') {
            return $name . ' (' . $mb_id . ')';
        }

        return $mb_id;
    }
}

if (!function_exists('icrm_point_get_balance')) {
    function icrm_point_get_balance($mb_id = null)
    {
        if ($mb_id === null || $mb_id === '') {
            $mb_id = icrm_point_get_billing_mb_id();
        }
        if ($mb_id === '' || !function_exists('get_point_sum')) {
            return 0;
        }

        return (int) get_point_sum($mb_id);
    }
}

if (!function_exists('icrm_point_calc_charge')) {
    /**
     * 실제 API 원가(KRW) → 고객 차감 포인트 (기본 5배)
     *
     * @param float $cost_krw
     * @return int
     */
    function icrm_point_calc_charge($cost_krw)
    {
        $cost_krw = max(0, (float) $cost_krw);
        if ($cost_krw <= 0) {
            return 0;
        }

        return (int) max(1, (int) ceil($cost_krw * icrm_point_get_multiplier()));
    }
}

if (!function_exists('icrm_point_resolve_charge')) {
    function icrm_point_resolve_charge(array $icrm_json)
    {
        if (isset($icrm_json['points_charged']) && (int) $icrm_json['points_charged'] > 0) {
            return (int) $icrm_json['points_charged'];
        }

        $cost = 0;
        if (isset($icrm_json['cost_krw'])) {
            $cost = (float) $icrm_json['cost_krw'];
        } elseif (isset($icrm_json['data']['cost_krw'])) {
            $cost = (float) $icrm_json['data']['cost_krw'];
        }

        return icrm_point_calc_charge($cost);
    }
}

if (!function_exists('icrm_point_make_request_id')) {
    function icrm_point_make_request_id($service, $task = '')
    {
        $service = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $service));
        $task = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $task));

        try {
            $rand = bin2hex(random_bytes(8));
        } catch (Exception $e) {
            $rand = md5(uniqid('', true));
        }

        return $service . '_' . ($task !== '' ? $task . '_' : '') . date('YmdHis') . '_' . $rand;
    }
}

if (!function_exists('icrm_point_table')) {
    function icrm_point_table($suffix = 'usage')
    {
        $prefix = function_exists('icrm_table_prefix') ? icrm_table_prefix() : (defined('G5_TABLE_PREFIX') ? G5_TABLE_PREFIX : 'g5_');

        return $prefix . 'icrm_point_' . $suffix;
    }
}

if (!function_exists('icrm_point_ensure_usage_table')) {
    function icrm_point_ensure_usage_table()
    {
        static $done = false;

        if ($done) {
            return;
        }

        $table = icrm_point_table('usage');
        sql_query(" create table if not exists {$table} (
            ipu_id int not null auto_increment,
            ipu_service varchar(32) not null default '',
            ipu_task varchar(32) not null default '',
            ipu_request_id varchar(64) not null default '',
            ipu_mb_id varchar(20) not null default '',
            ipu_points_charged int not null default 0,
            ipu_cost_krw decimal(12,4) not null default 0,
            ipu_point_balance int not null default 0,
            ipu_status varchar(20) not null default '',
            ipu_model varchar(100) not null default '',
            ipu_error text not null,
            ipu_created_at datetime not null default '0000-00-00 00:00:00',
            primary key (ipu_id),
            unique key request_id (ipu_request_id),
            key created_at (ipu_created_at),
            key mb_id (ipu_mb_id),
            key service_task (ipu_service, ipu_task)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8 ", false);

        $done = true;
    }
}

if (!function_exists('icrm_point_ensure_charge_table')) {
    function icrm_point_ensure_charge_table()
    {
        static $done = false;

        if ($done) {
            return;
        }

        $table = icrm_point_table('charge_requests');
        sql_query(" create table if not exists {$table} (
            ipcr_id int not null auto_increment,
            request_id varchar(64) not null default '',
            ipcr_mb_id varchar(20) not null default '',
            ipcr_amount_krw int not null default 0,
            ipcr_requested_points int not null default 0,
            ipcr_depositor varchar(100) not null default '',
            ipcr_memo text not null,
            ipcr_status varchar(20) not null default 'pending',
            ipcr_icrm_message text not null,
            ipcr_created_at datetime not null default '0000-00-00 00:00:00',
            ipcr_updated_at datetime not null default '0000-00-00 00:00:00',
            primary key (ipcr_id),
            unique key request_id (request_id),
            key status (ipcr_status),
            key created_at (ipcr_created_at)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8 ", false);

        $done = true;
    }
}

if (!function_exists('icrm_point_record_usage')) {
    function icrm_point_record_usage($service, $task, $request_id, $status, $points_charged, $cost_krw, $point_balance, $model, $error = '', $mb_id = null)
    {
        icrm_point_ensure_usage_table();

        $request_id = substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $request_id), 0, 64);
        if ($request_id === '') {
            return;
        }

        $mb_id = icrm_point_get_billing_mb_id($mb_id);
        $table = icrm_point_table('usage');
        $exists = sql_fetch(" select ipu_id from {$table} where ipu_request_id = '" . sql_escape_string($request_id) . "' limit 1 ");
        if (!empty($exists['ipu_id'])) {
            return;
        }

        sql_query(" insert into {$table}
                        set ipu_service = '" . sql_escape_string(substr((string) $service, 0, 32)) . "',
                            ipu_task = '" . sql_escape_string(substr((string) $task, 0, 32)) . "',
                            ipu_request_id = '" . sql_escape_string($request_id) . "',
                            ipu_mb_id = '" . sql_escape_string($mb_id) . "',
                            ipu_points_charged = '" . (int) $points_charged . "',
                            ipu_cost_krw = '" . sql_escape_string(sprintf('%.4f', (float) $cost_krw)) . "',
                            ipu_point_balance = '" . (int) $point_balance . "',
                            ipu_status = '" . sql_escape_string(substr((string) $status, 0, 20)) . "',
                            ipu_model = '" . sql_escape_string(substr((string) $model, 0, 100)) . "',
                            ipu_error = '" . sql_escape_string((string) $error) . "',
                            ipu_created_at = '" . G5_TIME_YMDHIS . "' ", false);
    }
}

if (!function_exists('icrm_point_require_config')) {
    function icrm_point_require_config($mb_id = null)
    {
        global $config, $g5;

        if (empty($config['cf_use_point'])) {
            return array(
                'ok'    => false,
                'error' => '그누보드 포인트 사용이 꺼져 있습니다. 환경설정 → 기본환경설정에서 포인트 사용을 켜 주세요.',
            );
        }

        $mb_id = icrm_point_get_billing_mb_id($mb_id);
        if ($mb_id === '') {
            return array('ok' => false, 'error' => '포인트를 적용할 회원을 찾을 수 없습니다. 로그인 후 다시 시도해 주세요.');
        }

        $row = sql_fetch(" select mb_id from {$g5['member_table']} where mb_id = '" . sql_escape_string($mb_id) . "' ");
        if (!$row) {
            return array('ok' => false, 'error' => '회원(' . $mb_id . ')을 찾을 수 없습니다.');
        }

        return array('ok' => true, 'mb_id' => $mb_id);
    }
}

if (!function_exists('icrm_point_sync_to_balance')) {
    /**
     * 지정 회원 mb_point 를 목표 잔액으로 맞춤 (iCRM point-sync 등)
     *
     * @param int         $target_balance
     * @param string      $reason
     * @param string|null $mb_id
     * @return bool
     */
    function icrm_point_sync_to_balance($target_balance, $reason = 'iCRM 포인트 동기화', $mb_id = null)
    {
        $check = icrm_point_require_config($mb_id);
        if (!$check['ok']) {
            return false;
        }

        $mb_id = $check['mb_id'];
        $target_balance = (int) $target_balance;
        $current = icrm_point_get_balance($mb_id);
        $delta = $target_balance - $current;

        if ($delta === 0) {
            return true;
        }

        if (!function_exists('insert_point')) {
            return false;
        }

        $rel_action = 'sync_' . substr(md5($reason . '|' . $target_balance . '|' . date('YmdHi')), 0, 24);
        insert_point($mb_id, $delta, (string) $reason, '@icrm', 0, $rel_action);

        return true;
    }
}

if (!function_exists('icrm_point_deduct')) {
    function icrm_point_deduct($points, $reason, $service, $request_id)
    {
        $points = (int) $points;
        if ($points <= 0) {
            return array('ok' => true, 'charged' => 0, 'balance' => icrm_point_get_balance());
        }

        $check = icrm_point_require_config();
        if (!$check['ok']) {
            return $check;
        }

        $mb_id = $check['mb_id'];
        $balance = icrm_point_get_balance($mb_id);
        if ($balance < $points) {
            return array(
                'ok'      => false,
                'status'  => 'point_insufficient',
                'error'   => 'AI API 포인트가 부족합니다. (보유 ' . number_format($balance) . 'P / 필요 ' . number_format($points) . 'P) iCRM에서 포인트를 충전해 주세요.',
                'balance' => $balance,
                'needed'  => $points,
            );
        }

        $rel_action = substr(preg_replace('/[^a-zA-Z0-9_]/', '_', 'ai_' . $service . '_' . $request_id), 0, 50);
        $result = insert_point($mb_id, -$points, (string) $reason, '@icrm', 0, $rel_action);

        if ($result === -1) {
            return array(
                'ok'        => true,
                'charged'   => 0,
                'duplicate' => true,
                'balance'   => icrm_point_get_balance($mb_id),
            );
        }

        return array(
            'ok'      => true,
            'charged' => $points,
            'balance' => icrm_point_get_balance($mb_id),
        );
    }
}

if (!function_exists('icrm_point_fetch_bank_info_from_icrm')) {
    /**
     * iCRM에 설정된 입금 안내 계좌 조회
     *
     * @return array{bank_name:string,account_no:string,holder_name:string,extra_note:string}
     */
    function icrm_point_fetch_bank_info_from_icrm()
    {
        $empty = array(
            'bank_name'   => '',
            'account_no'  => '',
            'holder_name' => '',
            'extra_note'  => '',
        );

        $payload = array();
        $license_key = icrm_point_get_license_key();
        if ($license_key !== '') {
            $payload['license_key'] = $license_key;
        }
        $domain = function_exists('g5b_seo_meta_site_domain')
            ? g5b_seo_meta_site_domain()
            : (function_exists('auto_comment_site_domain') ? auto_comment_site_domain() : '');
        if ($domain !== '') {
            $payload['domain'] = $domain;
        }

        try {
            $response = icrm_point_http_post_json(icrm_point_get_api_base_url() . '/point-bank-info', $payload, 12);
        } catch (Exception $e) {
            return $empty;
        }

        $json = json_decode($response, true);
        if (!is_array($json) || empty($json['success']) || empty($json['bank_info']) || !is_array($json['bank_info'])) {
            return $empty;
        }

        $bank = array_merge($empty, $json['bank_info']);
        $has_data = trim((string) ($bank['bank_name'] ?? '')) !== ''
            || trim((string) ($bank['account_no'] ?? '')) !== ''
            || trim((string) ($bank['holder_name'] ?? '')) !== '';

        return $has_data ? $bank : $empty;
    }
}

if (!function_exists('icrm_point_fetch_balance_from_icrm')) {
    /**
     * iCRM 사이트 잔액을 특정 회원에게 반영 (수동 동기화용)
     *
     * @param string|null $mb_id
     * @param array       $options sync_mode: up_only(기본) | force
     */
    function icrm_point_fetch_balance_from_icrm($mb_id = null, array $options = array())
    {
        $license_key = icrm_point_get_license_key();
        if ($license_key === '') {
            return array('ok' => false, 'error' => 'iCRM 라이선스 키가 없습니다.');
        }

        $mb_id = icrm_point_get_billing_mb_id($mb_id);
        $domain = function_exists('g5b_seo_meta_site_domain')
            ? g5b_seo_meta_site_domain()
            : (function_exists('auto_comment_site_domain') ? auto_comment_site_domain() : '');

        $payload = array(
            'license_key' => $license_key,
            'domain'      => $domain,
            'admin_mb_id' => $mb_id,
        );

        try {
            $response = icrm_point_http_post_json(icrm_point_get_api_base_url() . '/point-balance', $payload, 15);
        } catch (Exception $e) {
            return array('ok' => false, 'error' => $e->getMessage());
        }

        $json = json_decode($response, true);
        if (!is_array($json) || empty($json['success'])) {
            $msg = isset($json['message']) ? (string) $json['message'] : 'iCRM 포인트 조회 실패';

            return array('ok' => false, 'error' => $msg);
        }

        if (function_exists('icrm_sync_secret_from_icrm_json')) {
            icrm_sync_secret_from_icrm_json($json);
        }

        $balance = isset($json['point_balance']) ? (int) $json['point_balance'] : 0;
        $balance_source = isset($json['balance_source']) ? (string) $json['balance_source'] : 'site_pool';
        $icrm_member = isset($json['icrm_member_mb_id']) ? trim((string) $json['icrm_member_mb_id']) : '';

        if ($balance_source !== 'icrm_member') {
            if ($icrm_member === '' && $balance <= 0) {
                return array(
                    'ok'    => false,
                    'error' => 'iCRM 회원 연동(icrm_member_mb_id)이 없어 포인트를 동기화할 수 없습니다. iCRM 관리자에게 문의하세요.',
                );
            }
            if ($balance <= 0) {
                return array(
                    'ok'    => false,
                    'error' => 'iCRM 사이트 풀 잔액(0P)은 회원 잔액으로 반영하지 않습니다.',
                );
            }
        }

        $current = icrm_point_get_balance($mb_id);
        if ($balance === 0 && $current > 0 && $balance_source !== 'icrm_member') {
            return array(
                'ok'    => false,
                'error' => '포인트 0P 응답을 적용하지 않았습니다. iCRM API·연동 상태를 확인하세요.',
            );
        }

        $sync_mode = isset($options['sync_mode']) ? (string) $options['sync_mode'] : 'up_only';
        if ($sync_mode !== 'force') {
            $sync_mode = 'up_only';
        }

        if ($sync_mode === 'up_only') {
            if ($balance <= $current) {
                icrm_point_mark_synced_now();

                return array(
                    'ok'                => true,
                    'point_balance'     => $current,
                    'mb_id'             => $mb_id,
                    'synced'            => false,
                    'balance_source'    => isset($json['balance_source']) ? (string) $json['balance_source'] : '',
                    'icrm_member_mb_id' => isset($json['icrm_member_mb_id']) ? (string) $json['icrm_member_mb_id'] : '',
                    'message'           => '로컬 차감 잔액을 유지합니다. (iCRM 풀 ' . number_format($balance) . 'P)',
                );
            }
        }

        icrm_point_sync_to_balance($balance, 'iCRM 포인트 잔액 동기화', $mb_id);
        icrm_point_mark_synced_now();

        return array(
            'ok'                => true,
            'point_balance'     => $balance,
            'mb_id'             => $mb_id,
            'synced'            => true,
            'balance_source'    => isset($json['balance_source']) ? (string) $json['balance_source'] : '',
            'icrm_member_mb_id' => isset($json['icrm_member_mb_id']) ? (string) $json['icrm_member_mb_id'] : '',
        );
    }
}

if (!function_exists('icrm_point_sync_connection_from_icrm')) {
    /**
     * iCRM point-balance 호출로 secret token만 동기화 (잔액 변경 없음)
     */
    function icrm_point_sync_connection_from_icrm()
    {
        static $done = false;
        if ($done) {
            return false;
        }
        $done = true;

        $license_key = icrm_point_get_license_key();
        if ($license_key === '') {
            return false;
        }

        $domain = function_exists('g5b_seo_meta_site_domain')
            ? g5b_seo_meta_site_domain()
            : (function_exists('auto_comment_site_domain') ? auto_comment_site_domain() : '');

        $payload = array(
            'license_key' => $license_key,
            'domain'      => $domain,
            'admin_mb_id' => icrm_point_get_billing_mb_id(),
        );

        try {
            $response = icrm_point_http_post_json(icrm_point_get_api_base_url() . '/point-balance', $payload, 12);
        } catch (Exception $e) {
            return false;
        }

        $json = json_decode($response, true);
        if (!is_array($json) || empty($json['success'])) {
            return false;
        }

        if (function_exists('icrm_sync_secret_from_icrm_json')) {
            return icrm_sync_secret_from_icrm_json($json);
        }

        return false;
    }
}

if (!function_exists('icrm_point_charge_request_points')) {
    function icrm_point_charge_request_points($amount_krw)
    {
        return max(0, (int) $amount_krw);
    }
}

if (!function_exists('icrm_point_request_charge')) {
    function icrm_point_request_charge($amount_krw, $depositor = '', $memo = '')
    {
        icrm_point_ensure_charge_table();

        $amount_krw = (int) $amount_krw;
        if ($amount_krw < 10000) {
            return array('ok' => false, 'error' => '충전 신청 금액은 10,000원 이상 입력해 주세요.');
        }

        $license_key = icrm_point_get_license_key();
        if ($license_key === '') {
            return array('ok' => false, 'error' => 'iCRM 라이선스 키가 없습니다. 먼저 iCRM 연동을 설정하세요.');
        }

        $request_id = icrm_point_make_request_id('point', 'charge');
        $points = icrm_point_charge_request_points($amount_krw);
        $depositor = trim((string) $depositor);
        $memo = trim((string) $memo);
        $mb_id = icrm_point_get_billing_mb_id();
        $domain = function_exists('g5b_seo_meta_site_domain')
            ? g5b_seo_meta_site_domain()
            : (function_exists('auto_comment_site_domain') ? auto_comment_site_domain() : '');

        $payload = array(
            'license_key'      => $license_key,
            'domain'           => $domain,
            'request_id'       => $request_id,
            'admin_mb_id'      => $mb_id,
            'amount_krw'       => $amount_krw,
            'requested_points' => $points,
            'depositor'        => $depositor,
            'memo'             => $memo,
            'charge_source'    => 'onoff_builder_member',
            'charge_source_label' => '온오프빌더 회원',
            'callback_url'     => (function_exists('icrm_get_site_base_url') ? icrm_get_site_base_url() : (defined('G5_URL') ? G5_URL : '')) . '/icrm/point-sync.php',
        );

        $status = 'pending';
        $message = 'iCRM 승인 대기';

        try {
            $response = icrm_point_http_post_json(icrm_point_get_api_base_url() . '/point-charge-request', $payload, 20);
            $json = json_decode($response, true);
            if (!is_array($json)) {
                return array('ok' => false, 'error' => 'iCRM 충전 신청 응답을 읽을 수 없습니다.');
            }
            if (empty($json['success'])) {
                $msg = isset($json['message']) ? (string) $json['message'] : 'iCRM 충전 신청 실패';
                return array('ok' => false, 'error' => $msg);
            }
            $status = isset($json['status']) && $json['status'] !== '' ? preg_replace('/[^a-z_]/', '', (string) $json['status']) : 'pending';
            $message = isset($json['message']) ? (string) $json['message'] : 'iCRM 승인 대기';
            if (!empty($json['requested_points'])) {
                $points = max($points, (int) $json['requested_points']);
            }
            if (!empty($json['point_balance']) && function_exists('icrm_point_sync_to_balance')) {
                icrm_point_sync_to_balance((int) $json['point_balance'], 'iCRM 포인트 충전 선지급', $mb_id);
            }
        } catch (Exception $e) {
            return array('ok' => false, 'error' => $e->getMessage());
        }

        $table = icrm_point_table('charge_requests');
        sql_query(" insert into {$table}
                        set request_id = '" . sql_escape_string($request_id) . "',
                            ipcr_mb_id = '" . sql_escape_string($mb_id) . "',
                            ipcr_amount_krw = '" . (int) $amount_krw . "',
                            ipcr_requested_points = '" . (int) $points . "',
                            ipcr_depositor = '" . sql_escape_string($depositor) . "',
                            ipcr_memo = '" . sql_escape_string($memo) . "',
                            ipcr_status = '" . sql_escape_string($status) . "',
                            ipcr_icrm_message = '" . sql_escape_string($message) . "',
                            ipcr_created_at = '" . G5_TIME_YMDHIS . "',
                            ipcr_updated_at = '" . G5_TIME_YMDHIS . "' ", false);

        return array(
            'ok'               => true,
            'request_id'       => $request_id,
            'amount_krw'       => $amount_krw,
            'requested_points' => $points,
            'status'           => $status,
            'message'          => $message,
        );
    }
}

if (!function_exists('icrm_point_recent_charge_requests')) {
    function icrm_point_recent_charge_requests($limit = 10, $mb_id = null)
    {
        icrm_point_ensure_charge_table();
        $limit = max(1, min(30, (int) $limit));
        $mb_id = icrm_point_get_billing_mb_id($mb_id);
        $where = '';
        if ($mb_id !== '') {
            $where = " where ipcr_mb_id = '" . sql_escape_string($mb_id) . "' ";
        }
        $rows = array();
        $result = sql_query(" select *
                                from " . icrm_point_table('charge_requests') . "
                               {$where}
                               order by ipcr_id desc
                               limit {$limit} ", false);
        while ($row = sql_fetch_array($result)) {
            $rows[] = $row;
        }

        return $rows;
    }
}

if (!function_exists('icrm_point_http_post_json')) {
    function icrm_point_http_post_json($url, $payload, $timeout = 30)
    {
        $body = json_encode($payload);
        if ($body === false) {
            throw new Exception('iCRM 요청 JSON 생성 실패');
        }

        if (!function_exists('curl_init')) {
            throw new Exception('서버에 cURL 확장이 필요합니다.');
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => array(
                'Content-Type: application/json',
                'Accept: application/json',
            ),
            CURLOPT_TIMEOUT        => (int) $timeout,
            CURLOPT_CONNECTTIMEOUT => min(10, (int) $timeout),
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_FOLLOWLOCATION => false,
        ));

        $response = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno) {
            throw new Exception('iCRM API 연결 실패: ' . $error);
        }
        if ($status < 200 || $status >= 300) {
            $hint = '';
            if ($status >= 300 && $status < 400) {
                $location = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
                if ($location !== '') {
                    $hint = ' (리다이렉트: ' . $location . ')';
                } else {
                    $hint = ' (API 엔드포인트를 확인하세요)';
                }
            }
            throw new Exception('iCRM API HTTP ' . $status . $hint);
        }

        return (string) $response;
    }
}

if (!function_exists('icrm_point_usage_already_recorded')) {
    function icrm_point_usage_already_recorded($request_id)
    {
        icrm_point_ensure_usage_table();
        $request_id = substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $request_id), 0, 64);
        if ($request_id === '') {
            return false;
        }

        $table = icrm_point_table('usage');
        $row = sql_fetch(" select ipu_id from {$table} where ipu_request_id = '" . sql_escape_string($request_id) . "' limit 1 ");

        return !empty($row['ipu_id']);
    }
}

if (!function_exists('icrm_point_apply_api_response')) {
    /**
     * iCRM AI API 성공 응답 후 로그인 회원 포인트 차감
     *
     * @param string $service seo_meta|auto_comment
     * @param string $task
     * @param array  $icrm_json 전체 JSON 응답
     * @param string $request_id
     * @return array
     */
    function icrm_point_apply_api_response($service, $task, array $icrm_json, $request_id = '')
    {
        if (!icrm_point_is_enabled()) {
            return array('ok' => true, 'billing' => 'disabled');
        }

        $request_id = substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $request_id), 0, 64);
        if ($request_id !== '' && icrm_point_usage_already_recorded($request_id)) {
            $billing_mb = icrm_point_get_billing_mb_id();

            return array(
                'ok'            => true,
                'points_charged'=> 0,
                'point_balance' => icrm_point_get_balance($billing_mb),
                'mb_id'         => $billing_mb,
                'duplicate'     => true,
            );
        }

        $billing_mb = icrm_point_get_billing_mb_id();
        $model = isset($icrm_json['model']) ? (string) $icrm_json['model'] : '';
        $cost_krw = isset($icrm_json['cost_krw']) ? (float) $icrm_json['cost_krw'] : 0;

        if (empty($icrm_json['success'])) {
            $status = isset($icrm_json['status']) ? (string) $icrm_json['status'] : 'failed';
            $error = isset($icrm_json['message']) ? (string) $icrm_json['message'] : 'API 실패';

            icrm_point_record_usage($service, $task, $request_id, $status, 0, $cost_krw, icrm_point_get_balance($billing_mb), $model, $error, $billing_mb);

            if ($status === 'point_insufficient') {
                $error_msg = $error !== '' ? $error : 'iCRM 포인트가 부족합니다.';
                if ($error_msg === '포인트가 부족합니다.' && function_exists('icrm_point_get_balance')) {
                    $local_balance = (int) icrm_point_get_balance($billing_mb);
                    if ($local_balance > 0) {
                        $error_msg = '회원 포인트(' . number_format($local_balance) . 'P)가 iCRM에 전달되지 않았습니다. iCRM·사이트를 최신 업데이트한 뒤 다시 시도해 주세요.';
                    }
                }

                return array(
                    'ok'     => false,
                    'status' => 'point_insufficient',
                    'error'  => $error_msg,
                );
            }

            return array('ok' => false, 'error' => $error);
        }

        $points = icrm_point_resolve_charge($icrm_json);

        if ($points > 0) {
            $deduct = icrm_point_deduct(
                $points,
                'iCRM AI · ' . $service . ' · ' . $task . ' (원가×' . icrm_point_get_multiplier() . ')',
                $service,
                $request_id
            );
            if (!$deduct['ok']) {
                icrm_point_record_usage($service, $task, $request_id, 'point_insufficient', 0, $cost_krw, icrm_point_get_balance($billing_mb), $model, $deduct['error'], $billing_mb);

                return $deduct;
            }
            $charged = isset($deduct['charged']) ? (int) $deduct['charged'] : $points;
            $balance = isset($deduct['balance']) ? (int) $deduct['balance'] : icrm_point_get_balance($billing_mb);
        } else {
            $charged = 0;
            $balance = icrm_point_get_balance($billing_mb);
        }

        icrm_point_record_usage($service, $task, $request_id, 'success', $charged, $cost_krw, $balance, $model, '', $billing_mb);

        return array(
            'ok'             => true,
            'points_charged' => $charged,
            'point_balance'  => $balance,
            'mb_id'          => $billing_mb,
            'cost_krw'       => $cost_krw,
            'multiplier'     => icrm_point_get_multiplier(),
        );
    }
}

if (!function_exists('icrm_point_check_before_call')) {
    function icrm_point_check_before_call($min_points = 1)
    {
        if (!icrm_point_is_enabled()) {
            return array('ok' => true);
        }

        $check = icrm_point_require_config();
        if (!$check['ok']) {
            return $check;
        }

        $balance = icrm_point_get_balance($check['mb_id']);
        if ($balance < (int) $min_points && function_exists('icrm_point_fetch_balance_from_icrm')) {
            $fetch = icrm_point_fetch_balance_from_icrm($check['mb_id']);
            if (!empty($fetch['ok'])) {
                $balance = icrm_point_get_balance($check['mb_id']);
            }
        }
        if ($balance < (int) $min_points) {
            return array(
                'ok'      => false,
                'status'  => 'point_insufficient',
                'error'   => 'AI API 포인트가 부족합니다. (보유 ' . number_format($balance) . 'P) iCRM에서 포인트를 충전해 주세요.',
                'balance' => $balance,
            );
        }

        return array('ok' => true, 'balance' => $balance);
    }
}

if (!function_exists('icrm_point_format_summary')) {
    function icrm_point_format_summary($mb_id = null)
    {
        $mb_id = icrm_point_get_billing_mb_id($mb_id);
        $balance = icrm_point_get_balance($mb_id);

        return icrm_point_get_member_label($mb_id) . ' · ' . number_format($balance) . 'P';
    }
}

if (!function_exists('icrm_point_recent_member_history')) {
    /**
     * 그누보드 포인트 내역 (회원관리 화면과 동일 데이터)
     *
     * @param string|null $mb_id
     * @param int         $limit
     * @return array
     */
    function icrm_point_recent_member_history($mb_id = null, $limit = 15)
    {
        global $g5;

        $mb_id = icrm_point_get_billing_mb_id($mb_id);
        if ($mb_id === '') {
            return array();
        }

        $limit = max(1, min(50, (int) $limit));
        $rows = array();
        $result = sql_query(" select po_datetime, po_content, po_point, po_mb_point
                                from {$g5['point_table']}
                               where mb_id = '" . sql_escape_string($mb_id) . "'
                               order by po_id desc
                               limit {$limit} ", false);
        while ($row = sql_fetch_array($result)) {
            $rows[] = $row;
        }

        return $rows;
    }
}

if (!function_exists('icrm_point_usage_service_label')) {
    function icrm_point_usage_service_label($service)
    {
        $map = array(
            'seo_meta'          => 'SEO 메타',
            'rank_check'        => '순위체크',
            'icrm_rank'         => '순위체크',
            'content_collector' => '콘텐츠 수집',
            'auto_comment'      => '자동댓글',
            'point'             => '포인트',
        );

        $service = (string) $service;

        return isset($map[$service]) ? $map[$service] : ($service !== '' ? $service : '-');
    }
}

if (!function_exists('icrm_point_usage_task_label')) {
    function icrm_point_usage_task_label($task)
    {
        $map = array(
            'generate'          => 'AI 생성',
            'healthcheck'       => '연결 테스트',
            'faq'               => 'FAQ 생성',
            'draft'             => '초안 작성',
            'score'             => 'SEO 점수',
            'keywords'          => '키워드',
            'image_alt'         => '이미지 ALT',
            'check'             => '순위체크',
            'collect'           => 'URL 수집',
            'import'            => '콘텐츠 수신',
            'publish_checklist' => '발행 체크',
            'internal_links'    => '내부링크',
            'charge'            => '충전',
        );

        $task = (string) $task;

        return isset($map[$task]) ? $map[$task] : ($task !== '' ? $task : '-');
    }
}

if (!function_exists('icrm_point_usage_status_label')) {
    function icrm_point_usage_status_label($status)
    {
        $map = array(
            'success'            => '성공',
            'failed'             => '실패',
            'point_insufficient' => '포인트 부족',
        );

        $status = (string) $status;

        return isset($map[$status]) ? $map[$status] : ($status !== '' ? $status : '-');
    }
}

if (!function_exists('icrm_point_fetch_usage_history')) {
    /**
     * iCRM AI API 포인트 사용 내역 (g5_icrm_point_usage)
     *
     * @param string|null $mb_id
     * @param int         $page
     * @param int         $per_page
     * @return array{items:array,total:int,page:int,per_page:int,total_pages:int}
     */
    function icrm_point_fetch_usage_history($mb_id = null, $page = 1, $per_page = 20)
    {
        icrm_point_ensure_usage_table();

        $mb_id = icrm_point_get_billing_mb_id($mb_id);
        $page = max(1, (int) $page);
        $per_page = max(5, min(50, (int) $per_page));
        $offset = ($page - 1) * $per_page;
        $table = icrm_point_table('usage');
        $where = '';
        if ($mb_id !== '') {
            $where = " where ipu_mb_id = '" . sql_escape_string($mb_id) . "' ";
        }

        $total_row = sql_fetch(" select count(*) as cnt from {$table} {$where} ");
        $total = isset($total_row['cnt']) ? (int) $total_row['cnt'] : 0;
        $items = array();
        $result = sql_query(" select *
                                from {$table}
                               {$where}
                               order by ipu_id desc
                               limit {$offset}, {$per_page} ", false);
        while ($row = sql_fetch_array($result)) {
            $items[] = $row;
        }

        return array(
            'items'       => $items,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $per_page,
            'total_pages' => max(1, (int) ceil($total / $per_page)),
        );
    }
}

if (!function_exists('icrm_point_last_sync_file')) {
    function icrm_point_last_sync_file()
    {
        return G5_DATA_PATH . '/icrm-point-last-sync.txt';
    }
}

if (!function_exists('icrm_point_sync_interval_hours')) {
    function icrm_point_sync_interval_hours()
    {
        $hours = function_exists('g5site_cfg') ? (int) g5site_cfg('icrm_point_sync_hours', '1') : 1;

        return max(1, $hours);
    }
}

if (!function_exists('icrm_point_should_sync_now')) {
    function icrm_point_should_sync_now()
    {
        $file = icrm_point_last_sync_file();
        if (!is_file($file)) {
            return true;
        }

        $last = (int) trim((string) file_get_contents($file));
        $interval = icrm_point_sync_interval_hours() * 3600;

        return (time() - $last) >= $interval;
    }
}

if (!function_exists('icrm_point_mark_synced_now')) {
    function icrm_point_mark_synced_now()
    {
        @file_put_contents(icrm_point_last_sync_file(), (string) time(), LOCK_EX);
    }
}

if (!function_exists('icrm_point_maybe_auto_sync')) {
    /**
     * iCRM 연결 회원 포인트 → 그누보드 mb_point 동기화 (관리자 화면 진입 시)
     */
    function icrm_point_maybe_auto_sync()
    {
        if (!function_exists('g5site_cfg_bool') || !g5site_cfg_bool('icrm_point_auto_sync', true)) {
            return;
        }
        if (!function_exists('icrm_point_should_sync_now') || !icrm_point_should_sync_now()) {
            return;
        }
        if (!function_exists('icrm_point_fetch_balance_from_icrm')) {
            return;
        }

        $mb_id = icrm_point_get_billing_mb_id();
        $local_balance = icrm_point_get_balance($mb_id);
        if ($local_balance <= 0) {
            icrm_point_fetch_balance_from_icrm($mb_id);
        }
        if (function_exists('icrm_point_mark_synced_now')) {
            icrm_point_mark_synced_now();
        }
    }
}
