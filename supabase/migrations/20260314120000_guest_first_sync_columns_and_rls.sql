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

alter table public.goals enable row level security;
alter table public.checkins enable row level security;
alter table public.assigned_punishments enable row level security;
alter table public.punishments enable row level security;
alter table public.user_settings enable row level security;
alter table public.punishment_completion_history enable row level security;

drop policy if exists "Users can read their own goals" on public.goals;
drop policy if exists "Users can insert their own goals" on public.goals;
drop policy if exists "Users can update their own goals" on public.goals;
drop policy if exists "Users can delete their own goals" on public.goals;

create policy "Users can read their own goals"
  on public.goals
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own goals"
  on public.goals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own goals"
  on public.goals
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own goals"
  on public.goals
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own checkins" on public.checkins;
drop policy if exists "Users can insert their own checkins" on public.checkins;
drop policy if exists "Users can update their own checkins" on public.checkins;
drop policy if exists "Users can delete their own checkins" on public.checkins;

create policy "Users can read their own checkins"
  on public.checkins
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own checkins"
  on public.checkins
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own checkins"
  on public.checkins
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own checkins"
  on public.checkins
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own assigned punishments" on public.assigned_punishments;
drop policy if exists "Users can insert their own assigned punishments" on public.assigned_punishments;
drop policy if exists "Users can update their own assigned punishments" on public.assigned_punishments;
drop policy if exists "Users can delete their own assigned punishments" on public.assigned_punishments;

create policy "Users can read their own assigned punishments"
  on public.assigned_punishments
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own assigned punishments"
  on public.assigned_punishments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own assigned punishments"
  on public.assigned_punishments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own assigned punishments"
  on public.assigned_punishments
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read visible punishments" on public.punishments;
drop policy if exists "Users can insert their own punishments" on public.punishments;
drop policy if exists "Users can update their own punishments" on public.punishments;
drop policy if exists "Users can delete their own punishments" on public.punishments;

create policy "Authenticated users can read visible punishments"
  on public.punishments
  for select
  to authenticated
  using (owner_id is null or auth.uid() = owner_id);

create policy "Users can insert their own punishments"
  on public.punishments
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Users can update their own punishments"
  on public.punishments
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can delete their own punishments"
  on public.punishments
  for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Users can read their own settings" on public.user_settings;
drop policy if exists "Users can insert their own settings" on public.user_settings;
drop policy if exists "Users can update their own settings" on public.user_settings;
drop policy if exists "Users can delete their own settings" on public.user_settings;

create policy "Users can read their own settings"
  on public.user_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own settings"
  on public.user_settings
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own punishment completion history" on public.punishment_completion_history;
drop policy if exists "Users can delete their own punishment completion history" on public.punishment_completion_history;

create policy "Users can update their own punishment completion history"
  on public.punishment_completion_history
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own punishment completion history"
  on public.punishment_completion_history
  for delete
  to authenticated
  using (auth.uid() = user_id);
