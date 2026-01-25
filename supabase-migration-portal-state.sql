-- Migration: Add portal_state to leads table for single source of truth
-- Defensive version: safe to run multiple times, handles missing columns gracefully

DO $$
BEGIN
  -- 1) Add portal_state column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='leads' AND column_name='portal_state'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN portal_state TEXT DEFAULT 'unverified'
      CHECK (portal_state IN ('unverified','verified','password_set','active'));
    RAISE NOTICE 'Added portal_state column to leads table';
  ELSE
    RAISE NOTICE 'portal_state column already exists - skipping creation';
  END IF;

  -- 2) Create index (safe with IF NOT EXISTS)
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leads_portal_state ON public.leads(portal_state)';
    RAISE NOTICE 'Created index on portal_state';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Index creation skipped/failed: %', SQLERRM;
  END;

  -- 3) Backfill VERIFIED using email_verified_at (confirmed correct column name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='leads' AND column_name='email_verified_at'
  ) THEN
    UPDATE public.leads
    SET portal_state = 'verified'
    WHERE portal_token IS NOT NULL
      AND email_verified_at IS NOT NULL
      AND portal_state = 'unverified';
    RAISE NOTICE 'Backfilled verified state from email_verified_at';
  ELSE
    RAISE NOTICE 'email_verified_at column not found - skipping verified backfill';
  END IF;

  -- 4) Backfill PASSWORD_SET if lead_portal_auth table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='lead_portal_auth'
  ) THEN
    UPDATE public.leads
    SET portal_state = 'password_set'
    WHERE id IN (
      SELECT lead_id FROM public.lead_portal_auth
      WHERE password_hash IS NOT NULL
    )
    AND portal_state IN ('unverified','verified');
    RAISE NOTICE 'Backfilled password_set state from lead_portal_auth';
  ELSE
    RAISE NOTICE 'lead_portal_auth table not found - skipping password_set backfill';
  END IF;

  -- 5) Add column comment for documentation
  COMMENT ON COLUMN public.leads.portal_state IS
    'Portal access state: unverified → verified (email) → password_set → active. Single source of truth for UI.';
  RAISE NOTICE 'Migration completed successfully';

END $$;
