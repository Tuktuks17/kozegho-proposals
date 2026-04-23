-- ============================================================================
-- Kozegho Proposals v2 — Initial schema
-- Target project: yrlnvtiuonrjkvdoievj
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  email      text not null,
  created_at timestamptz not null default now()
);

-- customers -----------------------------------------------------------------
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company    text not null,
  email      text not null,
  country    text not null check (char_length(country) = 2),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index customers_company_trgm_idx on public.customers using gin (company gin_trgm_ops);
create index customers_company_lower_idx on public.customers (lower(company));
create index customers_created_by_idx on public.customers (created_by);

-- proposals -----------------------------------------------------------------
create table public.proposals (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique,
  customer_id      uuid not null references public.customers(id) on delete restrict,
  salesperson_name text not null,
  language         text not null check (language in ('PT','DE','ES','FR','EN')),
  subject          text not null,
  introduction     text,
  items            jsonb not null default '[]'::jsonb,
  subtotal         numeric(10,2) not null,
  total            numeric(10,2) not null,
  validity_date    date not null,
  delivery_weeks   integer,
  packaging_type   text not null default 'standard' check (packaging_type in ('standard','ocean')),
  delivery_terms   text,
  payment_terms    text,
  warranty         text,
  additional_notes text,
  status           text not null default 'draft' check (status in ('draft','exported')),
  created_by       uuid not null references public.profiles(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index proposals_created_by_idx on public.proposals (created_by);
create index proposals_created_at_idx on public.proposals (created_at desc);
create index proposals_reference_idx on public.proposals (reference);

-- updated_at trigger --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

-- profile auto-provision ----------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS -----------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.customers enable row level security;
alter table public.proposals enable row level security;

create policy "profiles_self_read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);

create policy "customers_owner_select" on public.customers for select using (auth.uid() = created_by);
create policy "customers_owner_insert" on public.customers for insert with check (auth.uid() = created_by);
create policy "customers_owner_update" on public.customers for update using (auth.uid() = created_by);
create policy "customers_owner_delete" on public.customers for delete using (auth.uid() = created_by);

create policy "proposals_owner_select" on public.proposals for select using (auth.uid() = created_by);
create policy "proposals_owner_insert" on public.proposals for insert with check (auth.uid() = created_by);
create policy "proposals_owner_update" on public.proposals for update using (auth.uid() = created_by);
create policy "proposals_owner_delete" on public.proposals for delete using (auth.uid() = created_by);

-- Daily count RPC -----------------------------------------------------------
create or replace function public.count_proposals_on_date(p_date date)
returns integer language sql security definer set search_path = public as $$
  select count(*)::int from public.proposals
  where created_by = auth.uid() and created_at::date = p_date;
$$;

grant execute on function public.count_proposals_on_date(date) to authenticated;

-- Storage policies (run after bucket creation — buckets already exist) ------
create policy "Public read datasheets" on storage.objects for select
  using (bucket_id = 'datasheets');

create policy "Public read logos" on storage.objects for select
  using (bucket_id = 'logos');

create policy "proposals_owner_read" on storage.objects for select
  using (bucket_id = 'proposals' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "proposals_owner_insert" on storage.objects for insert
  with check (bucket_id = 'proposals' and (storage.foldername(name))[1] = auth.uid()::text);
