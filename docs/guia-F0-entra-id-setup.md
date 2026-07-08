# F0 — Configuração Microsoft Entra ID + Graph API (Guia Manual)

**Projeto:** Kozegho Proposals — camada Microsoft (app-only **+ login SSO delegado**)
**Quem executa:** Afonso (portal Azure + dashboard Supabase + terminal)
**Duração estimada:** 40–60 min
**Pré-requisitos:** acesso de administrador ao tenant Microsoft 365 da Kozegho; decisão tomada sobre a mailbox remetente (ex.: `kozegho@kozegho.com`); Supabase CLI ligado ao projeto `yrlnvtiuonrjkvdoievj` (ou acesso ao dashboard).

> Esta versão estende o guia original: além do canal **app-only** (mailbox central, agentes),
> configura o **login "Continue with Microsoft"** e o envio/leitura de email **em nome do
> utilizador autenticado** — paridade total com o fluxo Google já em produção.
> O código correspondente já está no repo e deployado (ver secção "O que já está feito").

---

## O que já está feito (lado código — nada a fazer aqui)

- Botão **Continue with Microsoft** no ecrã de login (`LoginScreen.tsx` + `useAuth.ts`,
  provider `azure`, scopes `email offline_access Mail.Send Mail.Read`).
- Envio de propostas via **Graph `/me/sendMail`** quando a sessão é Microsoft
  (`src/services/sendEmail.ts` — o caminho Gmail continua intacto).
- Leitura de threads de email do cliente via **`graph-threads`** (Edge Function, mesma
  resposta que `gmail-threads`; o hook escolhe pela sessão).
- Canal app-only: **`_shared/msgraph.ts`** (token client-credentials + sendMail + leitura)
  e o spike **`graph-mail-spike`** (F1) — falham com mensagem clara enquanto os secrets
  abaixo não existirem.
- Lado Google: **já funciona em produção** (login Google + Gmail send/read). Nada a alterar.

---

## ⚠️ Regras de segurança (não negociável)

- O **Client Secret** é equivalente a uma password mestra das mailboxes abrangidas.
- **NUNCA** colar o secret em chats, prompts do Antigravity/Claude, screenshots ou commits.
- O secret viaja **diretamente** do portal Azure para os Supabase secrets (ou para o campo
  do provider Azure no dashboard Supabase). Mais nenhum sítio, nem temporariamente num
  ficheiro de notas.

---

## Passo 1 — Registar a aplicação

1. Abrir **entra.microsoft.com** → Identity → Applications → **App registrations** → **New registration**
2. **Name:** `Kozegho Proposals - Graph Mail`
3. **Supported account types:** *Accounts in this organizational directory only (Single tenant)*
4. **Redirect URI:** selecionar **Web** e colar
   `https://yrlnvtiuonrjkvdoievj.supabase.co/auth/v1/callback`
   *(o app-only não precisa de redirect, mas o login SSO Microsoft precisa — é o callback do Supabase Auth)*
5. **Register**

## Passo 2 — Guardar os IDs

Na página **Overview** da app, copiar:

- **Application (client) ID** → será `MS_CLIENT_ID`
- **Directory (tenant) ID** → será `MS_TENANT_ID`

(Estes dois não são secretos, mas trata-os com o mesmo cuidado.)

## Passo 3 — Criar o Client Secret

1. **Certificates & secrets** → Client secrets → **New client secret**
2. Description: `kozegho-proposals-backend` · Expires: **24 meses** — *marca a data de renovação no calendário; quando expirar, o envio para sem aviso.*
3. **Add** → copiar **imediatamente** a coluna **Value** (só é mostrada uma vez) → será `MS_CLIENT_SECRET`
4. (Recomendado) Criar um **segundo** secret `kozegho-proposals-sso`, também 24 meses — este vai para o provider Azure no Supabase (Passo 7). Ter secrets separados permite rodá-los de forma independente.

## Passo 4 — API Permissions (Graph)

1. **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**
2. Selecionar e adicionar:
   - `Mail.Send`
   - `Mail.ReadWrite`
3. **Add a permission** → **Microsoft Graph** → **Delegated permissions** *(novo — para o login SSO e o envio/leitura em nome do utilizador)*:
   - `email`, `openid`, `profile`, `offline_access`
   - `Mail.Send`
   - `Mail.Read`
4. Clicar **Grant admin consent for [Kozegho]** → o Status fica com ✓ verde em **todas** as linhas (application e delegated).

`Mail.ReadWrite` (application) fica já consentido para a fase F6 (leitura/análise da inbox central); no arranque só o envio será usado. As delegated permissions evitam o ecrã de consentimento a cada utilizador.

## Passo 5 — Guardar os secrets no Supabase

No terminal, na pasta do projeto (substituir os valores; não colar estes comandos preenchidos em mais lado nenhum):

```bash
supabase secrets set MS_TENANT_ID="<tenant id>" --project-ref yrlnvtiuonrjkvdoievj
supabase secrets set MS_CLIENT_ID="<client id>" --project-ref yrlnvtiuonrjkvdoievj
supabase secrets set MS_CLIENT_SECRET="<secret value 'backend'>" --project-ref yrlnvtiuonrjkvdoievj
supabase secrets set GRAPH_SENDER_MAILBOX="kozegho@kozegho.com" --project-ref yrlnvtiuonrjkvdoievj
supabase secrets set SPIKE_TEST_RECIPIENT="<o-teu-email-de-teste>" --project-ref yrlnvtiuonrjkvdoievj
```

Alternativa: Dashboard Supabase → Edge Functions → Secrets.

Verificar (mostra apenas os **nomes**, nunca os valores):

```bash
supabase secrets list --project-ref yrlnvtiuonrjkvdoievj
```

## Passo 6 — Application Access Policy (limitar o alcance da app)

**Porquê:** sem esta política, application permissions dão à app acesso a **todas** as mailboxes do tenant. Com ela, fica restrita apenas às que autorizares. **Obrigatório antes de uso em produção.** *(Só afeta o canal app-only; o canal delegado do login já está naturalmente limitado à mailbox do próprio utilizador.)*

No macOS, instalar PowerShell:

```bash
brew install --cask powershell
pwsh
```

Dentro do PowerShell:

```powershell
Install-Module ExchangeOnlineManagement -Scope CurrentUser
Connect-ExchangeOnline -UserPrincipalName <o-teu-admin>@kozegho.com

# 1. Grupo de segurança com as mailboxes autorizadas
New-DistributionGroup -Name "Graph Mail Allowed" -Alias graph-mail-allowed -Type Security
Add-DistributionGroupMember -Identity graph-mail-allowed -Member kozegho@kozegho.com
# (repetir Add-DistributionGroupMember para outras mailboxes, se necessário)

# 2. Política: a app só pode aceder a mailboxes deste grupo
New-ApplicationAccessPolicy -AppId "<MS_CLIENT_ID>" `
  -PolicyScopeGroupId graph-mail-allowed@kozegho.com `
  -AccessRight RestrictAccess `
  -Description "Kozegho Proposals - restrito a mailboxes autorizadas"

# 3. Testar (a política pode demorar 30-60 min a propagar)
Test-ApplicationAccessPolicy -Identity kozegho@kozegho.com -AppId "<MS_CLIENT_ID>"   # esperado: Granted
Test-ApplicationAccessPolicy -Identity <outra-mailbox>@kozegho.com -AppId "<MS_CLIENT_ID>"   # esperado: Denied
```

**Se o Passo 6 bloquear** (instalação do módulo, permissões): podes avançar para o spike F1 e concluir a política logo a seguir — o tenant é pequeno e controlado. Mas **F3 em diante não arranca sem a política aplicada e testada.**

## Passo 7 — Ativar o provider Azure no Supabase Auth *(novo — login SSO)*

1. Dashboard Supabase (projeto `yrlnvtiuonrjkvdoievj`) → **Authentication** → **Sign In / Providers** → **Azure**
2. **Enable** e preencher:
   - **Client ID:** o `MS_CLIENT_ID` (Application ID do Passo 2)
   - **Secret Value:** o secret `kozegho-proposals-sso` (Passo 3.4) — colado **diretamente** do portal Azure
   - **Azure Tenant URL:** `https://login.microsoftonline.com/<MS_TENANT_ID>`
3. **Save**
4. Teste: abrir kozegho-proposals.vercel.app numa janela anónima → **Continue with Microsoft**
   → login com uma conta `@kozegho.com` → deve entrar na app; num cliente com histórico de
   emails, o cartão de threads deve carregar (leitura Graph); enviar uma proposta de teste
   (envio Graph — a proposta sai da mailbox do próprio utilizador).

> Nota: o lado **Google** já está configurado neste ecrã (provider Google com scopes Gmail)
> — não mexer.

## Passo 8 — Spike F1 (canal app-only) *(novo)*

Com os secrets do Passo 5 gravados, invocar a função (a `<anon key>` está em Dashboard → Settings → API Keys):

```bash
curl -s -X POST \
  "https://yrlnvtiuonrjkvdoievj.supabase.co/functions/v1/graph-mail-spike" \
  -H "Authorization: Bearer <anon key>" | jq
```

Esperado:

```json
{ "ok": true, "send": { "ok": true }, "read": { "ok": true, "count": 3 } }
```

- `send.ok=true` → email de teste chegou ao `SPIKE_TEST_RECIPIENT`, enviado por `GRAPH_SENDER_MAILBOX`.
- `read.ok=false` com `send.ok=true` → normal se a Application Access Policy ainda estiver a propagar; repetir em 30–60 min.
- `missing secrets: ...` → o Passo 5 ficou incompleto; a mensagem lista exatamente o que falta.

---

## ✅ Evidência F0 (enviar ao Claude antes de arrancar o F1)

1. Screenshot de **API permissions** com admin consent ✓ verde em `Mail.Send` e `Mail.ReadWrite` (application) **e** nas delegated (`Mail.Send`, `Mail.Read`, `email`, `offline_access`)
2. Output de `supabase secrets list` (nomes das 5 variáveis visíveis)
3. Output de `Test-ApplicationAccessPolicy`: **Granted** na mailbox remetente + **Denied** numa mailbox fora do grupo — ou nota explícita de que a política fica para imediatamente após o F1
4. *(novo)* Screenshot do provider **Azure ativado** no Supabase Auth + login Microsoft bem-sucedido na app
5. *(novo)* Output JSON do `graph-mail-spike` com `"ok": true` (ou `send.ok: true` + nota da política em propagação)
