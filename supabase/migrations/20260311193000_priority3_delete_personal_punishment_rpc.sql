set check_function_bodies = off;

create or replace function public.delete_personal_punishment(p_punishment_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not exists (
    select 1
    from public.punishments punishment_row
    where punishment_row.id = p_punishment_id
      and punishment_row.owner_id = current_user_id
      and punishment_row.is_custom = true
  ) then
    raise exception 'Personal punishment % was not found for the current user.', p_punishment_id;
  end if;

  if exists (
    select 1
    from public.assigned_punishments assigned_row
    where assigned_row.punishment_id = p_punishment_id
    limit 1
  ) then
    raise exception 'Cannot delete a personal punishment that is already assigned.';
  end if;

  delete from public.punishments punishment_row
  where punishment_row.id = p_punishment_id
    and punishment_row.owner_id = current_user_id
    and punishment_row.is_custom = true;

  return p_punishment_id;
end;
$$;

revoke all on function public.delete_personal_punishment(uuid) from public;
grant execute on function public.delete_personal_punishment(uuid) to authenticated, service_role;