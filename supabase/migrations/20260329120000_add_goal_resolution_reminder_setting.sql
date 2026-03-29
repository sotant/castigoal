alter table public.user_settings
  add column if not exists goal_resolution_reminder_enabled boolean not null default true;

update public.user_settings
set goal_resolution_reminder_enabled = reminders_enabled
where goal_resolution_reminder_enabled is distinct from reminders_enabled;
