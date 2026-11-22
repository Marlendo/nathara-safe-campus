-- ============================================================
-- 0003_report_ownership — kepemilikan laporan untuk /reports/mine
--
--  Latar: F1 Security (sec_safecampus_0001_sso) — Opsi A (human 2026-11-22).
--  Endpoint milik-pelapor GET /admin/reports/mine memfilter
--  WHERE reports.submitted_by_user_id = req.user.id, sehingga kolom
--  penaut laporan → user ini WAJIB ada. Kolom nullable: alur lapor
--  publik anonim tetap jalan (NULL = tanpa pemilik), tanpa ubah
--  perilaku publik lain. Idempoten: aman dijalankan ulang.
-- ============================================================

ALTER TABLE reports ADD COLUMN IF NOT EXISTS submitted_by_user_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reports_submitted_by') THEN
    ALTER TABLE reports ADD CONSTRAINT fk_reports_submitted_by
      FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_submitted_by ON reports (submitted_by_user_id);
