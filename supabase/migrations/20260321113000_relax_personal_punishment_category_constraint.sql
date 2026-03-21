set check_function_bodies = off;

alter table public.punishments
  drop constraint if exists punishments_catalog_consistency_check;

alter table public.punishments
  add constraint punishments_catalog_consistency_check
  check (
    (owner_id is null and is_custom = false and category <> 'custom')
    or (owner_id is not null and is_custom = true)
  );
