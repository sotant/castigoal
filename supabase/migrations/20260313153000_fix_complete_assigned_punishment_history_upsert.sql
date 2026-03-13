set check_function_bodies = off;

create or replace function public.complete_assigned_punishment(p_assigned_id uuid)
returns public.assigned_punishments
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_assigned public.assigned_punishments%rowtype;
  selected_punishment public.punishments%rowtype;
  effective_completed_at timestamp with time zone;
  history_row_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authenticated user is required.';
  end if;

  select assigned_row.*
  into selected_assigned
  from public.assigned_punishments assigned_row
  where assigned_row.id = p_assigned_id
    and assigned_row.user_id = current_user_id
  for update;

  if not found then
    raise exception 'Assigned punishment % was not found for the current user.', p_assigned_id;
  end if;

  select punishment_row.*
  into selected_punishment
  from public.punishments punishment_row
  where punishment_row.id = selected_assigned.punishment_id;

  if not found then
    raise exception 'Punishment % does not exist.', selected_assigned.punishment_id;
  end if;

  effective_completed_at := coalesce(selected_assigned.completed_at, timezone('utc', now()));

  update public.assigned_punishments assigned_row
  set status = 'completed',
      completed_at = effective_completed_at
  where assigned_row.id = selected_assigned.id
  returning *
  into selected_assigned;

  select history_row.id
  into history_row_id
  from public.punishment_completion_history history_row
  where history_row.assigned_punishment_id = selected_assigned.id;

  if history_row_id is null then
    insert into public.punishment_completion_history (
      user_id,
      assigned_punishment_id,
      goal_id,
      punishment_id,
      punishment_title,
      punishment_description,
      completed_at
    )
    values (
      current_user_id,
      selected_assigned.id,
      selected_assigned.goal_id,
      selected_assigned.punishment_id,
      selected_punishment.title,
      selected_punishment.description,
      effective_completed_at
    );
  else
    update public.punishment_completion_history history_row
    set goal_id = selected_assigned.goal_id,
        punishment_id = selected_assigned.punishment_id,
        punishment_title = selected_punishment.title,
        punishment_description = selected_punishment.description,
        completed_at = effective_completed_at
    where history_row.id = history_row_id;
  end if;

  return selected_assigned;
end;
$$;

revoke all on function public.complete_assigned_punishment(uuid) from public;
grant execute on function public.complete_assigned_punishment(uuid) to authenticated, service_role;
