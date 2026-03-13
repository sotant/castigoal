set check_function_bodies = off;

create table if not exists public.punishment_completion_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_punishment_id uuid null references public.assigned_punishments(id) on delete set null,
  goal_id uuid null references public.goals(id) on delete set null,
  punishment_id uuid null references public.punishments(id) on delete set null,
  punishment_title text not null,
  punishment_description text not null,
  completed_at timestamp with time zone not null default timezone('utc', now()),
  created_at timestamp with time zone not null default timezone('utc', now())
);

create unique index if not exists punishment_completion_history_assigned_unique
  on public.punishment_completion_history(assigned_punishment_id)
  where assigned_punishment_id is not null;

create index if not exists punishment_completion_history_user_completed_idx
  on public.punishment_completion_history(user_id, completed_at desc);

alter table public.punishment_completion_history enable row level security;

create policy "Users can read their own punishment completion history"
  on public.punishment_completion_history
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own punishment completion history"
  on public.punishment_completion_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create or replace function public.list_pending_punishments()
returns table (
  assigned_id uuid,
  goal_id uuid,
  goal_title text,
  punishment_id uuid,
  punishment_title text,
  punishment_description text,
  punishment_category text,
  punishment_difficulty smallint,
  punishment_scope text,
  assigned_at timestamp with time zone,
  due_date date,
  status text
)
language sql
security invoker
set search_path = public
as $$
  select assigned_row.id as assigned_id,
         assigned_row.goal_id,
         goal_row.title as goal_title,
         punishment_row.id as punishment_id,
         punishment_row.title as punishment_title,
         punishment_row.description as punishment_description,
         punishment_row.category as punishment_category,
         punishment_row.difficulty as punishment_difficulty,
         case when punishment_row.owner_id is null then 'base' else 'personal' end as punishment_scope,
         assigned_row.assigned_at,
         assigned_row.due_date,
         assigned_row.status
  from public.assigned_punishments assigned_row
  inner join public.goals goal_row on goal_row.id = assigned_row.goal_id
  inner join public.punishments punishment_row on punishment_row.id = assigned_row.punishment_id
  where assigned_row.user_id = auth.uid()
    and assigned_row.status = 'pending'
  order by assigned_row.assigned_at desc, assigned_row.id desc;
$$;

create or replace function public.list_punishment_completion_history(p_limit integer default 50)
returns table (
  id uuid,
  assigned_punishment_id uuid,
  goal_id uuid,
  goal_title text,
  punishment_id uuid,
  punishment_title text,
  punishment_description text,
  completed_at timestamp with time zone
)
language sql
security invoker
set search_path = public
as $$
  select history_row.id,
         history_row.assigned_punishment_id,
         history_row.goal_id,
         goal_row.title as goal_title,
         history_row.punishment_id,
         history_row.punishment_title,
         history_row.punishment_description,
         history_row.completed_at
  from public.punishment_completion_history history_row
  left join public.goals goal_row on goal_row.id = history_row.goal_id
  where history_row.user_id = auth.uid()
  order by history_row.completed_at desc, history_row.id desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

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
  )
  on conflict (assigned_punishment_id) do update
    set punishment_id = excluded.punishment_id,
        goal_id = excluded.goal_id,
        punishment_title = excluded.punishment_title,
        punishment_description = excluded.punishment_description,
        completed_at = excluded.completed_at;

  return selected_assigned;
end;
$$;

revoke all on function public.list_pending_punishments() from public;
grant execute on function public.list_pending_punishments() to authenticated, service_role;

revoke all on function public.list_punishment_completion_history(integer) from public;
grant execute on function public.list_punishment_completion_history(integer) to authenticated, service_role;

revoke all on function public.complete_assigned_punishment(uuid) from public;
grant execute on function public.complete_assigned_punishment(uuid) to authenticated, service_role;
