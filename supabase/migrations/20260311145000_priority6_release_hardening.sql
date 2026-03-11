create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create index if not exists assigned_punishments_goal_user_idx
  on public.assigned_punishments (goal_id, user_id);

create index if not exists checkins_goal_user_idx
  on public.checkins (goal_id, user_id);

create index if not exists goal_period_outcomes_assigned_punishment_idx
  on public.goal_period_outcomes (assigned_punishment_id)
  where assigned_punishment_id is not null;

create index if not exists goal_period_outcomes_goal_user_idx
  on public.goal_period_outcomes (goal_id, user_id);

drop policy if exists "Users can read their own goal period outcomes"
  on public.goal_period_outcomes;

create policy "Users can read their own goal period outcomes"
  on public.goal_period_outcomes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
