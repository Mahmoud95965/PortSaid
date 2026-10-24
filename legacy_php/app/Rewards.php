<?php
declare(strict_types=1);
namespace App;

/** الزيارات والنقاط والكوبونات (QR) وتسوية الكوبون عند المحل. */
final class Rewards
{
    private static function haversine(float $la1, float $lo1, float $la2, float $lo2): float
    {
        $r = 6371000.0;
        $dLa = deg2rad($la2 - $la1);
        $dLo = deg2rad($lo2 - $lo1);
        $a = sin($dLa / 2) ** 2 + cos(deg2rad($la1)) * cos(deg2rad($la2)) * sin($dLo / 2) ** 2;
        return 2 * $r * asin(min(1.0, sqrt($a)));
    }

    private static function place(string $uuid): array
    {
        $p = Db::one("SELECT * FROM places WHERE uuid = ? AND status = 'active' AND deleted_at IS NULL", [$uuid]);
        if (!$p) { throw new ApiException('not_found', 'المكان مش موجود.', 404); }
        return $p;
    }

    /** الكود موقّع بـ HMAC: لا يمكن تخمينه أو تزويره، والحالة (مستخدم/منتهي) تُفحص من القاعدة. */
    public static function payload(array $c): string
    {
        $sig = substr(hash_hmac('sha256', $c['uuid'] . '|' . $c['user_id'] . '|' . $c['expires_at'], (string)Config::get('app.secret')), 0, 24);
        return 'PSC.' . $c['uuid'] . '.' . $sig;
    }

    public static function present(array $c): array
    {
        return ['payload' => self::payload($c), 'expires_at' => $c['expires_at'], 'discount' => (int)$c['discount_percent']];
    }

    public static function visit(): void
    {
        $u = Auth::need();
        RateLimiter::hit('visit:' . $u['id'], 30, 3600);
        $b = Http::body();
        $p = self::place(Validator::uuid($b['place_id'] ?? null));
        $cat = Db::one('SELECT code FROM categories WHERE id = ?', [$p['category_id']]);
        if (!$cat || $cat['code'] !== 'fun') { throw new ApiException('not_allowed', 'تسجيل الزيارة بالصورة متاح في أماكن الترفيه بس.', 422); }
        $lat = Validator::float($b['lat'] ?? null, -90, 90, false, 'خط العرض');
        $lon = Validator::float($b['lon'] ?? null, -180, 180, false, 'خط الطول');
        if ($lat === null || $lon === null) {
            throw new ApiException('location', 'لازم تفعّل الموقع (Location) عشان نتأكد إنك في المكان وتاخد النقاط.', 422);
        }
        // مكان إحداثياته لسه الافتراضية (مركز المدينة): مينفعش نتحقق منه، فمنديش نقاط على إحداثيات غلط.
        $pla = (float)$p['latitude'];
        $plo = (float)$p['longitude'];
        if (abs($pla - 31.2653) < 0.0002 && abs($plo - 32.3019) < 0.0002) {
            throw new ApiException('no_geo', 'موقع المكان ده لسه بيتحدّد بدقة من الإدارة. جرّب تسجّل الزيارة بعد شوية.', 422);
        }
        // الدقة اللي بلّغ بيها الجهاز بتتسامح بحد أقصى 100 متر، ونطاق المكان نفسه بحد أقصى 500 متر.
        $acc = (isset($b['acc']) && is_numeric($b['acc'])) ? max(0, min(100, (int)$b['acc'])) : 0;
        $radius = max(30, min(500, (int)$p['checkin_radius_m']));
        $dist = (int)round(self::haversine($lat, $lon, $pla, $plo));
        if ($dist > $radius + $acc) {
            $far = $dist >= 1000 ? number_format($dist / 1000, 1) . ' كم' : $dist . ' متر';
            throw new ApiException('location', "إنت بعيد عن المكان حوالي $far. لازم تكون في المكان نفسه (أو جنبه جدًا) عشان تاخد النقاط.", 422);
        }
        $verified = 1;
        $day = (new \DateTimeImmutable('now', new \DateTimeZone('Africa/Cairo')))->format('Y-m-d');
        $pts = (int)$p['visit_points'];
        $balance = Db::tx(function () use ($u, $p, $lat, $lon, $dist, $verified, $day, $pts) {
            $row = Db::one('SELECT points_balance FROM users WHERE id = ? FOR UPDATE', [$u['id']]);
            try {
                Db::run(
                    'INSERT INTO visits (user_id, place_id, points_awarded, latitude, longitude, distance_m, location_verified, visit_day) VALUES (?,?,?,?,?,?,?,?)',
                    [$u['id'], $p['id'], $pts, $lat, $lon, $dist, $verified, $day]
                );
            } catch (\PDOException $e) {
                if ($e->getCode() === '23000') { throw new ApiException('already_visited', 'سجّلت زيارتك للمكان ده النهاردة.', 409); }
                throw $e;
            }
            $new = (int)$row['points_balance'] + $pts;
            Db::run('UPDATE users SET points_balance = ? WHERE id = ?', [$new, $u['id']]);
            Db::run("INSERT INTO points_ledger (user_id, delta, balance_after, reason, ref_type, ref_id) VALUES (?,?,?,'visit','place',?)", [$u['id'], $pts, $new, $p['id']]);
            return $new;
        });
        Audit::log((int)$u['id'], 'visit.create', 'place', (int)$p['id']);
        Http::ok(['points_awarded' => $pts, 'balance' => $balance, 'location_verified' => (bool)$verified], 201);
    }

    public static function requestCoupon(): void
    {
        $u = Auth::need();
        RateLimiter::hit('cpn:' . $u['id'], 20, 3600);
        $b = Http::body();
        $p = self::place(Validator::uuid($b['place_id'] ?? null));
        $cat = Db::one('SELECT code FROM categories WHERE id = ?', [$p['category_id']]);
        if ($cat && $cat['code'] === 'housing') { throw new ApiException('not_allowed', 'السكن مفيهوش كوبونات خصم.', 422); }
        $hours = max(1, (int)Settings::get('coupon_validity_hours', '3'));
        $res = Db::tx(function () use ($u, $p, $hours) {
            Db::run("UPDATE coupons SET status = 'expired' WHERE status = 'active' AND expires_at <= UTC_TIMESTAMP()");
            $row = Db::one('SELECT points_balance FROM users WHERE id = ? FOR UPDATE', [$u['id']]);
            $c = Db::one("SELECT * FROM coupons WHERE user_id = ? AND place_id = ? AND status = 'active' FOR UPDATE", [$u['id'], $p['id']]);
            if ($c) { return ['c' => $c, 'bal' => (int)$row['points_balance'], 'new' => false]; }
            $cost = (int)$p['coupon_cost_points'];
            $bal = (int)$row['points_balance'];
            if ($bal < $cost) { throw new ApiException('no_points', "محتاج $cost نقطة وإنت معاك $bal. زور الأماكن واكسب نقاط.", 402); }
            $cid = Db::insert(
                'INSERT INTO coupons (uuid, user_id, place_id, points_cost, discount_percent, expires_at) VALUES (?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))',
                [Security::uuid(), $u['id'], $p['id'], $cost, $p['discount_percent'], $hours]
            );
            $new = $bal - $cost;
            Db::run('UPDATE users SET points_balance = ? WHERE id = ?', [$new, $u['id']]);
            Db::run("INSERT INTO points_ledger (user_id, delta, balance_after, reason, ref_type, ref_id) VALUES (?,?,?,'coupon','coupon',?)", [$u['id'], -$cost, $new, $cid]);
            return ['c' => Db::one('SELECT * FROM coupons WHERE id = ?', [$cid]), 'bal' => $new, 'new' => true];
        });
        if ($res['new']) { Audit::log((int)$u['id'], 'coupon.create', 'coupon', (int)$res['c']['id']); }
        Http::ok(['coupon' => self::present($res['c']), 'balance' => $res['bal']], $res['new'] ? 201 : 200);
    }

    /** للمحل (merchant) أو الأدمن: تسوية الكوبون مرة واحدة وتسجيل العمولة. */
    public static function redeem(): void
    {
        $u = Auth::need(['merchant', 'admin', 'owner']);
        if ($u['role'] === 'admin') { Auth::needPerm('coupons.redeem'); }
        RateLimiter::hit('redeem:' . $u['id'], 120, 3600);
        $b = Http::body();
        $code = $b['payload'] ?? null;
        if (!is_string($code) || !preg_match('/^PSC\.([0-9a-f-]{36})\.([0-9a-f]{24})$/', $code, $m)) { throw new ApiException('invalid_code', 'الكود غير صحيح.', 422); }
        $c = Db::one('SELECT c.*, p.name_ar AS place_name, p.commission_amount, us.name AS customer FROM coupons c JOIN places p ON p.id = c.place_id JOIN users us ON us.id = c.user_id WHERE c.uuid = ?', [$m[1]]);
        if (!$c || !hash_equals(substr(self::payload($c), -24), $m[2])) { throw new ApiException('invalid_code', 'الكود غير صحيح.', 404); }
        if ($u['role'] === 'merchant' && !Db::one('SELECT 1 AS x FROM place_staff WHERE user_id = ? AND place_id = ?', [$u['id'], $c['place_id']])) {
            throw new ApiException('forbidden', 'الكود ده لمكان تاني.', 403);
        }
        Db::tx(function () use ($c, $u) {
            $n = Db::run("UPDATE coupons SET status = 'redeemed', redeemed_at = UTC_TIMESTAMP(), redeemed_by = ? WHERE id = ? AND status = 'active' AND expires_at > UTC_TIMESTAMP()", [$u['id'], $c['id']]);
            if ($n !== 1) { throw new ApiException('not_valid', 'الكود مستخدم قبل كده أو منتهي.', 409); }
            Db::run('INSERT INTO commissions (coupon_id, place_id, amount) VALUES (?,?,?)', [$c['id'], $c['place_id'], $c['commission_amount']]);
        });
        Audit::log((int)$u['id'], 'coupon.redeem', 'coupon', (int)$c['id']);
        Http::ok(['place' => $c['place_name'], 'discount' => (int)$c['discount_percent'], 'customer' => mb_substr((string)$c['customer'], 0, 1) . '***']);
    }

    /** نقاط مشاركة الموقع: مرة واحدة لكل مستخدم (المشاركة نفسها بتتم على جهازه وما نقدرش نتحقق منها). */
    public static function share(): void
    {
        $u = Auth::need();
        RateLimiter::hit('share:' . $u['id'], 5, 3600);
        $pts = max(0, min(100, (int)Settings::get('share_points', '40')));
        $balance = Db::tx(function () use ($u, $pts) {
            $row = Db::one('SELECT points_balance FROM users WHERE id = ? FOR UPDATE', [$u['id']]);
            if (Db::one("SELECT id FROM points_ledger WHERE user_id = ? AND reason = 'share' LIMIT 1", [$u['id']])) {
                throw new ApiException('already_shared', 'خدت نقاط المشاركة قبل كده.', 409);
            }
            $new = (int)$row['points_balance'] + $pts;
            Db::run('UPDATE users SET points_balance = ? WHERE id = ?', [$new, $u['id']]);
            Db::run("INSERT INTO points_ledger (user_id, delta, balance_after, reason) VALUES (?,?,?,'share')", [$u['id'], $pts, $new]);
            return $new;
        });
        Audit::log((int)$u['id'], 'share.app', 'user', (int)$u['id']);
        Http::ok(['points_awarded' => $pts, 'balance' => $balance], 201);
    }
}
