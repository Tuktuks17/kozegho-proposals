-- Phase 0 security hardening (diagnosis 2026-09-30). Non-breaking for the live app.

-- 1. RAG search RPC: only edge functions (service role) may call it.
--    Before this, anyone holding the public anon key could read every embedded proposal.
revoke all on function public.match_proposal_embeddings(text, integer, uuid, uuid) from public, anon, authenticated;
grant execute on function public.match_proposal_embeddings(text, integer, uuid, uuid) to service_role;

-- 2. Other SECURITY DEFINER functions: no anonymous execution.
revoke all on function public.count_proposals_on_date(date) from public, anon, authenticated;
grant execute on function public.count_proposals_on_date(date) to service_role;

revoke all on function public.get_daily_proposal_count(text) from public, anon;
grant execute on function public.get_daily_proposal_count(text) to authenticated, service_role;
alter function public.get_daily_proposal_count(text) set search_path = public;

revoke all on function public.is_manager() from public, anon;
grant execute on function public.is_manager() to authenticated, service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;

alter function public.set_updated_at() set search_path = public;

-- 3. profiles: users may only change their own display name. role is managed via SQL/service role.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;
alter policy profiles_self_update on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4. Close open sign-up: only allowlisted emails can create an account.
--    To add a new user: insert into public.signup_allowlist (email, note) values ('name@kozegho.com', '...');
create table if not exists public.signup_allowlist (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.signup_allowlist enable row level security;
-- No policies: only the service role / SQL editor can read or change it.

insert into public.signup_allowlist (email, note)
select lower(email), 'existing user at hardening time'
from public.profiles
on conflict (email) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from public.signup_allowlist a where a.email = lower(new.email)
  ) then
    raise exception 'signup_not_allowed' using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name, email)
  values (new.id, '', new.email)
  on conflict (id) do nothing;
  return new;
end $function$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;

-- 5. Pause the scheduled AI agents (failing daily since 2026-08-17; credit exhausted).
--    Resume individually with: select cron.alter_job(<jobid>, active := true);
select cron.alter_job(j.jobid, active := false)
from cron.job j
where j.jobname in (
  'embed-proposals-daily',
  'agent-followup-daily',
  'agent-briefing-daily',
  'lead-qualification-weekly',
  'market-intelligence-weekly',
  'chief-of-staff-weekly'
);
