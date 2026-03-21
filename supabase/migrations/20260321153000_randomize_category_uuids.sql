set check_function_bodies = off;

alter table public.categories
  alter column id set default gen_random_uuid();

alter table public.punishments
  drop constraint if exists punishments_category_fkey;

alter table public.categories
  add column next_id uuid default gen_random_uuid();

update public.categories
set next_id = gen_random_uuid();

alter table public.categories
  alter column next_id set not null;

alter table public.categories
  add constraint categories_next_id_key unique (next_id);

alter table public.punishments
  add column category_next uuid;

update public.punishments punishment_row
set category_next = category_row.next_id
from public.categories category_row
where category_row.id = punishment_row.category;

alter table public.punishments
  alter column category_next set not null;

alter table public.categories
  drop constraint categories_pkey;

alter table public.categories
  rename column id to previous_id;

alter table public.categories
  rename column next_id to id;

alter table public.categories
  add constraint categories_pkey primary key (id);

alter table public.categories
  drop constraint categories_next_id_key;

alter table public.punishments
  drop column category;

alter table public.punishments
  rename column category_next to category;

drop index if exists public.punishments_category_idx;

create index punishments_category_idx
  on public.punishments (category);

alter table public.punishments
  add constraint punishments_category_fkey
  foreign key (category)
  references public.categories(id)
  on update restrict
  on delete restrict;

alter table public.categories
  drop column previous_id;
