# دليل ربط Port Said Hub بقاعدة بيانات Supabase 🚀

تم تجهيز المشروع بالكامل ليعمل بسلاسة مع **Supabase (PostgreSQL)** على استضافة **Vercel**.

---

## 📌 الخطوات السريعة للتشغيل

### 1. إنشاء مشروع جديد على Supabase
1. ادخل إلى [supabase.com](https://supabase.com) وسجّل دخولك أو أنشئ حسابًا مجانيًا.
2. اضغط على **New project**.
3. اختر اسمًا للمشروع (مثل: `portsaidhub`) واختر كلمة مرور قوية لقاعدة البيانات (`Database Password`) واحتفظ بها، ثم اختر أقرب منطقة جغرافية (مثل `Frankfurt / eu-central-1`).
4. انتظر دقيقة حتى يكتمل تجهيز المشروع.

---

### 2. تشغيل ملف المخطط (SQL Schema)
1. من القائمة الجانبية في لوحة تحكم Supabase، اضغط على **SQL Editor**.
2. اضغط على **New query**.
3. افتح الملف الموجود في مشروعك:
   [`database/supabase_schema.sql`](file:///c:/Users/محمود/Desktop/PortSaid/psh-vercel/database/supabase_schema.sql)
4. انسخ محتواه بالكامل والصقه في محرر SQL في Supabase.
5. اضغط على زر **Run** (أو `Ctrl + Enter`).
6. ستظهر لك رسالة `Success. No rows returned`، وستجد جميع الجداول (24 جدول + البيانات الأولية + سياسات الأمان RLS) قد أُنشئت بنجاح.

---

### 3. نسخ المفاتيح ووضعها في ملف البيئة (`.env`)
من لوحة تحكم Supabase، اذهب إلى:
**Project Settings (أيقونة الترس)**:

#### أ) بيانات الاتصال المباشر بقاعدة البيانات:
1. اذهب إلى **Database** ثم انزل لقسم **Connection string**.
2. اختر تبويب **URI** ثم فعّل وضع **Connection Pooling** (المنفذ `6543`) وهو الأنسب لسيرفرات Vercel Serverless.
3. انسخ الرابط الذي يبدو هكذا:
   ```env
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
   *(استبدل `[YOUR-PASSWORD]` بكلمة المرور التي اخترتها عند إنشاء المشروع)*.

#### ب) مفاتيح Supabase API:
1. من نفس الإعدادات، اذهب إلى **API**.
2. انسخ:
   - **Project URL**: ضعه في `SUPABASE_URL`
   - **anon public**: ضعه في `SUPABASE_ANON_KEY`
   - **service_role secret**: ضعه في `SUPABASE_SERVICE_ROLE_KEY`

#### ج) الحفظ في ملف `.env`:
افتح الملف [`.env`](file:///c:/Users/محمود/Desktop/PortSaid/psh-vercel/.env) في المجلد وضع القيم هناك:
```env
DATABASE_URL=postgresql://postgres.xxxx:your_password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

### 4. عند النشر على Vercel
في لوحة تحكم Vercel:
1. افتح مشروعك واذهب إلى **Settings** > **Environment Variables**.
2. أضف نفس المتغيرات:
   - `DATABASE_URL` (أو المتغيرات المنفصلة `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`)
   - `APP_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. اعمل **Redeploy** لكي يقرأ Vercel المتغيرات الجديدة.

---

### 5. الفحص والتأكد من نجاح الاتصال
افتح الرابط في متصفحك:
`https://your-domain.vercel.app/api/health.php`
ستجد تقرير الفحص يوضح:
- `"db_driver": "pgsql"`
- `"supabase_detected": true`
- `"db_connect": true`
- `"tables_missing": []`
- `"admin_ready": true`

---

## 🔑 بيانات الدخول الافتراضية للوحة التحكم (Admin)
- الرابط: `https://your-domain.vercel.app/admin/`
- البريد: `admin@portsaidhub.com`
- كلمة المرور الأولية: `Admin@123456`
*(يُفضل تغييرها بعد أول تسجيل دخول من لوحة التحكم)*.
