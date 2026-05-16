# Kozegho Proposals — Project State

**Version:** 1.0.0 | **Date:** May 2026 | **Status:** Production

---

## Overview

Kozegho Proposals is a commercial intelligence platform for the sales team of Kozegho, a Portuguese manufacturer of water treatment and industrial process equipment (polymer preparation systems, mixers, dosing systems, tanks, controllers).

The app enables sales managers to create and send branded PDF proposals, manage the customer portfolio with full CRM capability, and leverage Gemini 2.5 Flash AI for relationship scoring, daily commercial briefings, and automated follow-up email drafting.

---

## Production URLs

| Resource | URL / ID |
|---|---|
| App | https://kozegho-proposals.vercel.app |
| Supabase Project ID | yrlnvtiuonrjkvdoievj (eu-west-1) |
| GitHub | https://github.com/Tuktuks17/kozegho-proposals |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 3 + custom palette (#7AB648 green) |
| Auth | Supabase Auth — Google OAuth 2.0 (PKCE flow) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Backend | Supabase Edge Functions (Deno runtime) |
| AI | Google Gemini 2.5 Flash |
| Email | Gmail API (user's own OAuth token) |
| PDF | pdf-lib |
| Word export | docx |
| Hosting | Vercel (auto-deploy from main branch) |
| PWA | vite-plugin-pwa — offline queue for proposals |

---

## Features Implemented (Phase 1)

### Proposals
- Multi-section form: client, products (from Kozegho catalogue), delivery terms, payment terms, warranty, notes
- Bilingual support: PT, EN, DE, ES, FR (labels translate automatically)
- PDF generation (Kozegho branded, pdf-lib) with logo and datasheets
- Word (.docx) export
- Auto-reference system: `KZG/YYYY/MM/DD/NNN` (daily counter via DB)
- One-click email send via Gmail API (MIME multipart with PDF attachment)
- Offline queue: proposals created offline are synced when back online

### Customers CRM
- Customer list with fuzzy search (pg_trgm)
- Per-customer detail panel with:
  - Proposal history with outcome tracking (Open / Accepted / Rejected)
  - Revenue and pipeline metrics per client
  - Interaction timeline (note, call, meeting, WhatsApp, visit, other)
  - Task management (CRUD, priority, due date, status)
  - Gmail email history (last 20 threads via Gmail API)
  - AI Relationship Score (0-100, temperature: hot/warm/cold) via Gemini
  - Score invalidation banner when new activity is recorded

### Intelligence Tab
- **Daily Briefing**: on-demand Gemini analysis of full portfolio → headline, momentum badge, 3 urgent actions, opportunity, risk. Cached 4h in sessionStorage.
- **Pipeline metrics**: total revenue, pipeline value, conversion rate, active customers
- **Proposals Needing Attention**: open proposals ranked by days open (critical >14d, high 8-14d, medium 4-7d)
- **Clients at Risk**: customers with no activity in 14+ days (cold >30d, warm 14-30d)
- **Follow-up modal**: clicking "Follow up" on any attention-queue proposal generates a personalised email draft via Gemini, presents it editable (subject + HTML body), and sends via Gmail API in one click
- **Alert badge**: numeric badge on the Intelligence nav tab showing count of open proposals >7 days

### Auth & Profile
- Google OAuth login (PKCE flow)
- Name confirmation modal on each browser session
- Role field on profile (manager / salesperson) — infrastructure ready for RBAC
- Premium login page: dark #0B0B0D background, Kozegho wordmark (Bebas Neue), green grid overlay

---

## Edge Functions in Production

| Function | Trigger | What it does |
|---|---|---|
| `analyze-relationship` | User clicks "Analyse" on customer | Sends customer commercial data to Gemini 2.5 Flash → returns RelationshipScore (0-100, temperature, analysis, suggestions, risk_flags). Upserts to `relationship_scores`. |
| `analyze-portfolio` | User clicks "Generate Briefing" | Sends full portfolio snapshot to Gemini → returns daily briefing (headline, urgent[], opportunity, risk, momentum). No DB write — cached client-side. |
| `generate-followup` | User clicks "Follow up" | Sends proposal context to Gemini → returns `{subject, body}` HTML email draft. No DB write. |
| `generate-introduction` | Proposal form generation | Generates AI introduction paragraph for a proposal based on customer and products. |
| `gmail-threads` | Customer detail panel loads | Proxies Gmail API via user's OAuth token → returns last 20 email threads for the customer's email address. |
| `send-proposal` | "Send by email" in proposal form | Constructs MIME multipart email with PDF attachment and sends via Gmail API. Stores email metadata on the proposal record. |

All Edge Functions require `GEMINI_API_KEY` secret (except `gmail-threads` and `send-proposal`).

---

## Database Tables

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | = auth.users.id |
| full_name | text | display name |
| email | text | |
| role | text | 'manager' or 'salesperson' (DEFAULT 'salesperson') |
| created_at | timestamptz | |

RLS: users can only read/update their own row.

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | contact person |
| company | text | company name (fuzzy-indexed) |
| email | text | |
| country | text | ISO 2-letter code |
| created_by | uuid | → profiles |
| created_at | timestamptz | |

RLS: full CRUD scoped to `created_by = auth.uid()`.

### `proposals`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reference | text | unique, e.g. KZG/2026/01/15/001 |
| customer_id | uuid | → customers |
| salesperson_name | text | |
| language | text | PT/EN/DE/ES/FR |
| subject | text | |
| introduction | text | AI-generated |
| items | jsonb | array of ProposalItem |
| subtotal / total | numeric(10,2) | |
| validity_date | date | |
| delivery_weeks | integer | |
| packaging_type | text | standard/ocean |
| delivery_terms / payment_terms / warranty / additional_notes | text | |
| status | text | draft/exported |
| outcome | text | open/accepted/rejected |
| email_sent_at | timestamptz | |
| last_email_to / last_email_subject | text | |
| created_by | uuid | → profiles |
| created_at / updated_at | timestamptz | updated_at auto-set by trigger |

RLS: full CRUD scoped to `created_by = auth.uid()`.

### `interactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | → customers |
| created_by | uuid | → profiles |
| type | text | note/call/meeting/whatsapp/visit/other |
| content | text | |
| occurred_at | timestamptz | |
| ai_summary / ai_sentiment / ai_actions | text/int/jsonb | reserved for future AI tagging |
| created_at | timestamptz | |

RLS: all ops scoped to `created_by = auth.uid()`.

### `tasks`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | nullable → customers |
| created_by | uuid | → profiles |
| assigned_to | uuid | nullable → profiles |
| title | text | |
| due_date | date | nullable |
| priority | text | low/medium/high/urgent |
| status | text | open/done/cancelled |
| source | text | manual/ai_extracted/gmail_detected |
| source_ref | text | nullable |
| created_at / updated_at | timestamptz | |

RLS: all ops scoped to `created_by = auth.uid()`.

### `relationship_scores`
| Column | Type | Notes |
|---|---|---|
| customer_id | uuid | PK → customers |
| score | integer | 0-100 |
| temperature | text | hot/warm/cold |
| analysis | text | |
| opportunity | text | nullable |
| suggestions | jsonb | string[] |
| risk_flags | jsonb | string[] |
| last_analyzed | timestamptz | |

RLS: select allowed if `customer.created_by = auth.uid()`. Write via Edge Function service-role only.

---

## Hooks Created

| Hook | Purpose |
|---|---|
| `useAuth` | Google OAuth session, Gmail token management in sessionStorage |
| `useProfile` | User profile (name, email, role) from `profiles` table |
| `useCustomers` | Customer list with fuzzy search |
| `useCustomerProposals` | Proposals per customer; `updateOutcome()` |
| `useInteractions` | Interaction log per customer; `addInteraction()` |
| `useTasks` | Task CRUD per customer |
| `useRelationshipScore` | AI score fetch, `analyzeRelationship()`, `invalidateScore()`, `isOutdated` |
| `useGmailThreads` | Fetch Gmail threads for a customer via Edge Function |
| `useIntelligenceData` | Portfolio aggregation: metrics, attention queue, cold-risk customers |
| `useDailyBriefing` | Daily briefing generation (Gemini) with 4h sessionStorage cache |
| `useFollowUp` | Follow-up draft generation + Gmail send; full state machine |
| `useAlertCount` | COUNT of open proposals >7 days for the header alert badge |
| `useOfflineQueue` | PWA offline proposal queue with sync on reconnect |
| `useOnline` | Network status (online/offline) |
| `useProducts` | Product catalogue from Supabase Storage |
| `useProposalForm` | Multi-section proposal form state |
| `useProposalReference` | Auto-generates daily reference (KZG/YYYY/MM/DD/NNN) |
| `useDraft` | Proposal draft persistence between sessions |

---

## Environment Variables Required

### Vercel (frontend — build-time)
```
VITE_SUPABASE_URL=https://yrlnvtiuonrjkvdoievj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
```

### Supabase Edge Functions (secrets)
```
GEMINI_API_KEY=<Google AI Studio API key>
SUPABASE_URL=<set automatically by Supabase>
SUPABASE_SERVICE_ROLE_KEY=<set automatically by Supabase>
```

### Google OAuth (Supabase Auth providers)
- Provider: Google
- Scopes: `https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly`
- Authorized redirect URI: `https://yrlnvtiuonrjkvdoievj.supabase.co/auth/v1/callback`

---

## Manual Steps Required for a New Deploy

1. **Supabase project**: create project, note URL and anon key
2. **Run migrations in order** via SQL Editor:
   - `001_initial_schema.sql`
   - `20260515000000_crm_base.sql`
   - `20260515100000_proposal_outcome.sql`
   - `20260516100000_add_role_to_profiles.sql`
3. **Configure Google OAuth** in Supabase Auth providers with gmail scopes
4. **Create Supabase Storage bucket** `datasheets` (public read)
5. **Deploy Edge Functions** via Supabase Dashboard (create each function, paste code):
   - `analyze-relationship`
   - `analyze-portfolio`
   - `generate-followup`
   - `generate-introduction`
   - `gmail-threads`
   - `send-proposal`
6. **Set Edge Function secret**: `GEMINI_API_KEY` in Supabase → Settings → Edge Functions → Secrets
7. **Vercel**: connect GitHub repo, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, deploy
8. **Add Vercel domain** to Supabase Auth → URL Configuration → Site URL + Redirect URLs

---

## Security Audit Notes (May 2026)

### Finding 1 — Gmail token in sessionStorage
**Location:** `src/hooks/useAuth.ts` lines 19-22  
**Detail:** After Google sign-in, the OAuth `provider_token` (Gmail access token) is stored in `sessionStorage` as `kp:gmail_token`. It is read by `sendEmail.ts` and passed in the request body to the `gmail-threads` Edge Function.  
**Risk level:** Low-Medium for an internal B2B app.  
**Mitigating factors:** sessionStorage is cleared when the tab closes and is not accessible cross-origin. Token is also removed on sign-out.  
**Recommendation for Phase 2:** Implement server-side Gmail token handling via a backend service with OAuth refresh token storage, eliminating client-side token exposure.

### Finding 2 — CORS wildcard on all Edge Functions
**Location:** All Edge Functions (`CORS['Access-Control-Allow-Origin'] = '*'`)  
**Detail:** All Edge Functions accept requests from any origin. Combined with the Supabase JWT requirement on the `Authorization` header, this is effectively protected — unauthenticated callers cannot obtain a valid JWT. However, wildcard CORS is not best practice for production.  
**Risk level:** Low given JWT auth layer.  
**Recommendation for Phase 2:** Restrict `Access-Control-Allow-Origin` to `https://kozegho-proposals.vercel.app`.

### Finding 3 — No exposed secrets in repository
**Status:** Clean.  
**Detail:** No `.env.local` found in the working directory. The `.gitignore` includes `*.local` which covers `.env.local`. Supabase anon key is a Vercel build-time variable, not committed to source.

### Finding 4 — relationship_scores write via service-role only
**Status:** Correctly implemented.  
**Detail:** RLS on `relationship_scores` allows SELECT for the customer owner but has no INSERT/UPDATE policy for regular users. Writes happen exclusively through the `analyze-relationship` Edge Function using the service-role key. This prevents users from self-awarding AI scores.

---

## Known Limitations

- **Gmail token lifespan:** Google access tokens expire after 1 hour. If the user's session is longer, Gmail features (email history, send) will fail with 401 until sign-out and sign-in. Users must re-authenticate to refresh the token.
- **Edge Function cold starts:** Supabase free tier Edge Functions have cold starts (~1-2s on first call per session).
- **Daily Briefing not automatic:** The briefing is generated on-demand. The spec called for a 9:00 AM cron — this requires Supabase scheduled functions or an external cron service (not available on free tier).
- **relationship_scores no user-scoped RLS for write:** Only one score per customer — if multiple salespeople share a customer (future RBAC scenario), scores would collide.
- **No pagination:** Customer list, proposal history, and interaction timeline load all records. Performance impact starts around 200+ records per entity.
- **RBAC not enforced:** The `role` field exists on profiles but no feature gating is implemented yet. All authenticated users see all features.

---

## Next Phase — Roadmap

- **RBAC enforcement:** gate features by role (manager sees Intelligence + all customers; salesperson sees only own customers and proposals)
- **Google Calendar sync:** create follow-up calendar events from the follow-up modal
- **Daily briefing cron:** auto-generate and push-notify briefing at 09:00 via Supabase scheduled functions or Vercel cron
- **Score event-driven refresh:** rebuild relationship_scores automatically on proposal/interaction writes (via DB webhook or pg_notify)
- **Weekly performance email:** auto-generated summary email every Monday morning
- **Login page with team photos:** personalised greeting with salesperson avatar from Google profile
- **Gmail token refresh:** implement refresh token flow to handle >1h sessions without re-authentication
- **CORS hardening:** restrict Edge Function origins to production domain
