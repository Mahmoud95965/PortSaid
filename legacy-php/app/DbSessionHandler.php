<?php
declare(strict_types=1);
namespace App;

use SessionHandlerInterface;
use SessionUpdateTimestampHandlerInterface;

/**
 * جلسات PHP داخل قاعدة البيانات (إجباري على Vercel Serverless لضمان استمرار الجلسة بين مختلف السيرفرات).
 * يدعم كلاً من Supabase PostgreSQL و MySQL.
 */
final class DbSessionHandler implements SessionHandlerInterface, SessionUpdateTimestampHandlerInterface
{
    private bool $ready = false;
    private ?string $lock = null;

    private function ensure(): void
    {
        if ($this->ready) { return; }
        try {
            Db::one('SELECT 1 FROM php_sessions LIMIT 1');
        } catch (\Throwable $e) {
            if (Db::isPgsql()) {
                Db::run('CREATE TABLE IF NOT EXISTS php_sessions (
                    id VARCHAR(128) NOT NULL PRIMARY KEY,
                    data TEXT NOT NULL,
                    updated_at BIGINT NOT NULL
                )');
                Db::run('CREATE INDEX IF NOT EXISTS idx_php_sessions_updated ON php_sessions(updated_at)');
            } else {
                Db::run('CREATE TABLE IF NOT EXISTS php_sessions (
                    id VARCHAR(128) NOT NULL PRIMARY KEY,
                    data MEDIUMBLOB NOT NULL,
                    updated_at INT UNSIGNED NOT NULL,
                    KEY idx_updated (updated_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
            }
        }
        $this->ready = true;
    }

    public function open(string $path, string $name): bool { return true; }

    public function close(): bool
    {
        if ($this->lock !== null) {
            try {
                if (Db::isPgsql()) {
                    Db::one('SELECT pg_advisory_unlock(hashtext(?))', [$this->lock]);
                } else {
                    Db::one('SELECT RELEASE_LOCK(?) AS r', [$this->lock]);
                }
            } catch (\Throwable $e) { /* ignore */ }
            $this->lock = null;
        }
        return true;
    }

    public function read(string $id): string|false
    {
        $this->ensure();
        $k = 'ps_' . substr(hash('sha256', $id), 0, 40);
        try {
            if (Db::isPgsql()) {
                Db::one('SELECT pg_try_advisory_lock(hashtext(?))', [$k]);
            } else {
                Db::one('SELECT GET_LOCK(?, 10) AS l', [$k]);
            }
            $this->lock = $k;
        } catch (\Throwable $e) {
            $this->lock = null;
        }
        $r = Db::one('SELECT data FROM php_sessions WHERE id = ? AND updated_at > ?', [$id, time() - (int)ini_get('session.gc_maxlifetime')]);
        return $r ? (string)$r['data'] : '';
    }

    public function write(string $id, string $data): bool
    {
        $this->ensure();
        if (Db::isPgsql()) {
            Db::run('INSERT INTO php_sessions (id, data, updated_at) VALUES (?,?,?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at', [$id, $data, time()]);
        } else {
            Db::run('INSERT INTO php_sessions (id, data, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)', [$id, $data, time()]);
        }
        return true;
    }

    public function destroy(string $id): bool
    {
        $this->ensure();
        Db::run('DELETE FROM php_sessions WHERE id = ?', [$id]);
        return true;
    }

    public function gc(int $max_lifetime): int|false
    {
        $this->ensure();
        return Db::run('DELETE FROM php_sessions WHERE updated_at < ?', [time() - $max_lifetime]);
    }

    public function validateId(string $id): bool
    {
        $this->ensure();
        return (bool)Db::one('SELECT 1 AS x FROM php_sessions WHERE id = ? AND updated_at > ?', [$id, time() - (int)ini_get('session.gc_maxlifetime')]);
    }

    public function updateTimestamp(string $id, string $data): bool
    {
        return $this->write($id, $data);
    }
}
