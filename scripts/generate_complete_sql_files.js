const fs = require('fs');
const path = require('path');

const placesData = require('./enriched_places.json');

// ==========================================
// 1. FILE 1: 01_PORTSAID_COMPLETE_SCHEMA.sql
// ==========================================
const schemaSql = `-- ==============================================================================
-- Port Said Hub (دليلك في بورسعيد) - Complete Supabase PostgreSQL Schema
-- الملف الأول: المخطط الكامل، الجداول، القيود، الفهارس، الدوال، وسياسات الأمان
-- ==============================================================================
-- طريقة الاستخدام:
-- انسخ محتوى هذا الملف بالكامل والصقه في محرر SQL في Supabase (SQL Editor) واضغط Run.
-- سيقوم بحذف أي جداول أو دوال سابقة نظيفاً وإعادة بناء الهيكل بأعلى معايير الأمان.
-- ==============================================================================

-- 1. تفعيل الإضافات التشفيرية والتسلسلية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. إزالة الكائنات السابقة بترتيب صحيح (Clean Slate)
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_welcome_gift_insert ON public.users CASCADE;
DROP TRIGGER IF EXISTS trg_protect_users_points ON public.users CASCADE;
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users CASCADE;
DROP TRIGGER IF EXISTS set_places_updated_at ON public.places CASCADE;
DROP TRIGGER IF EXISTS set_partner_apps_updated_at ON public.partner_applications CASCADE;

DROP FUNCTION IF EXISTS public.trg_audit_welcome_gift CASCADE;
DROP FUNCTION IF EXISTS public.trg_guard_points_balance CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at CASCADE;
DROP FUNCTION IF EXISTS public.rpc_claim_share_reward CASCADE;
DROP FUNCTION IF EXISTS public.rpc_record_visit CASCADE;

DROP TABLE IF EXISTS public.saved_itineraries CASCADE;
DROP TABLE IF EXISTS public.user_favorites CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.email_tokens CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.usage_hits CASCADE;
DROP TABLE IF EXISTS public.partner_applications CASCADE;
DROP TABLE IF EXISTS public.explore_uploads CASCADE;
DROP TABLE IF EXISTS public.explore_items CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.place_reviews CASCADE;
DROP TABLE IF EXISTS public.commissions CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.points_ledger CASCADE;
DROP TABLE IF EXISTS public.transport_lines CASCADE;
DROP TABLE IF EXISTS public.place_staff CASCADE;
DROP TABLE IF EXISTS public.place_routes CASCADE;
DROP TABLE IF EXISTS public.places CASCADE;
DROP TABLE IF EXISTS public.admin_permissions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;
DROP TABLE IF EXISTS public.governorates CASCADE;
DROP TABLE IF EXISTS public.user_types CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- 3. إنشاء الجداول الأساسية المرجعية
-- ------------------------------------------------------------------------------

-- الأدوار (Roles)
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_ar VARCHAR(60) NOT NULL
);

-- أنواع المستخدمين (User Types)
CREATE TABLE public.user_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_ar VARCHAR(60) NOT NULL
);

-- المحافظات المصرية (Governorates)
CREATE TABLE public.governorates (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(80) UNIQUE NOT NULL
);

-- الكليات والمدارس (Institutions)
CREATE TABLE public.institutions (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(150) UNIQUE NOT NULL,
    kind VARCHAR(30) DEFAULT 'university',
    parent_ar VARCHAR(120),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- تصنيفات الأماكن (Categories)
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name_ar VARCHAR(80) NOT NULL,
    icon VARCHAR(60) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. جدول المستخدمين (Users)
-- ------------------------------------------------------------------------------
CREATE TABLE public.users (
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

-- 5. صلاحيات الأدمن (Admin Permissions)
-- ------------------------------------------------------------------------------
CREATE TABLE public.admin_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    perm VARCHAR(80) NOT NULL,
    granted_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, perm)
);

-- 6. الأماكن والأنشطة المعتمدة في بورسعيد (Places)
-- ------------------------------------------------------------------------------
CREATE TABLE public.places (
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
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'hidden')),
    maps_url TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- مسارات الوصول للمكان (Place Routes)
CREATE TABLE public.place_routes (
    id SERIAL PRIMARY KEY,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    step_no INT NOT NULL,
    instruction_ar TEXT NOT NULL
);

-- موظفو المكان والشركاء (Place Staff)
CREATE TABLE public.place_staff (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, place_id)
);

-- 7. خطوط المواصلات (Transport Lines)
-- ------------------------------------------------------------------------------
CREATE TABLE public.transport_lines (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(30) NOT NULL DEFAULT 'bus',
    name_ar VARCHAR(120) NOT NULL,
    details_ar TEXT,
    stops JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. الزيارات وتسجيل الحضور بالـ GPS (Visits)
-- ------------------------------------------------------------------------------
CREATE TABLE public.visits (
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

-- 9. الكوبونات وعمليات الاستبدال (Coupons)
-- ------------------------------------------------------------------------------
CREATE TABLE public.coupons (
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
CREATE TABLE public.commissions (
    id SERIAL PRIMARY KEY,
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    amount NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. دفتر حركات النقاط المحمي (Points Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE public.points_ledger (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    delta INT NOT NULL,
    balance_after INT NOT NULL,
    reason VARCHAR(60) NOT NULL,
    ref_type VARCHAR(60),
    ref_id TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. التقييمات والمراجعات (Place Reviews)
-- ------------------------------------------------------------------------------
CREATE TABLE public.place_reviews (
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

-- 12. الشكاوى والمقترحات (Feedback)
-- ------------------------------------------------------------------------------
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('complaint', 'suggestion')),
    message VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'done')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. استكشف بورسعيد (Explore Items & Uploads)
-- ------------------------------------------------------------------------------
CREATE TABLE public.explore_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('image', 'video')),
    title_ar VARCHAR(160) NOT NULL,
    description_ar TEXT,
    file_name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.explore_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    img_b64 TEXT,
    th_b64 TEXT,
    caption VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. طلبات الشركاء والتجار (Partner Applications)
-- ------------------------------------------------------------------------------
CREATE TABLE public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_name VARCHAR(160) NOT NULL,
    category_id INT REFERENCES public.categories(id),
    area_ar VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    proposed_discount_percent INT NOT NULL DEFAULT 10 CHECK (proposed_discount_percent BETWEEN 0 AND 100),
    proposed_commission_amount NUMERIC(8, 2) NOT NULL DEFAULT 5.00 CHECK (proposed_commission_amount >= 0),
    promo_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    place_id UUID REFERENCES public.places(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. الإحصائيات والإعدادات وتوكنات البريد (System Tables)
-- ------------------------------------------------------------------------------
CREATE TABLE public.usage_hits (
    day DATE NOT NULL DEFAULT CURRENT_DATE,
    kind VARCHAR(40) NOT NULL,
    ref VARCHAR(80) NOT NULL,
    hits INT NOT NULL DEFAULT 1,
    PRIMARY KEY (day, kind, ref)
);

CREATE TABLE public.settings (
    k VARCHAR(100) PRIMARY KEY,
    v TEXT
);

CREATE TABLE public.email_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email VARCHAR(190) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.activity_log (
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

-- 16. جدول الأماكن المفضلة للمستخدمين (User Favorites)
-- ------------------------------------------------------------------------------
CREATE TABLE public.user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, place_id)
);

-- 17. جدول حفظ الخطط الذكية للمستخدمين (Saved Itineraries)
-- ------------------------------------------------------------------------------
CREATE TABLE public.saved_itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    summary TEXT,
    budget_egp INT NOT NULL,
    total_cost INT NOT NULL,
    party_size INT DEFAULT 2,
    duration_hours NUMERIC(4, 1) NOT NULL,
    transport_mode VARCHAR(20) DEFAULT 'driving',
    stops_json JSONB NOT NULL,
    route_geojson JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- الفهارس لتحسين سرعة الاستعلامات (Indexes)
-- ==============================================================================
CREATE INDEX idx_users_role ON public.users(role_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_places_category ON public.places(category_id);
CREATE INDEX idx_places_status ON public.places(status);
CREATE INDEX idx_places_area ON public.places(area_ar);
CREATE INDEX idx_visits_user_day ON public.visits(user_id, visit_day);
CREATE INDEX idx_coupons_user_status ON public.coupons(user_id, status);
CREATE INDEX idx_points_ledger_user ON public.points_ledger(user_id);
CREATE INDEX idx_points_ledger_idemp ON public.points_ledger(idempotency_key);
CREATE INDEX idx_points_ledger_user_reason ON public.points_ledger(user_id, reason);
CREATE INDEX idx_reviews_place ON public.place_reviews(place_id, status);
CREATE INDEX idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_place ON public.user_favorites(place_id);
CREATE INDEX idx_saved_itineraries_user ON public.saved_itineraries(user_id);
CREATE INDEX idx_saved_itineraries_created ON public.saved_itineraries(created_at DESC);
CREATE INDEX idx_activity_log_created ON public.activity_log(created_at DESC);

-- ==============================================================================
-- دوال ومحفزات التحديث والأمان (Functions & Triggers)
-- ==============================================================================

-- 1. دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_places_updated_at
BEFORE UPDATE ON public.places
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_partner_apps_updated_at
BEFORE UPDATE ON public.partner_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. دالة حماية رصيد النقاط من التعديل اليدوي المباشر
CREATE OR REPLACE FUNCTION public.trg_guard_points_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.points_balance IS DISTINCT FROM NEW.points_balance) THEN
        IF current_setting('portsaid.trusted_context', true) IS DISTINCT FROM 'enabled' THEN
            RAISE EXCEPTION 'DIRECT_POINTS_UPDATE_FORBIDDEN: Modifying points_balance directly from client is blocked. Use official rewards RPC functions.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_protect_users_points
BEFORE UPDATE OF points_balance ON public.users
FOR EACH ROW EXECUTE FUNCTION public.trg_guard_points_balance();

-- 3. دالة تدقيق هدية الترحيب بنقاط التسجيل (بحد أقصى 20 نقطة)
CREATE OR REPLACE FUNCTION public.trg_audit_welcome_gift()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('portsaid.trusted_context', true) = 'enabled' THEN
        RETURN NEW;
    END IF;

    IF NEW.points_balance > 0 THEN
        IF NEW.points_balance > 20 THEN
            RAISE EXCEPTION 'FRAUDULENT_INITIAL_BALANCE: Initial balance cannot exceed 20 points';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.points_ledger 
            WHERE user_id = NEW.id AND reason = 'welcome_gift'
        ) THEN
            INSERT INTO public.points_ledger (
                user_id, delta, balance_after, reason, ref_type, ref_id, created_at
            ) VALUES (
                NEW.id, NEW.points_balance, NEW.points_balance, 'welcome_gift', 'registration', 'welcome_bonus', NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_audit_welcome_gift_insert
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_welcome_gift();

-- 4. الدالة الخادمية الذرية لمنح مكافأة المشاركة (مرة واحدة فقط 40 نقطة)
CREATE OR REPLACE FUNCTION public.rpc_claim_share_reward(
    p_user_id UUID,
    p_idempotency_key VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_bal INT;
    v_new_bal INT;
    v_pts INT := 40;
    v_existing_ledger_id INT;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_user', 'message', 'معرف المستخدم غير صحيح');
    END IF;

    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_ledger_id 
        FROM public.points_ledger 
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_ledger_id IS NOT NULL THEN
            SELECT points_balance INTO v_current_bal FROM public.users WHERE id = p_user_id;
            RETURN jsonb_build_object('ok', true, 'idempotent', true, 'points_awarded', 0, 'balance', v_current_bal, 'message', 'تم استلام هذه المعاملة مسبقاً.');
        END IF;
    END IF;

    SELECT points_balance INTO v_current_bal
    FROM public.users
    WHERE id = p_user_id AND status = 'active' AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'user_not_found', 'message', 'الحساب غير موجود أو معطل');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.points_ledger 
        WHERE user_id = p_user_id AND reason = 'share'
    ) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'already_shared', 'message', 'تم الحصول على مكافأة المشاركة مسبقاً.');
    END IF;

    v_new_bal := v_current_bal + v_pts;
    PERFORM set_config('portsaid.trusted_context', 'enabled', true);

    UPDATE public.users 
    SET points_balance = v_new_bal, updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.points_ledger (
        user_id, delta, balance_after, reason, ref_type, ref_id, idempotency_key, created_at
    ) VALUES (
        p_user_id, v_pts, v_new_bal, 'share', 'app_share', 'app_share_bonus', p_idempotency_key, NOW()
    );

    RETURN jsonb_build_object('ok', true, 'points_awarded', v_pts, 'balance', v_new_bal, 'message', 'مبروك! تمت إضافة +40 نقطة لمشاركة التطبيق بنجاح.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. الدالة الخادمية الذرية لتسجيل الحضور ومنح نقاط الزيارة
CREATE OR REPLACE FUNCTION public.rpc_record_visit(
    p_user_id UUID,
    p_place_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_distance_m INT DEFAULT NULL,
    p_idempotency_key VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_bal INT;
    v_new_bal INT;
    v_place RECORD;
    v_today DATE := CURRENT_DATE;
    v_pts INT;
    v_existing_visit_id INT;
    v_existing_ledger_id INT;
BEGIN
    IF p_user_id IS NULL OR p_place_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'بيانات الزيارة غير مكتملة');
    END IF;

    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_ledger_id 
        FROM public.points_ledger 
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_ledger_id IS NOT NULL THEN
            SELECT points_balance INTO v_current_bal FROM public.users WHERE id = p_user_id;
            RETURN jsonb_build_object('ok', true, 'idempotent', true, 'points_awarded', 0, 'balance', v_current_bal, 'message', 'تم تسجيل هذه الزيارة مسبقاً.');
        END IF;
    END IF;

    SELECT id, name_ar, visit_points, latitude, longitude, checkin_radius_m
    INTO v_place
    FROM public.places
    WHERE id = p_place_id AND status = 'active' AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'place_not_found', 'message', 'المكان غير موجود أو غير نشط');
    END IF;

    v_pts := COALESCE(v_place.visit_points, 20);

    SELECT id INTO v_existing_visit_id
    FROM public.visits
    WHERE user_id = p_user_id AND place_id = p_place_id AND visit_day = v_today;

    IF v_existing_visit_id IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'already_visited', 'message', 'لقد سجلت زيارتك لهذا المكان اليوم بالفعل.');
    END IF;

    SELECT points_balance INTO v_current_bal
    FROM public.users
    WHERE id = p_user_id AND status = 'active' AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'user_not_found', 'message', 'المستخدم غير موجود');
    END IF;

    INSERT INTO public.visits (
        user_id, place_id, points_awarded, latitude, longitude, distance_m, location_verified, visit_day, created_at
    ) VALUES (
        p_user_id, p_place_id, v_pts, p_latitude, p_longitude, p_distance_m, TRUE, v_today, NOW()
    );

    v_new_bal := v_current_bal + v_pts;
    PERFORM set_config('portsaid.trusted_context', 'enabled', true);

    UPDATE public.users 
    SET points_balance = v_new_bal, updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.points_ledger (
        user_id, delta, balance_after, reason, ref_type, ref_id, idempotency_key, created_at
    ) VALUES (
        p_user_id, v_pts, v_new_bal, 'visit', 'place', p_place_id::text, p_idempotency_key, NOW()
    );

    RETURN jsonb_build_object(
        'ok', true,
        'points_awarded', v_pts,
        'balance', v_new_bal,
        'place_name', v_place.name_ar,
        'message', 'مبروك! تم تسجيل حضورك في ' || v_place.name_ar || ' وحصلت على +' || v_pts || ' نقطة 🎉'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- تمكين سياسات أمان صفوف الجداول (Row Level Security - RLS)
-- ==============================================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explore_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explore_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_itineraries ENABLE ROW LEVEL SECURITY;

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

-- سياسات المستخدمين والعمليات
CREATE POLICY "Public read for active basic profiles" ON public.users FOR SELECT USING (status = 'active' AND deleted_at IS NULL);
CREATE POLICY "Users can view points ledger" ON public.points_ledger FOR SELECT USING (true);
CREATE POLICY "Users can view and manage coupons" ON public.coupons FOR ALL USING (true);
CREATE POLICY "Users can view visits" ON public.visits FOR SELECT USING (true);
CREATE POLICY "Users can submit feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can write reviews" ON public.place_reviews FOR ALL USING (true);
CREATE POLICY "Users can upload photos" ON public.explore_uploads FOR ALL USING (true);
CREATE POLICY "Partners can view and submit applications" ON public.partner_applications FOR ALL USING (true);
CREATE POLICY "Public insert activity_log" ON public.activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select activity_log" ON public.activity_log FOR SELECT USING (true);

-- سياسات المفضلة والخطط المحفوظة
CREATE POLICY "Users can view their own favorites" ON public.user_favorites FOR SELECT USING (true);
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites FOR ALL USING (true);

CREATE POLICY "Users can view their own itineraries" ON public.saved_itineraries FOR SELECT USING (true);
CREATE POLICY "Users can insert their own itineraries" ON public.saved_itineraries FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own itineraries" ON public.saved_itineraries FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own itineraries" ON public.saved_itineraries FOR DELETE USING (true);

-- سحب الصلاحيات المباشرة وإحكام دوال المكافآت
REVOKE EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR) TO service_role;
REVOKE UPDATE (points_balance) ON public.users FROM PUBLIC, anon, authenticated;

-- نهاية ملف المخطط (Schema Ready!)
`;

// ==========================================
// 2. FILE 2: 02_PORTSAID_COMPLETE_SEED_DATA.sql
// ==========================================
function buildSeedSql() {
  let sql = `-- ==============================================================================
-- Port Said Hub (دليلك في بورسعيد) - Complete Supabase Seed Data
-- الملف الثاني: إضافة كافة البيانات الرسمية المعتمدة (الأماكن، المستخدمين، والمراجع)
-- ==============================================================================
-- طريقة الاستخدام:
-- شغل هذا الملف بعد الانتهاء من تشغيل الملف الأول (01_PORTSAID_COMPLETE_SCHEMA.sql).
-- انسخ المحتوى بالكامل والصقه في SQL Editor في Supabase واضغط Run.
-- ==============================================================================

-- تفعيل سياق الثقة المؤقت لتغذية الأرصدة والبيانات الأولية
SET LOCAL portsaid.trusted_context = 'enabled';

-- 1. الأدوار (Roles)
INSERT INTO public.roles (id, code, name_ar) VALUES
(1, 'owner', 'مالك'),
(2, 'admin', 'أدمن'),
(3, 'merchant', 'تاجر / شريك'),
(4, 'user', 'مستخدم عادي')
ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar;
SELECT setval('public.roles_id_seq', (SELECT MAX(id) FROM public.roles));

-- 2. أنواع المستخدمين (User Types)
INSERT INTO public.user_types (id, code, name_ar) VALUES
(1, 'student', 'طالب'),
(2, 'visitor', 'سائح أو مغترب'),
(3, 'local', 'من بورسعيد')
ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar;
SELECT setval('public.user_types_id_seq', (SELECT MAX(id) FROM public.user_types));

-- 3. المحافظات الـ 27 (Governorates)
INSERT INTO public.governorates (name_ar) VALUES
('القاهرة'), ('الجيزة'), ('الإسكندرية'), ('القليوبية'),
('بورسعيد'), ('السويس'), ('الدقهلية'), ('الشرقية'),
('الغربية'), ('المنوفية'), ('كفر الشيخ'), ('البحيرة'),
('دمياط'), ('الإسماعيلية'), ('الفيوم'), ('بني سويف'),
('المنيا'), ('أسيوط'), ('سوهاج'), ('قنا'),
('الأقصر'), ('أسوان'), ('البحر الأحمر'), ('الوادي الجديد'),
('مطروح'), ('شمال سيناء'), ('جنوب سيناء')
ON CONFLICT (name_ar) DO NOTHING;
SELECT setval('public.governorates_id_seq', (SELECT MAX(id) FROM public.governorates));

-- 4. الكليات والمدارس (Institutions)
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
SELECT setval('public.institutions_id_seq', (SELECT MAX(id) FROM public.institutions));

-- 5. تصنيفات الأماكن (Categories)
INSERT INTO public.categories (id, code, name_ar, icon, sort_order) VALUES
(1, 'explore', 'استكشف بورسعيد', 'fa-compass', 1),
(2, 'fun', 'معالم وترفيه', 'fa-star', 2),
(3, 'food', 'مطاعم', 'fa-utensils', 3),
(4, 'cafe', 'كافيهات', 'fa-mug-hot', 4),
(5, 'sweets', 'حلويات', 'fa-ice-cream', 5),
(6, 'shop', 'تسوق', 'fa-bag-shopping', 6),
(7, 'sport', 'رياضة', 'fa-dumbbell', 7),
(8, 'housing', 'السكن', 'fa-bed', 8),
(9, 'bus', 'مواصلات', 'fa-bus', 9)
ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar, icon = EXCLUDED.icon;
SELECT setval('public.categories_id_seq', (SELECT MAX(id) FROM public.categories));

-- 6. خطوط المواصلات الأساسية (Transport Lines)
INSERT INTO public.transport_lines (id, kind, name_ar, details_ar, stops, sort_order) VALUES
(1, 'bus', 'الأمين', 'خط رئيسي يربط المعدية بكليات التكنولوجيا والحقوق ومعهد الحاسب الآلي', '["المعدية / السكن الجامعي", "قصر الثقافة", "معهد الحاسب الآلي", "كلية التكنولوجيا والحقوق", "بنك الإسكان", "السلام", "قسم الضواحي", "الحريتين", "شارع التلاتيني", "المنشية"]'::jsonb, 1),
(2, 'bus', 'الزهور', 'خط كليات الطب والعلاج الطبيعي والصيدلة مرورًا بشارع النصر', '["قصر الثقافة", "كلية الطب والعلاج الطبيعي", "كلية الصيدلة", "شارع النصر", "الزهور", "عمر بن عبد العزيز"]'::jsonb, 2),
(3, 'bus', 'الـ 5000', 'خط يربط المعدية بالتربية النوعية والإفرنج وحي العرب والمناخ', '["المعدية / السكن الجامعي", "كلية التربية النوعية", "الإفرنج", "حي العرب", "حي المناخ", "التعاونيات", "منطقة الـ 5000"]'::jsonb, 3),
(4, 'bus', 'التلاتيني', 'يربط منطقة الـ 5000 بشارع الجمهورية', '["منطقة الـ 5000", "شارع الجمهورية"]'::jsonb, 4),
(5, 'bus', 'السلام', 'حي العرب وشارع أسوان وفاطمة الزهراء', '["حي العرب", "شارع أسوان", "فاطمة الزهراء", "نفيسة"]'::jsonb, 5),
(6, 'bus', 'أسوان', 'خط الرجوع من الطب والعلاج الطبيعي إلى قصر الثقافة وشارع أسوان', '["كلية الطب والعلاج الطبيعي", "قصر الثقافة", "شارع أسوان"]'::jsonb, 6)
ON CONFLICT (id) DO NOTHING;
SELECT setval('public.transport_lines_id_seq', (SELECT MAX(id) FROM public.transport_lines));

-- 7. إعدادات النظام (Settings)
INSERT INTO public.settings (k, v) VALUES
('email_verify_required', '0'),
('notify_login_email', '1'),
('share_points', '40'),
('coupon_validity_hours', '3'),
('max_login_failures', '5'),
('lockout_minutes', '15'),
('explore_auto_approve', '0')
ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v;

-- 8. حسابات المستخدمين الرسمية والمعتمدة (5 حسابات مؤكدة)
INSERT INTO public.users (
    id, name, email, phone, password_hash, role_id, user_type_id, governorate_id, institution_id, points_balance, status, email_verified_at, created_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'المالك الرئيسي',
    'admin@portsaidhub.com',
    '01000000001',
    'scrypt:16384:8:1:4103052d78ab5464223911afe5154204:4729f958f01c29795a039bd86a2b54fbf6c158cf5d887304451f5c2786c59c14128d8dc7b38f97115b780a1fb4b13eabba2870f3e23e027234de33048c02b914',
    1,
    3,
    (SELECT id FROM public.governorates WHERE name_ar = 'بورسعيد' LIMIT 1),
    NULL,
    500,
    'active',
    NOW(),
    '2026-10-24T17:05:32.287Z'
),
(
    '00000000-0000-0000-0000-000000000004',
    'أحمد السيد',
    'ahmed@student.psu.edu.eg',
    '01234567890',
    'scrypt:16384:8:1:64fba198cb5b5e2b8b4df2b3093175e3:eca6446f351e086fff129f22e817d5091055f837bb20bcb0599f7e762e5f4eaa70ed227870d842ac3a694e6d7fd11c9b556f612d4bff5f5eefb8422cc324269f',
    4,
    1,
    (SELECT id FROM public.governorates WHERE name_ar = 'بورسعيد' LIMIT 1),
    NULL,
    60,
    'active',
    NOW(),
    '2026-10-24T17:05:32.287Z'
),
(
    '00000000-0000-0000-0000-000000000002',
    'كريم محمود',
    'karim@portsaidhub.com',
    '01011223344',
    'scrypt:16384:8:1:50953e3354557d0a28ea8a1ff5220094:143329a92df5a38175c5657b3ce2762c50498a4918d4e9d4e7d51ff2032b96aeb5788b76dcf7d921847bbccf534c68581c414854c5d5cbedbfbb06260117c519',
    2,
    3,
    (SELECT id FROM public.governorates WHERE name_ar = 'بورسعيد' LIMIT 1),
    NULL,
    220,
    'active',
    NOW(),
    '2026-10-24T17:05:32.287Z'
),
(
    'a9ed234a-7b67-4f19-b2f9-c6296d4c7c46',
    'محمود محمد موسى',
    'mahmoud.m.moussa5310@gmail.com',
    '01026795965',
    'scrypt:16384:8:1:19c90a4da65044b70ee0c34f9ed1a665:0a95fe16e5f664adce71ef41e924b0c494158bd876567e7518a0a413cfc77c0c973fd38ae650a91cef4db903b16f9adce0d669f67266d994adc11f413a36e013',
    4,
    1,
    (SELECT id FROM public.governorates WHERE name_ar = 'قنا' LIMIT 1),
    (SELECT id FROM public.institutions WHERE name_ar = 'كلية أخرى' LIMIT 1),
    20,
    'active',
    NOW(),
    '2026-10-24T17:25:49.818Z'
),
(
    '00000000-0000-0000-0000-000000000003',
    'صاحب مطعم كاستن',
    'merchant@portsaidhub.com',
    '01000000002',
    'scrypt:16384:8:1:1f78e425e47d3fd05d8284633a081d13:5aabcc9d5b26527c1a60de0c61da1daf63bd3220805ebfde49b3d2bc1daf149c395783b907819c7739ee445587f9c2b2d2f3d7c98d56414e2fea48902fc57ceb',
    3,
    3,
    (SELECT id FROM public.governorates WHERE name_ar = 'بورسعيد' LIMIT 1),
    NULL,
    100,
    'active',
    NOW(),
    '2026-10-24T17:05:32.287Z'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    user_type_id = EXCLUDED.user_type_id,
    governorate_id = EXCLUDED.governorate_id,
    institution_id = EXCLUDED.institution_id,
    points_balance = EXCLUDED.points_balance,
    status = 'active';

-- 9. إدراج رصيد النقاط الافتتاحي في سجل الحركات (Points Ledger)
INSERT INTO public.points_ledger (user_id, delta, balance_after, reason, ref_type, created_at) 
VALUES
('00000000-0000-0000-0000-000000000001', 500, 500, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()),
('00000000-0000-0000-0000-000000000004', 60, 60, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()),
('00000000-0000-0000-0000-000000000002', 220, 220, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()),
('a9ed234a-7b67-4f19-b2f9-c6296d4c7c46', 20, 20, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()),
('00000000-0000-0000-0000-000000000003', 100, 100, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW());

-- 10. إدراج كافة الأماكن والمعالم الرسمية في بورسعيد (252 مكاناً معتمداً)
INSERT INTO public.places (
    id, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, maps_url, status, is_demo
) VALUES
`;

  // Map category code to category ID
  const catCodeToId = {
    explore: 1,
    fun: 2,
    food: 3,
    cafe: 4,
    sweets: 5,
    shop: 6,
    sport: 7,
    housing: 8,
    bus: 9,
  };

  const escapeStr = (str) => {
    if (!str) return "''";
    return "'" + str.replace(/'/g, "''") + "'";
  };

  const placeRows = placesData.map((p) => {
    const catId = catCodeToId[p.cat] || 3;
    const name = escapeStr(p.n);
    const area = escapeStr(p.a || 'بورسعيد');
    const desc = escapeStr(p.ds || '');
    const lat = Number(p.lat).toFixed(6);
    const lon = Number(p.lon).toFixed(6);
    const pts = p.p || 20;
    const disc = p.disc || 0;
    const couponCost = p.coupon_cost_points || (disc > 0 ? 40 : 0);
    const comm = Number(p.commission_amount || (disc > 0 ? 5.0 : 0.0)).toFixed(2);
    const mapUrl = escapeStr(p.maps_url || '');

    return `('${p.id}', ${catId}, ${name}, ${area}, ${desc}, ${lat}, ${lon}, ${pts}, ${disc}, ${couponCost}, ${comm}, ${mapUrl}, 'active', FALSE)`;
  });

  sql += placeRows.join(',\n') + '\n';
  sql += `ON CONFLICT (id) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    area_ar = EXCLUDED.area_ar,
    description_ar = EXCLUDED.description_ar,
    category_id = EXCLUDED.category_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    visit_points = EXCLUDED.visit_points,
    discount_percent = EXCLUDED.discount_percent,
    coupon_cost_points = EXCLUDED.coupon_cost_points,
    commission_amount = EXCLUDED.commission_amount,
    maps_url = EXCLUDED.maps_url,
    status = 'active';

-- 11. عناصر استكشف بورسعيد الأولية (Explore Items)
INSERT INTO public.explore_items (kind, title_ar, description_ar, file_name, sort_order) VALUES
('image', 'فنار بورسعيد القديم', 'التحفة المعمارية التي تأسست عام 1869', 'port-said-lighthouse.webp', 1),
('image', 'ميناء بورسعيد ليلًا', 'سحر أضواء القناة وسفن العالم العابرة', 'port-said-port-night.webp', 2),
('image', 'مسجد السلام التاريخي', 'أحد أهم معالم المدينة الباسلة', 'port-said-mosque.webp', 3),
('image', 'شرفات الحي الإفرنجي الخشبية', 'العمارة التاريخية الفريدة الطراز في قلب بورسعيد', 'gallery/balconies-street.webp', 4),
('image', 'ميدان الشهداء ومسلة النصر', 'رمز الصمود والفداء للمدينة الباسلة', 'gallery/martyrs-square.webp', 5)
ON CONFLICT DO NOTHING;

-- 12. أماكن مفضلة أولية للمستخدمين التجريبيين
INSERT INTO public.user_favorites (user_id, place_id) VALUES
('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003'),
('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
('a9ed234a-7b67-4f19-b2f9-c6296d4c7c46', '20000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, place_id) DO NOTHING;

-- اكتملت إضافة كافة البيانات بنجاح!
`;

  return sql;
}

const seedSql = buildSeedSql();

// Write out both files and updated supabase_schema.sql
fs.writeFileSync(path.join(__dirname, '..', '01_PORTSAID_COMPLETE_SCHEMA.sql'), schemaSql, 'utf8');
fs.writeFileSync(path.join(__dirname, '..', '02_PORTSAID_COMPLETE_SEED_DATA.sql'), seedSql, 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'supabase_schema.sql'), schemaSql + '\n\n' + seedSql, 'utf8');

console.log('Successfully generated:');
console.log('1. 01_PORTSAID_COMPLETE_SCHEMA.sql (Size: ' + schemaSql.length + ' bytes)');
console.log('2. 02_PORTSAID_COMPLETE_SEED_DATA.sql (Size: ' + seedSql.length + ' bytes, 252 places)');
console.log('3. supabase_schema.sql (Combined)');
