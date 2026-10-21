<?php
// فحص سريع للتشخيص: افتح /api/health.php — لا يعرض أي أسرار. احذف الملف (أو أضف HEALTH_TOKEN) بعد ما كل حاجة تشتغل.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$tok = getenv('HEALTH_TOKEN');
if ($tok !== false && $tok !== '' && !hash_equals($tok, (string)($_GET['t'] ?? ''))) { http_response_code(404); exit('{}'); }

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Db;
use App\Config;

$r = ['php' => PHP_VERSION, 'php_ok' => PHP_VERSION_ID >= 80000, 'vercel' => getenv('VERCEL') !== false];
foreach (['pdo_pgsql', 'pdo_mysql', 'gd', 'mbstring', 'curl', 'openssl', 'json'] as $ext) { $r['ext_' . $ext] = extension_loaded($ext); }
$r['argon2id'] = defined('PASSWORD_ARGON2ID');
$r['https'] = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$r['public_assets_found'] = is_dir(dirname(__DIR__) . '/public/assets/port-said');
$r['app_found'] = is_file(dirname(__DIR__) . '/app/bootstrap.php');

$dbCfg = Config::get('db', []);
$driver = strtolower((string)($dbCfg['driver'] ?? 'pgsql'));
$r['db_driver'] = $driver;
$r['supabase_detected'] = $driver === 'pgsql' || strpos((string)($dbCfg['host'] ?? ''), 'supabase') !== false;

if (empty($dbCfg['host']) && empty(getenv('DATABASE_URL'))) {
    $r['env_missing'] = ['DB_HOST or DATABASE_URL', 'DB_USER', 'DB_PASS'];
} else {
    $r['env_missing'] = [];
    try {
        $pdo = Db::pdo();
        $r['db_connect'] = true;

        if (Db::isPgsql()) {
            $have = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")->fetchAll(PDO::FETCH_COLUMN);
            $r['lock_mechanism_works'] = (int)$pdo->query("SELECT GET_LOCK('psh_health', 1)")->fetchColumn() === 1;
        } else {
            $have = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
            $r['lock_mechanism_works'] = (int)$pdo->query("SELECT GET_LOCK('psh_health', 1)")->fetchColumn() === 1;
        }

        $coreTables = ['roles', 'users', 'user_types', 'governorates', 'institutions', 'categories', 'places', 'settings', 'activity_log', 'coupons', 'visits'];
        $r['tables_missing'] = array_values(array_diff($coreTables, $have));
        $r['sessions_table'] = in_array('php_sessions', $have, true);

        if (!$r['tables_missing']) {
            $r['admin_ready'] = (int)$pdo->query("SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code IN ('owner','admin') AND u.password_hash <> '!' AND u.deleted_at IS NULL")->fetchColumn() > 0;
            $r['places_count'] = (int)$pdo->query("SELECT COUNT(*) FROM places WHERE deleted_at IS NULL")->fetchColumn();
        }
    } catch (Throwable $e) {
        $r['db_connect'] = false;
        $r['db_error_code'] = $e instanceof PDOException ? (string)$e->getCode() : get_class($e);
        $r['db_error_message'] = $e->getMessage();
    }
}
echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
