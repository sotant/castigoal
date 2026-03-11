set check_function_bodies = off;

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
  select coalesce((
           select count(*)
           from public.goals goal_row
           where goal_row.user_id = auth.uid()
             and goal_row.active
         ), 0)::integer as active_goals_count,
         coalesce((
           select count(*)
           from public.assigned_punishments assigned_row
           where assigned_row.user_id = auth.uid()
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
  from (select 1) as singleton
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
    where assigned_row.user_id = auth.uid()
      and assigned_row.status = 'pending'
    order by assigned_row.assigned_at desc, assigned_row.id desc
    limit 1
  ) latest_pending on true;
$$;