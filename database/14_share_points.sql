-- نقاط مشاركة الموقع (40 نقطة، مرة واحدة لكل مستخدم) — شغّله مرة واحدة
ALTER TABLE points_ledger MODIFY reason ENUM('visit','coupon','admin_adjust','refund','share') NOT NULL;
INSERT INTO settings (k, v) VALUES ('share_points', '40') ON DUPLICATE KEY UPDATE v = '40';
