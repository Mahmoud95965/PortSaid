<?php
declare(strict_types=1);
namespace App;

final class Admin
{
    /** صف المستخدم الهدف مع دوره. */
    public static function target(string $uuid): array
    {
        $t = Db::one('SELECT u.id, u.uuid, u.name, u.email, u.email_verified_at, u.status, u.avatar, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.uuid = ? AND u.deleted_at IS NULL', [$uuid]);
        if (!$t) { throw new ApiException('not_found', 'المستخدم مش موجود.', 404); }
        return $t;
    }

    /** المالك لا يُمَس من أحد، والأدمن لا يديره إلا مالك، والمستخدم العادي حسب الصلاحية (تُفحص قبلها). */
    public static function guardTarget(array $me, array $t, string $what = 'العملية'): void
    {
        if ((int)$t['id'] === (int)$me['id'] && $what !== 'مراسلة') { throw new ApiException('forbidden', 'مينفعش تعمل ده على حسابك.', 403); }
        if ($t['role'] === 'owner' || ($t['role'] === 'admin' && $me['role'] !== 'owner')) {
            Audit::event($me, 'access_denied', 'critical', 'حاول ' . Audit::who($me) . ' تنفيذ ' . $what . ' على حساب إداري محمي: ' . $t['name']);
            throw new ApiException('forbidden', 'مش مسموح لك بالعملية دي على الحساب ده.', 403);
        }
    }

    /** تعطيل/تفعيل حساب مع السبب + إشعار بريدي. مشتركة بين تبويب الحسابات وتبويب الفريق. */
    public static function applyStatus(array $me, array $t, string $st, ?string $reason): void
    {
        self::guardTarget($me, $t, $st === 'suspended' ? 'تعطيل' : 'تفعيل');
        if ($st === 'suspended') {
            $reason = Validator::str($reason, 3, 200, 'سبب التعطيل');
            Db::run("UPDATE users SET status = 'suspended', disabled_reason = ?, disabled_at = UTC_TIMESTAMP(), disabled_by = ? WHERE id = ?", [$reason, $me['id'], $t['id']]);
            Audit::event($me, 'account_disabled', 'warning', 'قام ' . Audit::who($me) . ' بتعطيل حساب ' . $t['name'] . ' — السبب: ' . $reason, ['target' => $t['uuid'], 'target_role' => $t['role'], 'reason' => $reason]);
            if ($t['email']) { Mailer::notice((string)$t['email'], (string)$t['name'], 'تم تعطيل حسابك', "تم تعطيل حسابك في Port Said Hub.\nالسبب: $reason\nلو تعتقد إن ده حصل بالخطأ تواصل مع الإدارة."); }
        } else {
            Db::run("UPDATE users SET status = 'active', disabled_reason = NULL, disabled_at = NULL, disabled_by = NULL, failed_logins = 0, locked_until = NULL WHERE id = ?", [$t['id']]);
            Audit::event($me, 'account_enabled', 'notice', 'قام ' . Audit::who($me) . ' بإعادة تفعيل حساب ' . $t['name'], ['target' => $t['uuid'], 'target_role' => $t['role']]);
            if ($t['email']) { Mailer::notice((string)$t['email'], (string)$t['name'], 'تمت إعادة تفعيل حسابك', 'تمت إعادة تفعيل حسابك في Port Said Hub، تقدر تسجّل دخولك الآن.'); }
        }
    }

    /* ---- الإعداد الأول: يفعّل حساب المالك الافتراضي مرة واحدة فقط بكود سري من config.php ---- */
    private static function setupPending(): bool
    {
        return (bool)Db::one("SELECT 1 AS x FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'owner' AND u.password_hash = '!' LIMIT 1");
    }

    public static function setupStatus(): void { Http::ok(['pending' => self::setupPending()]); }

    public static function setup(): void
    {
        RateLimiter::hit('setup:' . Security::ip(), 5, 3600);
        $tok = (string)Config::get('app.setup_token', '');
        $b = Http::body();
        if (strlen($tok) < 32 || !self::setupPending() || !is_string($b['token'] ?? null) || !hash_equals($tok, $b['token'])) {
            Audit::event(null, 'security', 'critical', 'محاولة فاشلة لاستخدام صفحة الإعداد الأول', [], 300);
            throw new ApiException('forbidden', 'الإعداد غير متاح.', 403);
        }
        $email = Validator::email($b['email'] ?? null);
        $pw = Validator::password($b['password'] ?? null, $email, 'owner');
        $n = Db::run(
            "UPDATE users SET email = ?, password_hash = ?, must_change_password = 0 WHERE password_hash = '!' AND role_id = (SELECT id FROM roles WHERE code = 'owner')",
            [$email, Security::hashPassword($pw)]
        );
        if ($n < 1) { throw new ApiException('forbidden', 'الإعداد غير متاح.', 403); }
        Audit::log(null, 'admin.setup', 'user', null);
        Http::ok(['done' => true]);
    }

    /* ---- بيانات الجلسة الإدارية ---- */
    public static function me(): void
    {
        $u = Auth::needStaff();
        Http::ok(['user' => Auth::publicUser($u), 'catalog' => Perms::catalog()]);
    }

    /** الصفحة الرئيسية للوحة: الكروت تختلف حسب صلاحيات الحساب، والمالك يشوف زيادة ملخص الأمان وآخر الأحداث. */
    public static function home(): void
    {
        $u = Auth::needStaff();
        $n = static fn(string $sql, array $a = []) => (int)(Db::one($sql, $a)['n'] ?? 0);
        $cards = [];
        if (Auth::can('users.view', $u)) {
            $cards[] = ['label' => 'المستخدمين', 'value' => $n("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'user' AND u.deleted_at IS NULL"), 'icon' => 'fa-users', 'tab' => 'users'];
            $cards[] = ['label' => 'جدد آخر 7 أيام', 'value' => $n("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'user' AND u.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)"), 'icon' => 'fa-user-plus', 'tab' => 'users'];
            $cards[] = ['label' => 'حسابات معطّلة', 'value' => $n("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'user' AND u.deleted_at IS NULL AND u.status = 'suspended'"), 'icon' => 'fa-user-lock', 'tab' => 'users'];
        }
        if (Auth::can('places.view', $u)) {
            $cards[] = ['label' => 'الأماكن', 'value' => $n('SELECT COUNT(*) AS n FROM places WHERE deleted_at IS NULL'), 'icon' => 'fa-location-dot', 'tab' => 'places'];
        }
        if (Auth::can('uploads.review', $u)) {
            $cards[] = ['label' => 'صور بانتظار المراجعة', 'value' => $n("SELECT COUNT(*) AS n FROM explore_uploads WHERE status = 'pending'"), 'icon' => 'fa-images', 'tab' => 'uploads'];
        }
        if (Auth::can('coupons.redeem', $u) || Auth::can('stats.view', $u)) {
            $cards[] = ['label' => 'كوبونات نشطة', 'value' => $n("SELECT COUNT(*) AS n FROM coupons WHERE status='active' AND expires_at > UTC_TIMESTAMP()"), 'icon' => 'fa-ticket', 'tab' => Auth::can('coupons.redeem', $u) ? 'redeem' : 'stats'];
        }
        if (Auth::can('stats.view', $u)) {
            $cards[] = ['label' => 'الزيارات', 'value' => $n('SELECT COUNT(*) AS n FROM visits'), 'icon' => 'fa-shoe-prints', 'tab' => 'stats'];
        }
        $out = ['role' => $u['role'], 'cards' => $cards, 'recent' => [], 'security' => null];
        if ($u['role'] === 'owner') {
            $out['security'] = [
                ['label' => 'أحداث آخر 24 ساعة', 'value' => $n('SELECT COUNT(*) AS n FROM activity_log WHERE created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)'), 'icon' => 'fa-video'],
                ['label' => 'أحداث حرجة (24 ساعة)', 'value' => $n("SELECT COUNT(*) AS n FROM activity_log WHERE severity = 'critical' AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)"), 'icon' => 'fa-triangle-exclamation'],
                ['label' => 'محاولات دخول فاشلة (24 ساعة)', 'value' => $n("SELECT COUNT(*) AS n FROM activity_log WHERE tag = 'login_failed' AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)"), 'icon' => 'fa-user-shield'],
                ['label' => 'أدمن نشط', 'value' => $n("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'admin' AND u.deleted_at IS NULL AND u.status = 'active'"), 'icon' => 'fa-user-gear'],
                ['label' => 'حسابات المالك', 'value' => $n("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'owner' AND u.deleted_at IS NULL"), 'icon' => 'fa-crown'],
            ];
            $out['recent'] = Logs::rows('1=1', [], 8, 0);
        }
        Http::ok($out);
    }

    /* ---- الإحصائيات ---- */
    public static function stats(): void
    {
        Auth::needPerm('stats.view');
        $q = static fn(string $sql) => Db::one($sql) ?? [];
        Http::ok([
            'users'        => (int)($q("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'user' AND u.deleted_at IS NULL")['n'] ?? 0),
            'new_7d'       => (int)($q("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'user' AND u.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)")['n'] ?? 0),
            'places'       => (int)($q("SELECT COUNT(*) AS n FROM places WHERE deleted_at IS NULL")['n'] ?? 0),
            'visits'       => (int)($q("SELECT COUNT(*) AS n FROM visits")['n'] ?? 0),
            'points_given' => (int)($q("SELECT COALESCE(SUM(delta),0) AS n FROM points_ledger WHERE delta > 0")['n'] ?? 0),
            'coupons_active'   => (int)($q("SELECT COUNT(*) AS n FROM coupons WHERE status='active' AND expires_at > UTC_TIMESTAMP()")['n'] ?? 0),
            'coupons_redeemed' => (int)($q("SELECT COUNT(*) AS n FROM coupons WHERE status='redeemed'")['n'] ?? 0),
            'commission_total' => (float)($q("SELECT COALESCE(SUM(amount),0) AS n FROM commissions")['n'] ?? 0),
            'commission_pending' => (float)($q("SELECT COALESCE(SUM(amount),0) AS n FROM commissions WHERE status='pending'")['n'] ?? 0),
            'by_type' => Db::all("SELECT ut.name_ar AS name, COUNT(*) AS n FROM users u JOIN user_types ut ON ut.id = u.user_type_id WHERE u.deleted_at IS NULL GROUP BY ut.id, ut.name_ar"),
            'by_gender' => Db::all("SELECT gender, COUNT(*) AS n FROM users WHERE gender IS NOT NULL AND deleted_at IS NULL GROUP BY gender"),
        ]);
    }

    /** أكتر الأقسام والأماكن دخولًا. days=1 النهارده، 7، 30، أو 0 = الكل. */
    public static function usage(): void
    {
        Auth::needPerm('stats.view');
        $days = isset($_GET['days']) ? max(0, min(3650, (int)$_GET['days'])) : 30;
        $cut = '';
        $args = [];
        if ($days > 0) {
            $cut = ' AND day >= ?';
            $args[] = (new \DateTimeImmutable('now', new \DateTimeZone('Africa/Cairo')))->modify('-' . ($days - 1) . ' days')->format('Y-m-d');
        }
        $sections = Db::all("SELECT ref AS code, SUM(hits) AS n FROM usage_hits WHERE kind = 'section'$cut GROUP BY ref ORDER BY n DESC", $args);
        $places = Db::all(
            "SELECT p.name_ar AS name, c.code AS cat, SUM(h.hits) AS n FROM usage_hits h JOIN places p ON p.uuid = h.ref JOIN categories c ON c.id = p.category_id
             WHERE h.kind = 'place'" . str_replace('day >=', 'h.day >=', $cut) . ' GROUP BY h.ref, p.name_ar, c.code ORDER BY n DESC LIMIT 10',
            $args
        );
        Http::ok(['days' => $days, 'sections' => $sections, 'places' => $places]);
    }

    /* ---- الحسابات ---- */
    /** قائمة المسجلين (العملاء) مع العدد الكلي. */
    public static function users(): void
    {
        Auth::needPerm('users.view');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $per = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 25;
        $q = (isset($_GET['q']) && $_GET['q'] !== '') ? Validator::str($_GET['q'], 1, 60, 'البحث') : '';
        $args = [];
        $where = "u.deleted_at IS NULL AND r.code = 'user'";
        if (isset($_GET['status']) && in_array($_GET['status'], ['active', 'suspended'], true)) { $where .= ' AND u.status = ?'; $args[] = $_GET['status']; }
        if ($q !== '') {
            $like = '%' . addcslashes($q, '%_\\') . '%';
            $where .= ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
            array_push($args, $like, $like, $like);
        }
        $total = (int)Db::one("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE $where", $args)['n'];
        $rows = Db::all(
            "SELECT u.uuid AS id, u.name, u.phone, u.email, (u.email_verified_at IS NOT NULL) AS verified, u.avatar, r.code AS role, ut.name_ar AS type, i.name_ar AS institution, g.name_ar AS gov,
                    u.gender, u.points_balance AS points, u.status, u.disabled_reason, u.created_at, u.last_login_at
             FROM users u JOIN roles r ON r.id = u.role_id
             LEFT JOIN user_types ut ON ut.id = u.user_type_id
             LEFT JOIN institutions i ON i.id = u.institution_id
             LEFT JOIN governorates g ON g.id = u.governorate_id
             WHERE $where ORDER BY u.id DESC LIMIT $per OFFSET " . (($page - 1) * $per),
            $args
        );
        foreach ($rows as &$r) { $r['verified'] = (bool)$r['verified']; $r['avatar'] = $r['avatar'] ? 'assets/avatars/' . $r['avatar'] : null; }
        unset($r);
        Http::ok(['users' => $rows, 'page' => $page, 'per' => $per, 'total' => $total,
                  'can' => ['edit' => Auth::can('users.edit'), 'suspend' => Auth::can('users.suspend'), 'delete' => Auth::can('users.delete'), 'mail' => Auth::can('users.mail')]]);
    }

    public static function updateUser(): void
    {
        $me = Auth::needPerm('users.edit');
        $b = Http::body();
        $t = self::target(Validator::uuid($b['id'] ?? null));
        self::guardTarget($me, $t, 'تعديل');
        $name = Validator::name($b['name'] ?? null);
        $phone = (isset($b['phone']) && trim((string)$b['phone']) !== '') ? Validator::phone($b['phone']) : null;
        $email = (isset($b['email']) && trim((string)$b['email']) !== '') ? Validator::email($b['email']) : null;
        $gender = (isset($b['gender']) && $b['gender'] !== '') ? Validator::enum($b['gender'], ['male', 'female'], 'الجنس') : null;
        if ($phone === null && $email === null) { throw new ApiException('validation', 'لازم رقم هاتف أو بريد إلكتروني على الأقل.', 422); }
        $emailChanged = $email !== $t['email'];
        try {
            Db::run('UPDATE users SET name = ?, phone = ?, email = ?, gender = ?' . ($emailChanged ? ', email_verified_at = NULL' : '') . ' WHERE id = ?', [$name, $phone, $email, $gender, $t['id']]);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                throw new ApiException('conflict', strpos($e->getMessage(), 'uq_users_phone') !== false ? 'رقم الهاتف ده مسجّل لحساب تاني.' : 'الإيميل ده مسجّل لحساب تاني.', 409);
            }
            throw $e;
        }
        if ($emailChanged && $email !== null) { Profile::issueVerification((int)$t['id'], $email, $name); }
        Audit::event($me, 'account_edit', 'notice', 'قام ' . Audit::who($me) . ' بتعديل بيانات حساب ' . $t['name'] . ($name !== $t['name'] ? ' (الاسم الجديد: ' . $name . ')' : ''), ['target' => $t['uuid'], 'email_changed' => $emailChanged]);
        Http::ok(['saved' => true]);
    }

    public static function setUserStatus(): void
    {
        $me = Auth::needPerm('users.suspend');
        $b = Http::body();
        $t = self::target(Validator::uuid($b['id'] ?? null));
        $st = Validator::enum($b['status'] ?? null, ['active', 'suspended'], 'الحالة');
        if ($t['role'] !== 'user') { throw new ApiException('forbidden', 'حسابات الفريق بتتدار من تبويب «الفريق» (للمالك فقط).', 403); }
        self::applyStatus($me, $t, $st, isset($b['reason']) ? (string)$b['reason'] : null);
        Http::ok(['status' => $st]);
    }

    /** حذف حساب مستخدم: بيمسح بياناته الشخصية ويقفل الحساب، والرقم والإيميل يرجعوا متاحين لتسجيل جديد. سجل النقاط والزيارات بيفضل بدون اسم. */
    public static function deleteUser(): void
    {
        $me = Auth::needPerm('users.delete');
        $b = Http::body();
        $t = self::target(Validator::uuid($b['id'] ?? null));
        if ($t['role'] !== 'user') { throw new ApiException('forbidden', 'احذف صلاحيات الإداري الأول من تبويب «الفريق»، وبعدها تقدر تحذف الحساب.', 403); }
        self::guardTarget($me, $t, 'حذف');
        try {   // صور الزائر في "استكشف بورسعيد" والصورة الشخصية تتمسح مع حسابه
            $files = Db::all('SELECT file_name FROM explore_uploads WHERE user_id = ?', [$t['id']]);
            Db::run('DELETE FROM explore_uploads WHERE user_id = ?', [$t['id']]);
            foreach ($files as $f) { Catalog::dropUploadFile((string)$f['file_name']); }
            Profile::dropAvatarFile($t['avatar'] ?? null);
        } catch (\Throwable $e) {
            error_log('[delete-user uploads] ' . $e->getMessage());
        }
        Db::tx(function () use ($t) {
            Db::run("UPDATE coupons SET status = 'cancelled' WHERE user_id = ? AND status = 'active'", [$t['id']]);
            Db::run('DELETE FROM place_staff WHERE user_id = ?', [$t['id']]);
            Db::run('DELETE FROM email_tokens WHERE user_id = ?', [$t['id']]);
            Db::run("UPDATE users SET name = 'حساب محذوف', email = NULL, phone = NULL, avatar = NULL, email_verified_at = NULL, password_hash = '!', gender = NULL, user_type_id = NULL, governorate_id = NULL, institution_id = NULL, points_balance = 0, status = 'suspended', disabled_reason = 'تم حذف الحساب', deleted_at = UTC_TIMESTAMP() WHERE id = ?", [$t['id']]);
        });
        Audit::event($me, 'account_delete', 'critical', 'قام ' . Audit::who($me) . ' بحذف حساب المستخدم ' . $t['name'], ['target' => $t['uuid']]);
        Http::ok(['deleted' => true]);
    }

    /** مراسلة مستخدم بالبريد (PHPMailer). */
    public static function mailUser(): void
    {
        $me = Auth::needPerm('users.mail');
        RateLimiter::hit('mailuser:' . $me['id'], 30, 3600);
        $b = Http::body();
        $t = self::target(Validator::uuid($b['id'] ?? null));
        if ($t['role'] === 'owner' && $me['role'] !== 'owner') { throw new ApiException('forbidden', 'مش مسموح لك بالعملية دي على الحساب ده.', 403); }
        if (empty($t['email'])) { throw new ApiException('validation', 'المستخدم ده مالوش بريد إلكتروني.', 422); }
        $subject = Validator::str($b['subject'] ?? null, 3, 120, 'عنوان الرسالة');
        $msg = str_replace("\r", '', trim((string)($b['message'] ?? '')));
        if (mb_strlen($msg) < 5 || mb_strlen($msg) > 4000 || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $msg)) { throw new ApiException('validation', 'نص الرسالة لازم يكون من 5 إلى 4000 حرف.', 422); }
        if (!Mailer::enabled()) { throw new ApiException('mail_off', 'خدمة البريد غير مفعّلة. فعّل قسم mail في config.php وضع مكتبة PHPMailer.', 503); }
        $ok = Mailer::staffMessage((string)$t['email'], (string)$t['name'], $subject, $msg, Audit::who($me));
        if (!$ok) { throw new ApiException('mail_failed', 'تعذّر إرسال البريد (راجع إعدادات SMTP).', 502); }
        Audit::event($me, 'mail_sent', 'info', 'قام ' . Audit::who($me) . ' بإرسال بريد إلى ' . $t['name'] . ' بعنوان «' . $subject . '»', ['target' => $t['uuid']]);
        Http::ok(['sent' => true]);
    }

    /* ---- صور الزوار: مراجعة وقبول وحذف ---- */
    public static function uploadsList(): void
    {
        Auth::needPerm('uploads.review');
        $th = Catalog::hasImg() ? ', e.th_b64' : '';
        $rows = Db::all(
            "SELECT e.uuid AS id, e.file_name AS file, e.caption, e.status, e.created_at, u.name AS user_name, u.phone AS user_phone$th
             FROM explore_uploads e JOIN users u ON u.id = e.user_id ORDER BY (e.status = 'pending') DESC, e.id DESC LIMIT 100"
        );
        foreach ($rows as $i => $r) { $rows[$i]['th'] = !empty($r['th_b64']) ? 'data:image/jpeg;base64,' . $r['th_b64'] : null; unset($rows[$i]['th_b64']); }
        Http::ok(['items' => $rows]);
    }

    public static function approveUpload(): void
    {
        $me = Auth::needPerm('uploads.review');
        $b = Http::body();
        $id = Validator::uuid($b['id'] ?? null);
        $n = Db::run("UPDATE explore_uploads SET status = 'approved' WHERE uuid = ?", [$id]);
        Audit::event($me, 'upload', 'info', 'قام ' . Audit::who($me) . ' بقبول صورة زائر في استكشف بورسعيد', ['uuid' => $id, 'rows' => $n]);
        Http::ok(['approved' => true]);
    }

    public static function deleteUpload(): void
    {
        $me = Auth::needPerm('uploads.review');
        $b = Http::body();
        $id = Validator::uuid($b['id'] ?? null);
        $r = Db::one('SELECT id, file_name FROM explore_uploads WHERE uuid = ?', [$id]);
        if (!$r) { throw new ApiException('not_found', 'الصورة مش موجودة.', 404); }
        Db::run('DELETE FROM explore_uploads WHERE id = ?', [$r['id']]);
        Catalog::dropUploadFile((string)$r['file_name']);
        Audit::event($me, 'upload', 'notice', 'قام ' . Audit::who($me) . ' بحذف صورة زائر من استكشف بورسعيد', ['uuid' => $id]);
        Http::ok(['deleted' => true]);
    }

    /* ---- استكشف بورسعيد (صور/فيديوهات مرفوعة في htdocs/assets/explore) ---- */
    public static function exploreList(): void
    {
        Auth::needPerm('explore.manage');
        Http::ok(['items' => Db::all('SELECT uuid AS id, kind, title_ar AS title, description_ar AS description, file_name AS file, sort_order AS sort FROM explore_items ORDER BY sort_order, id')]);
    }

    public static function saveExplore(): void
    {
        $me = Auth::needPerm('explore.manage');
        $b = Http::body();
        $title = Validator::str($b['title'] ?? null, 2, 150, 'العنوان');
        $desc = (isset($b['description']) && trim((string)$b['description']) !== '') ? Validator::str($b['description'], 2, 1000, 'الوصف') : null;
        $file = trim((string)($b['file'] ?? ''));
        if (!preg_match('~^[A-Za-z0-9][A-Za-z0-9._-]{0,140}\.(jpg|jpeg|png|webp|gif|mp4|webm)$~i', $file)) {
            throw new ApiException('validation', 'اسم الملف لازم يكون حروف إنجليزي وأرقام من غير مسافات، وينتهي بـ jpg أو png أو webp أو gif أو mp4 أو webm.', 422);
        }
        if (!is_file(dirname(__DIR__) . '/assets/explore/' . $file)) {
            throw new ApiException('validation', 'الملف ده مش موجود في فولدر assets/explore على الاستضافة. ارفعه الأول وبعدين ضيفه هنا.', 422);
        }
        $kind = preg_match('~\.(mp4|webm)$~i', $file) ? 'video' : 'image';
        $sort = Validator::int($b['sort'] ?? 0, 0, 9999, 'الترتيب');
        $id = Security::uuid();
        Db::insert('INSERT INTO explore_items (uuid, kind, title_ar, description_ar, file_name, sort_order) VALUES (?,?,?,?,?,?)', [$id, $kind, $title, $desc, $file, $sort]);
        Audit::event($me, 'explore', 'info', 'قام ' . Audit::who($me) . ' بإضافة «' . $title . '» إلى استكشف بورسعيد', ['uuid' => $id]);
        Http::ok(['id' => $id], 201);
    }

    public static function deleteExplore(): void
    {
        $me = Auth::needPerm('explore.manage');
        $b = Http::body();
        $id = Validator::uuid($b['id'] ?? null);
        $r = Db::one('SELECT title_ar FROM explore_items WHERE uuid = ?', [$id]);
        $n = Db::run('DELETE FROM explore_items WHERE uuid = ?', [$id]);
        if ($n < 1) { throw new ApiException('not_found', 'العنصر مش موجود.', 404); }
        Audit::event($me, 'explore', 'notice', 'قام ' . Audit::who($me) . ' بحذف «' . ($r['title_ar'] ?? '') . '» من استكشف بورسعيد', ['uuid' => $id]);
        Http::ok(['deleted' => true]);
    }

    /* ---- الأماكن والمطاعم ---- */
    public static function places(): void
    {
        Auth::needPerm('places.view');
        Http::ok(['places' => Db::all(
            "SELECT p.uuid AS id, c.code AS category, p.name_ar AS name, p.area_ar AS area, p.description_ar AS description, p.latitude AS lat, p.longitude AS lon,
                    p.visit_points AS points, p.discount_percent AS discount, p.coupon_cost_points AS cost, p.commission_amount AS commission, p.checkin_radius_m AS radius, p.status
             FROM places p JOIN categories c ON c.id = p.category_id WHERE p.deleted_at IS NULL ORDER BY p.id DESC"
        ), 'can' => ['add' => Auth::can('places.add'), 'edit' => Auth::can('places.edit'), 'remove' => Auth::can('places.remove')]]);
    }

    public static function savePlace(): void
    {
        $b = Http::body();
        $editing = !empty($b['id']);
        $me = Auth::needPerm($editing ? 'places.edit' : 'places.add');
        $cat = Db::one('SELECT id FROM categories WHERE code = ?', [Validator::enum($b['category'] ?? null, array_column(Db::all('SELECT code FROM categories'), 'code'), 'التصنيف')]);
        $f = [
            Validator::str($b['name'] ?? null, 2, 150, 'الاسم'),
            Validator::str($b['area'] ?? null, 2, 100, 'المنطقة'),
            Validator::float($b['lat'] ?? null, -90, 90, true, 'خط العرض'),
            Validator::float($b['lon'] ?? null, -180, 180, true, 'خط الطول'),
            Validator::int($b['points'] ?? null, 0, 5000, 'نقاط الزيارة'),
            Validator::int($b['discount'] ?? null, 0, 100, 'نسبة الخصم'),
            Validator::int($b['cost'] ?? null, 0, 100000, 'تكلفة الكوبون'),
            Validator::float($b['commission'] ?? null, 0, 10000, true, 'العمولة'),
            Validator::enum($b['status'] ?? null, ['draft', 'active', 'hidden'], 'الحالة'),
        ];
        $desc = (isset($b['description']) && trim((string)$b['description']) !== '') ? Validator::str($b['description'], 2, 2000, 'الوصف') : null;
        $rad = (isset($b['radius']) && $b['radius'] !== '' && $b['radius'] !== null) ? Validator::int($b['radius'], 30, 500, 'نطاق تسجيل الزيارة (متر)') : null;
        if ($editing) {
            $id = Validator::uuid($b['id']);
            $n = Db::run(
                'UPDATE places SET category_id=?, name_ar=?, area_ar=?, latitude=?, longitude=?, visit_points=?, discount_percent=?, coupon_cost_points=?, commission_amount=?, status=?, description_ar=?, checkin_radius_m=COALESCE(?, checkin_radius_m), is_demo=0 WHERE uuid=? AND deleted_at IS NULL',
                [$cat['id'], $f[0], $f[1], $f[2], $f[3], $f[4], $f[5], $f[6], $f[7], $f[8], $desc, $rad, $id]
            );
            Audit::event($me, 'place_edit', 'notice', 'قام ' . Audit::who($me) . ' بتعديل المكان «' . $f[0] . '»', ['uuid' => $id, 'rows' => $n]);
            Http::ok(['id' => $id]);
        }
        $id = Security::uuid();
        Db::insert(
            'INSERT INTO places (uuid, category_id, name_ar, area_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, status, description_ar, checkin_radius_m, is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, 150),0)',
            [$id, $cat['id'], $f[0], $f[1], $f[2], $f[3], $f[4], $f[5], $f[6], $f[7], $f[8], $desc, $rad]
        );
        Audit::event($me, 'place_add', 'info', 'قام ' . Audit::who($me) . ' بإضافة المكان «' . $f[0] . '»', ['uuid' => $id]);
        Http::ok(['id' => $id], 201);
    }

    /** إزالة مكان من الموقع (حذف ناعم: البيانات والسجل التاريخي يفضلوا). */
    public static function deletePlace(): void
    {
        $me = Auth::needPerm('places.remove');
        $b = Http::body();
        $id = Validator::uuid($b['id'] ?? null);
        $p = Db::one('SELECT name_ar FROM places WHERE uuid = ? AND deleted_at IS NULL', [$id]);
        if (!$p) { throw new ApiException('not_found', 'المكان مش موجود.', 404); }
        Db::run("UPDATE places SET deleted_at = UTC_TIMESTAMP(), status = 'hidden' WHERE uuid = ?", [$id]);
        Audit::event($me, 'place_remove', 'warning', 'قام ' . Audit::who($me) . ' بإزالة المكان «' . $p['name_ar'] . '» من الموقع', ['uuid' => $id]);
        Http::ok(['deleted' => true]);
    }
}
