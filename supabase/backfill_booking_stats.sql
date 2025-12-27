-- Backfill: Reset and apply booking statistics from cal_webhook_events
-- Purpose: Clean backfill of booking_count, has_rescheduled, has_cancelled
-- Run in Supabase Dashboard > SQL Editor
-- Safe: Idempotent, can run multiple times

-- Step 1: Reset all to defaults (clean slate)
UPDATE public.leads
SET 
  booking_count = 0,
  has_rescheduled = false,
  has_cancelled = false
WHERE cal_booking_uid IS NOT NULL;

-- Step 2: Apply statistics from cal_webhook_events
UPDATE public.leads l
SET
  booking_count = COALESCE(x.created_count, 0),
  has_rescheduled = COALESCE(x.rescheduled_count, 0) > 0,
  has_cancelled = COALESCE(x.cancelled_count, 0) > 0
FROM (
  SELECT
    cal_booking_uid,
    COUNT(*) FILTER (WHERE event_type = 'booking.created') AS created_count,
    COUNT(*) FILTER (WHERE event_type = 'booking.rescheduled') AS rescheduled_count,
    COUNT(*) FILTER (WHERE event_type = 'booking.cancelled') AS cancelled_count
  FROM public.cal_webhook_events
  WHERE cal_booking_uid IS NOT NULL
  GROUP BY cal_booking_uid
) x
WHERE l.cal_booking_uid = x.cal_booking_uid;

-- Verification query
SELECT 
  COUNT(*) as total_leads_with_booking_uid,
  SUM(booking_count) as total_bookings,
  SUM(CASE WHEN has_rescheduled THEN 1 ELSE 0 END) as leads_with_reschedules,
  SUM(CASE WHEN has_cancelled THEN 1 ELSE 0 END) as leads_with_cancellations
FROM public.leads
WHERE cal_booking_uid IS NOT NULL;

