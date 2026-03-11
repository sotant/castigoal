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
