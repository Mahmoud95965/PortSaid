# نشر Port Said Hub على Vercel

## ⚠️ لازم تعرف قبل ما تبدأ
1. **Vercel مش بيشغّل PHP رسميًا.** الباك إند بتاعك PHP، فاستخدمت Runtime مجتمعي (`vercel-php@0.7.3` / PHP 8.3). بيشتغل، بس مش من Vercel نفسها، وممكن يتوقف أو يتغير مستقبلًا.
2. **قاعدة البيانات لازم تتنقل.** MySQL بتاع InfinityFree بيقبل اتصالات من استضافته بس، فـ Vercel مش هتوصله. محتاج MySQL خارجي (Aiven / Railway / Clever Cloud أو أي مزوّد MySQL).
   - لازم يدعم **Triggers** (ملف 10) و`GET_LOCK` → **متستخدمش TiDB**.
   - راجع الخطة المجانية الحالية عند كل مزوّد.
3. **الصور كلها محفوظة في القاعدة** (ده كويس). أما الرفع على فولدرات (فيديو في `assets/explore`) فمش هيشتغل على Vercel؛ حط الفيديوهات في `public/assets/explore/` قبل الـ deploy.

## الخطوات
1. **أنشئ قاعدة MySQL** وخد (host / port / name / user / password).
2. **انقل بياناتك:** صدّر القاعدة الحالية من phpMyAdmin (InfinityFree) واستوردها في القاعدة الجديدة. لو هتبدأ نضيف: شغّل ملفات `database/` بالترتيب 01 → 25 (الـ 26 اختياري، الكود بينشئ جدول الجلسات لوحده).
3. **ارفع المجلد ده على GitHub** (ملف `.gitignore` جاهز ويمنع رفع الأسرار).
4. في Vercel: **Add New Project** → اختار الريبو → Framework: **Other** → سيب Build Command فاضي → Deploy.
5. من **Settings → Environment Variables** ضيف القيم الموجودة في `.env.example` (الأساسي: `DB_*` و`APP_SECRET`) وبعدها **Redeploy**.
6. افتح `https://موقعك.vercel.app/api/health.php` وتأكد: `db_connect: true`، `tables_missing: []`، و`ext_pdo_mysql` / `ext_gd` = true.
7. لو فيه دومين خاص: ضيفه في Vercel وحطه في `ALLOWED_HOSTS` و`BASE_URL`.
8. بعد ما كل حاجة تشتغل: امسح `api/health.php` أو ضيف `HEALTH_TOKEN`.

## 🔐 أمان (مهم)
الـ zip الأصلي كان فيه `config.local.php` بداخله **بيانات حقيقية** (قاعدة البيانات، SMTP جيميل، مفتاح التطبيق). شلتها من النسخة دي، لكن لو اتشاركت أو اترفعت في أي مكان: **غيّر باسورد القاعدة وApp Password بتاع جيميل و`APP_SECRET`**.

## اللي اتغيّر في الكود
- `vercel.json`: Runtime الـ PHP + هيدرز الأمان (CSP / X-Frame...) بدل `.htaccess` + كاش.
- الملفات الثابتة اتنقلت لـ `public/`، و`database/` برّاها (مش بتتنشر).
- `app/bootstrap.php`: الإعدادات من Environment Variables.
- `app/DbSessionHandler.php` (جديد): الجلسات في MySQL بدل ملفات (إجباري على Serverless).
- `Security::ip()`: بيقرأ IP الزائر الحقيقي من هيدرز Vercel (من غيره كان الـ Rate Limit هيحسب كل الناس كأنهم شخص واحد).
- `Db.php`: دعم SSL لقواعد البيانات المُدارة.
- مسارات الصور الثابتة اتعدلت لـ `PUBLIC_ROOT`، واللوج بقى في Vercel Runtime Logs.

## حدود Vercel
- حجم الطلب الأقصى 4.5MB (الواجهة بتضغط الصور قبل الرفع فمفيش مشكلة).
- زمن تنفيذ الـ API محدد بـ 30 ثانية.
- إرسال البريد بيتم قبل ما الرد يوصل (مفيش `fastcgi_finish_request`)، فالتسجيل ممكن ياخد ثواني زيادة لو SMTP بطيء.
