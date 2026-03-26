set check_function_bodies = off;

alter table public.goals
  add column if not exists lifecycle_status text,
  add column if not exists resolution_status text,
  add column if not exists closed_on date,
  add column if not exists resolved_at timestamp with time zone,
  add column if not exists resolution_source text,
  add column if not exists punishment_pool_scope text,
  add column if not exists punishment_category_mode text,
  add column if not exists punishment_category_ids uuid[] default '{}'::uuid[];

update public.goals
set lifecycle_status = case
      when active then 'active'
      when current_date > (start_date + (greatest(target_days, 1) - 1)) then 'closed'
      else 'paused'
    end
where lifecycle_status is null;

update public.goals
set resolution_status = 'pending'
where resolution_status is null;

update public.goals
set punishment_pool_scope = 'base'
where punishment_pool_scope is null;

update public.goals
set punishment_category_mode = 'all'
where punishment_category_mode is null;

update public.goals
set punishment_category_ids = '{}'::uuid[]
where punishment_category_ids is null;

update public.goals
set closed_on = start_date + (greatest(target_days, 1) - 1)
where lifecycle_status = 'closed'
  and closed_on is null;

alter table public.goals
  alter column lifecycle_status set default 'active',
  alter column lifecycle_status set not null,
  alter column resolution_status set default 'pending',
  alter column resolution_status set not null,
  alter column punishment_pool_scope set default 'base',
  alter column punishment_pool_scope set not null,
  alter column punishment_category_mode set default 'all',
  alter column punishment_category_mode set not null,
  alter column punishment_category_ids set default '{}'::uuid[],
  alter column punishment_category_ids set not null;

alter table public.goals
  drop constraint if exists goals_lifecycle_status_check,
  drop constraint if exists goals_resolution_status_check,
  drop constraint if exists goals_resolution_source_check,
  drop constraint if exists goals_punishment_pool_scope_check,
  drop constraint if exists goals_punishment_category_mode_check,
  drop constraint if exists goals_punishment_category_selection_check;

alter table public.goals
  add constraint goals_lifecycle_status_check
    check (lifecycle_status in ('active', 'paused', 'closed')),
  add constraint goals_resolution_status_check
    check (resolution_status in ('pending', 'passed', 'failed')),
  add constraint goals_resolution_source_check
    check (resolution_source is null or resolution_source in ('manual', 'expired')),
  add constraint goals_punishment_pool_scope_check
    check (punishment_pool_scope in ('base', 'personal', 'both')),
  add constraint goals_punishment_category_mode_check
    check (punishment_category_mode in ('all', 'selected')),
  add constraint goals_punishment_category_selection_check
    check (
      (punishment_category_mode = 'all' and coalesce(array_length(punishment_category_ids, 1), 0) = 0)
      or (punishment_category_mode = 'selected' and coalesce(array_length(punishment_category_ids, 1), 0) > 0)
    );

update public.goals
set active = (lifecycle_status = 'active')
where active is distinct from (lifecycle_status = 'active');

alter table public.goal_period_outcomes
  add column if not exists target_days integer,
  add column if not exists required_days integer,
  add column if not exists resolution_source text;

update public.goal_period_outcomes outcome_row
set target_days = goal_row.target_days,
    required_days = greatest(ceil((greatest(goal_row.target_days, 1)::numeric * goal_row.minimum_success_rate) / 100), 1)::integer,
    resolution_source = coalesce(outcome_row.resolution_source, 'expired')
from public.goals goal_row
where goal_row.id = outcome_row.goal_id
  and (
    outcome_row.target_days is null
    or outcome_row.required_days is null
    or outcome_row.resolution_source is null
  );

alter table public.goal_period_outcomes
  alter column target_days set not null,
  alter column required_days set not null,
  alter column resolution_source set not null;

alter table public.goal_period_outcomes
  drop constraint if exists goal_period_outcomes_target_days_check,
  drop constraint if exists goal_period_outcomes_required_days_check,
  drop constraint if exists goal_period_outcomes_resolution_source_check;

alter table public.goal_period_outcomes
  add constraint goal_period_outcomes_target_days_check
    check (target_days > 0),
  add constraint goal_period_outcomes_required_days_check
    check (required_days > 0 and required_days <= target_days),
  add constraint goal_period_outcomes_resolution_source_check
    check (resolution_source in ('manual', 'expired'));

create index if not exists goals_user_lifecycle_status_idx
  on public.goals (user_id, lifecycle_status, resolution_status, start_date);

create index if not exists goal_period_outcomes_goal_evaluated_at_idx
  on public.goal_period_outcomes (goal_id, evaluated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'goal_period_outcomes'
      and policyname = 'Users can insert their own goal period outcomes'
  ) then
    create policy "Users can insert their own goal period outcomes"
      on public.goal_period_outcomes
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'goal_period_outcomes'
      and policyname = 'Users can update their own goal period outcomes'
  ) then
    create policy "Users can update their own goal period outcomes"
      on public.goal_period_outcomes
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'goal_period_outcomes'
      and policyname = 'Users can delete their own goal period outcomes'
  ) then
    create policy "Users can delete their own goal period outcomes"
      on public.goal_period_outcomes
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

with latest_outcomes as (
  select distinct on (goal_id)
         goal_id,
         window_end,
         evaluated_at,
         passed,
         resolution_source
  from public.goal_period_outcomes
  order by goal_id, evaluated_at desc, id desc
)
update public.goals goal_row
set lifecycle_status = 'closed',
    active = false,
    closed_on = coalesce(goal_row.closed_on, latest_outcomes.window_end),
    resolved_at = coalesce(goal_row.resolved_at, latest_outcomes.evaluated_at),
    resolution_source = coalesce(goal_row.resolution_source, latest_outcomes.resolution_source),
    resolution_status = case when latest_outcomes.passed then 'passed' else 'failed' end
from latest_outcomes
where goal_row.id = latest_outcomes.goal_id;

drop function if exists public.evaluate_goal_period(uuid, date);

create or replace function public.evaluate_goal_period(
  p_goal_id uuid,
  p_reference_date date default current_date
)
returns table (
  goal_id uuid,
  period_key text,
  window_start date,
  window_end date,
  planned_days integer,
  required_days integer,
  completed_days integer,
  completion_rate integer,
  passed boolean
)
language plpgsql
security invoker
set search_path = public
as $function$
declare
  current_user_id uuid := auth.uid();
  selected_goal public.goals%rowtype;
  requested_date date := coalesce(p_reference_date, current_date);
  deadline date;
  raw_window_end date;
begin
  if current_user_id is null then
    raise exception 'Authenticated user is required.';
  end if;

  select *
  into selected_goal
  from public.goals
  where id = p_goal_id
    and user_id = current_user_id;

  if not found then
    raise exception 'Goal % was not found for the current user.', p_goal_id;
  end if;

  deadline := selected_goal.start_date + (greatest(selected_goal.target_days, 1) - 1);

  goal_id := selected_goal.id;
  window_start := selected_goal.start_date;
  raw_window_end := coalesce(selected_goal.closed_on, least(requested_date, deadline));
  window_end := case when raw_window_end < window_start then window_start else raw_window_end end;
  planned_days := greatest((window_end - window_start) + 1, 1);
  required_days := greatest(ceil((greatest(selected_goal.target_days, 1)::numeric * selected_goal.minimum_success_rate) / 100), 1)::integer;

  select count(*)
  into completed_days
  from public.checkins checkin_row
  where checkin_row.goal_id = selected_goal.id
    and checkin_row.user_id = current_user_id
    and checkin_row.checkin_date between window_start and window_end
    and checkin_row.status = 'completed';

  completion_rate := case
    when planned_days <= 0 then 0
    else round((completed_days::numeric / planned_days::numeric) * 100)::integer
  end;
  passed := completed_days >= required_days;
  period_key := selected_goal.id::text || ':' || window_start::text || ':' || window_end::text || ':' || planned_days::text;

  return next;
end;
$function$;

drop function if exists public.list_goal_evaluations(date);

create or replace function public.list_goal_evaluations(
  p_reference_date date default current_date
)
returns table (
  goal_id uuid,
  period_key text,
  window_start date,
  window_end date,
  planned_days integer,
  required_days integer,
  completed_days integer,
  completion_rate integer,
  passed boolean
)
language sql
security invoker
set search_path = public
as $function$
  with parameters as (
    select coalesce(p_reference_date, current_date) as reference_date
  ),
  latest_outcomes as (
    select distinct on (goal_id)
           goal_id,
           period_key,
           window_start,
           window_end,
           planned_days,
           required_days,
           completed_days,
           completion_rate,
           passed,
           evaluated_at,
           id
    from public.goal_period_outcomes
    where user_id = auth.uid()
    order by goal_id, evaluated_at desc, id desc
  )
  select goal_row.id as goal_id,
         case
           when goal_row.lifecycle_status = 'closed' and goal_row.resolution_status in ('passed', 'failed') and outcome_row.goal_id is not null then outcome_row.period_key
           else evaluation.period_key
         end as period_key,
         case
           when goal_row.lifecycle_status = 'closed' and goal_row.resolution_status in ('passed', 'failed') and outcome_row.goal_id is not null then outcome_row.window_start
           else evaluation.window_start
         end as window_start,
         case
           when goal_row.lifecycle_status = 'closed' and goal_row.resolution_status in ('passed', 'failed') and outcome_row.goal_id is not null then outcome_row.window_end
           else evaluation.window_end
         end as window_end,
         case
           when goal_row.lifecycle_status = 'closed' and goal_row.resolution_status in ('passed', 'failed') and outcome_row.goal_id is not null then outcome_row.planned_days
           else evaluation.planned_days
         end as planned_days,
         case
           when goal_row.lifecycle_status = 'closed' and goal_row.resolution_status in ('passed', 'failed') and outcome_row.goal_id is not null then outcome_row.required_days
           else evaluation.required_days
         end as required_days,
         case
           when goal_row.lifecycle_status = 'closed' and goal_row.resolution_status in ('passed', 'failed') and outcome_row.goal_id is not null then outcome_row.completed_days
           else evaluation.completed_days
         end as completed_days,
         case
           when goal_row.lifecycle_status = 'closed' and goal_row.resolution_status in ('passed', 'failed') and outcome_row.goal_id is not null then outcome_row.completion_rate
           else evaluation.completion_rate
         end as completion_rate,
         case
           when goal_row.lifecycle_status = 'closed' and goal_row.resolution_status in ('passed', 'failed') and outcome_row.goal_id is not null then outcome_row.passed
           else evaluation.passed
         end as passed
  from public.goals goal_row
  cross join parameters
  cross join lateral public.evaluate_goal_period(goal_row.id, parameters.reference_date) evaluation
  left join latest_outcomes outcome_row
    on outcome_row.goal_id = goal_row.id
  where goal_row.user_id = auth.uid()
  order by case goal_row.lifecycle_status
             when 'active' then 0
             when 'paused' then 1
             else 2
           end,
           goal_row.created_at desc,
           goal_row.id desc;
$function$;

drop function if exists public.list_home_goal_summaries(date);

create or replace function public.list_home_goal_summaries(
  p_reference_date date default current_date
)
returns table (
  goal_id uuid,
  title text,
  description text,
  active boolean,
  lifecycle_status text,
  resolution_status text,
  closed_on date,
  passed boolean,
  target_days integer,
  required_days integer,
  completed_days integer,
  completion_rate integer,
  current_streak integer,
  best_streak integer,
  today_status text,
  days_until_start integer,
  remaining_days integer
)
language sql
security invoker
set search_path = public
as $function$
  with parameters as (
    select coalesce(p_reference_date, current_date) as reference_date
  ),
  evaluations as (
    select *
    from public.list_goal_evaluations((select reference_date from parameters))
  )
  select goal_row.id as goal_id,
         goal_row.title,
         goal_row.description,
         goal_row.lifecycle_status = 'active' as active,
         goal_row.lifecycle_status,
         goal_row.resolution_status,
         goal_row.closed_on,
         case
           when goal_row.resolution_status = 'passed' then true
           when goal_row.resolution_status = 'failed' then false
           else evaluations.passed
         end as passed,
         goal_row.target_days,
         evaluations.required_days,
         evaluations.completed_days,
         evaluations.completion_rate,
         coalesce(current_streak_row.current_streak, 0)::integer as current_streak,
         coalesce(best_streak_row.best_streak, 0)::integer as best_streak,
         today_checkin.status as today_status,
         case
           when parameters.reference_date < goal_row.start_date then (goal_row.start_date - parameters.reference_date)
           else 0
         end::integer as days_until_start,
         case
           when goal_row.lifecycle_status = 'closed' then 0
           when parameters.reference_date > deadline_row.deadline_date then 0
           else (deadline_row.deadline_date - parameters.reference_date) + 1
         end::integer as remaining_days
  from public.goals goal_row
  join evaluations on evaluations.goal_id = goal_row.id
  cross join parameters
  cross join lateral (
    select goal_row.start_date + (greatest(goal_row.target_days, 1) - 1) as deadline_date
  ) deadline_row
  cross join lateral (
    select case
             when goal_row.closed_on is not null and goal_row.closed_on < parameters.reference_date then goal_row.closed_on
             else parameters.reference_date
           end as streak_reference_date
  ) streak_reference
  left join lateral (
    with recursive streak(day_date, streak_count) as (
      select streak_reference.streak_reference_date, 0
      union all
      select streak.day_date - 1, streak.streak_count + 1
      from streak
      where exists (
        select 1
        from public.checkins checkin_row
        where checkin_row.goal_id = goal_row.id
          and checkin_row.user_id = goal_row.user_id
          and checkin_row.checkin_date = streak.day_date
          and checkin_row.status = 'completed'
      )
    )
    select max(streak_count) as current_streak
    from streak
  ) current_streak_row on true
  left join lateral (
    select max(streak_group_lengths.streak_length) as best_streak
    from (
      select count(*) as streak_length
      from (
        select checkin_row.checkin_date,
               checkin_row.checkin_date - (row_number() over (order by checkin_row.checkin_date))::integer as streak_group
        from public.checkins checkin_row
        where checkin_row.goal_id = goal_row.id
          and checkin_row.user_id = goal_row.user_id
          and checkin_row.status = 'completed'
      ) completed_checkins
      group by completed_checkins.streak_group
    ) streak_group_lengths
  ) best_streak_row on true
  left join lateral (
    select checkin_row.status
    from public.checkins checkin_row
    where checkin_row.goal_id = goal_row.id
      and checkin_row.user_id = goal_row.user_id
      and checkin_row.checkin_date = parameters.reference_date
    limit 1
  ) today_checkin on true
  where goal_row.user_id = auth.uid()
  order by case goal_row.lifecycle_status
             when 'active' then 0
             when 'paused' then 1
             else 2
           end,
           goal_row.created_at desc,
           goal_row.id desc;
$function$;

drop function if exists public.get_home_summary();

create or replace function public.get_home_summary()
returns table (
  active_goals_count integer,
  pending_punishments_count integer,
  latest_pending_assigned_id uuid,
  latest_pending_goal_id uuid,
  latest_pending_punishment_id uuid,
  latest_pending_due_date date,
  latest_pending_status text,
  latest_punishment_title text,
  latest_punishment_description text,
  latest_punishment_category_id uuid,
  latest_punishment_category_name text,
  latest_punishment_difficulty smallint,
  latest_punishment_scope text
)
language sql
security invoker
set search_path = public
as $function$
  with current_user as (
    select auth.uid() as user_id
  )
  select coalesce((
           select count(*)
           from public.goals goal_row
           where goal_row.user_id = current_user.user_id
             and goal_row.lifecycle_status = 'active'
         ), 0)::integer as active_goals_count,
         coalesce((
           select count(*)
           from public.assigned_punishments assigned_row
           where assigned_row.user_id = current_user.user_id
             and assigned_row.status = 'pending'
         ), 0)::integer as pending_punishments_count,
         latest_pending.id as latest_pending_assigned_id,
         latest_pending.goal_id as latest_pending_goal_id,
         latest_pending.punishment_id as latest_pending_punishment_id,
         latest_pending.due_date as latest_pending_due_date,
         latest_pending.status as latest_pending_status,
         latest_pending.title as latest_punishment_title,
         latest_pending.description as latest_punishment_description,
         latest_pending.category_id as latest_punishment_category_id,
         latest_pending.category_name as latest_punishment_category_name,
         latest_pending.difficulty as latest_punishment_difficulty,
         latest_pending.scope as latest_punishment_scope
  from current_user
  left join lateral (
    select assigned_row.id,
           assigned_row.goal_id,
           assigned_row.punishment_id,
           assigned_row.due_date,
           assigned_row.status,
           punishment_row.title,
           punishment_row.description,
           punishment_row.category as category_id,
           category_row.name as category_name,
           punishment_row.difficulty,
           case when punishment_row.owner_id is null then 'base' else 'personal' end as scope
    from public.assigned_punishments assigned_row
    join public.punishments punishment_row on punishment_row.id = assigned_row.punishment_id
    join public.categories category_row on category_row.id = punishment_row.category
    where assigned_row.user_id = current_user.user_id
      and assigned_row.status = 'pending'
    order by assigned_row.assigned_at desc, assigned_row.id desc
    limit 1
  ) latest_pending on true;
$function$;

drop function if exists public.get_stats_summary(date);

create or replace function public.get_stats_summary(
  p_reference_date date default current_date
)
returns table (
  average_rate integer,
  completion_ratio integer,
  goals_active_count integer,
  completed_punishments integer,
  total_checkins bigint
)
language sql
security invoker
set search_path = public
as $function$
  with parameters as (
    select auth.uid() as user_id,
           coalesce(p_reference_date, current_date) as reference_date
  ),
  evaluation_rows as (
    select evaluation.completion_rate
    from parameters
    cross join lateral public.list_goal_evaluations(parameters.reference_date) evaluation
  ),
  checkin_rows as (
    select checkin_row.status
    from public.checkins checkin_row
    join parameters on parameters.user_id = checkin_row.user_id
  ),
  punishment_rows as (
    select assigned_row.status
    from public.assigned_punishments assigned_row
    join parameters on parameters.user_id = assigned_row.user_id
  )
  select coalesce(round(avg(evaluation_rows.completion_rate))::integer, 0) as average_rate,
         coalesce((
           select round((count(*) filter (where checkin_rows.status = 'completed')::numeric / nullif(count(*), 0)::numeric) * 100)::integer
           from checkin_rows
         ), 0) as completion_ratio,
         coalesce((
           select count(*)
           from public.goals goal_row
           join parameters on parameters.user_id = goal_row.user_id
           where goal_row.lifecycle_status = 'active'
         ), 0)::integer as goals_active_count,
         coalesce((
           select count(*)
           from punishment_rows
           where punishment_rows.status = 'completed'
         ), 0)::integer as completed_punishments,
         coalesce((
           select count(*)
           from checkin_rows
         ), 0)::bigint as total_checkins
  from evaluation_rows;
$function$;

drop function if exists public.list_goal_period_outcomes(uuid, integer);

create or replace function public.list_goal_period_outcomes(
  p_goal_id uuid default null,
  p_limit integer default 30
)
returns table (
  id uuid,
  goal_id uuid,
  period_key text,
  window_start date,
  window_end date,
  planned_days integer,
  target_days integer,
  required_days integer,
  completed_days integer,
  completion_rate integer,
  minimum_success_rate numeric,
  passed boolean,
  assigned_punishment_id uuid,
  resolution_source text,
  evaluated_at timestamp with time zone
)
language sql
security invoker
set search_path = public
as $function$
  select outcome_row.id,
         outcome_row.goal_id,
         outcome_row.period_key,
         outcome_row.window_start,
         outcome_row.window_end,
         outcome_row.planned_days,
         outcome_row.target_days,
         outcome_row.required_days,
         outcome_row.completed_days,
         outcome_row.completion_rate,
         outcome_row.minimum_success_rate,
         outcome_row.passed,
         outcome_row.assigned_punishment_id,
         outcome_row.resolution_source,
         outcome_row.evaluated_at
  from public.goal_period_outcomes outcome_row
  where outcome_row.user_id = auth.uid()
    and (p_goal_id is null or outcome_row.goal_id = p_goal_id)
  order by outcome_row.window_end desc, outcome_row.evaluated_at desc, outcome_row.id desc
  limit greatest(coalesce(p_limit, 30), 1);
$function$;

drop function if exists public.record_goal_checkin(uuid, text, text, date);
drop function if exists public.record_goal_checkin(uuid, text, date);

create or replace function public.record_goal_checkin(
  p_goal_id uuid,
  p_status text,
  p_checkin_date date default current_date
)
returns table(
  checkin_id uuid,
  checkin_goal_id uuid,
  checkin_date date,
  checkin_status text,
  checkin_created_at timestamp with time zone,
  evaluation_goal_id uuid,
  evaluation_period_key text,
  evaluation_window_start date,
  evaluation_window_end date,
  evaluation_planned_days integer,
  evaluation_required_days integer,
  evaluation_completed_days integer,
  evaluation_completion_rate integer,
  evaluation_passed boolean,
  assigned_punishment_id uuid,
  assigned_punishment_goal_id uuid,
  assigned_punishment_punishment_id uuid,
  assigned_punishment_assigned_at timestamp with time zone,
  assigned_punishment_due_date date,
  assigned_punishment_status text,
  assigned_punishment_completed_at timestamp with time zone,
  assigned_punishment_period_key text
)
language plpgsql
security invoker
set search_path = public
as $function$
declare
  current_user_id uuid := auth.uid();
  selected_goal public.goals%rowtype;
  saved_checkin public.checkins%rowtype;
  evaluation_row record;
  effective_checkin_date date := coalesce(p_checkin_date, current_date);
begin
  if current_user_id is null then
    raise exception 'Authenticated user is required.';
  end if;

  if p_status not in ('completed', 'missed') then
    raise exception 'Unsupported check-in status: %.', p_status;
  end if;

  select *
  into selected_goal
  from public.goals
  where id = p_goal_id
    and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Goal % was not found for the current user.', p_goal_id;
  end if;

  if selected_goal.lifecycle_status <> 'active' then
    raise exception 'Goal % is not active and cannot receive check-ins.', p_goal_id;
  end if;

  insert into public.checkins (
    user_id,
    goal_id,
    checkin_date,
    status
  )
  values (
    current_user_id,
    p_goal_id,
    effective_checkin_date,
    p_status
  )
  on conflict on constraint checkins_goal_date_unique do update
    set status = excluded.status
  returning *
  into saved_checkin;

  select *
  into evaluation_row
  from public.evaluate_goal_period(p_goal_id, effective_checkin_date);

  return query
  select saved_checkin.id,
         saved_checkin.goal_id,
         saved_checkin.checkin_date,
         saved_checkin.status,
         saved_checkin.created_at,
         evaluation_row.goal_id,
         evaluation_row.period_key,
         evaluation_row.window_start,
         evaluation_row.window_end,
         evaluation_row.planned_days,
         evaluation_row.required_days,
         evaluation_row.completed_days,
         evaluation_row.completion_rate,
         evaluation_row.passed,
         null::uuid,
         null::uuid,
         null::uuid,
         null::timestamp with time zone,
         null::date,
         null::text,
         null::timestamp with time zone,
         null::text;
end;
$function$;

revoke all on function public.evaluate_goal_period(uuid, date) from public;
revoke all on function public.list_goal_evaluations(date) from public;
revoke all on function public.list_home_goal_summaries(date) from public;
revoke all on function public.get_home_summary() from public;
revoke all on function public.get_stats_summary(date) from public;
revoke all on function public.list_goal_period_outcomes(uuid, integer) from public;
revoke all on function public.record_goal_checkin(uuid, text, date) from public;

grant execute on function public.evaluate_goal_period(uuid, date) to authenticated, service_role;
grant execute on function public.list_goal_evaluations(date) to authenticated, service_role;
grant execute on function public.list_home_goal_summaries(date) to authenticated, service_role;
grant execute on function public.get_home_summary() to authenticated, service_role;
grant execute on function public.get_stats_summary(date) to authenticated, service_role;
grant execute on function public.list_goal_period_outcomes(uuid, integer) to authenticated, service_role;
grant execute on function public.record_goal_checkin(uuid, text, date) to authenticated, service_role;
