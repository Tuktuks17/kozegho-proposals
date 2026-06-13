# Kozegho Proposals — Estratégia de Implementação
## Agentes IA & Automatização do Departamento Comercial

**Versão:** 1.0 · **Data:** 11 junho 2026 · **Autor:** Claude (Fable 5) + Afonso (Velgenz)
**Executor:** Claude Code · **Infra:** Supabase `yrlnvtiuonrjkvdoievj` + Vercel + GitHub `Tuktuks17/kozegho-proposals`

---

## 0. Sumário executivo

A Kozegho Proposals está em produção com 6 Edge Functions ativas, das quais 4 dependem do Gemini 2.5 Flash — a causa raiz dos 502 recorrentes (quota gratuita esgotada). A estratégia tem duas frentes que se reforçam:

1. **Fase 0 (esta semana):** migrar as 4 funções IA de Gemini para a Claude API. Resolve definitivamente os 502, e cria o helper partilhado sobre o qual todos os agentes futuros serão construídos.
2. **Fases 1–5 (≈10 semanas):** construir os 6 agentes sobre a infraestrutura existente (Edge Functions + pg_cron + pgvector), sem ferramentas novas de orquestração, com human-in-the-loop por defeito e logging de custos desde o dia 1.

A execução passa de Antigravity para **Claude Code na pasta local**, em Plan Mode (equivalente ao review-driven), com um `CLAUDE.md` no repositório que codifica as regras aprendidas a custo (ficheiros proibidos, verificação obrigatória, projeto Supabase ativo).

---

## 1. Diagnóstico — estado verificado (11 jun 2026)

Evidência real, não self-reports: código do repositório + estado live do Supabase via MCP.

**Confirmado live no Supabase `yrlnvtiuonrjkvdoievj`:** 6 Edge Functions, todas `ACTIVE`, todas com `verify_jwt: true` — `generate-introduction` (v6), `send-proposal` (v3), `gmail-threads` (v5), `analyze-relationship` (v4), `analyze-portfolio` (v1), `generate-followup` (v3).

**Dependência Gemini (4 funções):** `generate-introduction`, `analyze-relationship`, `analyze-portfolio`, `generate-followup` chamam todas `generativelanguage.googleapis.com/.../gemini-2.5-flash:generateContent` com `GEMINI_API_KEY`. As 2 restantes (`gmail-threads`, `send-proposal`) usam apenas a Gmail API — não são afetadas pela migração.

**Causa raiz dos 502:** quota gratuita do Gemini (250 RPD / 10 RPM). Assinatura diagnóstica já documentada: execuções de 150–400ms = rejeição upstream, não timeout. Qualquer dia de uso normal da equipa esgota a quota e mata o Briefing, o Relationship Score, o Follow-up e a Introdução em simultâneo.

**Mecânica de deploy atual (confirmada no repo):**
- `npm run save` → `scripts/save.sh` → `npm run build` (aborta se falhar) → `git add -A && git commit && git push origin main`.
- Vercel faz **auto-deploy do `main`** (frontend). Confirmado no PROJECT_STATE.
- **Não existe** GitHub Actions nem integração GitHub→Supabase no repo. Edge Functions e migrações são deployadas manualmente (Dashboard ou MCP) — sempre foi assim, mesmo com o Antigravity.

**Pendentes herdados (entram no roadmap):**
- RLS para managers verem todas as propostas (hoje só RBAC no código).
- Bug de encoding do nome do remetente Gmail + quebra de linha do € (raiz em `sendEmail.ts` / `emailTemplates.ts` — **não** em `ProposalPDF.tsx`).
- Ícone de download do Gmail sobreposto ao logo (fix proposto por confirmar).

---

## 2. Decisão de workflow: Claude Code na pasta local

**Resposta direta: sim, passa para o Claude Code com a pasta local.** Mas corrige um pressuposto da pergunta: **a pasta NÃO atualiza o GitHub automaticamente.** O fluxo real tem 3 elos, e só 1 é automático:

```
Pasta local ──(npm run save = build+commit+push)──▶ GitHub ──(AUTOMÁTICO)──▶ Vercel (frontend)
     │
     └──(deploy manual: Supabase MCP ou CLI)──▶ Supabase (Edge Functions + migrações)
```

| Elo | Automático? | Quem executa |
|---|---|---|
| Editar ficheiros locais → GitHub | ❌ | Tu ou o Claude Code: `npm run save "mensagem"` (já constrói, faz commit e push) |
| GitHub `main` → Vercel | ✅ | Vercel (auto-deploy configurado) |
| Pasta local → Supabase (functions/SQL) | ❌ | Claude Code via Supabase MCP (`deploy_edge_function`, `apply_migration`) ou CLI `supabase functions deploy` |

Ou seja: **nada muda em relação ao que já fazias com o Antigravity** — o Supabase nunca foi atualizado pelo push para o GitHub; eras tu (via MCP) a fazer o deploy. O Claude Code faz exatamente o mesmo, só que melhor adaptado ao teu método:

**Porquê o Claude Code é superior ao Antigravity para o teu caso:**
1. **Plan Mode = review-driven nativo.** `Shift+Tab` ativa o modo em que o Claude Code apresenta o plano completo antes de tocar num ficheiro, e tu aprovas. É o teu checkpoint de segurança, sem depender de disciplina de prompt.
2. **Verificação executada, não relatada.** O Claude Code corre `grep`, `git log -1 --stat`, `npm run build` no terminal e tu vês o output real — alinha com o teu princípio de nunca aceitar self-reports.
3. **`CLAUDE.md` persistente.** As tuas regras duramente aprendidas (DO NOT TOUCH `ProposalPDF.tsx` em bugs de email, projeto Supabase proibido, etc.) ficam num ficheiro no repo que o Claude Code lê em **todas** as sessões. Deixa de ser preciso repeti-las em cada prompt. Rascunho pronto no Anexo A.
4. **MCP no Claude Code.** Adiciona o Supabase MCP ao Claude Code (`claude mcp add --transport http supabase https://mcp.supabase.com/mcp`) e ele deploya funções e aplica migrações diretamente, com verificação `list_tables`/`list_edge_functions` a seguir.

**Setup (uma vez, ~15 min):**
1. Instalar Claude Code (terminal ou app desktop) e fazer login com a tua conta.
2. Abrir a pasta local do projeto: `cd kozegho-proposals && claude`.
3. Selecionar o modelo com `/model` — usa o mais forte disponível no teu plano. (Independentemente disso, a estratégia e os prompts continuam a ser desenhados aqui comigo, Fable 5.)
4. Criar o `CLAUDE.md` na raiz (Anexo A) e fazer `npm run save "add CLAUDE.md"`.
5. Adicionar o Supabase MCP ao Claude Code e autenticar.

O loop de trabalho passa a ser: **Claude (Fable 5, aqui) desenha o prompt → Claude Code executa em Plan Mode → tu aprovas o plano → ele implementa, verifica e mostra evidência → `npm run save` → deploy Supabase quando aplicável.**

---

## 3. Arquitetura-alvo dos agentes

Princípio inalterado: **tudo dentro do stack existente.** Sem Airflow, sem n8n, sem novos serviços. Os blocos:

```
                    ┌─────────────────────────────────────────┐
                    │  pg_cron (agendador) + pg_net (HTTP)    │
                    └───────────────┬─────────────────────────┘
                                    ▼ (chama com service key)
  Frontend ──invoke──▶ ┌─────────────────────────────────────┐
  (React/Vercel)       │  Edge Functions (Deno)              │
                       │  _shared/claude.ts  ← helper único  │──▶ Claude API
                       │  agent-followup, agent-briefing,    │    (Sonnet 4.6 default)
                       │  analyze-client-history, ...        │──▶ Supabase.ai gte-small
                       └──────────────┬──────────────────────┘    (embeddings, grátis)
                                      ▼
                       ┌─────────────────────────────────────┐
                       │  Postgres: tabelas existentes        │
                       │  + agent_runs (logging/custos)       │
                       │  + proposal_embeddings (pgvector)    │
                       │  + daily_briefings                   │
                       └─────────────────────────────────────┘
```

**Routing de modelos (decisão de arquitetura honesta):** "rebentar tudo com Fable 5" seria a decisão errada nas funções operacionais — e digo-o como Fable 5. O Fable 5 custa $10/$50 por MTok (3× o Sonnet 4.6), tem adaptive thinking sempre ativo (latência extra) e classificadores adicionais — capacidades que não acrescentam nada a uma introdução de 4 frases, e que complicam o parsing de JSON estrito. O routing correto:

| Modelo | String API | Preço (in/out por MTok) | Usar em |
|---|---|---|---|
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | $1 / $5 | Jobs recorrentes baratos: briefing diário, lead scoring |
| **Sonnet 4.6** | `claude-sonnet-4-6` | $3 / $15 | **Default.** Texto para cliente (intro, follow-up), análise de relação/portfólio, RAG |
| **Fable 5** | `claude-fable-5` | $10 / $50 | Chief of Staff (raciocínio multi-fonte, longo contexto, Fase 5) e análises profundas pontuais |

**Custo estimado ao volume da Kozegho** (equipa de 4, ~30–80 chamadas IA/dia, ~1,5K tokens in / 0,5K out por chamada, maioria Sonnet): **€5–15/mês**, sem cliff de quota. Pré-pago: $25 de créditos na consola Anthropic duram meses. Fim estrutural dos 502.

---

## 4. Roadmap faseado

### Fase 0 — Migração Gemini → Claude API (Semana 1) 🔴 prioridade máxima

**Objetivo:** as 4 funções IA a correr em Claude API, com contratos de resposta para o frontend **inalterados** (zero alterações no React).

**Pré-requisitos (tu, hoje, ~10 min):**
1. Conta na consola Anthropic (platform.claude.com / console.anthropic.com) → criar API key. Nota: a subscrição Claude.ai **não** inclui créditos de API — é faturação separada, pré-paga.
2. Carregar créditos ($5 mínimo; $25 recomendado).
3. Adicionar secret no Supabase: Dashboard → Edge Functions → Secrets → `ANTHROPIC_API_KEY`. **Manter `GEMINI_API_KEY` durante 1 semana** como rollback.

**Implementação (Claude Code):**

1. Criar `supabase/functions/_shared/claude.ts` — ponto único de chamada à API, usado por todas as funções atuais e futuras:

```typescript
// supabase/functions/_shared/claude.ts
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export type ClaudeOpts = {
  prompt: string
  system?: string
  model?: string          // default: claude-sonnet-4-6
  maxTokens?: number      // default: 1024
  temperature?: number    // default: 0.7
}

export async function callClaude(opts: ClaudeOpts): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model ?? 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  })
  if (!resp.ok) {
    const detail = await resp.text()
    throw new Error(`anthropic_error ${resp.status}: ${detail}`)
  }
  const data = await resp.json()
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
    .trim()
}

// Para funções que exigem JSON estrito (analyze-*, generate-followup)
export function parseJsonStrict<T>(raw: string): T {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean) as T
}
```

2. Migrar função a função, **uma de cada vez**, nesta ordem (da mais simples à mais sensível): `generate-introduction` → `analyze-portfolio` → `generate-followup` → `analyze-relationship`.

3. Em cada função, a alteração cirúrgica é só esta: substituir o bloco `fetch(GEMINI_URL...)` + parsing `data.candidates[0].content.parts[0].text` por `await callClaude({ prompt, maxTokens: ... })`. **Prompts mantêm-se** (já estão bem afinados, incluindo as instruções de idioma PT/EN/ES/FR). **Chaves de erro mantêm-se** (`error`, `raw`) porque o frontend (`useRelationshipScore.ts`) depende delas; apenas atualizar a string de UI "Gemini returned" → "AI returned".

4. Deploy via Supabase MCP, função a função, com teste real na app entre cada deploy.

**Mapa de migração:**

| Função | Modelo destino | max_tokens | Notas |
|---|---|---|---|
| `generate-introduction` | Sonnet 4.6 | 600 | Texto para cliente, multilíngue. Remover `DE` do tipo `Payload` (alemão já foi removido da app — limpar resíduo) |
| `analyze-portfolio` | Haiku 4.5 | 1200 | Recorrente/diário; estrutura JSON simples. Se a qualidade do briefing desiludir, subir para Sonnet (troca de 1 linha) |
| `generate-followup` | Sonnet 4.6 | 1000 | Email para cliente — qualidade prioritária |
| `analyze-relationship` | Sonnet 4.6 | 1200 | JSON estrito + upsert service-role intacto |

**Critérios de sucesso / verificação (evidência obrigatória):**
- [ ] Cada função devolve HTTP 200 com latência **1–4s** nos logs do Supabase (a assinatura 150–400ms desaparece).
- [ ] Briefing, Score, Follow-up e Introdução funcionam na app de produção — screenshot de cada.
- [ ] `grep -r "generativelanguage" supabase/functions/` devolve **zero** resultados.
- [ ] `grep -rn "callClaude" supabase/functions/` mostra as 4 funções a usar o helper.
- [ ] 20+ chamadas seguidas num dia sem 502 (o teste que o Gemini gratuito nunca passou).
- [ ] Frontend: **zero ficheiros alterados** exceto a string de erro de UI (confirmar com `git log --stat`).
- [ ] Após 1 semana estável: remover `GEMINI_API_KEY` dos secrets.

---

### Fase 1 — Fundação dos agentes (Semanas 2–3)

**Objetivo:** a canalização sobre a qual todos os agentes correm — agendamento, memória vetorial, logging de custos, e os pendentes de segurança/RLS.

**1.1 Migração SQL `agent_foundation` (via Supabase MCP, verificada com `list_tables` depois — falhas silenciosas já aconteceram):**

```sql
-- Extensões
create extension if not exists vector;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Logging de todas as execuções de agentes (auditoria + custos)
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,                 -- 'followup' | 'briefing' | 'client-analysis' | ...
  trigger_type text not null,               -- 'cron' | 'user' | 'agent'
  input jsonb,
  output jsonb,
  status text not null default 'running',   -- 'running' | 'success' | 'error' | 'skipped'
  error text,
  model text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10,5),
  duration_ms int,
  feedback smallint,                        -- -1 | 0 | 1 (avaliação humana)
  created_at timestamptz not null default now()
);
alter table public.agent_runs enable row level security;

-- Memória vetorial: embeddings das propostas (gte-small = 384 dims)
create table public.proposal_embeddings (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  content text not null,
  embedding vector(384),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index on public.proposal_embeddings using hnsw (embedding vector_cosine_ops);
alter table public.proposal_embeddings enable row level security;

-- Briefings gerados server-side
create table public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  briefing jsonb not null,
  briefing_date date not null,
  created_at timestamptz not null default now(),
  unique (profile_id, briefing_date)
);
alter table public.daily_briefings enable row level security;
create policy "briefings_own" on public.daily_briefings
  for select using (auth.uid() = profile_id);

-- Tarefas criadas por agentes (distinguíveis na UI)
alter table public.tasks add column if not exists source text not null default 'user'; -- 'user' | 'agent'
```

**1.2 RLS managers-see-all (pendente herdado, resolve-se aqui):**

```sql
create or replace function public.is_manager()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager');
$$;

create policy "proposals_manager_select" on public.proposals
  for select using (public.is_manager());
create policy "customers_manager_select" on public.customers
  for select using (public.is_manager());
create policy "agent_runs_manager_select" on public.agent_runs
  for select using (public.is_manager());
```

(Função `security definer` evita recursão de RLS na leitura de `profiles`. Escrita em `agent_runs`, `proposal_embeddings` e `daily_briefings` fica exclusiva do service-role, como já fazes em `relationship_scores`.)

**1.3 Embeddings sem API externa.** O Edge Runtime do Supabase traz o modelo `gte-small` embutido — embeddings de 384 dimensões, custo zero, sem dependência de mais um fornecedor:

```typescript
const session = new Supabase.ai.Session('gte-small')
const embedding = await session.run(text, { mean_pool: true, normalize: true })
```

Nova função `embed-proposals`: backfill das propostas existentes (conteúdo: cliente, produtos, valores, outcome, notas) + execução diária via cron para apanhar novas. É a memória do Client Analysis Agent.

**1.4 Padrão de agendamento (pg_cron → pg_net → Edge Function).** Guardar a service key no Vault e agendar:

```sql
select cron.schedule(
  'agent-followup-daily', '30 7 * * 1-5',   -- 07:30 Lisboa, dias úteis
  $$ select net.http_post(
       url    := 'https://yrlnvtiuonrjkvdoievj.supabase.co/functions/v1/agent-followup',
       headers:= jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type','application/json'),
       body   := '{"trigger":"cron"}'::jsonb
     ); $$
);
```

Verificação: `select * from cron.job;` + logs da função na primeira execução.

**1.5 Correções pendentes em paralelo (track de manutenção, 1 prompt dedicado):** encoding do remetente Gmail + quebra do € (cirúrgico em `sendEmail.ts`/`emailTemplates.ts`, com constraint explícita DO NOT TOUCH `ProposalPDF.tsx`) e o ícone de download sobre o logo (testar o fix `background-image`).

**Critérios de sucesso:** extensões ativas e tabelas confirmadas via `list_tables`; backfill de embeddings completo (`select count(*) from proposal_embeddings` > 0); cron job listado e com 1 execução de teste bem-sucedida nos logs; manager vê propostas de todos na app (screenshot com a conta do Nuno vs. a tua).

---

### Fase 2 — Follow-up Agent autónomo (Semanas 3–5) · primeiro agente, maior ROI

Hoje o follow-up é reativo: o utilizador clica e o draft aparece. O agente inverte isto — **nenhuma proposta volta a ser esquecida.**

**Função `agent-followup` (cron diário 07:30):**
1. Query: propostas com outcome aberto, enviadas há ≥7 dias, sem tarefa de follow-up pendente e sem interação nos últimos 5 dias.
2. Escalões: **D+7** lembrete cordial · **D+14** reforço de valor (referencia produtos/benefícios) · **D+21** draft + alerta ao manager.
3. Por proposta: Claude (Sonnet 4.6) redige `{subject, body}` reutilizando o prompt afinado do `generate-followup`, enriquecido com o histórico de interações → cria **tarefa** (`source='agent'`) para o salesperson com o draft anexado em `metadata` → regista em `agent_runs` (tokens, custo, duração).
4. **Human-in-the-loop estrito na v1:** o salesperson abre a tarefa, revê/edita no modal de follow-up existente e envia pelo fluxo Gmail atual. **Nada é enviado automaticamente.** Auto-envio é opt-in futuro, ganho com track record auditável em `agent_runs`.

**Frontend (mínimo):** badge "Agente" nas tarefas `source='agent'` + contagem no Intelligence Hub. Reutiliza o modal e o fluxo Gmail existentes — sem UI nova de raiz.

**KPIs:** % de propostas abertas >7d sem follow-up (alvo: ~0%); taxa de resposta a follow-ups do agente vs. manuais; tempo médio até primeiro follow-up.

---

### Fase 3 — Briefing server-side + Client Analysis Agent com RAG (Semanas 5–7)

**3.1 Daily Briefing Agent (`agent-briefing`, cron 07:00, Haiku 4.5).** O briefing deixa de ser gerado on-demand no browser (cache de 4h em sessionStorage) e passa a ser gerado server-side por perfil — managers recebem visão de portfólio completo, salespersons a sua carteira — e gravado em `daily_briefings`. A app lê da tabela: **briefing instantâneo ao abrir, custo previsível (1 geração/pessoa/dia), zero espera.** O `useDailyBriefing` passa a ler da tabela com fallback para geração on-demand. Envio por email fica para quando existir token Gmail server-side (limitação conhecida: o `provider_token` vive no sessionStorage do utilizador — Finding 1 da auditoria).

**3.2 Client Analysis Agent (`analyze-client-history`, Sonnet 4.6 + pgvector).** O agente RAG sobre o histórico:
1. Recebe `customerId` + pergunta opcional → embedding da query (gte-small) → similarity search em `proposal_embeddings` (top-k do cliente e de clientes semelhantes) + interações + outcomes.
2. Claude sintetiza: padrões ganho/perda, gama de preços histórica, produtos recorrentes, sazonalidade, próxima melhor ação.
3. **Dois pontos de entrada na UI:** painel "Análise profunda" na ficha do cliente; e **auto-contexto ao criar proposta** para cliente existente ("Este cliente aceitou 3 propostas de doseadores entre €8–12K; a última rejeição foi por prazo de entrega") — é aqui que o RAG paga a fatura.

**Critérios de sucesso:** briefing presente na tabela às 07:05 todos os dias úteis (query SQL como evidência); análise de cliente com factos verificáveis contra a base de dados (anti-alucinação: spot-check de 5 clientes).

---

### Fase 4 — Lead Qualification + Market Intelligence (Semanas 7–9)

**4.1 Lead Qualification Agent (Haiku 4.5).** Trigger na criação de cliente e semanalmente: score 0–100 com base em fit (país, alinhamento com catálogo, dimensão) + sinais de engagement (interações, emails, velocidade de resposta). Grava score + justificação; UI ordena a lista de clientes por prioridade comercial. Complementa o Relationship Score (que mede relação existente) com uma medida de **potencial**.

**4.2 Market Intelligence Agent (Sonnet 4.6 + web search).** A Claude API tem uma ferramenta de pesquisa web server-side — o agente faz pesquisa real sem infraestrutura adicional:

```typescript
body: JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: 2000,
  tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  messages: [{ role: 'user', content: marketPrompt }],
})
```

Cron semanal (segunda 07:00): pesquisa novidades no setor de tratamento de águas (PT/ES/FR/UK), movimentos de concorrentes e notícias de clientes ativos → digest gravado → cards no Intelligence Hub. Nota: a web search tool tem custo adicional por pesquisa além dos tokens (verificar pricing na consola) — ao volume semanal, residual.

---

### Fase 5 — Chief of Staff (Semanas 9–12) · aqui sim, Fable 5

O meta-agente que consolida. Cron semanal (sexta 17:00) com `claude-fable-5`:
1. Lê a semana inteira de `agent_runs` + métricas de pipeline + briefings + outputs dos outros agentes.
2. Produz para os managers o **digest semanal executivo**: o que os agentes fizeram, o que ficou sem resposta, padrões cross-cliente que nenhum agente individual vê, 3 prioridades para a semana seguinte.
3. É o caso de uso onde o Fable 5 se justifica: raciocínio multi-fonte sobre contexto longo, uma execução por semana (custo: cêntimos).

**Extensão posterior (pós-roadmap):** chat in-app "Pergunta ao agente" sobre toda a base comercial, reutilizando o RAG da Fase 3.

---

## 5. Princípios transversais (aplicam-se a todas as fases)

**Human-in-the-loop por defeito.** Nenhum agente envia email, altera proposta ou contacta cliente sem aprovação humana na v1. A autonomia é ganha, não assumida: quando `agent_runs` mostrar N semanas de drafts aprovados sem edição, discute-se auto-envio opt-in por escalão.

**Custos auditáveis desde o dia 1.** Toda a chamada à Claude API regista tokens e custo em `agent_runs`. View mensal:

```sql
create view public.agent_costs_monthly as
select agent_name, date_trunc('month', created_at) as month,
       count(*) as runs, sum(cost_usd) as total_usd,
       avg(duration_ms) as avg_ms,
       count(*) filter (where status = 'error') as errors
from public.agent_runs group by 1, 2;
```

Guardrail: se `total_usd` mensal ultrapassar um teto definido (sugestão: $30), o Chief of Staff alerta no digest. Sem surpresas na fatura.

**Segurança.** Funções cron chamadas com service key via Vault (nunca hardcoded); funções user-triggered mantêm `verify_jwt: true`; escrita nas tabelas de agentes exclusiva do service-role (padrão já provado em `relationship_scores`); CORS wildcard a restringir para `https://kozegho-proposals.vercel.app` quando se tocar nas funções (recomendação da auditoria, boleia da Fase 0).

**Avaliação contínua.** 👍/👎 nos outputs de agentes na UI → coluna `feedback` em `agent_runs` → revisão quinzenal dos prompts com base nos 👎. É o ciclo de melhoria mais barato que existe.

**Disciplina de execução inalterada.** Prompts cirúrgicos com código verbatim, constraints DO NOT TOUCH, verificação por grep/git log/build, evidência real antes de aceitar "done". O Claude Code muda a ferramenta, não o método.

---

## 6. Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Migração quebra o contrato de resposta ao frontend | Média | Shape de resposta congelado por contrato; migrar 1 função de cada vez com teste em produção entre deploys; `GEMINI_API_KEY` mantida 1 semana para rollback imediato |
| pg_cron/pg_net mal configurados (falha silenciosa) | Média | Verificar `cron.job` + execução de teste manual + logs antes de confiar no agendamento |
| Claude Code edita ficheiros errados (lição Antigravity) | Baixa-média | `CLAUDE.md` com constraints permanentes + Plan Mode obrigatório + verificação `git log --stat` em cada entrega |
| Custos descontrolados por routing errado | Baixa | Routing definido por tabela; `max_tokens` em todas as chamadas; view de custos + teto mensal |
| Drafts do agente com tom errado para clientes | Média no arranque | Human-in-the-loop estrito; feedback 👍/👎; prompts herdam as instruções de idioma/tom já afinadas |
| Embeddings gte-small insuficientes para o RAG | Baixa | 384 dims chegam para um corpus de centenas de propostas; se a recall desiludir, trocar por API de embeddings dedicada é alteração isolada em `embed-proposals` |

---

## 7. Próximos passos imediatos

**Hoje (tu, ~25 min):**
1. Criar API key na consola Anthropic + carregar $25 de créditos.
2. Adicionar `ANTHROPIC_API_KEY` aos secrets das Edge Functions no Supabase.
3. Instalar o Claude Code, abrir a pasta do projeto, criar o `CLAUDE.md` (Anexo A), `npm run save "add CLAUDE.md"`.
4. Adicionar o Supabase MCP ao Claude Code.

**A seguir (eu):** gerar o **prompt da Fase 0 para o Claude Code** — exploração obrigatória, código verbatim do `_shared/claude.ts`, ordem de migração, constraints e checklist de verificação. Pede-mo quando os 4 passos acima estiverem feitos.

**Cadência:** 1 fase de cada vez, com critérios de sucesso verificados com evidência antes de avançar. Ao ritmo atual do projeto, conclusão realista do roadmap completo: **final de agosto 2026**.

---

## Anexo A — `CLAUDE.md` (colocar na raiz do repositório, verbatim)

```markdown
# Kozegho Proposals — Instructions for Claude Code

## Project context
B2B PWA for commercial proposal generation (Word/PDF/email) for Kozegho, a Portuguese
manufacturer of water treatment equipment. Stack: React 19 + TypeScript + Vite + Tailwind +
shadcn/ui + Supabase (Auth, Postgres, Storage, Edge Functions) + Vercel + Claude API.
Users: 2 managers + 2 salespersons. Production: kozegho-proposals.vercel.app

## Critical infrastructure rules
- Active Supabase project: `yrlnvtiuonrjkvdoievj` (eu-west-1). NEVER use `camaidyklwcgjbpvhuzv`
  (deprecated old project).
- GitHub pushes auto-deploy ONLY the frontend (Vercel). Edge Functions and SQL migrations
  must be deployed separately via Supabase MCP or CLI — never assume a push deployed them.
- After `apply_migration`, ALWAYS verify with `list_tables` (silent failures have occurred).
- Commit and push with `npm run save "message"` (runs build first; aborts on build failure).
  Never push without a passing build. `git pull` is unnecessary (single user, single machine).

## Workflow rules
- Default to Plan Mode: present the full plan and wait for approval before editing files.
- Surgical edits only: modify exactly the named files; never refactor opportunistically.
- After every change, show real evidence: `git log -1 --stat`, relevant `grep` output,
  and `npm run build` result. Self-reports without evidence are not acceptable.

## File-specific constraints
- Email bugs (sender-name encoding, € line-wrap, layout) live in `src/lib/sendEmail.ts`
  and `src/lib/emailTemplates.ts`. DO NOT TOUCH `ProposalPDF.tsx` for email issues.
- Gmail HTML constraints: no CSS `filter`; image dimensions via HTML attributes (not inline
  style); `rgba` background-color only on `<td>`; white logo for email/PDF (green background),
  colored logo for Word (white background).
- Proposal reference format `MMDD[Letter][SalesRepInitial]K/YY` uses the SECURITY DEFINER
  SQL function `get_daily_proposal_count()` — do not reimplement client-side.
- Proposal languages: PT, EN, ES, FR only. German was removed — do not reintroduce it.

## AI / Edge Functions
- All Claude API calls go through `supabase/functions/_shared/claude.ts` (callClaude).
  Never call the Anthropic API directly from a function body.
- Model routing: Haiku 4.5 (`claude-haiku-4-5-20251001`) for recurring cheap jobs;
  Sonnet 4.6 (`claude-sonnet-4-6`) default and for client-facing text; Fable 5
  (`claude-fable-5`) only for the Chief of Staff agent. Always set `max_tokens`.
- Keep Edge Function response shapes stable — the frontend depends on exact keys
  (`error`, `raw`, and each function's result schema).
- Agent functions must log every run to `agent_runs` (tokens, cost_usd, duration_ms, status).
- PWA install prompt does not appear in dev (`devOptions: { enabled: false }`) — expected,
  not a bug.
```

---

*Documento vivo — atualizar no fim de cada fase com o que foi entregue e aprendido.*
