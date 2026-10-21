<?php
declare(strict_types=1);
namespace App;

use PDO;

/** طبقة قاعدة البيانات: تدعم كلاً من Supabase PostgreSQL و MySQL مع Prepared Statements. */
final class Db
{
    private static ?PDO $pdo = null;
    private static string $driver = 'mysql';

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $d = Config::get('db');
            self::$driver = strtolower((string)($d['driver'] ?? 'mysql'));

            if (self::$driver === 'pgsql') {
                $dsn = sprintf('pgsql:host=%s;port=%d;dbname=%s;sslmode=require',
                    $d['host'],
                    (int)($d['port'] ?? 5432),
                    $d['name'] ?: 'postgres'
                );
                self::$pdo = new PDO($dsn, $d['user'], $d['pass'], [
                    PDO::ATTR_TIMEOUT            => 8,
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::ATTR_STRINGIFY_FETCHES  => false,
                ]);
            } else {
                $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $d['host'], (int)($d['port'] ?? 3306), $d['name']);
                $ssl = [];
                if (!empty($d['ssl'])) {
                    $ca = (string)($d['ssl_ca'] ?? '');
                    if ($ca === '') { foreach (['/etc/pki/tls/certs/ca-bundle.crt', '/etc/ssl/certs/ca-certificates.crt'] as $c) { if (is_file($c)) { $ca = $c; break; } } }
                    if ($ca !== '') { $ssl[PDO::MYSQL_ATTR_SSL_CA] = $ca; }
                    $ssl[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = $ca !== '';
                }
                self::$pdo = new PDO($dsn, $d['user'], $d['pass'], $ssl + [
                    PDO::ATTR_TIMEOUT            => 8,
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::ATTR_STRINGIFY_FETCHES  => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+00:00', "
                        . "sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
                ]);
            }
        }
        return self::$pdo;
    }

    public static function isPgsql(): bool
    {
        self::pdo();
        return self::$driver === 'pgsql';
    }

    public static function normalize(string $sql): string
    {
        if (self::isPgsql()) {
            if (stripos($sql, 'INSERT IGNORE INTO') !== false) {
                $sql = preg_replace('/INSERT\s+IGNORE\s+INTO\b/i', 'INSERT INTO', $sql);
                if (!preg_match('/ON\s+CONFLICT\b/i', $sql)) {
                    $sql .= ' ON CONFLICT DO NOTHING';
                }
            }
            if (strpos($sql, '<=>') !== false) {
                $sql = str_replace('<=>', 'IS NOT DISTINCT FROM', $sql);
            }
        }
        return $sql;
    }

    public static function one(string $sql, array $p = []): ?array
    {
        $sql = self::normalize($sql);
        $st = self::pdo()->prepare($sql);
        $st->execute($p);
        $r = $st->fetch();
        return $r === false ? null : $r;
    }

    public static function all(string $sql, array $p = []): array
    {
        $sql = self::normalize($sql);
        $st = self::pdo()->prepare($sql);
        $st->execute($p);
        return $st->fetchAll();
    }

    public static function run(string $sql, array $p = []): int
    {
        $sql = self::normalize($sql);
        $st = self::pdo()->prepare($sql);
        $st->execute($p);
        return $st->rowCount();
    }

    public static function insert(string $sql, array $p = []): int|string
    {
        if (self::isPgsql()) {
            $sql = self::normalize($sql);
            if (!preg_match('/\bRETURNING\b/i', $sql)) {
                $sql .= ' RETURNING id';
            }
            $st = self::pdo()->prepare($sql);
            $st->execute($p);
            $r = $st->fetchColumn();
            return is_numeric($r) ? (int)$r : (string)$r;
        }
        self::run($sql, $p);
        return (int)self::pdo()->lastInsertId();
    }

    /** @return mixed */
    public static function tx(callable $fn)
    {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $r = $fn();
            $pdo->commit();
            return $r;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) { $pdo->rollBack(); }
            throw $e;
        }
    }
}
