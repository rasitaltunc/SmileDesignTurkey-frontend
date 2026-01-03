-- Migration: Create lead_timeline_events table
-- B6.1: Lead Timeline Events for tracking lead journey stages
--
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)

-- Create extension if not exists
create extension if not exists pgcrypto;

-- Create table if not exists
create table if not exists public.lead_timeline_events (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null,
  stage text not null,
  actor_role text not null default 'consultant',
  note text null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now()
);

-- Create indexes
create index if not exists lead_timeline_events_lead_id_created_at_idx
  on public.lead_timeline_events (lead_id, created_at desc);

create index if not exists lead_timeline_events_stage_idx
  on public.lead_timeline_events (stage);

-- Enable Row Level Security
alter table public.lead_timeline_events enable row level security;

-- Drop existing policies if they exist (for idempotency)
drop policy if exists "timeline_select_authenticated" on public.lead_timeline_events;

-- Policy: Allow SELECT for authenticated users
create policy "timeline_select_authenticated"
  on public.lead_timeline_events
  for select
  to authenticated
  using ((select auth.uid()) is not null);

-- Add comment to table
comment on table public.lead_timeline_events is 'Tracks lead journey stages and events with actor roles and optional notes';
