set check_function_bodies = off;

update public.goals
set frequency = 'daily'
where frequency <> 'daily';

alter table public.goals
  alter column frequency set default 'daily';

alter table public.goals
  drop constraint if exists goals_frequency_check;

alter table public.goals
  add constraint goals_frequency_daily_only
  check (frequency = 'daily');

alter table public.punishments
  alter column is_custom set default false;

alter table public.punishments
  add constraint punishments_catalog_consistency_check
  check (
    (owner_id is null and is_custom = false and category <> 'custom')
    or (owner_id is not null and is_custom = true and category = 'custom')
  );

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
  latest_punishment_category text,
  latest_punishment_difficulty smallint,
  latest_punishment_scope text
)
language sql
security invoker
set search_path = public
as $$
  with current_user as (
    select auth.uid() as user_id
  )
  select coalesce((
           select count(*)
           from public.goals goal_row
           where goal_row.user_id = current_user.user_id
             and goal_row.active
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
         latest_pending.category as latest_punishment_category,
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
           punishment_row.category,
           punishment_row.difficulty,
           case when punishment_row.owner_id is null then 'base' else 'personal' end as scope
    from public.assigned_punishments assigned_row
    join public.punishments punishment_row on punishment_row.id = assigned_row.punishment_id
    where assigned_row.user_id = current_user.user_id
      and assigned_row.status = 'pending'
    order by assigned_row.assigned_at desc, assigned_row.id desc
    limit 1
  ) latest_pending on true;
$$;

create or replace function public.list_home_goal_summaries(
  p_reference_date date default current_date
)
returns table (
  goal_id uuid,
  title text,
  description text,
  active boolean,
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
as $$
  with parameters as (
    select coalesce(p_reference_date, current_date) as reference_date
  )
  select goal_row.id as goal_id,
         goal_row.title,
         goal_row.description,
         goal_row.active,
         evaluation.completion_rate,
         coalesce(current_streak_row.current_streak, 0)::integer as current_streak,
         coalesce(best_streak_row.best_streak, 0)::integer as best_streak,
         today_checkin.status as today_status,
         case
           when parameters.reference_date < goal_row.start_date then (goal_row.start_date - parameters.reference_date)
           else 0
         end::integer as days_until_start,
         case
           when parameters.reference_date > deadline_row.deadline_date then 0
           else (deadline_row.deadline_date - parameters.reference_date) + 1
         end::integer as remaining_days
  from public.goals goal_row
  cross join parameters
  cross join lateral (
    select goal_row.start_date + (greatest(goal_row.target_days, 1) - 1) as deadline_date
  ) deadline_row
  cross join lateral public.evaluate_goal_period(goal_row.id, parameters.reference_date) evaluation
  left join lateral (
    with recursive streak(day_date, streak_count) as (
      select parameters.reference_date, 0
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
  order by goal_row.active desc, goal_row.created_at desc, goal_row.id desc;
$$;

create or replace function public.get_stats_summary(
  p_reference_date date default current_date
)
returns table (
  average_rate integer,
  completion_ratio integer,
  goals_active_count integer,
  completed_punishments integer
)
language sql
security invoker
set search_path = public
as $$
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
           where goal_row.active
         ), 0)::integer as goals_active_count,
         coalesce((
           select count(*)
           from punishment_rows
           where punishment_rows.status = 'completed'
         ), 0)::integer as completed_punishments
  from evaluation_rows;
$$;

create or replace function public.get_goal_calendar_month(
  p_goal_id uuid,
  p_month_start date default current_date
)
returns table (
  date text,
  day_number integer,
  in_month boolean,
  status text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_goal public.goals%rowtype;
  month_start date := date_trunc('month', coalesce(p_month_start, current_date))::date;
  month_end date := (date_trunc('month', coalesce(p_month_start, current_date)) + interval '1 month - 1 day')::date;
  leading_days integer := extract(isodow from date_trunc('month', coalesce(p_month_start, current_date)))::integer - 1;
  total_cells integer;
  grid_start date;
begin
  if current_user_id is null then
    raise exception 'Authenticated user is required.';
  end if;

  select *
  into selected_goal
  from public.goals goal_row
  where goal_row.id = p_goal_id
    and goal_row.user_id = current_user_id;

  if not found then
    raise exception 'Goal % was not found for the current user.', p_goal_id;
  end if;

  total_cells := ceil((leading_days + extract(day from month_end)::integer)::numeric / 7) * 7;
  grid_start := month_start - leading_days;

  return query
  select calendar_day.calendar_date::text as date,
         extract(day from calendar_day.calendar_date)::integer as day_number,
         date_trunc('month', calendar_day.calendar_date) = date_trunc('month', month_start) as in_month,
         checkin_row.status
  from (
    select grid_start + offset_index as calendar_date
    from generate_series(0, total_cells - 1) offset_index
  ) calendar_day
  left join public.checkins checkin_row
    on checkin_row.goal_id = selected_goal.id
   and checkin_row.user_id = current_user_id
   and checkin_row.checkin_date = calendar_day.calendar_date
  order by calendar_day.calendar_date;
end;
$$;

create or replace function public.list_punishment_catalog()
returns table (
  id uuid,
  title text,
  description text,
  category text,
  difficulty smallint,
  scope text
)
language sql
security invoker
set search_path = public
as $$
  select punishment_row.id,
         punishment_row.title,
         punishment_row.description,
         punishment_row.category,
         punishment_row.difficulty,
         case when punishment_row.owner_id is null then 'base' else 'personal' end as scope
  from public.punishments punishment_row
  where punishment_row.owner_id is null
     or punishment_row.owner_id = auth.uid()
  order by case when punishment_row.owner_id is null then 1 else 0 end,
           punishment_row.created_at desc,
           punishment_row.id desc;
$$;

revoke all on function public.get_home_summary() from public;
revoke all on function public.list_home_goal_summaries(date) from public;
revoke all on function public.get_stats_summary(date) from public;
revoke all on function public.get_goal_calendar_month(uuid, date) from public;
revoke all on function public.list_punishment_catalog() from public;

grant execute on function public.get_home_summary() to authenticated, service_role;
grant execute on function public.list_home_goal_summaries(date) to authenticated, service_role;
grant execute on function public.get_stats_summary(date) to authenticated, service_role;
grant execute on function public.get_goal_calendar_month(uuid, date) to authenticated, service_role;
grant execute on function public.list_punishment_catalog() to authenticated, service_role;
