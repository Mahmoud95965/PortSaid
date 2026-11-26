-- Migration 17: DB-backed session revocation (users.session_version)
-- 2026-11-26
--
-- المشكلة: إبطال الجلسات (revokeAllUserSessions — بيتنده عند تغيير كلمة
-- السر) كان بيتسجل في ذاكرة العملية بس (Set/Map في session.ts)، وده مالوش
-- أي أثر على Vercel: دوال serverless منفصلة، كل طلب ممكن يروح لنسخة
-- تانية، والذاكرة بتتمسح مع كل إعادة تشغيل. فجلسة مسروقة كانت بتفضل
-- شغالة لحد 7 أيام حتى بعد ما المستخدم يغيّر كلمة سره.
--
-- الحل: رقم إصدار الجلسة بيتخزن في قاعدة البيانات وبيزيد مع كل إبطال،
-- والتوكن الجديد بيحمل رقم الإصدار الحالي، وكل مسار خادم بيتحقق منه
-- (unsealSessionTokenAsync في src/lib/auth/session.ts). التوكنات القديمة
-- (من غير رقم إصدار) بتتعامل كإصدار 1 — والعمود ده بيتعمل بقيمة افتراضية
-- 1، فمفيش أي جلسة حالية بتتكسر.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 1;
