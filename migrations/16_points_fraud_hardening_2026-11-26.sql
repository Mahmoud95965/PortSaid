-- Migration 16: points fraud hardening + atomic coupon redeem + feedback server-only
-- 2026-11-26
--
-- ما تم اكتشافه في تدقيق 26 نوفمبر (الجولة الثانية):
-- (أ) rpc_record_visit كان بيجيب إحداثيات المكان ونصف قطر التسجيل (checkin_radius_m)
--     لكنه عمره ما استخدمهم — أي متصل عبر /api/rewards/visit يقدر يبعت أي
--     إحداثيات وياخد +20 نقطة لكل مكان كل يوم من غير ما يكون هناك أصلاً،
--     وlocation_verified كان بيتسجل TRUE على طول. دلوقتي المسافة بتتحسب
--     خادمياً (haversine) وأي زيارة أبعد من نصف القطر بتترفض.
-- (ب) مسار الاستبدال كان بياخد التكلفة من الطلب نفسه (pointsCost) من غير ما
--     يتأكد من تكلفة الكوبون في المكان — يعني استبدال بأي عدد نقاط، حتى نقطة
--     واحدة. وكمان كان قراءة-ثم-كتابة (مش ذري) والتحديث المباشر للرصيد بيتقفل
--     بواسطة trigger الحماية (trg_protect_users_points موجود فعلاً) لأن الخادم
--     عمره ما فعّل سياق الثقة — فالاستبدال كان بيرجع "نجاح" والرصيد مش بيتغير.
--     الحل: RPC ذري rpc_redeem_coupon بيقرأ التكلفة من المكان وبيخصم ويسجل
--     في معاملة واحدة وبيفعّل سياق الثقة.
-- (ج) جدول feedback كان عنده سياسة INSERT عامة — أي حد بالمفتاح العام يقدر
--     يغرق الجدول وبأي user_id وأي status. الكتابة بقت من الخادم بس
--     (POST /api/feedback) والسياسة العامة اتشالت.
-- ملاحظات من التحقق المباشر 26 نوفمبر 02:23 EET:
-- - المفتاح العام أصلاً مش بيقدر ينفذ rpc_record_visit ولا rpc_claim_share_reward
--   (has_function_privilege = false للاتنين)، فمفيش حاجة تتلغي هناك — بس
--   بنثبّت صلاحية service_role للمسار الخادمي.
-- - سياسة قراءة التقييمات أصلاً مقيدة بـ status='visible' — مفيش تغيير.
-- - توقيع rpc_record_visit الحي هو (uuid, text, numeric, numeric, int, varchar)
--   — p_place_id نص مش UUID (مختلف عن migration 01) — فالاستبدال هنا بنفس
--   التوقيع الحي عشان يحل محله فعلاً مش يعمل نسخة تانية.

-- (1) rpc_record_visit — نفس التوقيع الحي + تحقق المسافة خادمياً.
CREATE OR REPLACE FUNCTION public.rpc_record_visit(
    p_user_id UUID,
    p_place_id TEXT,
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
    v_dist_m INT;
BEGIN
    -- أ. التحقق من المدخلات
    IF p_user_id IS NULL OR p_place_id IS NULL OR p_place_id = '' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'بيانات الزيارة غير مكتملة');
    END IF;
    IF p_latitude IS NULL OR p_longitude IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'إحداثيات الزيارة غير متوفرة — فعّل تحديد الموقع');
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
    WHERE id::text = p_place_id AND status = 'active' AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'place_not_found', 'message', 'المكان غير موجود أو غير نشط');
    END IF;

    v_pts := COALESCE(v_place.visit_points, 20);

    -- ج2. التحقق من المسافة خادمياً (haversine بالمتر) — إحداثيات المتصل لا
    -- تُؤخذ على ظاهرها أبداً. نصف القطر الافتراضي 150 م.
    v_dist_m := ROUND(6371000 * 2 * asin(LEAST(1, sqrt(
        power(sin(radians((p_latitude - v_place.latitude) / 2)), 2) +
        cos(radians(v_place.latitude)) * cos(radians(p_latitude)) *
        power(sin(radians((p_longitude - v_place.longitude) / 2)), 2)
    ))))::INT;

    IF v_dist_m > COALESCE(v_place.checkin_radius_m, 150) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'too_far', 'message', 'أنت بعيد عن المكان — لازم تكون موجود فيه لتسجيل الزيارة');
    END IF;

    -- د. التحقق من قيد الزيارة اليومية (زيارة واحدة لنفس المكان في اليوم)
    SELECT id INTO v_existing_visit_id
    FROM public.visits
    WHERE user_id = p_user_id AND place_id::text = p_place_id AND visit_day = v_today;

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

    -- و. إدراج الزيارة — المسافة المخزنة هي المحسوبة خادمياً، وlocation_verified
    -- بقت صادقة لأنها لا تُسجَّل إلا بعد اجتياز تحقق المسافة.
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
        p_place_id::uuid,
        v_pts,
        p_latitude,
        p_longitude,
        v_dist_m,
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
        p_place_id,
        p_idempotency_key,
        NOW()
    );

    RETURN jsonb_build_object(
        'ok', true,
        'points_awarded', v_pts,
        'balance', v_new_bal,
        'place_name', v_place.name_ar,
        'message', 'مبروك! تم تسجيل حضورك في ' || v_place.name_ar || ' وحصلت على +' || v_pts || ' نقطة'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- المسار الخادمي بس هو اللي ينفذ دوال النقاط (المفتاح العام متأكد إنه
-- مش بيقدر — اتحقق 26 نوفمبر 02:23 EET — والمنح ده بيثبّت مسار الخادم).
GRANT EXECUTE ON FUNCTION public.rpc_record_visit(UUID, TEXT, NUMERIC, NUMERIC, INT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) TO service_role;

-- (2) rpc_redeem_coupon — استبدال كوبون ذري: التكلفة من المكان نفسه،
-- قفل الصف، خصم + دفتر في معاملة واحدة، وسياق الثقة مفعّل (تريجر الحماية
-- كان بيمنع التحديث المباشر من المسار القديم).
CREATE OR REPLACE FUNCTION public.rpc_redeem_coupon(
    p_user_id UUID,
    p_place_id TEXT,
    p_coupon_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_current_bal INT;
    v_new_bal INT;
    v_place RECORD;
    v_cost INT;
BEGIN
    IF p_user_id IS NULL OR p_place_id IS NULL OR p_place_id = '' OR p_coupon_code IS NULL OR p_coupon_code = '' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'بيانات الاستبدال غير مكتملة');
    END IF;

    SELECT id, name_ar, coupon_cost_points
    INTO v_place
    FROM public.places
    WHERE id::text = p_place_id AND status = 'active' AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'place_not_found', 'message', 'المكان غير موجود أو غير نشط');
    END IF;

    v_cost := COALESCE(v_place.coupon_cost_points, 40);
    IF v_cost <= 0 THEN
        v_cost := 40;
    END IF;

    SELECT points_balance INTO v_current_bal
    FROM public.users
    WHERE id = p_user_id AND status = 'active' AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'user_not_found', 'message', 'الحساب غير موجود أو معطل');
    END IF;

    IF v_current_bal < v_cost THEN
        RETURN jsonb_build_object('ok', false, 'code', 'insufficient', 'message', 'رصيد نقاطك لا يكفي لاستبدال هذا الكوبون.');
    END IF;

    v_new_bal := v_current_bal - v_cost;

    PERFORM set_config('portsaid.trusted_context', 'enabled', true);

    UPDATE public.users
    SET points_balance = v_new_bal, updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.points_ledger (
        user_id,
        delta,
        balance_after,
        reason,
        ref_type,
        ref_id,
        created_at
    ) VALUES (
        p_user_id,
        -v_cost,
        v_new_bal,
        'استبدال كوبون خصم في ' || v_place.name_ar,
        'coupon_redemption',
        p_coupon_code,
        NOW()
    );

    RETURN jsonb_build_object(
        'ok', true,
        'points_cost', v_cost,
        'balance', v_new_bal,
        'place_name', v_place.name_ar
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.rpc_redeem_coupon(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_redeem_coupon(UUID, TEXT, TEXT) TO service_role;

-- (3) الملاحظات: الكتابة من الخادم بس (POST /api/feedback) — إلغاء سياسة
-- الإدراج العامة.
DROP POLICY IF EXISTS "Users can submit feedback" ON public.feedback;
