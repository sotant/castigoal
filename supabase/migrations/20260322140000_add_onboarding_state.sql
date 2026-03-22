create table if not exists public.onboarding_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  local_user_id uuid not null,
  has_seen_onboarding boolean not null default false,
  is_completed boolean not null default false,
  is_skipped boolean not null default false,
  current_step text not null default 'not_started',
  onboarding_version integer not null default 1,
  has_created_first_goal boolean not null default false,
  has_logged_first_day boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint onboarding_state_current_step_check
    check (
      current_step in (
        'not_started',
        'intro_pending',
        'goal_creation_pending',
        'daily_tracking_pending',
        'completed',
        'skipped'
      )
    )
);

create index if not exists onboarding_state_updated_at_idx
  on public.onboarding_state (updated_at desc);

alter table public.onboarding_state enable row level security;

drop policy if exists "Users can read their own onboarding state"
  on public.onboarding_state;

drop policy if exists "Users can insert their own onboarding state"
  on public.onboarding_state;

drop policy if exists "Users can update their own onboarding state"
  on public.onboarding_state;

drop policy if exists "Users can delete their own onboarding state"
  on public.onboarding_state;

create policy "Users can read their own onboarding state"
  on public.onboarding_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own onboarding state"
  on public.onboarding_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own onboarding state"
  on public.onboarding_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own onboarding state"
  on public.onboarding_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists onboarding_state_set_updated_at
  on public.onboarding_state;

create trigger onboarding_state_set_updated_at
before update on public.onboarding_state
for each row
execute function public.set_updated_at();
