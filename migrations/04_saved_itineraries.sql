-- ==============================================================================
-- Port Said Hub - Migration 04: Saved Itineraries Table for Smart Planner
-- ==============================================================================

-- 1. التأكد من عدم وجود جدول قديم بحالة غير مكتملة
DROP TABLE IF EXISTS public.saved_itineraries CASCADE;

-- 2. إنشاء جدول حفظ الخطط والرحلات الذكية
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

-- 3. إنشاء الفهارس لتحسين الأداء
CREATE INDEX idx_saved_itineraries_user ON public.saved_itineraries(user_id);
CREATE INDEX idx_saved_itineraries_created ON public.saved_itineraries(created_at DESC);

-- 4. تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security)
ALTER TABLE public.saved_itineraries ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدم بقراءة رحلاته فقط
CREATE POLICY "Users can view their own itineraries"
    ON public.saved_itineraries
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email')
    );

-- السماح للمستخدم بإضافة خطط لنفسه فقط
CREATE POLICY "Users can insert their own itineraries"
    ON public.saved_itineraries
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email')
    );

-- السماح للمستخدم بتعديل رحلاته فقط
CREATE POLICY "Users can update their own itineraries"
    ON public.saved_itineraries
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email')
    );

-- السماح للمستخدم بحذف رحلاته فقط
CREATE POLICY "Users can delete their own itineraries"
    ON public.saved_itineraries
    FOR DELETE
    USING (
        auth.uid() = user_id 
        OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email')
    );
