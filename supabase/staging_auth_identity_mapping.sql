-- STAGING ONLY: run after Auth users are provisioned and migration is reviewed.
-- Does not alter operational_state or operational_state_backups.
-- Keep legacy record IDs stable; map them to auth.users instead of recreating business records.
begin;

create table if not exists public.bi_auth_legacy_links (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_user_id text not null unique,
  created_at timestamptz not null default now(),
  constraint legacy_user_id_nonempty check (length(trim(legacy_user_id)) > 0)
);

alter table public.bi_auth_legacy_links enable row level security;
revoke all on public.bi_auth_legacy_links from anon, authenticated;
-- Access to mapping should happen only through vetted server-side operations.
-- Do not grant blanket access or use user-editable user_metadata for roles.

create unique index if not exists bi_profiles_email_normalized_unique
  on public.bi_profiles (lower(btrim(email)))
  where email is not null and btrim(email) <> '';

commit;
