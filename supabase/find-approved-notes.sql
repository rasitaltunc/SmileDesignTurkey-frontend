-- Find recent approved notes with PDF
SELECT 
  id,
  lead_id,
  status,
  pdf_storage_path,
  approved_at,
  created_at
FROM doctor_notes
WHERE status = 'approved'
  AND pdf_storage_path IS NOT NULL
ORDER BY approved_at DESC
LIMIT 10;
