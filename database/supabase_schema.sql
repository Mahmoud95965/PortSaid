-- ==============================================================================
-- Port Said Hub (دليلك في بورسعيد) - Complete Supabase PostgreSQL Schema
-- ==============================================================================
-- هذا الملف مجهز بالكامل للتشغيل مباشرة في محرر SQL في Supabase (SQL Editor).
-- يتضمن:
-- 1. تفعيل الإضافات (Extensions) ودوال التوافق (Compatibility Functions).
-- 2. الجداول المرجعية (Lookup Tables).
-- 3. جداول المستخدمين والصلاحيات والتحقق (Users & Auth).
-- 4. الأماكن والأنشطة والمسارات وموظفي الأماكن (Places & Staff).
-- 5. خطوط المواصلات (Transport Lines).
-- 6. الزيارات والكوبونات والعمولات ونقاط المكافآت (Visits, Coupons & Rewards).
-- 7. التقييمات والمراجعات (Reviews).
-- 8. الشكاوى والاقتراحات (Feedback).
-- 9. استكشف بورسعيد ولقطات الزوار والتفاعلات (Explore & Reactions).
-- 10. طلبات انضمام التجار والشركاء (Partner Applications).
-- 11. الإشعارات وعروض المتاجر وصور المنيو (Notifications, Offers & Menu).
-- 12. الجلسات وتحديد معدل الطلبات (Sessions & Rate Limits).
-- 13. الإحصائيات والإعدادات وتوكنات التحقق وسجل الرقابة (Settings, Hits, Tokens & Logs).
-- 14. الفهارس المتقدمة لتحقيق أعلى أداء (Indexes).
-- 15. دوال ومحفزات التحديث التلقائي (Triggers).
-- 16. سياسات أمان صفوف الجداول (Row Level Security - RLS).
-- 17. البيانات الأولية الأساسية وحساب المالك (Seed Data).
-- ==============================================================================

-- 1. تفعيل الإضافات الضرورية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- دوال التوافق لتشغيل استعلامات التطبيق بسلاسة على PostgreSQL
CREATE OR REPLACE FUNCTION UTC_TIMESTAMP()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN clock_timestamp() AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION DATE_ADD(t TIMESTAMPTZ, i INTERVAL)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN t + i;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION DATE_SUB(t TIMESTAMPTZ, i INTERVAL)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN t - i;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION GET_LOCK(k TEXT, timeout_sec INT DEFAULT 5)
RETURNS INT AS $$
BEGIN
    RETURN CASE WHEN pg_try_advisory_lock(hashtext(k)) THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION RELEASE_LOCK(k TEXT)
RETURNS INT AS $$
BEGIN
    RETURN CASE WHEN pg_advisory_unlock(hashtext(k)) THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- 2. الجداول المرجعية الأساسية
-- ------------------------------------------------------------------------------
-- الأدوار (Roles)
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_ar VARCHAR(60) NOT NULL
);

-- أنواع المستخدمين (User Types)
CREATE TABLE IF NOT EXISTS public.user_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_ar VARCHAR(60) NOT NULL
);

-- المحافظات المصرية (Governorates)
CREATE TABLE IF NOT EXISTS public.governorates (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(80) UNIQUE NOT NULL,
    name_en VARCHAR(80)
);

-- الكليات والمدارس (Institutions)
CREATE TABLE IF NOT EXISTS public.institutions (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(150) UNIQUE NOT NULL,
    kind VARCHAR(30) DEFAULT 'university',
    parent_ar VARCHAR(120),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- تصنيفات الأماكن (Categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_ar VARCHAR(80) NOT NULL,
    icon VARCHAR(60) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. جدول المستخدمين (Users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(190) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INT NOT NULL REFERENCES public.roles(id) DEFAULT 4,
    user_type_id INT REFERENCES public.user_types(id),
    governorate_id INT REFERENCES public.governorates(id),
    institution_id INT REFERENCES public.institutions(id),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    points_balance INT NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    avatar TEXT,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    verified_at TIMESTAMPTZ,
    disabled_reason TEXT,
    disabled_at TIMESTAMPTZ,
    disabled_by UUID REFERENCES public.users(id),
    email_verified_at TIMESTAMPTZ,
    failed_logins INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. صلاحيات الأدمن التفصيلية (Admin Permissions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    perm VARCHAR(80) NOT NULL,
    granted_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, perm)
);

-- 5. الأماكن والأنشطة التجارية (Places)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    category_id INT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name_ar VARCHAR(160) NOT NULL,
    area_ar VARCHAR(120) NOT NULL,
    description_ar TEXT,
    latitude NUMERIC(10, 7) NOT NULL DEFAULT 31.2653,
    longitude NUMERIC(10, 7) NOT NULL DEFAULT 32.3019,
    visit_points INT NOT NULL DEFAULT 20,
    discount_percent INT NOT NULL DEFAULT 10 CHECK (discount_percent BETWEEN 0 AND 100),
    coupon_cost_points INT NOT NULL DEFAULT 50 CHECK (coupon_cost_points >= 0),
    commission_amount NUMERIC(8, 2) NOT NULL DEFAULT 5.00 CHECK (commission_amount >= 0),
    checkin_radius_m INT NOT NULL DEFAULT 150 CHECK (checkin_radius_m BETWEEN 30 AND 1000),
    logo_b64 TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'hidden')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- مسارات الوصول للمكان (Place Routes)
CREATE TABLE IF NOT EXISTS public.place_routes (
    id SERIAL PRIMARY KEY,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    step_no INT NOT NULL,
    instruction_ar TEXT NOT NULL
);

-- فريق عمل وموظفو المكان (Place Staff)
CREATE TABLE IF NOT EXISTS public.place_staff (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, place_id)
);

-- 6. خطوط المواصلات (Transport Lines)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_lines (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(30) NOT NULL DEFAULT 'bus',
    name_ar VARCHAR(120) NOT NULL,
    details_ar TEXT,
    stops JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. الزيارات وتسجيل الحضور (Visits)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visits (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    points_awarded INT NOT NULL DEFAULT 20,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    distance_m INT,
    location_verified BOOLEAN NOT NULL DEFAULT TRUE,
    visit_day DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, place_id, visit_day)
);

-- 8. الكوبونات وعمليات الاستبدال (Coupons)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    points_cost INT NOT NULL CHECK (points_cost >= 0),
    discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- العمولات المستحقة (Commissions)
CREATE TABLE IF NOT EXISTS public.commissions (
    id SERIAL PRIMARY KEY,
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    amount NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- سجل حركات النقاط (Points Ledger)
CREATE TABLE IF NOT EXISTS public.points_ledger (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    delta INT NOT NULL,
    balance_after INT NOT NULL,
    reason VARCHAR(60) NOT NULL,
    ref_type VARCHAR(60),
    ref_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. التقييمات والمراجعات (Place Reviews)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (place_id, user_id)
);

-- 10. الشكاوى والاقتراحات (Feedback)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('complaint', 'suggestion')),
    message VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'done')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. استكشف بورسعيد (Explore Items, Uploads & Reactions)
-- ------------------------------------------------------------------------------
-- محتوى استكشف الرسمي
CREATE TABLE IF NOT EXISTS public.explore_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('image', 'video')),
    title_ar VARCHAR(160) NOT NULL,
    description_ar TEXT,
    file_name VARCHAR(255),
    img_b64 TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- لقطات وصور الزوار
CREATE TABLE IF NOT EXISTS public.explore_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    img_b64 TEXT,
    th_b64 TEXT,
    caption VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    visibility VARCHAR(10) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- تفاعلات الزوار مع الصور
CREATE TABLE IF NOT EXISTS public.explore_reactions (
    upload_id UUID NOT NULL REFERENCES public.explore_uploads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (upload_id, user_id)
);

-- 12. طلبات انضمام التجار والشركاء (Partner Applications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_name VARCHAR(160) NOT NULL,
    category_id INT REFERENCES public.categories(id),
    business_type_other VARCHAR(100),
    area_ar VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    proposed_discount_percent INT NOT NULL DEFAULT 10 CHECK (proposed_discount_percent BETWEEN 0 AND 100),
    proposed_commission_amount NUMERIC(8, 2) NOT NULL DEFAULT 5.00 CHECK (proposed_commission_amount >= 0),
    promo_notes TEXT,
    commercial_registry_img TEXT,
    tax_number VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    place_id UUID REFERENCES public.places(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. توثيق الطلاب (ID Verifications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.id_verifications (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    img_b64 TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note VARCHAR(500),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. الإشعارات والتنبيهات (Notifications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    kind VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (kind IN ('admin', 'offer')),
    title VARCHAR(120) NOT NULL,
    body TEXT NOT NULL,
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notification_id BIGINT NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, notification_id)
);

-- 15. عروض المتاجر ومنيو المحل (Offers & Menus)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_offers (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notification_id BIGINT REFERENCES public.notifications(id) ON DELETE SET NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    img_b64 TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'hidden')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_images (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    caption VARCHAR(160),
    sort_order INT NOT NULL DEFAULT 0,
    img_b64 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. الجلسات وتحديد معدل الاستخدام (Sessions & Rate Limits)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.php_sessions (
    id VARCHAR(128) PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_php_sessions_updated ON public.php_sessions(updated_at);

CREATE TABLE IF NOT EXISTS public.rate_limits (
    bucket VARCHAR(64) PRIMARY KEY,
    hits INT NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ NOT NULL
);

-- 17. إحصائيات الاستخدام والزيارات (Usage Hits)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_hits (
    day DATE NOT NULL DEFAULT CURRENT_DATE,
    kind VARCHAR(40) NOT NULL,
    ref VARCHAR(80) NOT NULL,
    hits INT NOT NULL DEFAULT 1,
    PRIMARY KEY (day, kind, ref)
);

-- 18. إعدادات الموقع (Settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    k VARCHAR(100) PRIMARY KEY,
    v TEXT
);

-- 19. توكنات البريد (Email Verification Tokens)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email VARCHAR(190) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. سجل نشاط الموقع (Audit Activity Log - مع التحقق المتسلسل التشفيري)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_name VARCHAR(150) NOT NULL DEFAULT 'زائر',
    actor_role VARCHAR(40),
    tag VARCHAR(60) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'notice', 'warning', 'critical')),
    description VARCHAR(600) NOT NULL,
    meta JSONB,
    ip INET,
    user_agent TEXT,
    prev_hash VARCHAR(64) NOT NULL DEFAULT REPEAT('0', 64),
    row_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- الفهارس للأداء العالي (Indexes)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_places_category ON public.places(category_id);
CREATE INDEX IF NOT EXISTS idx_places_status ON public.places(status);
CREATE INDEX IF NOT EXISTS idx_places_area ON public.places(area_ar);
CREATE INDEX IF NOT EXISTS idx_visits_user_day ON public.visits(user_id, visit_day);
CREATE INDEX IF NOT EXISTS idx_coupons_user_status ON public.coupons(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_place ON public.place_reviews(place_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_partner_apps_status ON public.partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_tag ON public.activity_log(tag);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_target ON public.notifications(target_user_id, deleted_at, id);
CREATE INDEX IF NOT EXISTS idx_idver_status ON public.id_verifications(status, id);

-- ------------------------------------------------------------------------------
-- دوال ومحفزات التحديث التلقائي (Triggers)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_places_updated_at ON public.places;
CREATE TRIGGER set_places_updated_at
BEFORE UPDATE ON public.places
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_partner_apps_updated_at ON public.partner_applications;
CREATE TRIGGER set_partner_apps_updated_at
BEFORE UPDATE ON public.partner_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_idver_updated_at ON public.id_verifications;
CREATE TRIGGER set_idver_updated_at
BEFORE UPDATE ON public.id_verifications
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- تمكين سياسات أمان صفوف الجداول (Row Level Security - RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explore_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explore_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explore_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.id_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.php_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة العامة للبيانات التعريفية
CREATE POLICY "Public read for roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Public read for user_types" ON public.user_types FOR SELECT USING (true);
CREATE POLICY "Public read for governorates" ON public.governorates FOR SELECT USING (true);
CREATE POLICY "Public read for institutions" ON public.institutions FOR SELECT USING (is_active = true);
CREATE POLICY "Public read for categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read for places" ON public.places FOR SELECT USING (status = 'active' AND deleted_at IS NULL);
CREATE POLICY "Public read for place_routes" ON public.place_routes FOR SELECT USING (true);
CREATE POLICY "Public read for transport_lines" ON public.transport_lines FOR SELECT USING (is_active = true);
CREATE POLICY "Public read for reviews" ON public.place_reviews FOR SELECT USING (status = 'visible');
CREATE POLICY "Public read for explore_items" ON public.explore_items FOR SELECT USING (is_active = true);
CREATE POLICY "Public read for approved explore_uploads" ON public.explore_uploads FOR SELECT USING (status = 'approved');
CREATE POLICY "Public read for settings" ON public.settings FOR SELECT USING (true);

-- سياسات المستخدمين والعمليات والتسجيل الكامل
CREATE POLICY "Public registration for users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their profile" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Users can view profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can view points ledger" ON public.points_ledger FOR SELECT USING (true);
CREATE POLICY "Users can insert points ledger" ON public.points_ledger FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view and manage coupons" ON public.coupons FOR ALL USING (true);
CREATE POLICY "Users can create and view their visits" ON public.visits FOR ALL USING (true);
CREATE POLICY "Users can submit feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can write reviews" ON public.place_reviews FOR ALL USING (true);
CREATE POLICY "Users can upload photos" ON public.explore_uploads FOR ALL USING (true);
CREATE POLICY "Users can react to photos" ON public.explore_reactions FOR ALL USING (true);
CREATE POLICY "Partners can view and submit applications" ON public.partner_applications FOR ALL USING (true);
CREATE POLICY "Users can manage verification" ON public.id_verifications FOR ALL USING (true);
CREATE POLICY "Users can view notifications" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Users can manage notification reads" ON public.notification_reads FOR ALL USING (true);
CREATE POLICY "Users can view place offers" ON public.place_offers FOR ALL USING (true);
CREATE POLICY "Users can view menus" ON public.menu_images FOR ALL USING (true);
CREATE POLICY "Public sessions management" ON public.php_sessions FOR ALL USING (true);
CREATE POLICY "Public rate limits management" ON public.rate_limits FOR ALL USING (true);
CREATE POLICY "Public usage hits management" ON public.usage_hits FOR ALL USING (true);
CREATE POLICY "Public email tokens" ON public.email_tokens FOR ALL USING (true);
CREATE POLICY "Public insert activity_log" ON public.activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select activity_log" ON public.activity_log FOR SELECT USING (true);

-- ==============================================================================
-- البيانات الأولية الأساسية (SEED DATA)
-- ==============================================================================

-- 1. الأدوار
INSERT INTO public.roles (id, code, name_ar) VALUES
(1, 'owner', 'مالك'),
(2, 'admin', 'أدمن'),
(3, 'merchant', 'تاجر / شريك'),
(4, 'user', 'مستخدم عادي')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.roles));

-- 2. أنواع المستخدمين
INSERT INTO public.user_types (id, code, name_ar) VALUES
(1, 'student', 'طالب'),
(2, 'visitor', 'سائح أو مغترب'),
(3, 'local', 'من بورسعيد')
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.user_types_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.user_types));

-- 3. المحافظات الـ 27
INSERT INTO public.governorates (name_ar, name_en) VALUES
('القاهرة', 'Cairo'), ('الجيزة', 'Giza'), ('الإسكندرية', 'Alexandria'), ('القليوبية', 'Qalyubia'),
('بورسعيد', 'Port Said'), ('السويس', 'Suez'), ('الدقهلية', 'Dakahlia'), ('الشرقية', 'Sharqia'),
('الغربية', 'Gharbia'), ('المنوفية', 'Monufia'), ('كفر الشيخ', 'Kafr El Sheikh'), ('البحيرة', 'Beheira'),
('دمياط', 'Damietta'), ('الإسماعيلية', 'Ismailia'), ('الفيوم', 'Faiyum'), ('بني سويف', 'Beni Suef'),
('المنيا', 'Minya'), ('أسيوط', 'Asyut'), ('سوهاج', 'Sohag'), ('قنا', 'Qena'),
('الأقصر', 'Luxor'), ('أسوان', 'Aswan'), ('البحر الأحمر', 'Red Sea'), ('الوادي الجديد', 'New Valley'),
('مطروح', 'Matrouh'), ('شمال سيناء', 'North Sinai'), ('جنوب سيناء', 'South Sinai')
ON CONFLICT (name_ar) DO NOTHING;

-- 4. كليات ومدارس بورسعيد
INSERT INTO public.institutions (name_ar, kind, parent_ar, sort_order) VALUES
('كلية التجارة — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 1),
('كلية الآداب — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 2),
('كلية التربية — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 3),
('كلية العلوم — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 4),
('كلية الهندسة — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 5),
('كلية التربية الرياضية — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 6),
('كلية التربية النوعية — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 7),
('كلية الحقوق — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 8),
('كلية الطب البشري — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 9),
('كلية التمريض — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 10),
('كلية الصيدلة — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 11),
('كلية العلاج الطبيعي — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 12),
('كلية تكنولوجيا الإدارة ونظم المعلومات — جامعة بورسعيد', 'university', 'جامعة بورسعيد', 13),
('كلية علوم الحاسب وتقنية المعلومات — جامعة شرق بورسعيد الأهلية', 'university', 'جامعة شرق بورسعيد الأهلية', 14),
('كلية الطب البشري — جامعة شرق بورسعيد الأهلية', 'university', 'جامعة شرق بورسعيد الأهلية', 15),
('كلية الهندسة — جامعة شرق بورسعيد الأهلية', 'university', 'جامعة شرق بورسعيد الأهلية', 16),
('كلية الصيدلة — جامعة شرق بورسعيد الأهلية', 'university', 'جامعة شرق بورسعيد الأهلية', 17),
('كلية العلوم الصحية التطبيقية — جامعة شرق بورسعيد الأهلية', 'university', 'جامعة شرق بورسعيد الأهلية', 18),
('كلية علوم الأعمال — جامعة شرق بورسعيد الأهلية', 'university', 'جامعة شرق بورسعيد الأهلية', 19),
('كلية طب الأسنان — جامعة شرق بورسعيد الأهلية', 'university', 'جامعة شرق بورسعيد الأهلية', 20),
('كلية الآداب — جامعة شرق بورسعيد الأهلية', 'university', 'جامعة شرق بورسعيد الأهلية', 21),
('مدرسة (مش في كلية)', 'school', 'مدارس بورسعيد', 22),
('كلية أخرى', 'other', 'أخرى', 23)
ON CONFLICT (name_ar) DO NOTHING;

-- 5. تصنيفات الأماكن
INSERT INTO public.categories (id, code, name_ar, icon, sort_order) VALUES
(1, 'explore', 'استكشف بورسعيد', 'fa-compass', 1),
(2, 'fun', 'معالم وترفيه', 'fa-star', 2),
(3, 'food', 'مطاعم', 'fa-utensils', 3),
(4, 'cafe', 'كافيهات', 'fa-mug-hot', 4),
(5, 'sweets', 'حلويات', 'fa-ice-cream', 5),
(6, 'shop', 'تسوق', 'fa-bag-shopping', 6),
(7, 'sport', 'رياضة', 'fa-dumbbell', 7),
(8, 'housing', 'سكن (شقق)', 'fa-bed', 8),
(9, 'bus', 'مواصلات', 'fa-bus', 9),
(10, 'hotels', 'الأوتيلات والفنادق', 'fa-hotel', 10)
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.categories));

-- 6. خطوط المواصلات الأساسية
INSERT INTO public.transport_lines (id, kind, name_ar, details_ar, stops, sort_order) VALUES
(1, 'bus', 'الأمين', 'خط رئيسي يربط المعدية بكليات التكنولوجيا والحقوق ومعهد الحاسب الآلي', '["المعدية / السكن الجامعي", "قصر الثقافة", "معهد الحاسب الآلي", "كلية التكنولوجيا والحقوق", "بنك الإسكان", "السلام", "قسم الضواحي", "الحريتين", "شارع التلاتيني", "المنشية"]'::jsonb, 1),
(2, 'bus', 'الزهور', 'خط كليات الطب والعلاج الطبيعي والصيدلة مرورًا بشارع النصر', '["قصر الثقافة", "كلية الطب والعلاج الطبيعي", "كلية الصيدلة", "شارع النصر", "الزهور", "عمر بن عبد العزيز"]'::jsonb, 2),
(3, 'bus', 'الـ 5000', 'خط يربط المعدية بالتربية النوعية وحي العرب والمناخ', '["المعدية / السكن الجامعي", "كلية التربية النوعية", "حي العرب", "حي المناخ", "التعاونيات", "منطقة الـ 5000"]'::jsonb, 3),
(4, 'bus', 'التلاتيني', 'يربط منطقة الـ 5000 بشارع الجمهورية', '["منطقة الـ 5000", "شارع الجمهورية"]'::jsonb, 4),
(5, 'bus', 'السلام', 'حي العرب وشارع أسوان وفاطمة الزهراء', '["حي العرب", "شارع أسوان", "فاطمة الزهراء", "نفيسة"]'::jsonb, 5),
(6, 'bus', 'أسوان', 'خط الرجوع من الطب والعلاج الطبيعي إلى قصر الثقافة وشارع أسوان', '["كلية الطب والعلاج الطبيعي", "قصر الثقافة", "شارع أسوان"]'::jsonb, 6)
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.transport_lines_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.transport_lines));

-- 7. إعدادات النظام الافتراضية
INSERT INTO public.settings (k, v) VALUES
('email_verify_required', '0'),
('notify_login_email', '1'),
('share_points', '40'),
('coupon_validity_hours', '3'),
('max_login_failures', '5'),
('lockout_minutes', '15'),
('explore_auto_approve', '0')
ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v;

-- 8. حساب المالك الافتراضي (Admin / Owner)
-- البريد: admin@portsaidhub.com
-- كلمة المرور الأولية: Admin@123456 (يمكن تغييرها فور الدخول)
INSERT INTO public.users (
    id, name, email, phone, password_hash, role_id, points_balance, must_change_password, email_verified_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'المالك الرئيسي',
    'admin@portsaidhub.com',
    '01000000001',
    '$2b$10$NcaICkD2vw2nhN02BaOtOeLInpmVIZdQJwvxBP5BhypxThDroKcFG', -- Admin@123456
    1, -- owner
    500,
    FALSE,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 9. أماكن ومعالم أولية في بورسعيد (Landmarks & Places)
INSERT INTO public.places (
    id, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, status
) VALUES 
('11111111-1111-1111-1111-111111111101', 2, 'فنار بورسعيد التاريخي', 'حي الشرق', 'أول فنار في العالم يُبنى بالخرسانة المسلحة، معلم تاريخي فريد عند مدخل قناة السويس.', 31.2652880, 32.3023020, 50, 0, 0, 0, 'active'),
('11111111-1111-1111-1111-111111111102', 2, 'ممشى ديليسبس وقناة السويس', 'حي الشرق', 'ممشى سياحي شهير لمشاهدة السفن العابرة لقناة السويس وجسر النصر وبورفؤاد.', 31.2585000, 32.3087000, 30, 0, 0, 0, 'active'),
('11111111-1111-1111-1111-111111111103', 2, 'مسجد السلام الكبير', 'حي الشرق', 'من أكبر وأشهر مساجد بورسعيد بطراز معماري إسلامي متميز.', 31.2641000, 32.3052000, 25, 0, 0, 0, 'active'),
('11111111-1111-1111-1111-111111111104', 3, 'مطعم كاستن للأسماك', 'حي الشرق', 'أحد أعرق وأشهر مطاعم الأسماك والمأكولات البحرية الطازجة في بورسعيد.', 31.2612000, 32.3041000, 20, 15, 60, 10.00, 'active'),
('11111111-1111-1111-1111-111111111105', 3, 'مطعم ومأكولات الجندي البحرية', 'حي العرب', 'أسماك وفواكه بحر بورسعيدية بطعم بلدي أصيل وأسعار مميزة للطلبة.', 31.2568000, 32.2954000, 20, 12, 50, 8.00, 'active'),
('11111111-1111-1111-1111-111111111106', 4, 'كافيه بينوس ممشى القناة', 'حي الشرق', 'إطلالة مباشرة على المجرى الملاحي لقناة السويس مع مشروبات وقهوة مميزة.', 31.2592000, 32.3078000, 15, 10, 40, 5.00, 'active'),
('11111111-1111-1111-1111-111111111107', 5, 'حلويات سيلفر وكاساتا بورسعيد', 'حي العرب', 'أشهر كاساتا وحلويات بورسعيدية بطعم لا يُنسى.', 31.2581000, 32.2982000, 15, 10, 40, 5.00, 'active'),
('11111111-1111-1111-1111-111111111108', 6, 'سوق السمك الحضاري الجديد', 'حي العرب', 'سوق عصري متكامل لشراء وشوي أشهى الأسماك البورسعيدية فورًا.', 31.2543000, 32.2912000, 25, 10, 45, 5.00, 'active'),
('11111111-1111-1111-1111-111111111109', 8, 'سكن طلبة حي الشرق المتميز', 'حي الشرق', 'غرف مفروشة وقريبة من المواصلات والممشى، إنترنت سريع وأمن.', 31.2625000, 32.3015000, 0, 0, 0, 0, 'active'),
('11111111-1111-1111-1111-111111111110', 8, 'سكن طالبات حي الزهور', 'حي الزهور', 'شقق هادئة بالقرب من مجمع كليات الطب والصيدلة والعلاج الطبيعي.', 31.2480000, 32.2780000, 0, 0, 0, 0, 'active')
ON CONFLICT (id) DO NOTHING;

-- 10. محتويات أولية في استكشف بورسعيد
INSERT INTO public.explore_items (kind, title_ar, description_ar, file_name, sort_order) VALUES
('image', 'فنار بورسعيد القديم', 'التحفة المعمارية التي تأسست عام 1869', 'port-said-lighthouse.webp', 1),
('image', 'ميناء بورسعيد ليلًا', 'سحر أضواء القناة وسفن العالم العابرة', 'port-said-port-night.webp', 2),
('image', 'مسجد السلام التاريخي', 'أحد أهم معالم المدينة الباسلة', 'port-said-mosque.webp', 3),
('image', 'شرفات الحي الإفرنجي الخشبية', 'العمارة التاريخية الفريدة الطراز في قلب بورسعيد', 'gallery/balconies-street.webp', 4),
('image', 'ميدان الشهداء ومسلة النصر', 'رمز الصمود والفداء للمدينة الباسلة', 'gallery/martyrs-square.webp', 5)
ON CONFLICT DO NOTHING;

-- تم إعداد مخطط Supabase بنجاح!
