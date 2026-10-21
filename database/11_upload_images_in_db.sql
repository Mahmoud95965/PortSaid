-- اختياري: الكود بيضيف الأعمدة دي تلقائيًا أول رفع. شغّله يدويًا لو الاستضافة منعت ALTER من الكود.
ALTER TABLE explore_uploads ADD COLUMN img_b64 MEDIUMTEXT NULL AFTER file_name, ADD COLUMN th_b64 MEDIUMTEXT NULL AFTER file_name;
