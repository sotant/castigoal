update public.goals
set lifecycle_status = 'active',
    active = true,
    updated_at = timezone('utc', now())
where lifecycle_status = 'paused';

alter table public.goals
  drop constraint if exists goals_lifecycle_status_check;

alter table public.goals
  add constraint goals_lifecycle_status_check
    check (lifecycle_status in ('active', 'closed'));
