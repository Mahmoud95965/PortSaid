-- =====================================================================
-- اختياري لكنه موصى به: يمنع حذف أو تعديل أي صف في activity_log حتى من phpMyAdmin أو من أي كود.
-- لو الاستضافة رفضت CREATE TRIGGER (صلاحية TRIGGER) تجاهله: الموقع نفسه مفيهوش أي مسار لحذف السجل،
-- والسلسلة المشفّرة (prev_hash/row_hash) بتكشف أي تلاعب من لوحة المالك > السجل > "فحص سلامة السجل".
-- في phpMyAdmin: نفّذ كل أمر لوحده، وغيّر الـ Delimiter لو طلب منك ($$).
-- =====================================================================
DROP TRIGGER IF EXISTS activity_log_no_update;
DROP TRIGGER IF EXISTS activity_log_no_delete;

CREATE TRIGGER activity_log_no_update BEFORE UPDATE ON activity_log
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity_log is append-only';

CREATE TRIGGER activity_log_no_delete BEFORE DELETE ON activity_log
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity_log is append-only';
