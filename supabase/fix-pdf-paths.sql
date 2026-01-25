-- Fix old pdf_storage_path format
-- BEFORE: pdf/doctor-notes/xxx.pdf
-- AFTER: doctor-notes/xxx.pdf

-- Remove "pdf/" prefix from all paths
UPDATE doctor_notes 
SET pdf_storage_path = REPLACE(pdf_storage_path, 'pdf/', '')
WHERE pdf_storage_path LIKE 'pdf/%';

-- Verify fix
SELECT id, pdf_storage_path, approved_at
FROM doctor_notes
WHERE pdf_storage_path IS NOT NULL
ORDER BY approved_at DESC
LIMIT 10;
