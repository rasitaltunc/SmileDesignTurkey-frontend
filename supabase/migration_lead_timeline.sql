create extension if not exists pgcrypto;

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

create index if not exists lead_timeline_events_lead_id_created_at_idx
  on public.lead_timeline_events (lead_id, created_at desc);

create index if not exists lead_timeline_events_stage_idx
  on public.lead_timeline_events (stage);

alter table public.lead_timeline_events enable row level security;

drop policy if exists "timeline_select_authenticated" on public.lead_timeline_events;
create policy "timeline_select_authenticated"
  on public.lead_timeline_events
  for select
  to authenticated
  using ((select auth.uid()) is not null);
