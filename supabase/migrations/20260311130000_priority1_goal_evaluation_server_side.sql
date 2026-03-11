set check_function_bodies = off;

alter table public.goals
  add constraint goals_id_user_id_unique unique (id, user_id);

alter table public.punishments
  add constraint punishments_id_owner_id_unique unique (id, owner_id);

alter table public.checkins
  add constraint checkins_goal_user_id_fkey
    foreign key (goal_id, user_id)
    references public.goals (id, user_id)
    on delete cascade;

alter table public.assigned_punishments
  add constraint assigned_punishments_goal_user_id_fkey
    foreign key (goal_id, user_id)
    references public.goals (id, user_id)
    on delete cascade;

create index assigned_punishments_punishment_id_idx
  on public.assigned_punishments (punishment_id);

create or replace function public.validate_assigned_punishment_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  linked_punishment public.punishments%rowtype;
begin
  select *
  into linked_punishment
  from public.punishments
  where id = new.punishment_id;

  if not found then
    raise exception 'Punishment % does not exist.', new.punishment_id;
  end if;

  if linked_punishment.owner_id is not null and linked_punishment.owner_id <> new.user_id then
    raise exception 'Punishment % does not belong to user %.', new.punishment_id, new.user_id;
  end if;

  return new;
end;
$$;

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
  completed_days integer,
  completion_rate integer,
  passed boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_goal public.goals%rowtype;
  requested_date date := coalesce(p_reference_date, current_date);
  deadline date;
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
  window_end := least(requested_date, deadline);
  planned_days := greatest((window_end - window_start) + 1, 1);

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
  passed := completion_rate >= selected_goal.minimum_success_rate;
  period_key := selected_goal.id::text || ':' || window_start::text || ':' || window_end::text || ':' || planned_days::text;

  return next;
end;
$$;

create or replace function public.list_goal_evaluations(
  p_reference_date date default current_date
)
returns table (
  goal_id uuid,
  period_key text,
  window_start date,
  window_end date,
  planned_days integer,
  completed_days integer,
  completion_rate integer,
  passed boolean
)
language sql
security invoker
set search_path = public
as $$
  select evaluation.goal_id,
         evaluation.period_key,
         evaluation.window_start,
         evaluation.window_end,
         evaluation.planned_days,
         evaluation.completed_days,
         evaluation.completion_rate,
         evaluation.passed
  from public.goals goal_row
  cross join lateral public.evaluate_goal_period(goal_row.id, coalesce(p_reference_date, current_date)) as evaluation
  where goal_row.user_id = auth.uid()
  order by goal_row.created_at desc, goal_row.id desc;
$$;

create or replace function public.record_goal_checkin(
  p_goal_id uuid,
  p_status text,
  p_note text default null,
  p_checkin_date date default current_date
)
returns table (
  checkin_id uuid,
  checkin_goal_id uuid,
  checkin_date date,
  checkin_status text,
  checkin_note text,
  checkin_created_at timestamptz,
  evaluation_goal_id uuid,
  evaluation_period_key text,
  evaluation_window_start date,
  evaluation_window_end date,
  evaluation_planned_days integer,
  evaluation_completed_days integer,
  evaluation_completion_rate integer,
  evaluation_passed boolean,
  assigned_punishment_id uuid,
  assigned_punishment_goal_id uuid,
  assigned_punishment_punishment_id uuid,
  assigned_punishment_assigned_at timestamptz,
  assigned_punishment_due_date date,
  assigned_punishment_status text,
  assigned_punishment_completed_at timestamptz,
  assigned_punishment_period_key text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_goal public.goals%rowtype;
  saved_checkin public.checkins%rowtype;
  evaluation_row record;
  selected_assigned_punishment public.assigned_punishments%rowtype;
  selected_punishment_id uuid;
  available_punishments_count integer;
  numeric_seed integer := 0;
  deadline date;
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

  if not selected_goal.active then
    raise exception 'Goal % is paused and cannot receive check-ins.', p_goal_id;
  end if;

  insert into public.checkins (
    user_id,
    goal_id,
    checkin_date,
    status,
    note
  )
  values (
    current_user_id,
    p_goal_id,
    effective_checkin_date,
    p_status,
    nullif(trim(coalesce(p_note, '')), '')
  )
  on conflict on constraint checkins_goal_date_unique do update
    set status = excluded.status,
        note = excluded.note
  returning *
  into saved_checkin;

  select *
  into evaluation_row
  from public.evaluate_goal_period(p_goal_id, effective_checkin_date);

  deadline := selected_goal.start_date + (greatest(selected_goal.target_days, 1) - 1);

  if effective_checkin_date >= deadline and not evaluation_row.passed then
    select assigned_row.*
    into selected_assigned_punishment
    from public.assigned_punishments assigned_row
    where assigned_row.goal_id = p_goal_id
      and assigned_row.user_id = current_user_id
      and assigned_row.period_key = evaluation_row.period_key;

    if not found then
      select count(*)
      into available_punishments_count
      from public.punishments punishment_row
      where punishment_row.owner_id is null
         or punishment_row.owner_id = current_user_id;

      if available_punishments_count > 0 then
        select coalesce(sum(ascii(substr(evaluation_row.period_key, character_index, 1))), 0)
        into numeric_seed
        from generate_series(1, char_length(evaluation_row.period_key)) as character_index;

        select punishment_choice.id
        into selected_punishment_id
        from (
          select punishment_row.id,
                 row_number() over (order by punishment_row.created_at desc, punishment_row.id desc) - 1 as zero_based_position
          from public.punishments punishment_row
          where punishment_row.owner_id is null
             or punishment_row.owner_id = current_user_id
        ) as punishment_choice
        where punishment_choice.zero_based_position = mod(numeric_seed, available_punishments_count);

        insert into public.assigned_punishments (
          user_id,
          goal_id,
          punishment_id,
          assigned_at,
          due_date,
          status,
          completed_at,
          period_key
        )
        values (
          current_user_id,
          p_goal_id,
          selected_punishment_id,
          timezone('utc', now()),
          evaluation_row.window_end + 1,
          'pending',
          null,
          evaluation_row.period_key
        )
        on conflict on constraint assigned_punishments_goal_period_unique do nothing
        returning *
        into selected_assigned_punishment;

        if not found then
          select assigned_row.*
          into selected_assigned_punishment
          from public.assigned_punishments assigned_row
          where assigned_row.goal_id = p_goal_id
            and assigned_row.user_id = current_user_id
            and assigned_row.period_key = evaluation_row.period_key;
        end if;
      end if;
    end if;
  end if;

  return query
  select saved_checkin.id,
         saved_checkin.goal_id,
         saved_checkin.checkin_date,
         saved_checkin.status,
         saved_checkin.note,
         saved_checkin.created_at,
         evaluation_row.goal_id,
         evaluation_row.period_key,
         evaluation_row.window_start,
         evaluation_row.window_end,
         evaluation_row.planned_days,
         evaluation_row.completed_days,
         evaluation_row.completion_rate,
         evaluation_row.passed,
         selected_assigned_punishment.id,
         selected_assigned_punishment.goal_id,
         selected_assigned_punishment.punishment_id,
         selected_assigned_punishment.assigned_at,
         selected_assigned_punishment.due_date,
         selected_assigned_punishment.status,
         selected_assigned_punishment.completed_at,
         selected_assigned_punishment.period_key;
end;
$$;

drop trigger if exists assigned_punishments_validate_links on public.assigned_punishments;

create trigger assigned_punishments_validate_links
before insert or update on public.assigned_punishments
for each row
execute function public.validate_assigned_punishment_links();

revoke all on function public.evaluate_goal_period(uuid, date) from public;
revoke all on function public.list_goal_evaluations(date) from public;
revoke all on function public.record_goal_checkin(uuid, text, text, date) from public;

grant execute on function public.evaluate_goal_period(uuid, date) to authenticated, service_role;
grant execute on function public.list_goal_evaluations(date) to authenticated, service_role;
grant execute on function public.record_goal_checkin(uuid, text, text, date) to authenticated, service_role;
