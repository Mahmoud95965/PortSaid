<?php
declare(strict_types=1);
if (PHP_VERSION_ID < 80000) { http_response_code(500); exit('PHP 8.0+ required'); }
define('APP_ROOT', __DIR__);
define('PUBLIC_ROOT', dirname(__DIR__) . '/public');   // الملفات الثابتة (assets) على Vercel جوه public/

// 1. تحميل ملف .env لو موجود (للتشغيل المحلي وتسهيل الاختبار)
$envFile = dirname(__DIR__) . '/.env';
if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) { continue; }
            if (strpos($line, '=') !== false) {
                [$ek, $ev] = explode('=', $line, 2);
                $ek = trim($ek);
                $ev = trim($ev, " \t\n\r\0\x0B\"'");
                if (getenv($ek) === false || getenv($ek) === '') {
                    putenv("$ek=$ev");
                    $_ENV[$ek] = $ev;
                    $_SERVER[$ek] = $ev;
                }
            }
        }
    }
}

/** يقرأ متغير بيئة (Vercel Environment Variables أو .env) ويرجع $d لو مش موجود/فاضي. */
function psh_env(string $k, $d = '')
{
    $v = getenv($k);
    if ($v === false || $v === '') { $v = $_ENV[$k] ?? ($_SERVER[$k] ?? false); }
    return ($v === false || $v === '') ? $d : $v;
}
function psh_bool($v): bool { return in_array(strtolower((string)$v), ['1', 'true', 'yes', 'on'], true); }

// 2. تحليل وتحديد إعدادات قاعدة البيانات (Supabase PostgreSQL أو MySQL)
$dbUrl = (string)psh_env('DATABASE_URL', '');
$dbDriver = strtolower((string)psh_env('DB_DRIVER', ''));
$dbHost = (string)psh_env('DB_HOST', '');
$dbPort = (int)psh_env('DB_PORT', 0);
$dbName = (string)psh_env('DB_NAME', '');
$dbUser = (string)psh_env('DB_USER', '');
$dbPass = (string)psh_env('DB_PASS', '');
$dbSsl  = psh_bool(psh_env('DB_SSL', '1'));
$dbSslCa = (string)psh_env('DB_SSL_CA', '');

if ($dbUrl !== '') {
    $p = parse_url($dbUrl);
    if ($p) {
        $scheme = strtolower($p['scheme'] ?? 'pgsql');
        $dbDriver = in_array($scheme, ['postgres', 'postgresql', 'pgsql'], true) ? 'pgsql' : 'mysql';
        $dbHost = $p['host'] ?? '';
        $dbPort = (int)($p['port'] ?? ($dbDriver === 'pgsql' ? 5432 : 3306));
        $dbUser = urldecode($p['user'] ?? '');
        $dbPass = urldecode($p['pass'] ?? '');
        $dbName = ltrim($p['path'] ?? '', '/');
        $dbSsl  = true;
    }
}

if ($dbHost !== '') {
    if ($dbDriver === '') {
        $dbDriver = ($dbPort === 5432 || $dbPort === 6543 || strpos($dbHost, 'supabase') !== false) ? 'pgsql' : 'mysql';
    }
    if ($dbPort === 0) {
        $dbPort = ($dbDriver === 'pgsql') ? 6543 : 3306;
    }
    if ($dbName === '' && $dbDriver === 'pgsql') {
        $dbName = 'postgres';
    }

    $hosts = array_filter(array_map('trim', explode(',', (string)psh_env('ALLOWED_HOSTS', ''))));
    foreach (['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL'] as $vk) {
        $vh = (string)psh_env($vk, '');
        if ($vh !== '') { $hosts[] = $vh; }
    }

    $GLOBALS['cfg'] = [
        'db' => [
            'driver' => $dbDriver,
            'host'   => $dbHost,
            'port'   => $dbPort,
            'name'   => $dbName,
            'user'   => $dbUser,
            'pass'   => $dbPass,
            'ssl'    => $dbSsl,
            'ssl_ca' => $dbSslCa,
        ],
        'supabase' => [
            'url'              => (string)psh_env('SUPABASE_URL', ''),
            'anon_key'         => (string)psh_env('SUPABASE_ANON_KEY', ''),
            'service_role_key' => (string)psh_env('SUPABASE_SERVICE_ROLE_KEY', ''),
        ],
        'app' => [
            'secret'           => (string)psh_env('APP_SECRET', 'psh-secret-default-change-in-production-12345'),
            'setup_token'      => (string)psh_env('SETUP_TOKEN', ''),
            'allowed_hosts'    => array_values(array_unique($hosts)),
            'trust_proxy'      => true,
            'session_idle'     => (int)psh_env('SESSION_IDLE', 28800),
            'session_absolute' => (int)psh_env('SESSION_ABSOLUTE', 604800),
            'base_url'         => (string)psh_env('BASE_URL', ''),
        ],
        'mail' => [
            'enabled'   => psh_bool(psh_env('MAIL_ENABLED', '0')),
            'host'      => (string)psh_env('MAIL_HOST', 'smtp.gmail.com'),
            'port'      => (int)psh_env('MAIL_PORT', 587),
            'secure'    => (string)psh_env('MAIL_SECURE', 'tls'),
            'user'      => (string)psh_env('MAIL_USER'),
            'pass'      => (string)psh_env('MAIL_PASS'),
            'from'      => (string)psh_env('MAIL_FROM', (string)psh_env('MAIL_USER')),
            'from_name' => (string)psh_env('MAIL_FROM_NAME', 'Port Said Hub'),
            'timeout'   => (int)psh_env('MAIL_TIMEOUT', 8),
        ],
        'ai' => [
            'api_key' => (string)psh_env('AI_API_KEY'),
            'model'   => (string)psh_env('AI_MODEL', 'claude-sonnet-4-5')
        ],
    ];
} else {
    // للتشغيل المحلي بملف config.local.php (اختياري)
    $cfgFile = APP_ROOT . '/config.local.php';
    if (!is_file($cfgFile)) {
        http_response_code(500); header('Content-Type: application/json; charset=utf-8');
        exit('{"ok":false,"error":{"code":"config","message":"Server not configured (missing DB_HOST or DATABASE_URL env var)"}}');
    }
    $GLOBALS['cfg'] = require $cfgFile;
}

if (!is_array($GLOBALS['cfg'])) {
    http_response_code(500); header('Content-Type: application/json; charset=utf-8');
    exit('{"ok":false,"error":{"code":"config","message":"Server not configured"}}');
}

spl_autoload_register(static function (string $c): void {
    if (strncmp($c, 'App\\', 4) === 0) {
        $f = APP_ROOT . '/' . str_replace('\\', '/', substr($c, 4)) . '.php';
        if (is_file($f)) { require $f; }
    }
});

mb_internal_encoding('UTF-8');
date_default_timezone_set('UTC');
ini_set('display_errors', '0');
ini_set('log_errors', '1');
// على Vercel الأخطاء تذهب تلقائيًا إلى Runtime Logs (stderr)
error_reporting(E_ALL);
