-- Migration 13 — users.auth_provider (2026-11-25)
--
-- لماذا: صفحة المسؤول كانت تخمّن طريقة التسجيل من وجود password_hash
-- (فيه هاش ← بريد، مفيش هاش ← Google)، لكن حسابات Google متسجلة هي كمان
-- بـ password_hash عشوائي محدش يعرفه (عشان الدخول بكلمة مرور يستحيل لها)،
-- فكل المستخدمين الـ 45 كانوا بيظهروا "بريد" ولا واحد Google.
-- من هنا ورايح مسار التسجيل نفسه بيسجل الطريقة الحقيقية في العمود ده.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email'
  CHECK (auth_provider IN ('email', 'google'));

-- تعبئة الحسابات القديمة: في الكود، email_verified_at بيتسجل لحظة التسجيل
-- من مسار Google بس (حسابات البريد مفيش أي مسار بيظبطه لها)، فأي حساب
-- حقيقي عنده email_verified_at يبقى Google. نستثني حسابات الديمو المزروعة
-- (IDs بتبدأ بـ 00000000-) لأن الـ seed حاطط لها verified_at هي كمان.
UPDATE public.users
SET auth_provider = 'google'
WHERE email_verified_at IS NOT NULL
  AND id::text NOT LIKE '00000000-%';
