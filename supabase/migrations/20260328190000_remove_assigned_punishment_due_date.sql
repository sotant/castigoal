set check_function_bodies = off;

drop function if exists public.get_home_summary();
drop function if exists public.list_pending_punishments();
drop function if exists public.record_goal_checkin(uuid, text, text, date);
drop function if exists public.record_goal_checkin(uuid, text, date);

alter table public.assigned_punishments
  drop column if exists due_date;

create or replace function public.get_home_summary()
returns table (
  active_goals_count integer,
  pending_punishments_count integer,
  latest_pending_assigned_id uuid,
  latest_pending_goal_id uuid,
  latest_pending_punishment_id uuid,
  latest_pending_status text,
  latest_punishment_title text,
  latest_punishment_description text,
  latest_punishment_category_id uuid,
  latest_punishment_category_name text,
  latest_punishment_difficulty smallint,
  latest_punishment_created_at timestamp with time zone,
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
         latest_pending.status as latest_pending_status,
         latest_pending.title as latest_punishment_title,
         latest_pending.description as latest_punishment_description,
         latest_pending.category_id as latest_punishment_category_id,
         latest_pending.category_name as latest_punishment_category_name,
         latest_pending.difficulty as latest_punishment_difficulty,
         latest_pending.created_at as latest_punishment_created_at,
         latest_pending.scope as latest_punishment_scope
  from current_user
  left join lateral (
    select assigned_row.id,
           assigned_row.goal_id,
           assigned_row.punishment_id,
           assigned_row.status,
           punishment_row.title,
           punishment_row.description,
           punishment_row.category as category_id,
           category_row.name as category_name,
           punishment_row.difficulty,
           punishment_row.created_at,
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

create or replace function public.list_pending_punishments()
returns table (
  assigned_id uuid,
  goal_id uuid,
  goal_title text,
  punishment_id uuid,
  punishment_title text,
  punishment_description text,
  punishment_category_id uuid,
  punishment_category_name text,
  punishment_difficulty smallint,
  punishment_scope text,
  assigned_at timestamp with time zone,
  status text
)
language sql
security invoker
set search_path = public
as $function$
  select assigned_row.id as assigned_id,
         assigned_row.goal_id,
         goal_row.title as goal_title,
         punishment_row.id as punishment_id,
         punishment_row.title as punishment_title,
         punishment_row.description as punishment_description,
         punishment_row.category as punishment_category_id,
         category_row.name as punishment_category_name,
         punishment_row.difficulty as punishment_difficulty,
         case when punishment_row.owner_id is null then 'base' else 'personal' end as punishment_scope,
         assigned_row.assigned_at,
         assigned_row.status
  from public.assigned_punishments assigned_row
  inner join public.goals goal_row on goal_row.id = assigned_row.goal_id
  inner join public.punishments punishment_row on punishment_row.id = assigned_row.punishment_id
  inner join public.categories category_row on category_row.id = punishment_row.category
  where assigned_row.user_id = auth.uid()
    and assigned_row.status = 'pending'
  order by assigned_row.assigned_at desc, assigned_row.id desc;
$function$;

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
         null::text,
         null::timestamp with time zone,
         null::text;
end;
$function$;

revoke all on function public.get_home_summary() from public;
revoke all on function public.list_pending_punishments() from public;
revoke all on function public.record_goal_checkin(uuid, text, date) from public;

grant execute on function public.get_home_summary() to authenticated, service_role;
grant execute on function public.list_pending_punishments() to authenticated, service_role;
grant execute on function public.record_goal_checkin(uuid, text, date) to authenticated, service_role;
