-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Create doctor_briefs table for AI summary caching
create table if not exists public.doctor_briefs (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  brief jsonb not null,
  confidence_score float not null default 0.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Enable RLS (optional, depending on your policy, usually good for security)
alter table public.doctor_briefs enable row level security;

-- Policy: Authenticated users can read briefs (adjust as needed for doctors vs others)
create policy "Allow authenticated read access"
  on public.doctor_briefs for select
  to authenticated
  using (true);

-- Policy: Service role or doctors can upsert (API uses service role probably, or authenticated)
create policy "Allow authenticated upsert access"
  on public.doctor_briefs for all
  to authenticated
  using (true)
  with check (true);
