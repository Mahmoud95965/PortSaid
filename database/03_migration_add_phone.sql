-- للقواعد المنشأة قبل إضافة رقم الهاتف فقط (لو استوردت 01_schema.sql الجديد مش محتاجه).
ALTER TABLE users
  ADD COLUMN phone CHAR(11) NULL AFTER email,
  ADD UNIQUE KEY uq_users_phone (phone);

-- جعل الإيميل اختياريًا (للقواعد القديمة):
ALTER TABLE users MODIFY email VARCHAR(190) NULL;

-- الكليات/المدارس (للقواعد القديمة): شغّل أيضًا جدول institutions من 01_schema.sql وبياناته من 02_seed.sql ثم:
ALTER TABLE users
  ADD COLUMN institution_id SMALLINT UNSIGNED NULL AFTER governorate_id,
  ADD CONSTRAINT fk_users_inst FOREIGN KEY (institution_id) REFERENCES institutions (id);

-- تعديل اسم كلية قديمة (لو استوردت النسخة السابقة من 02_seed.sql):
UPDATE institutions SET name_ar = 'كلية تكنولوجيا الإدارة ونظم المعلومات — جامعة بورسعيد' WHERE name_ar = 'معهد الحاسب الآلي — جامعة بورسعيد';

-- استبدال رياض الأطفال بالحقوق (لو استوردت النسخة السابقة):
UPDATE institutions SET name_ar = 'كلية الحقوق — جامعة بورسعيد' WHERE name_ar = 'كلية رياض الأطفال — جامعة بورسعيد';
