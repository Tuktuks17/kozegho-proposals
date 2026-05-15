-- ============================================================================
-- Kozegho Proposals v2 — CRM base tables
-- Migration: 20260515000000_crm_base
-- ============================================================================

-- Interações manuais por cliente
create table if not exists public.interactions (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  created_by    uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('note','call','meeting','whatsapp','visit','other')),
  content       text not null,
  occurred_at   timestamptz not null default now(),
  ai_summary    text,
  ai_sentiment  integer check (ai_sentiment between -2 and 2),
  ai_actions    jsonb default '[]',
  created_at    timestamptz default now()
);

-- Tarefas comerciais por cliente
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references public.customers(id) on delete cascade,
  created_by      uuid not null references public.profiles(id) on delete cascade,
  assigned_to     uuid references public.profiles(id),
  title           text not null,
  due_date        date,
  priority        text default 'medium' check (priority in ('low','medium','high','urgent')),
  status          text default 'open' check (status in ('open','done','cancelled')),
  source          text default 'manual' check (source in ('manual','ai_extracted','gmail_detected')),
  source_ref      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Cache de análise AI por cliente
create table if not exists public.relationship_scores (
  customer_id    uuid primary key references public.customers(id) on delete cascade,
  score          integer check (score between 0 and 100),
  temperature    text check (temperature in ('hot','warm','cold')),
  analysis       text,
  opportunity    text,
  suggestions    jsonb default '[]',
  risk_flags     jsonb default '[]',
  last_analyzed  timestamptz default now()
);

-- RLS
alter table public.interactions enable row level security;
alter table public.tasks enable row level security;
alter table public.relationship_scores enable row level security;

create policy "interactions_owner" on public.interactions for all using (auth.uid() = created_by);
create policy "tasks_created_by" on public.tasks for all using (auth.uid() = created_by);
create policy "relationship_scores_select" on public.relationship_scores for select using (
  exists (select 1 from public.customers c where c.id = customer_id and c.created_by = auth.uid())
);

-- Índices
create index if not exists interactions_customer_idx on public.interactions(customer_id);
create index if not exists tasks_customer_idx on public.tasks(customer_id);
create index if not exists tasks_assigned_idx on public.tasks(assigned_to);
