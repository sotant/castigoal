alter table public.user_feedback
  alter column user_id drop not null;

drop policy if exists "Users can read their own feedback" on public.user_feedback;
drop policy if exists "Users can insert their own feedback" on public.user_feedback;
drop policy if exists "Authenticated users can insert their own feedback" on public.user_feedback;
drop policy if exists "Anonymous users can insert anonymous feedback" on public.user_feedback;

create policy "Authenticated users can insert their own feedback"
  on public.user_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id and user_id is not null);

create policy "Anonymous users can insert anonymous feedback"
  on public.user_feedback
  for insert
  to anon
  with check (user_id is null);

revoke all on table public.user_feedback from anon;
revoke all on table public.user_feedback from authenticated;

grant insert on table public.user_feedback to anon;
grant insert on table public.user_feedback to authenticated;
