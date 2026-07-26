<?php
/**
 * SEO 메타 수동 저장 · iCRM(온오프마케팅) 중앙 AI API (페이지 / 게시판 / 글)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_LIB_PATH . '/onoff-builder-config.lib.php')) {
    include_once G5_LIB_PATH . '/onoff-builder-config.lib.php';
}

if (!function_exists('g5b_seo_meta_data_dir')) {
    function g5b_seo_meta_data_dir()
    {
        $dir = G5_DATA_PATH . '/seo-meta';
        if (!is_dir($dir)) {
            @mkdir($dir, G5_DIR_PERMISSION, true);
        }

        return $dir;
    }
}

if (!function_exists('g5b_seo_meta_store_file')) {
    function g5b_seo_meta_store_file($type)
    {
        $type = preg_replace('/[^a-z]/', '', (string) $type);
        if ($type === '') {
            $type = 'pages';
        }

        return g5b_seo_meta_data_dir() . '/' . $type . '.json';
    }
}

if (!function_exists('g5b_seo_meta_load_store')) {
    function g5b_seo_meta_load_store($type)
    {
        static $cache = array();
        if (isset($cache[$type])) {
            return $cache[$type];
        }

        $file = g5b_seo_meta_store_file($type);
        if (!is_file($file)) {
            $cache[$type] = array();

            return $cache[$type];
        }

        $raw = @file_get_contents($file);
        $data = json_decode((string) $raw, true);
        if (!is_array($data)) {
            $data = array();
        }

        $cache[$type] = $data;

        return $cache[$type];
    }
}

if (!function_exists('g5b_seo_meta_save_store')) {
    function g5b_seo_meta_save_store($type, $data)
    {
        if (!is_array($data)) {
            return false;
        }

        $file = g5b_seo_meta_store_file($type);
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($json === false) {
            return false;
        }

        $ok = @file_put_contents($file, $json, LOCK_EX);
        if ($ok === false) {
            return false;
        }

        @chmod($file, G5_FILE_PERMISSION);

        return true;
    }
}

if (!function_exists('g5b_seo_meta_get')) {
    function g5b_seo_meta_get($type, $key)
    {
        $key = trim((string) $key);
        if ($key === '') {
            return null;
        }

        $store = g5b_seo_meta_load_store($type);
        if (!isset($store[$key]) || !is_array($store[$key])) {
            return null;
        }

        return g5b_seo_meta_normalize_record($store[$key]);
    }
}

if (!function_exists('g5b_seo_meta_normalize_record')) {
    function g5b_seo_meta_normalize_record($row)
    {
        if (!is_array($row)) {
            return array();
        }

        $faq = array();
        if (!empty($row['faq']) && is_array($row['faq'])) {
            foreach ($row['faq'] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $q = isset($item['q']) ? trim((string) $item['q']) : '';
                $a = isset($item['a']) ? trim((string) $item['a']) : '';
                if ($q !== '' && $a !== '') {
                    $faq[] = array('q' => $q, 'a' => $a);
                }
            }
        }

        return array(
            'title'        => isset($row['title']) ? trim((string) $row['title']) : '',
            'description'  => isset($row['description']) ? trim((string) $row['description']) : '',
            'keywords'     => isset($row['keywords']) ? trim((string) $row['keywords']) : '',
            'robots'       => isset($row['robots']) ? trim((string) $row['robots']) : '',
            'og_image'     => isset($row['og_image']) ? trim((string) $row['og_image']) : '',
            'canonical'    => isset($row['canonical']) ? trim((string) $row['canonical']) : '',
            'schema_type'  => isset($row['schema_type']) ? trim((string) $row['schema_type']) : '',
            'faq'          => $faq,
            'updated_at'   => isset($row['updated_at']) ? (string) $row['updated_at'] : '',
        );
    }
}

if (!function_exists('g5b_seo_meta_save')) {
    function g5b_seo_meta_save($type, $key, $row)
    {
        $key = trim((string) $key);
        if ($key === '') {
            return false;
        }

        $record = g5b_seo_meta_normalize_record($row);
        $record['updated_at'] = date('Y-m-d H:i:s');

        $store = g5b_seo_meta_load_store($type);
        $empty = $record['title'] === '' && $record['description'] === '' && $record['keywords'] === ''
            && $record['robots'] === '' && $record['og_image'] === '' && $record['canonical'] === ''
            && $record['schema_type'] === '' && empty($record['faq']);

        if ($empty) {
            unset($store[$key]);
        } else {
            $store[$key] = $record;
        }

        return g5b_seo_meta_save_store($type, $store);
    }
}

if (!function_exists('g5b_seo_meta_config_path')) {
    function g5b_seo_meta_config_path()
    {
        return G5_DATA_PATH . '/seo-meta.config.php';
    }
}

if (!function_exists('g5b_seo_meta_load_config')) {
    function g5b_seo_meta_load_config()
    {
        static $cfg = null;
        if ($cfg !== null) {
            return $cfg;
        }

        $cfg = array(
            'icrm_license_key'    => '',
            'icrm_seo_api_base_url' => 'https://icrm.co.kr/api/seo-meta',
        );

        if (function_exists('onoff_builder_config_license_key')) {
            $key = onoff_builder_config_license_key();
            if ($key !== '') {
                $cfg['icrm_license_key'] = $key;
            }
        }
        if (function_exists('onoff_builder_config_api_base_url')) {
            $url = onoff_builder_config_api_base_url('seo_meta_api_base_url', '');
            if ($url !== '') {
                $cfg['icrm_seo_api_base_url'] = $url;
            }
        }

        if (function_exists('g5site_cfg')) {
            $key = g5site_cfg('icrm_license_key', '');
            if ($key !== '') {
                $cfg['icrm_license_key'] = $key;
            }
            $url = g5site_cfg('icrm_seo_api_base_url', '');
            if ($url !== '') {
                $cfg['icrm_seo_api_base_url'] = $url;
            }
        }

        $file = g5b_seo_meta_config_path();
        if (is_file($file)) {
            include $file;
            if (defined('G5B_SEO_ICRM_LICENSE_KEY') && G5B_SEO_ICRM_LICENSE_KEY !== '') {
                $cfg['icrm_license_key'] = G5B_SEO_ICRM_LICENSE_KEY;
            }
            if (defined('G5B_SEO_ICRM_API_BASE_URL') && G5B_SEO_ICRM_API_BASE_URL !== '') {
                $cfg['icrm_seo_api_base_url'] = G5B_SEO_ICRM_API_BASE_URL;
            }
        }

        if (function_exists('onoff_builder_config_license_key')) {
            $key = onoff_builder_config_license_key();
            if ($key !== '') {
                $cfg['icrm_license_key'] = $key;
            }
        }
        if (function_exists('onoff_builder_config_api_base_url')) {
            $url = onoff_builder_config_api_base_url('seo_meta_api_base_url', '');
            if ($url !== '') {
                $cfg['icrm_seo_api_base_url'] = $url;
            }
        }

        return $cfg;
    }
}

if (!function_exists('g5b_seo_meta_site_domain')) {
    function g5b_seo_meta_site_domain()
    {
        if (!empty($_SERVER['HTTP_HOST'])) {
            $host = strtolower(preg_replace('/[^a-zA-Z0-9.\-:]/', '', (string) $_SERVER['HTTP_HOST']));
            if ($host !== '') {
                return $host;
            }
        }

        if (function_exists('icrm_get_site_base_url')) {
            $base = icrm_get_site_base_url();
            if ($base !== '') {
                $host = parse_url($base, PHP_URL_HOST);
                if ($host) {
                    return strtolower($host);
                }
            }
        }

        if (defined('G5_URL') && G5_URL) {
            $host = parse_url(G5_URL, PHP_URL_HOST);
            if ($host) {
                return strtolower($host);
            }
        }

        return '';
    }
}

if (!function_exists('g5b_seo_meta_get_license_key')) {
    function g5b_seo_meta_get_license_key()
    {
        $cfg = g5b_seo_meta_load_config();
        $key = isset($cfg['icrm_license_key']) ? trim((string) $cfg['icrm_license_key']) : '';

        if ($key !== '') {
            return $key;
        }

        if (function_exists('auto_comment_get_setting')) {
            $shared = trim(auto_comment_get_setting('icrm_license_key', ''));
            if ($shared !== '') {
                return $shared;
            }
        }

        return '';
    }
}

if (!function_exists('g5b_seo_meta_get_api_base_url')) {
    function g5b_seo_meta_get_api_base_url()
    {
        $cfg = g5b_seo_meta_load_config();
        $url = isset($cfg['icrm_seo_api_base_url']) ? trim((string) $cfg['icrm_seo_api_base_url']) : '';

        return $url !== '' ? rtrim($url, '/') : 'https://icrm.co.kr/api/seo-meta';
    }
}

/** @deprecated OpenAI 직접 연동 제거 — iCRM 라이선스 키 사용 */
if (!function_exists('g5b_seo_meta_get_api_key')) {
    function g5b_seo_meta_get_api_key()
    {
        return g5b_seo_meta_get_license_key();
    }
}

if (!function_exists('g5b_seo_meta_is_ai_configured')) {
    function g5b_seo_meta_is_ai_configured()
    {
        return g5b_seo_meta_get_license_key() !== '';
    }
}

if (!function_exists('g5b_seo_meta_save_license_settings')) {
    function g5b_seo_meta_save_license_settings($license_key, $api_base_url = '')
    {
        $license_key = trim((string) $license_key);
        $api_base_url = trim((string) $api_base_url);
        if ($api_base_url === '') {
            $api_base_url = g5b_seo_meta_get_api_base_url();
        }

        if ($license_key === '') {
            $file = g5b_seo_meta_config_path();
            if (is_file($file)) {
                include $file;
                if (defined('G5B_SEO_ICRM_LICENSE_KEY') && G5B_SEO_ICRM_LICENSE_KEY !== '') {
                    $license_key = G5B_SEO_ICRM_LICENSE_KEY;
                }
            }
        }

        if ($license_key === '') {
            return false;
        }

        $file = g5b_seo_meta_config_path();
        $php = "<?php\nif (!defined('_GNUBOARD_')) exit;\n"
            . "define('G5B_SEO_ICRM_LICENSE_KEY', " . var_export($license_key, true) . ");\n"
            . "define('G5B_SEO_ICRM_API_BASE_URL', " . var_export($api_base_url, true) . ");\n";

        $ok = @file_put_contents($file, $php, LOCK_EX);
        if ($ok === false) {
            return false;
        }

        @chmod($file, G5_FILE_PERMISSION);

        return true;
    }
}

if (!function_exists('g5b_seo_meta_icrm_api_url')) {
    function g5b_seo_meta_icrm_api_url($endpoint = 'generate')
    {
        $base = g5b_seo_meta_get_api_base_url();
        if (!preg_match('#^https?://#i', $base)) {
            throw new Exception('iCRM SEO API 주소가 올바르지 않습니다.');
        }

        $endpoint = trim((string) $endpoint, '/');
        if ($endpoint === 'generate' || $endpoint === 'generate/') {
            return rtrim($base, '/') . '/generate.php';
        }

        return rtrim($base, '/') . '/' . $endpoint;
    }
}

if (!function_exists('g5b_seo_meta_http_response_is_html')) {
    function g5b_seo_meta_http_response_is_html($response)
    {
        if (!is_string($response) || $response === '') {
            return false;
        }

        $snippet = strtolower(ltrim(substr($response, 0, 512)));

        return strpos($snippet, '<html') !== false
            || strpos($snippet, '<!doctype html') !== false
            || strpos($snippet, '<body') !== false;
    }
}

if (!function_exists('g5b_seo_meta_http_post_json')) {
    if (!class_exists('G5B_Seo_Meta_Icrm_Http_Exception')) {
        class G5B_Seo_Meta_Icrm_Http_Exception extends Exception
        {
            private $icrm_response;
            private $icrm_http_status;

            public function __construct($message, array $icrm_response = array(), $icrm_http_status = 0)
            {
                parent::__construct((string) $message);
                $this->icrm_response = $icrm_response;
                $this->icrm_http_status = (int) $icrm_http_status;
            }

            public function getIcrmResponse()
            {
                return $this->icrm_response;
            }

            public function getIcrmHttpStatus()
            {
                return $this->icrm_http_status;
            }
        }
    }

    function g5b_seo_meta_http_post_json($url, $payload, $timeout = 60)
    {
        $body = json_encode($payload);
        if ($body === false) {
            throw new Exception('AI 요청 JSON 생성에 실패했습니다.');
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
            throw new Exception('온오프마케팅(iCRM) API 연결 실패: ' . $error);
        }
        if (g5b_seo_meta_http_response_is_html($response)) {
            throw new Exception('iCRM API가 HTML 페이지를 반환했습니다. API URL과 iCRM 서버 배포 상태를 확인하세요.');
        }
        if ($status < 200 || $status >= 300) {
            $decoded = json_decode((string) $response, true);
            if (is_array($decoded)) {
                $message = isset($decoded['message']) && $decoded['message'] !== ''
                    ? (string) $decoded['message']
                    : ('온오프마케팅(iCRM) API 응답 오류: HTTP ' . $status);
                throw new G5B_Seo_Meta_Icrm_Http_Exception($message, $decoded, $status);
            }
            if ($status === 403) {
                throw new Exception('iCRM SEO API 접근이 거부되었습니다(HTTP 403). icrm.co.kr에 /api/seo-meta/generate.php 가 배포·실행 가능한지 확인해 주세요.');
            }
            if ($status >= 500) {
                throw new Exception('iCRM SEO API 서버 오류입니다(HTTP ' . $status . '). icrm.co.kr api/seo-meta 배포와 PHP-FPM 로그를 확인해 주세요.');
            }

            throw new Exception('온오프마케팅(iCRM) API 응답 오류: HTTP ' . $status);
        }

        return (string) $response;
    }
}

if (!function_exists('g5b_seo_meta_site_ai_context')) {
    function g5b_seo_meta_site_ai_context()
    {
        return array(
            'site_name'   => function_exists('g5site_cfg') ? g5site_cfg('site_name', '') : '',
            'site_desc'   => function_exists('g5site_cfg') ? g5site_cfg('site_desc', '') : '',
            'main_keyword'=> function_exists('g5site_cfg') ? g5site_cfg('main_keyword', '') : '',
            'address'     => function_exists('g5site_cfg') ? g5site_cfg('address', '') : '',
            'site_url'    => function_exists('icrm_get_site_base_url') ? icrm_get_site_base_url() : (defined('G5_URL') ? G5_URL : ''),
        );
    }
}

if (!function_exists('g5b_seo_meta_icrm_request')) {
    /**
     * 온오프마케팅(iCRM) 중앙 AI API
     *
     * @param string $task seo|faq|draft|image_alt|score|keywords|publish_checklist|internal_links
     * @param array  $params
     * @param int    $timeout
     * @return array
     */
    function g5b_seo_meta_icrm_request($task, $params = array(), $timeout = 60)
    {
        $license_key = g5b_seo_meta_get_license_key();
        if ($license_key === '') {
            return array(
                'ok'    => false,
                'error' => 'iCRM 라이선스 키가 설정되지 않았습니다. 관리자 → SEO 메타 관리 → iCRM 연동에서 키를 입력하세요. (iCRM에 사이트 등록 시 발급)',
            );
        }

        $request_id = function_exists('icrm_point_make_request_id')
            ? icrm_point_make_request_id('seo_meta', $task)
            : '';

        if ($task !== 'healthcheck' && function_exists('icrm_point_check_before_call')) {
            $precheck = icrm_point_check_before_call(1);
            if (!$precheck['ok']) {
                return array('ok' => false, 'error' => $precheck['error'], 'status' => isset($precheck['status']) ? $precheck['status'] : '');
            }
        }

        $payload = array_merge(
            g5b_seo_meta_site_ai_context(),
            array(
                'license_key'        => $license_key,
                'domain'             => g5b_seo_meta_site_domain(),
                'task'               => preg_replace('/[^a-z_]/', '', (string) $task),
                'request_id'         => $request_id,
                'admin_mb_id'        => function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : '',
                'billing_multiplier' => function_exists('icrm_point_get_multiplier') ? icrm_point_get_multiplier() : 6,
            ),
            $params
        );
        if (function_exists('icrm_point_is_enabled') && icrm_point_is_enabled()) {
            $billing_mb = function_exists('icrm_point_get_billing_mb_id') ? icrm_point_get_billing_mb_id() : '';
            $payload['member_point_balance'] = function_exists('icrm_point_get_balance')
                ? (int) icrm_point_get_balance($billing_mb)
                : 0;
        }

        try {
            $response = g5b_seo_meta_http_post_json(g5b_seo_meta_icrm_api_url('generate'), $payload, $timeout);
        } catch (Exception $e) {
            $error = array('ok' => false, 'error' => $e->getMessage());
            if ($e instanceof G5B_Seo_Meta_Icrm_Http_Exception) {
                $icrm_response = $e->getIcrmResponse();
                if (!empty($icrm_response['status'])) {
                    $error['status'] = (string) $icrm_response['status'];
                }
                if (isset($icrm_response['point_balance'])) {
                    $error['point_balance'] = (int) $icrm_response['point_balance'];
                }
                if (isset($icrm_response['points_charged'])) {
                    $error['points_charged'] = (int) $icrm_response['points_charged'];
                }
            }

            return $error;
        }

        $json = json_decode($response, true);
        if (!is_array($json)) {
            return array('ok' => false, 'error' => 'iCRM API 응답 JSON을 읽을 수 없습니다.');
        }

        if ($task !== 'healthcheck' && function_exists('icrm_point_apply_api_response')) {
            $billing = icrm_point_apply_api_response('seo_meta', $task, $json, $request_id);
            if (!$billing['ok']) {
                return array(
                    'ok'     => false,
                    'error'  => isset($billing['error']) ? $billing['error'] : '포인트 차감 실패',
                    'status' => isset($billing['status']) ? $billing['status'] : '',
                );
            }
        }

        if (empty($json['success'])) {
            $msg = isset($json['message']) && $json['message'] !== '' ? (string) $json['message'] : 'iCRM API 처리에 실패했습니다.';
            if (($json['status'] ?? '') === 'point_insufficient'
                && $msg === '포인트가 부족합니다.'
                && function_exists('icrm_point_get_balance')) {
                $local_balance = (int) icrm_point_get_balance();
                if ($local_balance > 0) {
                    $msg = '회원 포인트(' . number_format($local_balance) . 'P)가 iCRM에 전달되지 않았습니다. iCRM·사이트를 최신 업데이트한 뒤 다시 시도해 주세요.';
                }
            }

            return array('ok' => false, 'error' => $msg, 'status' => isset($json['status']) ? (string) $json['status'] : '');
        }

        $data = isset($json['data']) && is_array($json['data']) ? $json['data'] : $json;

        $result = array(
            'ok'    => true,
            'data'  => $data,
            'model' => isset($json['model']) ? (string) $json['model'] : 'icrm-central',
        );

        if (isset($billing) && is_array($billing)) {
            if (isset($billing['points_charged'])) {
                $result['points_charged'] = (int) $billing['points_charged'];
            }
            if (isset($billing['point_balance'])) {
                $result['point_balance'] = (int) $billing['point_balance'];
            }
        }

        return $result;
    }
}

if (!function_exists('g5b_seo_meta_test_icrm_api')) {
    function g5b_seo_meta_test_icrm_api()
    {
        $result = g5b_seo_meta_icrm_request('healthcheck', array(
            'subject' => 'iCRM SEO API 연결 테스트',
            'content' => '온오프마케팅 iCRM SEO API 연결 상태 확인 요청입니다.',
        ), 20);

        if (!$result['ok']) {
            return array('ok' => false, 'message' => $result['error']);
        }

        return array(
            'ok'      => true,
            'message' => 'iCRM SEO API 연결 성공. 모델: ' . (isset($result['model']) ? $result['model'] : 'icrm-central'),
        );
    }
}

if (!function_exists('g5b_seo_meta_list_pages')) {
    function g5b_seo_meta_list_pages()
    {
        $pages = array(
            array('key' => '/', 'label' => '메인 (index)', 'path' => '/'),
        );

        if (function_exists('seofeed_get_static_page_paths')) {
            foreach (seofeed_get_static_page_paths() as $path) {
                if ($path === '/') {
                    continue;
                }
                if (strpos($path, '/page/') !== 0) {
                    continue;
                }
                $key = ltrim($path, '/');
                $pages[] = array(
                    'key'   => $key,
                    'label' => basename($path, '.php'),
                    'path'  => $path,
                );
            }

            return $pages;
        }

        $page_dir = G5_PATH . '/page';
        if (is_dir($page_dir)) {
            foreach (glob($page_dir . '/*.php') as $file) {
                $name = basename($file);
                if ($name[0] === '_' || $name === '_init.php') {
                    continue;
                }
                $pages[] = array(
                    'key'   => 'page/' . $name,
                    'label' => basename($name, '.php'),
                    'path'  => '/page/' . $name,
                );
            }
        }

        return $pages;
    }
}

if (!function_exists('g5b_seo_meta_extract_page_text')) {
    function g5b_seo_meta_extract_page_text($page_key)
    {
        $page_key = trim((string) $page_key);
        if ($page_key === '' || $page_key === '/') {
            $file = G5_PATH . '/index.php';
        } elseif (preg_match('#^page/[a-z0-9_\-]+\.php$#i', $page_key)) {
            $file = G5_PATH . '/' . $page_key;
        } else {
            return '';
        }

        if (!is_file($file)) {
            return '';
        }

        $html = @file_get_contents($file);
        if ($html === false) {
            return '';
        }

        $text = preg_replace('/<\?php.*?\?>/s', ' ', $html);
        $text = strip_tags((string) $text);
        $text = preg_replace('/\s+/', ' ', $text);

        return trim((string) $text);
    }
}

if (!function_exists('g5b_seo_meta_extract_post_context')) {
    function g5b_seo_meta_extract_post_context($bo_table, $wr_id)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return array('subject' => '', 'content' => '', 'board_name' => '');
        }

        $write_table = $g5['write_prefix'] . $bo_table;
        $row = sql_fetch(" select wr_subject, wr_content from {$write_table} where wr_id = '{$wr_id}' ");
        if (!$row) {
            return array('subject' => '', 'content' => '', 'board_name' => '');
        }

        $board = sql_fetch(" select bo_subject from {$g5['board_table']} where bo_table = '{$bo_table}' ");
        $content = strip_tags((string) $row['wr_content']);
        $content = preg_replace('/\s+/', ' ', $content);

        return array(
            'subject'     => get_text(strip_tags((string) $row['wr_subject'])),
            'content'     => trim((string) $content),
            'board_name'  => $board ? get_text((string) $board['bo_subject']) : '',
        );
    }
}

if (!function_exists('g5b_seo_meta_build_ai_context')) {
    function g5b_seo_meta_build_ai_context($type, $key, $extra = array())
    {
        $type = preg_replace('/[^a-z]/', '', (string) $type);
        $key = trim((string) $key);
        $site_name = function_exists('g5site_cfg') ? g5site_cfg('site_name', '') : '';
        $site_desc = function_exists('g5site_cfg') ? g5site_cfg('site_desc', '') : '';
        $main_kw = function_exists('g5site_cfg') ? g5site_cfg('main_keyword', '') : '';
        $address = function_exists('g5site_cfg') ? g5site_cfg('address', '') : '';

        $parts = array(
            '사이트명: ' . $site_name,
            '사이트 설명: ' . $site_desc,
            '주요 키워드: ' . $main_kw,
            '주소(GEO): ' . $address,
            '대상 유형: ' . $type,
            '대상 키: ' . $key,
        );

        if ($type === 'pages') {
            $parts[] = '페이지 본문 요약: ' . g5b_seo_meta_extract_page_text($key);
        } elseif ($type === 'boards') {
            global $g5;
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', $key);
            $board = sql_fetch(" select bo_subject, bo_content_head from {$g5['board_table']} where bo_table = '{$bo_table}' ");
            if ($board) {
                $parts[] = '게시판명: ' . get_text((string) $board['bo_subject']);
                $head = strip_tags((string) $board['bo_content_head']);
                if ($head !== '') {
                    $parts[] = '게시판 상단 설명: ' . preg_replace('/\s+/', ' ', $head);
                }
            }
        } elseif ($type === 'posts') {
            if (preg_match('#^([a-z0-9_]+):(\d+)$#i', $key, $m)) {
                $ctx = g5b_seo_meta_extract_post_context($m[1], (int) $m[2]);
                $parts[] = '게시판: ' . $ctx['board_name'];
                $parts[] = '글 제목: ' . $ctx['subject'];
                $parts[] = '글 본문: ' . (function_exists('cut_str') ? cut_str($ctx['content'], 2000) : substr($ctx['content'], 0, 2000));
            }
        }

        if (!empty($extra['subject'])) {
            $parts[] = '입력 제목: ' . trim((string) $extra['subject']);
        }
        if (!empty($extra['content'])) {
            $plain = strip_tags((string) $extra['content']);
            $parts[] = '입력 본문: ' . (function_exists('cut_str') ? cut_str($plain, 2000) : substr($plain, 0, 2000));
        }

        return implode("\n", $parts);
    }
}

if (!function_exists('g5b_seo_meta_parse_faq_items')) {
    function g5b_seo_meta_parse_faq_items($items)
    {
        $faq = array();
        if (!is_array($items)) {
            return $faq;
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $q = isset($item['q']) ? $item['q'] : (isset($item['question']) ? $item['question'] : '');
            $a = isset($item['a']) ? $item['a'] : (isset($item['answer']) ? $item['answer'] : '');
            if (trim((string) $q) !== '' && trim((string) $a) !== '') {
                $faq[] = array('q' => trim((string) $q), 'a' => trim((string) $a));
            }
        }

        return $faq;
    }
}

if (!function_exists('g5b_seo_meta_ai_draft_post')) {
    function g5b_seo_meta_ai_draft_post($params = array())
    {
        $topic = isset($params['topic']) ? trim((string) $params['topic']) : '';
        if ($topic === '') {
            return array('ok' => false, 'error' => '주제를 입력해 주세요.');
        }

        $result = g5b_seo_meta_icrm_request('draft', array(
            'topic'      => $topic,
            'keywords'   => isset($params['keywords']) ? trim((string) $params['keywords']) : '',
            'tone'       => isset($params['tone']) ? trim((string) $params['tone']) : 'professional',
            'length'     => isset($params['length']) ? trim((string) $params['length']) : 'medium',
            'board_name' => isset($params['board_name']) ? trim((string) $params['board_name']) : '',
        ), 90);

        if (!$result['ok']) {
            return $result;
        }

        $data = $result['data'];

        return array(
            'ok'   => true,
            'data' => array(
                'subject' => isset($data['subject']) ? trim((string) $data['subject']) : '',
                'content' => isset($data['content']) ? trim((string) $data['content']) : '',
            ),
        );
    }
}

if (!function_exists('g5b_seo_meta_ai_generate_faq_enhanced')) {
    function g5b_seo_meta_ai_generate_faq_enhanced($type, $key, $extra = array(), $count = 6)
    {
        $count = max(3, min(8, (int) $count));

        $result = g5b_seo_meta_icrm_request('faq', array(
            'type'    => preg_replace('/[^a-z]/', '', (string) $type),
            'key'     => trim((string) $key),
            'count'   => $count,
            'context' => g5b_seo_meta_build_ai_context($type, $key, $extra),
            'subject' => isset($extra['subject']) ? (string) $extra['subject'] : '',
            'content' => isset($extra['content']) ? (string) $extra['content'] : '',
        ), 60);

        if (!$result['ok']) {
            return $result;
        }

        $faq = g5b_seo_meta_parse_faq_items(isset($result['data']['faq']) ? $result['data']['faq'] : array());

        return array(
            'ok'   => true,
            'data' => array('faq' => $faq),
        );
    }
}

if (!function_exists('g5b_seo_meta_ai_image_alts')) {
    function g5b_seo_meta_ai_image_alts($subject, $content, $files = array())
    {
        $file_payload = array();
        foreach ($files as $i => $file) {
            if (!is_array($file)) {
                continue;
            }
            $file_payload[] = array(
                'index'       => isset($file['index']) ? (int) $file['index'] : $i,
                'name'        => isset($file['name']) ? (string) $file['name'] : 'image_' . ($i + 1),
                'current_alt' => isset($file['current_alt']) ? (string) $file['current_alt'] : '',
            );
        }

        $result = g5b_seo_meta_icrm_request('image_alt', array(
            'subject' => trim((string) $subject),
            'content' => (string) $content,
            'files'   => $file_payload,
        ), 90);

        if (!$result['ok']) {
            return $result;
        }

        $data = $result['data'];
        $file_alts = array();
        if (!empty($data['file_alts']) && is_array($data['file_alts'])) {
            foreach ($data['file_alts'] as $alt) {
                $file_alts[] = trim((string) $alt);
            }
        }

        return array(
            'ok'   => true,
            'data' => array(
                'file_alts' => $file_alts,
                'content'   => isset($data['content']) ? trim((string) $data['content']) : (string) $content,
            ),
        );
    }
}

if (!function_exists('g5b_seo_meta_ai_score_post')) {
    function g5b_seo_meta_ai_score_post($subject, $content, $extra = array())
    {
        $result = g5b_seo_meta_icrm_request('score', array(
            'subject'     => trim((string) $subject),
            'content'     => (string) $content,
            'seo_title'   => isset($extra['seo_title']) ? (string) $extra['seo_title'] : '',
            'description' => isset($extra['description']) ? (string) $extra['description'] : '',
            'keywords'    => isset($extra['keywords']) ? (string) $extra['keywords'] : '',
            'faq_count'   => isset($extra['faq_count']) ? (int) $extra['faq_count'] : 0,
        ), 45);

        if (!$result['ok']) {
            return $result;
        }

        $data = $result['data'];
        $checks = array();
        if (!empty($data['checks']) && is_array($data['checks'])) {
            foreach ($data['checks'] as $check) {
                if (!is_array($check)) {
                    continue;
                }
                $checks[] = array(
                    'label'  => isset($check['label']) ? trim((string) $check['label']) : '',
                    'status' => isset($check['status']) ? trim((string) $check['status']) : '',
                    'hint'   => isset($check['hint']) ? trim((string) $check['hint']) : '',
                );
            }
        }

        $tips = array();
        if (!empty($data['tips']) && is_array($data['tips'])) {
            foreach ($data['tips'] as $tip) {
                $tip = trim((string) $tip);
                if ($tip !== '') {
                    $tips[] = $tip;
                }
            }
        }

        return array(
            'ok'   => true,
            'data' => array(
                'score'   => isset($data['score']) ? max(0, min(100, (int) $data['score'])) : 0,
                'grade'   => isset($data['grade']) ? trim((string) $data['grade']) : '',
                'summary' => isset($data['summary']) ? trim((string) $data['summary']) : '',
                'checks'  => $checks,
                'tips'    => array_slice($tips, 0, 5),
            ),
        );
    }
}

if (!function_exists('g5b_seo_meta_ai_keyword_suggestions')) {
    function g5b_seo_meta_ai_keyword_suggestions($subject, $content, $extra = array())
    {
        $result = g5b_seo_meta_icrm_request('keywords', array(
            'subject'       => trim((string) $subject),
            'content'       => (string) $content,
            'current_terms' => isset($extra['keywords']) ? (string) $extra['keywords'] : '',
            'board_name'    => isset($extra['board_name']) ? (string) $extra['board_name'] : '',
            'limit'         => isset($extra['limit']) ? max(3, min(10, (int) $extra['limit'])) : 6,
        ), 45);

        if (!$result['ok']) {
            return $result;
        }

        $items = array();
        $source = isset($result['data']['keywords']) ? $result['data']['keywords'] : array();
        if (is_array($source)) {
            foreach ($source as $item) {
                if (is_array($item)) {
                    $keyword = isset($item['keyword']) ? trim((string) $item['keyword']) : '';
                    if ($keyword !== '') {
                        $items[] = array(
                            'keyword' => $keyword,
                            'intent'  => isset($item['intent']) ? trim((string) $item['intent']) : '',
                            'reason'  => isset($item['reason']) ? trim((string) $item['reason']) : '',
                        );
                    }
                } else {
                    $keyword = trim((string) $item);
                    if ($keyword !== '') {
                        $items[] = array('keyword' => $keyword, 'intent' => '', 'reason' => '');
                    }
                }
            }
        }

        return array('ok' => true, 'data' => array('keywords' => array_slice($items, 0, 10)));
    }
}

if (!function_exists('g5b_seo_meta_ai_publish_checklist')) {
    function g5b_seo_meta_ai_publish_checklist($subject, $content, $extra = array())
    {
        $result = g5b_seo_meta_icrm_request('publish_checklist', array(
            'subject'     => trim((string) $subject),
            'content'     => (string) $content,
            'seo_title'   => isset($extra['seo_title']) ? (string) $extra['seo_title'] : '',
            'description' => isset($extra['description']) ? (string) $extra['description'] : '',
            'keywords'    => isset($extra['keywords']) ? (string) $extra['keywords'] : '',
            'faq_count'   => isset($extra['faq_count']) ? (int) $extra['faq_count'] : 0,
            'has_rank'    => !empty($extra['has_rank']),
        ), 45);

        if (!$result['ok']) {
            return $result;
        }

        $items = array();
        if (!empty($result['data']['items']) && is_array($result['data']['items'])) {
            foreach ($result['data']['items'] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $items[] = array(
                    'label'  => isset($item['label']) ? trim((string) $item['label']) : '',
                    'status' => isset($item['status']) ? trim((string) $item['status']) : '',
                    'action' => isset($item['action']) ? trim((string) $item['action']) : '',
                );
            }
        }

        return array(
            'ok'   => true,
            'data' => array(
                'summary' => isset($result['data']['summary']) ? trim((string) $result['data']['summary']) : '',
                'items'   => $items,
            ),
        );
    }
}

if (!function_exists('g5b_seo_meta_build_post_public_url')) {
    function g5b_seo_meta_build_post_public_url($bo_table, $wr_id)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return '';
        }

        if (function_exists('icrm_build_final_url')) {
            $url = icrm_build_final_url($bo_table, $wr_id);
            if ($url !== '') {
                return $url;
            }
        }

        if (function_exists('get_pretty_url')) {
            return get_pretty_url($bo_table, $wr_id);
        }

        return G5_BBS_URL . '/board.php?bo_table=' . urlencode($bo_table) . '&wr_id=' . $wr_id;
    }
}

if (!function_exists('g5b_seo_meta_fetch_internal_link_candidates')) {
    /**
     * 내부링크 AI 후보 글 목록 (사이트 공개 글)
     *
     * @param string $bo_table
     * @param int    $exclude_wr_id
     * @param int    $limit
     * @return array
     */
    function g5b_seo_meta_fetch_internal_link_candidates($bo_table = '', $exclude_wr_id = 0, $limit = 60)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $exclude_wr_id = (int) $exclude_wr_id;
        $limit = max(10, min(100, (int) $limit));

        $exclude_boards = array('inquiry');
        if (function_exists('g5site_cfg')) {
            $cfg = trim(g5site_cfg('sitemap_exclude_boards', ''));
            if ($cfg !== '') {
                foreach (explode(',', $cfg) as $part) {
                    $part = preg_replace('/[^a-z0-9_]/i', '', trim($part));
                    if ($part !== '') {
                        $exclude_boards[] = $part;
                    }
                }
            }
        }
        $exclude_boards = array_unique($exclude_boards);

        $candidates = array();
        $board_res = sql_query(" select bo_table, bo_subject from {$g5['board_table']} order by bo_table ");
        while ($brow = sql_fetch_array($board_res)) {
            $bt = preg_replace('/[^a-z0-9_]/i', '', (string) $brow['bo_table']);
            if ($bt === '' || in_array($bt, $exclude_boards, true)) {
                continue;
            }

            $write_table = $g5['write_prefix'] . $bt;
            $per_board = ($bo_table !== '' && $bt === $bo_table) ? 30 : 12;
            $sql = " select wr_id, wr_subject, wr_content, wr_option
                       from {$write_table}
                      where wr_id = wr_parent
                        and wr_is_comment = 0
                        and wr_option not like '%secret%'
                      order by wr_id desc
                      limit {$per_board} ";
            $res = sql_query($sql, false);
            if (!$res) {
                continue;
            }

            while ($row = sql_fetch_array($res)) {
                $wr_id = (int) $row['wr_id'];
                if ($wr_id < 1) {
                    continue;
                }
                if ($bt === $bo_table && $exclude_wr_id > 0 && $wr_id === $exclude_wr_id) {
                    continue;
                }

                $plain = trim(preg_replace('/\s+/', ' ', strip_tags((string) $row['wr_content'])));
                $candidates[] = array(
                    'bo_table'  => $bt,
                    'wr_id'     => $wr_id,
                    'subject'   => get_text(strip_tags((string) $row['wr_subject'])),
                    'url'       => g5b_seo_meta_build_post_public_url($bt, $wr_id),
                    'excerpt'   => function_exists('cut_str') ? cut_str($plain, 120) : substr($plain, 0, 120),
                    'board_name'=> get_text((string) $brow['bo_subject']),
                    'same_board'=> ($bo_table !== '' && $bt === $bo_table) ? 1 : 0,
                );
            }
        }

        usort($candidates, function ($a, $b) {
            if ((int) $a['same_board'] !== (int) $b['same_board']) {
                return (int) $b['same_board'] - (int) $a['same_board'];
            }

            return (int) $b['wr_id'] - (int) $a['wr_id'];
        });

        return array_slice($candidates, 0, $limit);
    }
}

if (!function_exists('g5b_seo_meta_ai_internal_links')) {
    function g5b_seo_meta_ai_internal_links($subject, $content, $bo_table = '', $wr_id = 0, $extra = array())
    {
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        $candidates = g5b_seo_meta_fetch_internal_link_candidates($bo_table, $wr_id, 60);

        if (!$candidates) {
            return array('ok' => false, 'error' => '내부링크 후보 글이 없습니다. 다른 게시판에 공개 글을 먼저 작성해 주세요.');
        }

        $payload_candidates = array();
        foreach ($candidates as $item) {
            $payload_candidates[] = array(
                'bo_table'   => $item['bo_table'],
                'wr_id'      => (int) $item['wr_id'],
                'subject'    => $item['subject'],
                'url'        => $item['url'],
                'excerpt'    => $item['excerpt'],
                'board_name' => $item['board_name'],
            );
        }

        $result = g5b_seo_meta_icrm_request('internal_links', array(
            'subject'    => trim((string) $subject),
            'content'    => (string) $content,
            'bo_table'   => $bo_table,
            'wr_id'      => $wr_id,
            'keywords'   => isset($extra['keywords']) ? (string) $extra['keywords'] : '',
            'board_name' => isset($extra['board_name']) ? (string) $extra['board_name'] : '',
            'limit'      => isset($extra['limit']) ? max(2, min(8, (int) $extra['limit'])) : 5,
            'candidates' => $payload_candidates,
        ), 60);

        if (!$result['ok']) {
            return $result;
        }

        $links = array();
        $source = isset($result['data']['links']) ? $result['data']['links'] : array();
        if (is_array($source)) {
            foreach ($source as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $url = isset($row['url']) ? trim((string) $row['url']) : '';
                $anchor = isset($row['anchor_text']) ? trim((string) $row['anchor_text']) : '';
                if ($anchor === '' && isset($row['anchor'])) {
                    $anchor = trim((string) $row['anchor']);
                }
                if ($url === '' || $anchor === '') {
                    continue;
                }
                $links[] = array(
                    'anchor_text' => $anchor,
                    'url'         => $url,
                    'bo_table'    => isset($row['bo_table']) ? preg_replace('/[^a-z0-9_]/i', '', (string) $row['bo_table']) : '',
                    'wr_id'       => isset($row['wr_id']) ? (int) $row['wr_id'] : 0,
                    'reason'      => isset($row['reason']) ? trim((string) $row['reason']) : '',
                    'context_hint'=> isset($row['context_hint']) ? trim((string) $row['context_hint']) : '',
                    'html_snippet'=> isset($row['html_snippet']) ? trim((string) $row['html_snippet']) : '',
                );
            }
        }

        return array(
            'ok'   => true,
            'data' => array(
                'links'            => array_slice($links, 0, 8),
                'candidate_count'  => count($payload_candidates),
            ),
        );
    }
}

if (!function_exists('g5b_seo_meta_post_has_seo')) {
    function g5b_seo_meta_post_has_seo($bo_table, $wr_id)
    {
        $meta = g5b_seo_meta_get('posts', preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table) . ':' . (int) $wr_id);
        if (!is_array($meta)) {
            return false;
        }

        return $meta['title'] !== '' || $meta['description'] !== '';
    }
}

if (!function_exists('g5b_seo_meta_bulk_fetch_posts')) {
    /**
     * 일괄 SEO 대상 글 목록
     *
     * @param string $bo_table
     * @param int    $page
     * @param int    $per_page
     * @param bool   $only_missing SEO 미설정 글만
     * @return array
     */
    function g5b_seo_meta_bulk_fetch_posts($bo_table, $page = 1, $per_page = 30, $only_missing = true)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        if ($bo_table === '') {
            return array('ok' => false, 'error' => '게시판 ID가 없습니다.');
        }

        $write_table = $g5['write_prefix'] . $bo_table;
        $page = max(1, (int) $page);
        $per_page = max(1, min(100, (int) $per_page));
        $offset = ($page - 1) * $per_page;

        $where = " where wr_is_comment = 0 ";
        $sql_cnt = " select count(*) as cnt from {$write_table} {$where} ";
        $total_row = sql_fetch($sql_cnt);
        $total = (int) $total_row['cnt'];

        $sql = " select wr_id, wr_subject, wr_datetime from {$write_table} {$where} order by wr_id desc limit {$offset}, {$per_page} ";
        $result = sql_query($sql);

        $items = array();
        while ($row = sql_fetch_array($result)) {
            $wr_id = (int) $row['wr_id'];
            $has_seo = g5b_seo_meta_post_has_seo($bo_table, $wr_id);
            if ($only_missing && $has_seo) {
                continue;
            }
            $items[] = array(
                'wr_id'     => $wr_id,
                'subject'   => get_text(strip_tags((string) $row['wr_subject'])),
                'datetime'  => (string) $row['wr_datetime'],
                'has_seo'   => $has_seo,
            );
        }

        return array(
            'ok'        => true,
            'items'     => $items,
            'total'     => $total,
            'page'      => $page,
            'per_page'  => $per_page,
            'bo_table'  => $bo_table,
        );
    }
}

if (!function_exists('g5b_seo_meta_bulk_process_post')) {
    /**
     * 글 1건 SEO 생성 후 저장
     *
     * @param string $bo_table
     * @param int    $wr_id
     * @param bool   $include_faq FAQ 포함 여부
     * @return array
     */
    function g5b_seo_meta_bulk_process_post($bo_table, $wr_id, $include_faq = true)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return array('ok' => false, 'error' => '잘못된 글 정보입니다.');
        }

        $key = $bo_table . ':' . $wr_id;
        $result = g5b_seo_meta_ai_generate('posts', $key, array());

        if (!$result['ok']) {
            return $result;
        }

        $data = $result['data'];

        if ($include_faq && (empty($data['faq']) || count($data['faq']) < 3)) {
            $faq_result = g5b_seo_meta_ai_generate_faq_enhanced('posts', $key, array(), 6);
            if ($faq_result['ok'] && !empty($faq_result['data']['faq'])) {
                $data['faq'] = $faq_result['data']['faq'];
            }
        }

        $saved = g5b_seo_meta_save('posts', $key, $data);
        if (!$saved) {
            return array('ok' => false, 'error' => 'SEO 메타 저장 실패');
        }

        return array(
            'ok'      => true,
            'wr_id'   => $wr_id,
            'subject' => g5b_seo_meta_extract_post_context($bo_table, $wr_id)['subject'],
            'data'    => $data,
        );
    }
}

if (!function_exists('g5b_seo_meta_get_post_files')) {
    function g5b_seo_meta_get_post_files($bo_table, $wr_id)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return array();
        }

        $sql = " select bf_no, bf_source, bf_file, bf_content, bf_type
                   from {$g5['board_file_table']}
                  where bo_table = '{$bo_table}' and wr_id = '{$wr_id}'
                  order by bf_no ";
        $result = sql_query($sql);
        $files = array();

        while ($row = sql_fetch_array($result)) {
            if ((int) $row['bf_type'] !== 1) {
                continue;
            }
            $files[] = array(
                'index'       => (int) $row['bf_no'],
                'name'        => (string) $row['bf_source'],
                'file'        => (string) $row['bf_file'],
                'current_alt' => (string) $row['bf_content'],
            );
        }

        return $files;
    }
}

if (!function_exists('g5b_seo_meta_save_post_file_alts')) {
    function g5b_seo_meta_save_post_file_alts($bo_table, $wr_id, $file_alts)
    {
        global $g5;

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1 || !is_array($file_alts)) {
            return false;
        }

        $files = g5b_seo_meta_get_post_files($bo_table, $wr_id);
        $updated = 0;

        foreach ($files as $i => $file) {
            if (!isset($file_alts[$i])) {
                continue;
            }
            $alt = trim((string) $file_alts[$i]);
            if ($alt === '') {
                continue;
            }
            $bf_no = (int) $file['index'];
            sql_query(" update {$g5['board_file_table']}
                           set bf_content = '" . sql_escape_string($alt) . "'
                         where bo_table = '{$bo_table}' and wr_id = '{$wr_id}' and bf_no = '{$bf_no}' ");
            $updated++;
        }

        return $updated;
    }
}

if (!function_exists('g5b_seo_meta_ai_generate')) {
    function g5b_seo_meta_ai_generate($type, $key, $extra = array())
    {
        $result = g5b_seo_meta_icrm_request('seo', array(
            'type'    => preg_replace('/[^a-z]/', '', (string) $type),
            'key'     => trim((string) $key),
            'context' => g5b_seo_meta_build_ai_context($type, $key, $extra),
            'subject' => isset($extra['subject']) ? (string) $extra['subject'] : '',
            'content' => isset($extra['content']) ? (string) $extra['content'] : '',
        ), 60);

        if (!$result['ok']) {
            return $result;
        }

        $parsed = $result['data'];
        $faq = g5b_seo_meta_parse_faq_items(isset($parsed['faq']) ? $parsed['faq'] : array());

        return array(
            'ok'   => true,
            'data' => array(
                'title'       => isset($parsed['title']) ? trim((string) $parsed['title']) : '',
                'description' => isset($parsed['description']) ? trim((string) $parsed['description']) : '',
                'keywords'    => isset($parsed['keywords']) ? trim((string) $parsed['keywords']) : '',
                'robots'      => isset($parsed['robots']) ? trim((string) $parsed['robots']) : 'index,follow',
                'schema_type' => isset($parsed['schema_type']) ? trim((string) $parsed['schema_type']) : '',
                'faq'         => $faq,
            ),
        );
    }
}

/** @deprecated g5b_seo_meta_ai_generate 사용 */
if (!function_exists('g5b_seo_meta_openai_generate')) {
    function g5b_seo_meta_openai_generate($type, $key, $extra = array())
    {
        return g5b_seo_meta_ai_generate($type, $key, $extra);
    }
}

if (!function_exists('g5b_seo_meta_apply_globals')) {
    function g5b_seo_meta_apply_globals($meta)
    {
        if (!is_array($meta) || empty($meta)) {
            return;
        }

        global $page_title, $page_description, $page_keywords, $page_robots,
               $page_og_image, $page_canonical, $page_schema_type, $g5b_seo_meta_faq, $g5;

        if (!empty($meta['title'])) {
            $page_title = $meta['title'];
            if (isset($g5) && is_array($g5)) {
                $g5['title'] = strip_tags($meta['title']);
            }
        }
        if (!empty($meta['description'])) {
            $page_description = $meta['description'];
        }
        if (!empty($meta['keywords'])) {
            $page_keywords = $meta['keywords'];
        }
        if (!empty($meta['robots'])) {
            $page_robots = $meta['robots'];
        }
        if (!empty($meta['og_image'])) {
            $page_og_image = $meta['og_image'];
        }
        if (!empty($meta['canonical'])) {
            $page_canonical = $meta['canonical'];
        }
        if (!empty($meta['schema_type'])) {
            $page_schema_type = $meta['schema_type'];
        }
        if (!empty($meta['faq'])) {
            $g5b_seo_meta_faq = $meta['faq'];
        }
    }
}

if (!function_exists('g5b_seo_meta_apply_context')) {
    function g5b_seo_meta_apply_context()
    {
        global $bo_table, $wr_id, $write;

        if (defined('G5_IS_ADMIN') && G5_IS_ADMIN) {
            return;
        }

        if (!empty($bo_table) && !empty($wr_id) && is_array($write) && !empty($write['wr_id']) && empty($write['wr_is_comment'])) {
            $key = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table) . ':' . (int) $wr_id;
            $meta = g5b_seo_meta_get('posts', $key);
            if (!$meta) {
                $meta = g5b_seo_meta_get('boards', $bo_table);
            }
            g5b_seo_meta_apply_globals($meta);

            return;
        }

        if (!empty($bo_table) && empty($wr_id)) {
            $meta = g5b_seo_meta_get('boards', preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table));
            g5b_seo_meta_apply_globals($meta);

            return;
        }

        if (defined('_INDEX_')) {
            $meta = g5b_seo_meta_get('pages', '/');
            g5b_seo_meta_apply_globals($meta);

            return;
        }

        if (!empty($_SERVER['SCRIPT_FILENAME'])) {
            $dir = basename(dirname($_SERVER['SCRIPT_FILENAME']));
            $script = basename($_SERVER['SCRIPT_FILENAME']);
            if ($dir === 'page' && preg_match('/\.php$/', $script) && $script[0] !== '_') {
                $meta = g5b_seo_meta_get('pages', 'page/' . $script);
                g5b_seo_meta_apply_globals($meta);
            }
        }
    }
}

if (!function_exists('g5b_seo_meta_build_faq_jsonld')) {
    function g5b_seo_meta_build_faq_jsonld($faq)
    {
        if (!is_array($faq) || empty($faq)) {
            return '';
        }

        $entities = array();
        foreach ($faq as $item) {
            if (!is_array($item)) {
                continue;
            }
            $q = isset($item['q']) ? trim((string) $item['q']) : '';
            $a = isset($item['a']) ? trim((string) $item['a']) : '';
            if ($q === '' || $a === '') {
                continue;
            }
            $entities[] = array(
                '@type'          => 'Question',
                'name'           => $q,
                'acceptedAnswer' => array(
                    '@type' => 'Answer',
                    'text'  => $a,
                ),
            );
        }

        if (empty($entities)) {
            return '';
        }

        $graph = array(
            '@context'   => 'https://schema.org',
            '@type'      => 'FAQPage',
            'mainEntity' => $entities,
        );

        $json = json_encode($graph, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            return '';
        }

        return '<script type="application/ld+json">' . str_replace('</', '<\/', $json) . '</script>';
    }
}

if (!function_exists('g5b_seo_meta_append_faq_jsonld')) {
    function g5b_seo_meta_append_faq_jsonld($meta_html)
    {
        global $g5b_seo_meta_faq;

        if (empty($g5b_seo_meta_faq) || !is_array($g5b_seo_meta_faq)) {
            return $meta_html;
        }

        $block = g5b_seo_meta_build_faq_jsonld($g5b_seo_meta_faq);
        if ($block === '') {
            return $meta_html;
        }

        return $meta_html . PHP_EOL . $block;
    }
}

if (!function_exists('g5b_seo_meta_on_write_update_after')) {
    function g5b_seo_meta_on_write_update_after($board, $wr_id, $w, $qstr, $redirect_url)
    {
        if (!isset($_POST['g5b_seo_meta_enabled']) || $_POST['g5b_seo_meta_enabled'] !== '1') {
            return;
        }

        global $is_admin;
        if ($is_admin !== 'super' && $is_admin !== 'group' && $is_admin !== 'board') {
            return;
        }

        if (!is_array($board) || empty($board['bo_table'])) {
            return;
        }

        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $board['bo_table']);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return;
        }

        $faq = array();
        if (!empty($_POST['g5b_seo_faq_q']) && is_array($_POST['g5b_seo_faq_q'])) {
            $answers = isset($_POST['g5b_seo_faq_a']) && is_array($_POST['g5b_seo_faq_a']) ? $_POST['g5b_seo_faq_a'] : array();
            foreach ($_POST['g5b_seo_faq_q'] as $i => $q) {
                $q = trim((string) $q);
                $a = isset($answers[$i]) ? trim((string) $answers[$i]) : '';
                if ($q !== '' && $a !== '') {
                    $faq[] = array('q' => $q, 'a' => $a);
                }
            }
        }

        g5b_seo_meta_save('posts', $bo_table . ':' . $wr_id, array(
            'title'       => isset($_POST['g5b_seo_title']) ? $_POST['g5b_seo_title'] : '',
            'description' => isset($_POST['g5b_seo_description']) ? $_POST['g5b_seo_description'] : '',
            'keywords'    => isset($_POST['g5b_seo_keywords']) ? $_POST['g5b_seo_keywords'] : '',
            'robots'      => isset($_POST['g5b_seo_robots']) ? $_POST['g5b_seo_robots'] : '',
            'og_image'    => isset($_POST['g5b_seo_og_image']) ? $_POST['g5b_seo_og_image'] : '',
            'canonical'   => isset($_POST['g5b_seo_canonical']) ? $_POST['g5b_seo_canonical'] : '',
            'schema_type' => isset($_POST['g5b_seo_schema_type']) ? $_POST['g5b_seo_schema_type'] : '',
            'faq'         => $faq,
        ));
    }
}

if (!function_exists('g5b_seo_meta_get_post_record')) {
    function g5b_seo_meta_get_post_record($bo_table, $wr_id)
    {
        $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $bo_table);
        $wr_id = (int) $wr_id;
        if ($bo_table === '' || $wr_id < 1) {
            return array();
        }

        $meta = g5b_seo_meta_get('posts', $bo_table . ':' . $wr_id);

        return is_array($meta) ? $meta : array();
    }
}

if (!function_exists('g5b_seo_meta_ensure_seo_init')) {
    function g5b_seo_meta_ensure_seo_init()
    {
        if (!is_file(G5_PATH . '/components/seo-meta.php')) {
            return;
        }

        include_once G5_PATH . '/components/seo-meta.php';
        if (function_exists('g5b_seo_init')) {
            g5b_seo_init();
        }
    }
}

if (!function_exists('g5b_seo_meta_user_can_manage')) {
    function g5b_seo_meta_user_can_manage()
    {
        global $is_admin, $is_member;

        return $is_member && ($is_admin === 'super' || $is_admin === 'group' || $is_admin === 'board');
    }
}

if (!function_exists('g5b_seo_meta_images_dir')) {
    function g5b_seo_meta_images_dir()
    {
        $dir = g5b_seo_meta_data_dir() . '/images';
        if (!is_dir($dir)) {
            @mkdir($dir, G5_DIR_PERMISSION, true);
        }

        return $dir;
    }
}

if (!function_exists('g5b_seo_meta_resolve_public_url')) {
    function g5b_seo_meta_resolve_public_url($path)
    {
        $path = trim((string) $path);
        if ($path === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        if (!defined('G5_URL')) {
            return $path;
        }

        if ($path[0] === '/') {
            if (defined('G5_DATA_PATH') && defined('G5_DATA_URL') && strpos($path, '/data/') === 0) {
                return G5_DATA_URL . substr($path, strlen('/data'));
            }

            return G5_URL . $path;
        }

        return G5_URL . '/' . ltrim($path, '/');
    }
}

if (!function_exists('g5b_seo_meta_default_og_image')) {
    function g5b_seo_meta_default_og_image()
    {
        if (function_exists('g5site_cfg_url')) {
            return g5site_cfg_url('og_image', '');
        }

        return '';
    }
}

if (!function_exists('g5b_seo_meta_build_preview_url')) {
    function g5b_seo_meta_build_preview_url($type, $key, $canonical = '')
    {
        if ($canonical !== '') {
            return g5b_seo_meta_resolve_public_url($canonical);
        }

        $base = defined('G5_URL') ? rtrim(G5_URL, '/') : '';

        if ($type === 'pages') {
            if ($key === '/') {
                return $base . '/';
            }
            if (preg_match('#^page/#', $key)) {
                return $base . '/' . $key;
            }

            return $base . '/page/' . ltrim($key, '/');
        }

        if ($type === 'boards') {
            $bo_table = preg_replace('/[^a-z0-9_]/i', '', (string) $key);
            if ($bo_table !== '' && function_exists('get_pretty_url')) {
                $url = get_pretty_url($bo_table);
                if ($url) {
                    return $url;
                }
            }

            return $base . '/bbs/board.php?bo_table=' . urlencode($bo_table);
        }

        if ($type === 'posts' && preg_match('#^([a-z0-9_]+):(\d+)$#i', $key, $m)) {
            if (function_exists('get_pretty_url')) {
                $url = get_pretty_url($m[1], (int) $m[2]);
                if ($url) {
                    return $url;
                }
            }

            return $base . '/bbs/board.php?bo_table=' . urlencode($m[1]) . '&wr_id=' . (int) $m[2];
        }

        return $base . '/';
    }
}

if (!function_exists('g5b_seo_meta_preview_domain')) {
    function g5b_seo_meta_preview_domain($url)
    {
        $host = parse_url((string) $url, PHP_URL_HOST);
        if ($host) {
            return $host;
        }

        if (defined('G5_DOMAIN') && G5_DOMAIN !== '') {
            $host = parse_url(G5_DOMAIN, PHP_URL_HOST);

            return $host ? $host : preg_replace('#^https?://#i', '', rtrim(G5_DOMAIN, '/'));
        }

        return 'www.example.com';
    }
}

if (!function_exists('g5b_seo_meta_upload_featured_image')) {
    function g5b_seo_meta_upload_featured_image($file)
    {
        if (!is_array($file) || empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return array('ok' => false, 'error' => '업로드 파일이 없습니다.');
        }

        if (!empty($file['error'])) {
            return array('ok' => false, 'error' => '업로드 오류 (코드 ' . (int) $file['error'] . ')');
        }

        $max_bytes = 2 * 1024 * 1024;
        if (!empty($file['size']) && (int) $file['size'] > $max_bytes) {
            return array('ok' => false, 'error' => '이미지는 2MB 이하만 업로드할 수 있습니다.');
        }

        $info = @getimagesize($file['tmp_name']);
        if (!$info || empty($info['mime'])) {
            return array('ok' => false, 'error' => '이미지 파일만 업로드할 수 있습니다.');
        }

        $allowed = array(
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
        );
        if (!isset($allowed[$info['mime']])) {
            return array('ok' => false, 'error' => 'JPG, PNG, WEBP, GIF만 지원합니다.');
        }

        $ext = $allowed[$info['mime']];
        $filename = 'seo_' . date('Ymd_His') . '_' . substr(md5(uniqid('', true)), 0, 8) . '.' . $ext;
        $dest = g5b_seo_meta_images_dir() . '/' . $filename;

        if (!@move_uploaded_file($file['tmp_name'], $dest)) {
            return array('ok' => false, 'error' => '파일 저장에 실패했습니다. data/seo-meta/images/ 권한을 확인하세요.');
        }

        @chmod($dest, G5_FILE_PERMISSION);

        $relative = '/data/seo-meta/images/' . $filename;

        return array(
            'ok'   => true,
            'path' => $relative,
            'url'  => g5b_seo_meta_resolve_public_url($relative),
        );
    }
}

if (!function_exists('g5b_seo_meta_preview_assets')) {
    function g5b_seo_meta_preview_assets()
    {
        static $loaded = false;
        if ($loaded) {
            return;
        }
        $loaded = true;

        $base = G5_PLUGIN_URL . '/seo_meta/assets';
        echo '<link rel="stylesheet" href="' . htmlspecialchars($base . '/seo-preview.css', ENT_QUOTES, 'UTF-8') . '">' . PHP_EOL;
        echo '<script src="' . htmlspecialchars($base . '/seo-preview.js', ENT_QUOTES, 'UTF-8') . '" defer></script>' . PHP_EOL;
    }
}

if (!function_exists('g5b_seo_meta_render_preview_panel')) {
    /**
     * @param array $opts id_prefix, preview_url, default_title, default_description, default_image, site_name, upload_url
     */
    function g5b_seo_meta_render_preview_panel($opts = array())
    {
        $prefix = isset($opts['id_prefix']) ? preg_replace('/[^a-z0-9_]/', '', (string) $opts['id_prefix']) : 'seo';
        $preview_id = $prefix . '_serp_preview';
        $upload_url = isset($opts['upload_url']) ? (string) $opts['upload_url'] : '';

        g5b_seo_meta_preview_assets();

        $config = array(
            'prefix'              => $prefix,
            'previewUrl'          => isset($opts['preview_url']) ? (string) $opts['preview_url'] : '',
            'defaultTitle'        => isset($opts['default_title']) ? (string) $opts['default_title'] : '',
            'defaultDescription'  => isset($opts['default_description']) ? (string) $opts['default_description'] : '',
            'defaultImage'        => isset($opts['default_image']) ? (string) $opts['default_image'] : g5b_seo_meta_default_og_image(),
            'siteName'            => isset($opts['site_name']) ? (string) $opts['site_name'] : (function_exists('g5site_cfg') ? g5site_cfg('site_name', '') : ''),
            'uploadUrl'           => $upload_url,
            'titleField'          => $prefix === 'g5b_seo' ? 'g5b_seo_title' : 'seo_title',
            'descriptionField'    => $prefix === 'g5b_seo' ? 'g5b_seo_description' : 'seo_description',
            'imageField'          => $prefix === 'g5b_seo' ? 'g5b_seo_og_image' : 'seo_og_image',
            'canonicalField'      => $prefix === 'g5b_seo' ? 'g5b_seo_canonical' : 'seo_canonical',
        );
        ?>
<div class="g5b-seo-layout__preview">
    <div class="g5b-serp-preview" id="<?php echo htmlspecialchars($preview_id, ENT_QUOTES, 'UTF-8'); ?>">
        <h3 class="g5b-serp-preview__heading">검색·SNS 미리보기</h3>
        <p class="g5b-serp-preview__note">네이버·구글 검색 결과와 SNS 공유 카드가 이렇게 보입니다.</p>

        <div class="g5b-serp-preview__tabs" role="tablist">
            <button type="button" class="g5b-serp-preview__tab is-active" data-tab="naver" role="tab" aria-selected="true">네이버</button>
            <button type="button" class="g5b-serp-preview__tab" data-tab="google" role="tab" aria-selected="false">구글</button>
            <button type="button" class="g5b-serp-preview__tab" data-tab="sns" role="tab" aria-selected="false">SNS 공유</button>
        </div>

        <div class="g5b-serp-preview__pane is-active" data-pane="naver">
            <div class="g5b-serp-naver">
                <div class="g5b-serp-naver__site">
                    <span class="g5b-serp-naver__favicon" aria-hidden="true">N</span>
                    <span class="g5b-serp-naver__domain" data-preview="domain">www.example.com</span>
                </div>
                <div class="g5b-serp-naver__body">
                    <div class="g5b-serp-naver__text">
                        <div class="g5b-serp-naver__title" data-preview="title">SEO 타이틀 미리보기</div>
                        <div class="g5b-serp-naver__desc" data-preview="description">설명(description)이 여기에 표시됩니다.</div>
                    </div>
                    <div class="g5b-serp-naver__thumb" data-preview="thumb-wrap" hidden>
                        <img src="" alt="" data-preview="thumb">
                    </div>
                </div>
            </div>
        </div>

        <div class="g5b-serp-preview__pane" data-pane="google" hidden>
            <div class="g5b-serp-google">
                <div class="g5b-serp-google__site">
                    <span class="g5b-serp-google__favicon" aria-hidden="true"></span>
                    <span class="g5b-serp-google__domain" data-preview="domain">www.example.com</span>
                </div>
                <div class="g5b-serp-google__body">
                    <div class="g5b-serp-google__text">
                        <div class="g5b-serp-google__title" data-preview="title">SEO 타이틀 미리보기</div>
                        <div class="g5b-serp-google__desc" data-preview="description">설명(description)이 여기에 표시됩니다.</div>
                    </div>
                    <div class="g5b-serp-google__thumb" data-preview="thumb-wrap" hidden>
                        <img src="" alt="" data-preview="thumb">
                    </div>
                </div>
            </div>
        </div>

        <div class="g5b-serp-preview__pane" data-pane="sns" hidden>
            <div class="g5b-serp-sns">
                <div class="g5b-serp-sns__image" data-preview="sns-image-wrap">
                    <img src="" alt="" data-preview="sns-image">
                    <span class="g5b-serp-sns__placeholder" data-preview="sns-placeholder">대표 이미지</span>
                </div>
                <div class="g5b-serp-sns__meta">
                    <div class="g5b-serp-sns__domain" data-preview="domain">EXAMPLE.COM</div>
                    <div class="g5b-serp-sns__title" data-preview="title">SEO 타이틀 미리보기</div>
                    <div class="g5b-serp-sns__desc" data-preview="description">설명(description)이 여기에 표시됩니다.</div>
                </div>
            </div>
        </div>

        <ul class="g5b-serp-preview__counts">
            <li>타이틀 <strong data-preview="title-count">0</strong>/60자</li>
            <li>설명 <strong data-preview="desc-count">0</strong>/160자</li>
        </ul>
    </div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
    if (typeof g5bSeoPreviewInit === 'function') {
        g5bSeoPreviewInit(<?php echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>);
    }
});
</script>
        <?php
    }
}

if (!function_exists('g5b_seo_meta_render_featured_image_field')) {
    function g5b_seo_meta_render_featured_image_field($opts = array())
    {
        $prefix = isset($opts['id_prefix']) ? preg_replace('/[^a-z0-9_]/', '', (string) $opts['id_prefix']) : 'seo';
        $name = $prefix === 'g5b_seo' ? 'g5b_seo_og_image' : 'og_image';
        $id = $prefix === 'g5b_seo' ? 'g5b_seo_og_image' : 'seo_og_image';
        $value = isset($opts['value']) ? (string) $opts['value'] : '';
        $upload_url = isset($opts['upload_url']) ? (string) $opts['upload_url'] : '';
        $hide_label = !empty($opts['hide_label']);
        $img_url = $value !== '' ? g5b_seo_meta_resolve_public_url($value) : g5b_seo_meta_default_og_image();
        $file_id = $id . '_file';
        ?>
<div class="g5b-seo-featured" data-seo-featured="<?php echo htmlspecialchars($prefix, ENT_QUOTES, 'UTF-8'); ?>">
    <?php if (!$hide_label) { ?><label class="g5b-seo-featured__label">대표 이미지</label><?php } ?>
    <p class="g5b-seo-featured__hint">워드프레스 대표이미지처럼 검색·SNS 미리보기 썸네일에 사용됩니다. 권장 1200×630px (JPG·PNG·WEBP)</p>
    <div class="g5b-seo-featured__box">
        <div class="g5b-seo-featured__preview" id="<?php echo htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); ?>_preview">
            <?php if ($img_url !== '') { ?>
            <img src="<?php echo htmlspecialchars($img_url, ENT_QUOTES, 'UTF-8'); ?>" alt="대표 이미지 미리보기">
            <?php } else { ?>
            <span class="g5b-seo-featured__empty">이미지 없음</span>
            <?php } ?>
        </div>
        <div class="g5b-seo-featured__controls">
            <input type="file" id="<?php echo htmlspecialchars($file_id, ENT_QUOTES, 'UTF-8'); ?>" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
            <button type="button" class="btn btn_02 g5b-seo-featured__upload" data-target="<?php echo htmlspecialchars($file_id, ENT_QUOTES, 'UTF-8'); ?>">이미지 업로드</button>
            <button type="button" class="btn btn_02 g5b-seo-featured__remove" data-input="<?php echo htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); ?>">이미지 제거</button>
        </div>
    </div>
    <input type="text" name="<?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?>" id="<?php echo htmlspecialchars($id, ENT_QUOTES, 'UTF-8'); ?>" class="frm_input g5b-seo-featured__url"
        value="<?php echo htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); ?>" placeholder="/data/seo-meta/images/... 또는 /img/common/og-image.jpg">
</div>
        <?php
        if ($upload_url !== '') {
            echo '<script>document.addEventListener("DOMContentLoaded",function(){if(typeof g5bSeoFeaturedInit==="function"){g5bSeoFeaturedInit('
                . json_encode(array(
                    'inputId'       => $id,
                    'fileId'        => $file_id,
                    'previewId'     => $id . '_preview',
                    'uploadUrl'     => $upload_url,
                    'previewRootId' => $prefix . '_serp_preview',
                ), JSON_UNESCAPED_UNICODE)
                . ');}});</script>';
        }
    }
}
