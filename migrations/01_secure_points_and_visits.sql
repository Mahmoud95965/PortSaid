-- ==============================================================================
-- Port Said Hub - Phase 1 Migration: Secure Points & Visits Architecture
-- File: migrations/01_secure_points_and_visits.sql
-- Description:
--   1. Adds idempotency_key to points_ledger.
--   2. Blocks direct client modifications of points_balance on users via DB trigger.
--   3. Drops wide-open INSERT policy on points_ledger (only SECURITY DEFINER RPCs can insert).
--   4. Creates atomic RPC rpc_claim_share_reward (strictly 1 claim per user, server-fixed 40 pts).
--   5. Creates atomic RPC rpc_record_visit (correct columns, 1 visit per day, server-fetched points).
--   6. Enforces registration welcome bonus cap (max 20 pts) and auto-ledger entry via trigger.
-- ==============================================================================

-- 1. إضافة عمود مفتاح عدم التكرار (Idempotency Key)
ALTER TABLE public.points_ledger 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_points_ledger_idemp ON public.points_ledger(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_reason ON public.points_ledger(user_id, reason);

-- 2. إغلاق ثغرة التعديل المباشر لرصيد النقاط من طرف العميل
CREATE OR REPLACE FUNCTION public.trg_guard_points_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا تم تغيير points_balance بدون تصريح سياق الخادم المعتمد يتم الرفض فوراً
    IF (OLD.points_balance IS DISTINCT FROM NEW.points_balance) THEN
        IF current_setting('portsaid.trusted_context', true) IS DISTINCT FROM 'enabled' THEN
            RAISE EXCEPTION 'DIRECT_POINTS_UPDATE_FORBIDDEN: Modifying points_balance directly from client is blocked. Use official rewards RPC functions.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_users_points ON public.users;
CREATE TRIGGER trg_protect_users_points
BEFORE UPDATE OF points_balance ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.trg_guard_points_balance();

-- 3. إلغاء سياسة الإدراج المباشر في دفتر الحركات للعميل (RLS Hardening)
DROP POLICY IF EXISTS "Users can insert points ledger" ON public.points_ledger;

-- الحفاظ على سياسة القراءة فقط للمستخدمين
DROP POLICY IF EXISTS "Users can view points ledger" ON public.points_ledger;
CREATE POLICY "Users can view points ledger" ON public.points_ledger FOR SELECT USING (true);

-- 4. الدالة الخادمية الذرية لمنح مكافأة المشاركة (مرة واحدة فقط وثابتة 40 نقطة)
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
    -- أ. التحقق من صحة المعرف
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_user', 'message', 'معرف المستخدم غير صحيح');
    END IF;

    -- ب. التحقق من مفتاح عدم التكرار (Idempotency)
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_ledger_id 
        FROM public.points_ledger 
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_ledger_id IS NOT NULL THEN
            SELECT points_balance INTO v_current_bal FROM public.users WHERE id = p_user_id;
            RETURN jsonb_build_object(
                'ok', true, 
                'idempotent', true, 
                'points_awarded', 0, 
                'balance', v_current_bal, 
                'message', 'تم استلام هذه المعاملة مسبقاً.'
            );
        END IF;
    END IF;

    -- ج. قفل صف المستخدم لمنع التعارضات المتزامنة (Concurrency Lock)
    SELECT points_balance INTO v_current_bal
    FROM public.users
    WHERE id = p_user_id AND status = 'active' AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'user_not_found', 'message', 'الحساب غير موجود أو معطل');
    END IF;

    -- د. التحقق من عدم أخذ مكافأة المشاركة مسبقاً
    IF EXISTS (
        SELECT 1 FROM public.points_ledger 
        WHERE user_id = p_user_id AND reason = 'share'
    ) THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'code', 'already_shared', 
            'message', 'تم الحصول على مكافأة المشاركة مسبقاً.'
        );
    END IF;

    -- هـ. احتساب الرصيد الجديد
    v_new_bal := v_current_bal + v_pts;

    -- و. تفعيل سياق الثقة المؤقت لتحديث الرصيد
    PERFORM set_config('portsaid.trusted_context', 'enabled', true);

    -- ز. التحديث الذري للرصيد
    UPDATE public.users 
    SET points_balance = v_new_bal, updated_at = NOW()
    WHERE id = p_user_id;

    -- ح. تسجيل الحركة في دفتر الحركات ذرياً
    INSERT INTO public.points_ledger (
        user_id,
        delta,
        balance_after,
        reason,
        ref_type,
        ref_id,
        idempotency_key,
        created_at
    ) VALUES (
        p_user_id,
        v_pts,
        v_new_bal,
        'share',
        'app_share',
        'app_share_bonus',
        p_idempotency_key,
        NOW()
    );

    RETURN jsonb_build_object(
        'ok', true,
        'points_awarded', v_pts,
        'balance', v_new_bal,
        'message', 'مبروك! تمت إضافة +40 نقطة لمشاركة التطبيق بنجاح.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) TO anon, authenticated;

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
    -- أ. التحقق من المدخلات
    IF p_user_id IS NULL OR p_place_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'بيانات الزيارة غير مكتملة');
    END IF;

    -- ب. التحقق من مفتاح عدم التكرار (Idempotency)
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_ledger_id 
        FROM public.points_ledger 
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_ledger_id IS NOT NULL THEN
            SELECT points_balance INTO v_current_bal FROM public.users WHERE id = p_user_id;
            RETURN jsonb_build_object(
                'ok', true, 
                'idempotent', true, 
                'points_awarded', 0, 
                'balance', v_current_bal, 
                'message', 'تم تسجيل هذه الزيارة مسبقاً.'
            );
        END IF;
    END IF;

    -- ج. جلب بيانات المكان والتأكد من نشاطه وقيمة نقاط الزيارة المحددة له خادمياً
    SELECT id, name_ar, visit_points, latitude, longitude, checkin_radius_m
    INTO v_place
    FROM public.places
    WHERE id = p_place_id AND status = 'active' AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'place_not_found', 'message', 'المكان غير موجود أو غير نشط');
    END IF;

    v_pts := COALESCE(v_place.visit_points, 20);

    -- د. التحقق من قيد الزيارة اليومية (زيارة واحدة لنفس المكان في اليوم)
    SELECT id INTO v_existing_visit_id
    FROM public.visits
    WHERE user_id = p_user_id AND place_id = p_place_id AND visit_day = v_today;

    IF v_existing_visit_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'code', 'already_visited', 
            'message', 'لقد سجلت زيارتك لهذا المكان اليوم بالفعل.'
        );
    END IF;

    -- هـ. قفل صف المستخدم لمنع تضارب المعاملات (Row Lock)
    SELECT points_balance INTO v_current_bal
    FROM public.users
    WHERE id = p_user_id AND status = 'active' AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'user_not_found', 'message', 'المستخدم غير موجود');
    END IF;

    -- و. إدراج الزيارة بالأسماء المطابقة لمخطط قاعدة البيانات (latitude, longitude)
    INSERT INTO public.visits (
        user_id,
        place_id,
        points_awarded,
        latitude,
        longitude,
        distance_m,
        location_verified,
        visit_day,
        created_at
    ) VALUES (
        p_user_id,
        p_place_id,
        v_pts,
        p_latitude,
        p_longitude,
        p_distance_m,
        TRUE,
        v_today,
        NOW()
    );

    -- ز. احتساب الرصيد الجديد
    v_new_bal := v_current_bal + v_pts;

    -- ح. تفعيل سياق الثقة المؤقت لتحديث الرصيد
    PERFORM set_config('portsaid.trusted_context', 'enabled', true);

    -- ط. تحديث رصيد المستخدم في قاعدة البيانات ذرياً
    UPDATE public.users 
    SET points_balance = v_new_bal, updated_at = NOW()
    WHERE id = p_user_id;

    -- ي. إدراج سجل الحركة في دفتر النقاط ذرياً
    INSERT INTO public.points_ledger (
        user_id,
        delta,
        balance_after,
        reason,
        ref_type,
        ref_id,
        idempotency_key,
        created_at
    ) VALUES (
        p_user_id,
        v_pts,
        v_new_bal,
        'visit',
        'place',
        p_place_id::text,
        p_idempotency_key,
        NOW()
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

GRANT EXECUTE ON FUNCTION public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR) TO anon, authenticated;

-- 6. حماية وتدقيق هدية الترحيب عند إنشاء الحساب (الحد الأقصى 20 نقطة)
CREATE OR REPLACE FUNCTION public.trg_audit_welcome_gift()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.points_balance > 0 THEN
        IF NEW.points_balance > 20 THEN
            RAISE EXCEPTION 'FRAUDULENT_INITIAL_BALANCE: Initial balance cannot exceed 20 points';
        END IF;

        -- التحقق من عدم وجود قيد ترحيبي سابق للمستخدم قبل الإدراج
        IF NOT EXISTS (
            SELECT 1 FROM public.points_ledger 
            WHERE user_id = NEW.id AND reason = 'welcome_gift'
        ) THEN
            INSERT INTO public.points_ledger (
                user_id,
                delta,
                balance_after,
                reason,
                ref_type,
                ref_id,
                created_at
            ) VALUES (
                NEW.id,
                NEW.points_balance,
                NEW.points_balance,
                'welcome_gift',
                'registration',
                'welcome_bonus',
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_audit_welcome_gift_insert ON public.users;
CREATE TRIGGER trg_audit_welcome_gift_insert
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_welcome_gift();
