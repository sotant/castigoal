set check_function_bodies = off;

create table if not exists public.goal_period_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  period_key text not null,
  window_start date not null,
  window_end date not null,
  planned_days integer not null check (planned_days > 0),
  completed_days integer not null check (completed_days >= 0),
  completion_rate integer not null check (completion_rate >= 0 and completion_rate <= 100),
  minimum_success_rate numeric not null check (minimum_success_rate > 0 and minimum_success_rate <= 100),
  passed boolean not null,
  assigned_punishment_id uuid null references public.assigned_punishments(id) on delete set null,
  evaluated_at timestamp with time zone not null default timezone('utc', now()),
  constraint goal_period_outcomes_goal_user_fkey
    foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade,
  constraint goal_period_outcomes_goal_period_unique unique (goal_id, period_key)
);

create index if not exists goal_period_outcomes_user_window_end_idx
  on public.goal_period_outcomes(user_id, window_end desc);

create index if not exists goal_period_outcomes_goal_window_end_idx
  on public.goal_period_outcomes(goal_id, window_end desc);

alter table public.goal_period_outcomes enable row level security;

create policy "Users can read their own goal period outcomes"
  on public.goal_period_outcomes
  for select
  to authenticated
  using (auth.uid() = user_id);

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
  completed_days integer,
  completion_rate integer,
  minimum_success_rate numeric,
  passed boolean,
  assigned_punishment_id uuid,
  evaluated_at timestamp with time zone
)
language sql
security invoker
set search_path = public
as $$
  select outcome_row.id,
         outcome_row.goal_id,
         outcome_row.period_key,
         outcome_row.window_start,
         outcome_row.window_end,
         outcome_row.planned_days,
         outcome_row.completed_days,
         outcome_row.completion_rate,
         outcome_row.minimum_success_rate,
         outcome_row.passed,
         outcome_row.assigned_punishment_id,
         outcome_row.evaluated_at
  from public.goal_period_outcomes outcome_row
  where outcome_row.user_id = auth.uid()
    and (p_goal_id is null or outcome_row.goal_id = p_goal_id)
  order by outcome_row.window_end desc, outcome_row.evaluated_at desc, outcome_row.id desc
  limit greatest(coalesce(p_limit, 30), 1);
$$;

create or replace function public.record_goal_checkin(p_goal_id uuid, p_status text, p_note text default null::text, p_checkin_date date default current_date)
returns table(
  checkin_id uuid,
  checkin_goal_id uuid,
  checkin_date date,
  checkin_status text,
  checkin_note text,
  checkin_created_at timestamp with time zone,
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
  assigned_punishment_assigned_at timestamp with time zone,
  assigned_punishment_due_date date,
  assigned_punishment_status text,
  assigned_punishment_completed_at timestamp with time zone,
  assigned_punishment_period_key text
)
language plpgsql
set search_path to 'public'
as $function$
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

  if effective_checkin_date >= deadline then
    insert into public.goal_period_outcomes (
      user_id,
      goal_id,
      period_key,
      window_start,
      window_end,
      planned_days,
      completed_days,
      completion_rate,
      minimum_success_rate,
      passed,
      assigned_punishment_id,
      evaluated_at
    )
    values (
      current_user_id,
      p_goal_id,
      evaluation_row.period_key,
      evaluation_row.window_start,
      evaluation_row.window_end,
      evaluation_row.planned_days,
      evaluation_row.completed_days,
      evaluation_row.completion_rate,
      selected_goal.minimum_success_rate,
      evaluation_row.passed,
      selected_assigned_punishment.id,
      timezone('utc', now())
    )
    on conflict on constraint goal_period_outcomes_goal_period_unique do update
      set window_start = excluded.window_start,
          window_end = excluded.window_end,
          planned_days = excluded.planned_days,
          completed_days = excluded.completed_days,
          completion_rate = excluded.completion_rate,
          minimum_success_rate = excluded.minimum_success_rate,
          passed = excluded.passed,
          assigned_punishment_id = coalesce(public.goal_period_outcomes.assigned_punishment_id, excluded.assigned_punishment_id),
          evaluated_at = excluded.evaluated_at;
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
$function$;

revoke all on function public.list_goal_period_outcomes(uuid, integer) from public;
grant execute on function public.list_goal_period_outcomes(uuid, integer) to authenticated, service_role;