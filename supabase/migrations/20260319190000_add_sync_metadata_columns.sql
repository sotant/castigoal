set check_function_bodies = off;

alter table public.goals
  add column if not exists origin_device_id text null,
  add column if not exists source_guest_id uuid null;

alter table public.checkins
  add column if not exists origin_device_id text null,
  add column if not exists source_guest_id uuid null;

alter table public.assigned_punishments
  add column if not exists origin_device_id text null,
  add column if not exists source_guest_id uuid null;

alter table public.punishments
  add column if not exists origin_device_id text null,
  add column if not exists source_guest_id uuid null;

alter table public.punishment_completion_history
  add column if not exists origin_device_id text null,
  add column if not exists source_guest_id uuid null;

alter table public.user_settings
  add column if not exists origin_device_id text null,
  add column if not exists source_guest_id uuid null;

create index if not exists goals_source_guest_idx
  on public.goals (source_guest_id)
  where source_guest_id is not null;

create index if not exists checkins_source_guest_idx
  on public.checkins (source_guest_id)
  where source_guest_id is not null;

create index if not exists assigned_punishments_source_guest_idx
  on public.assigned_punishments (source_guest_id)
  where source_guest_id is not null;

create index if not exists punishment_history_source_guest_idx
  on public.punishment_completion_history (source_guest_id)
  where source_guest_id is not null;

create index if not exists punishments_source_guest_idx
  on public.punishments (source_guest_id)
  where source_guest_id is not null;

create index if not exists user_settings_source_guest_idx
  on public.user_settings (source_guest_id)
  where source_guest_id is not null;
