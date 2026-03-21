set check_function_bodies = off;

alter table public.punishments
  drop constraint if exists punishments_category_fkey;

alter table public.categories
  add column id_uuid uuid;

update public.categories
set id_uuid = case name
  when 'tarea' then '11111111-1111-4111-8111-111111111111'::uuid
  when 'estudio' then '22222222-2222-4222-8222-222222222222'::uuid
  when 'fisico' then '33333333-3333-4333-8333-333333333333'::uuid
  when 'social' then '44444444-4444-4444-8444-444444444444'::uuid
  when 'finanzas' then '55555555-5555-4555-8555-555555555555'::uuid
  when 'entretenimiento' then '66666666-6666-4666-8666-666666666666'::uuid
  when 'salud' then '77777777-7777-4777-8777-777777777777'::uuid
  when 'trabajo' then '88888888-8888-4888-8888-888888888888'::uuid
  when 'nutricion' then '99999999-9999-4999-8999-999999999999'::uuid
  when 'hogar' then 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  when 'otros' then 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  else gen_random_uuid()
end;

alter table public.categories
  alter column id_uuid set not null;

alter table public.categories
  add constraint categories_id_uuid_key unique (id_uuid);

alter table public.punishments
  add column category_uuid uuid;

update public.punishments punishment_row
set category_uuid = category_row.id_uuid
from public.categories category_row
where category_row.id = punishment_row.category;

alter table public.punishments
  alter column category_uuid set not null;

drop function if exists public.get_home_summary();

create function public.get_home_summary()
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
as $$
  with current_context as (
    select auth.uid() as user_id
  )
  select coalesce((
           select count(*)
           from public.goals goal_row
           where goal_row.user_id = current_context.user_id
             and goal_row.active
         ), 0)::integer as active_goals_count,
         coalesce((
           select count(*)
           from public.assigned_punishments assigned_row
           where assigned_row.user_id = current_context.user_id
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
  from current_context
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
    where assigned_row.user_id = current_context.user_id
      and assigned_row.status = 'pending'
    order by assigned_row.assigned_at desc, assigned_row.id desc
    limit 1
  ) latest_pending on true;
$$;

drop function if exists public.list_punishment_catalog();

create function public.list_punishment_catalog()
returns table (
  id uuid,
  title text,
  description text,
  category_id uuid,
  category_name text,
  difficulty smallint,
  scope text,
  created_at timestamp with time zone
)
language sql
security invoker
set search_path = public
as $$
  select punishment_row.id,
         punishment_row.title,
         punishment_row.description,
         punishment_row.category as category_id,
         category_row.name as category_name,
         punishment_row.difficulty,
         case when punishment_row.owner_id is null then 'base' else 'personal' end as scope,
         punishment_row.created_at
  from public.punishments punishment_row
  join public.categories category_row on category_row.id = punishment_row.category
  where punishment_row.owner_id is null
     or punishment_row.owner_id = auth.uid()
  order by case when punishment_row.owner_id is null then 1 else 0 end,
           punishment_row.created_at desc,
           punishment_row.id desc;
$$;

drop function if exists public.list_pending_punishments();

create function public.list_pending_punishments()
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
         punishment_row.category as punishment_category_id,
         category_row.name as punishment_category_name,
         punishment_row.difficulty as punishment_difficulty,
         case when punishment_row.owner_id is null then 'base' else 'personal' end as punishment_scope,
         assigned_row.assigned_at,
         assigned_row.due_date,
         assigned_row.status
  from public.assigned_punishments assigned_row
  inner join public.goals goal_row on goal_row.id = assigned_row.goal_id
  inner join public.punishments punishment_row on punishment_row.id = assigned_row.punishment_id
  inner join public.categories category_row on category_row.id = punishment_row.category
  where assigned_row.user_id = auth.uid()
    and assigned_row.status = 'pending'
  order by assigned_row.assigned_at desc, assigned_row.id desc;
$$;

alter table public.categories
  drop constraint categories_pkey;

alter table public.categories
  rename column id to legacy_id;

alter table public.categories
  rename column id_uuid to id;

alter table public.categories
  add constraint categories_pkey primary key (id);

alter table public.punishments
  drop column category;

alter table public.punishments
  rename column category_uuid to category;

create index if not exists punishments_category_idx
  on public.punishments (category);

alter table public.punishments
  add constraint punishments_category_fkey
  foreign key (category)
  references public.categories(id)
  on update restrict
  on delete restrict;

alter table public.categories
  drop column legacy_id;

revoke all on function public.get_home_summary() from public;
revoke all on function public.list_punishment_catalog() from public;
revoke all on function public.list_pending_punishments() from public;

grant execute on function public.get_home_summary() to authenticated, service_role;
grant execute on function public.list_punishment_catalog() to authenticated, service_role;
grant execute on function public.list_pending_punishments() to authenticated, service_role;
