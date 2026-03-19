update public.assigned_punishments
set status = 'completed'
where status = 'pending'
  and completed_at is not null;

alter table public.assigned_punishments
  drop constraint if exists assigned_punishments_completion_state_check;

alter table public.assigned_punishments
  add constraint assigned_punishments_completion_state_check
  check (
    (status = 'pending' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  );
