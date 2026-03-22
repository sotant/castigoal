create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  user_id uuid not null,
  user_email text null,
  type text not null check (type in ('suggestion', 'bug_report')),
  subject text not null check (char_length(btrim(subject)) > 0),
  message text not null check (char_length(btrim(message)) > 0),
  category text null,
  affected_section text null,
  reproduction_steps text null,
  app_version text null,
  platform text null,
  device_model text null,
  locale text null,
  source_screen text null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  constraint user_feedback_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on delete cascade
);

create index if not exists user_feedback_user_id_created_at_idx
  on public.user_feedback (user_id, created_at desc);

create index if not exists user_feedback_type_created_at_idx
  on public.user_feedback (type, created_at desc);

alter table public.user_feedback enable row level security;

drop policy if exists "Users can read their own feedback" on public.user_feedback;
drop policy if exists "Users can insert their own feedback" on public.user_feedback;

create policy "Users can read their own feedback"
  on public.user_feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own feedback"
  on public.user_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);
