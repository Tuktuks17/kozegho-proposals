import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GREEN = '#7AB648'
const DARK = '#333333'
const GREY = '#F5F5F5'

type ItemOption = { label: string; price: number }
type ProposalItem = {
  product_name: string
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  line_total: number
  options: ItemOption[]
}
type DatasheetPath = { path: string; productName: string }

type Payload = {
  proposalNumber: string
  subject: string
  createdAt: string
  validityDate: string | null
  deliveryWeeks: number | null
  packagingType: string | null
  deliveryTerms: string | null
  paymentTerms: string | null
  warranty: string | null
  additionalNotes: string | null
  introduction: string | null
  subtotal: number
  total: number
  language: string
  items: ProposalItem[]
  clientEmail: string
  clientName: string
  clientCompany: string
  clientCountry: string
  commercialName: string
  datasheetPaths: DatasheetPath[]
  proposalId: string
  senderEmail?: string
}

// ── Labels ────────────────────────────────────────────────────────────────────

type L = {
  title: string; reference: string; date: string; validUntil: string
  company: string; contact: string; country: string; subject: string
  description: string; qty: string; basePrice: string; options: string
  lineTotal: string; subtotal: string; total: string; conditions: string
  delivery: string; weeks: string; packaging: string; packagingStd: string
  packagingOcean: string; paymentTerms: string; warranty: string
  notes: string; preparedBy: string; greeting: string; closing: string
}
const LABELS: Record<string, L> = {
  pt: { title: 'Proposta Comercial', reference: 'Referência', date: 'Data',
    validUntil: 'Válida até', company: 'Empresa', contact: 'Contacto', country: 'País',
    subject: 'Assunto', description: 'Descrição', qty: 'Qtd.', basePrice: 'Preço Base (€)',
    options: 'Opções', lineTotal: 'Valor (€)', subtotal: 'Subtotal', total: 'TOTAL PROPOSTA (Excl. IVA)',
    conditions: 'Termos e Condições', delivery: 'Prazo de Entrega', weeks: 'semanas',
    packaging: 'Embalagem', packagingStd: 'Standard', packagingOcean: 'Marítima',
    paymentTerms: 'Condições de Pagamento', warranty: 'Garantia', notes: 'Notas Adicionais',
    preparedBy: 'Elaborado por', greeting: 'Exmo(a). Sr(a).', closing: 'Com os melhores cumprimentos' },
  en: { title: 'Commercial Proposal', reference: 'Reference', date: 'Date',
    validUntil: 'Valid Until', company: 'Company', contact: 'Contact', country: 'Country',
    subject: 'Subject', description: 'Description', qty: 'Qty.', basePrice: 'Base Price (€)',
    options: 'Options', lineTotal: 'Value (€)', subtotal: 'Subtotal', total: 'TOTAL PROPOSAL (Excl. VAT)',
    conditions: 'Terms & Conditions', delivery: 'Delivery Time', weeks: 'weeks',
    packaging: 'Packaging', packagingStd: 'Standard', packagingOcean: 'Ocean Freight',
    paymentTerms: 'Payment Terms', warranty: 'Warranty', notes: 'Additional Notes',
    preparedBy: 'Prepared by', greeting: 'Dear', closing: 'Kind regards' },
  fr: { title: 'Proposition Commerciale', reference: 'Référence', date: 'Date',
    validUntil: "Valable jusqu'au", company: 'Société', contact: 'Contact', country: 'Pays',
    subject: 'Objet', description: 'Description', qty: 'Qté.', basePrice: 'Prix de Base (€)',
    options: 'Options', lineTotal: 'Valeur (€)', subtotal: 'Sous-total', total: 'TOTAL OFFRE (HT)',
    conditions: 'Termes et Conditions', delivery: 'Délai de Livraison', weeks: 'semaines',
    packaging: 'Emballage', packagingStd: 'Standard', packagingOcean: 'Maritime',
    paymentTerms: 'Conditions de Paiement', warranty: 'Garantie', notes: 'Notes Complémentaires',
    preparedBy: 'Établi par', greeting: 'Madame, Monsieur', closing: 'Cordialement' },
  es: { title: 'Propuesta Comercial', reference: 'Referencia', date: 'Fecha',
    validUntil: 'Válida hasta', company: 'Empresa', contact: 'Contacto', country: 'País',
    subject: 'Asunto', description: 'Descripción', qty: 'Cant.', basePrice: 'Precio Base (€)',
    options: 'Opciones', lineTotal: 'Valor (€)', subtotal: 'Subtotal', total: 'TOTAL PROPUESTA (Excl. IVA)',
    conditions: 'Términos y Condiciones', delivery: 'Plazo de Entrega', weeks: 'semanas',
    packaging: 'Embalaje', packagingStd: 'Estándar', packagingOcean: 'Marítimo',
    paymentTerms: 'Condiciones de Pago', warranty: 'Garantía', notes: 'Notas Adicionales',
    preparedBy: 'Elaborado por', greeting: 'Estimado/a', closing: 'Atentamente' },
  de: { title: 'Angebot', reference: 'Referenz', date: 'Datum',
    validUntil: 'Gültig bis', company: 'Unternehmen', contact: 'Ansprechpartner', country: 'Land',
    subject: 'Betreff', description: 'Beschreibung', qty: 'Mge.', basePrice: 'Basispreis (€)',
    options: 'Optionen', lineTotal: 'Wert (€)', subtotal: 'Zwischensumme', total: 'GESAMTSUMME (exkl. MwSt.)',
    conditions: 'Geschäftsbedingungen', delivery: 'Lieferzeit', weeks: 'Wochen',
    packaging: 'Verpackung', packagingStd: 'Standard', packagingOcean: 'Seefracht',
    paymentTerms: 'Zahlungsbedingungen', warranty: 'Garantie', notes: 'Zusätzliche Hinweise',
    preparedBy: 'Erstellt von', greeting: 'Sehr geehrte(r)', closing: 'Mit freundlichen Grüßen' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, lang: string): string {
  const locale = lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'pt-PT'
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—'
  const locale = lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'pt-PT'
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, Math.min(i + chunkSize, bytes.length)))
  }
  return btoa(binary)
}

// ── HTML generator ────────────────────────────────────────────────────────────

function buildEmailHtml(p: Payload): string {
  const lang = p.language.toLowerCase()
  const L = LABELS[lang] ?? LABELS.pt
  const packagingLabel = p.packagingType === 'ocean' ? L.packagingOcean : L.packagingStd

  const itemRows = p.items.map((item, i) => {
    const optsText = item.options?.length
      ? item.options.map(o => `• ${o.label}: €&nbsp;${fmt(o.price, lang)}`).join('<br/>')
      : '—'
    const lineValue = item.line_total + (item.options?.reduce((s, o) => s + o.price, 0) ?? 0)
    const bg = i % 2 === 1 ? GREY : '#FFFFFF'
    return `
      <tr style="background:${bg}; border-bottom: 1px solid #E0E0E0;">
        <td style="padding:8px 10px; font-size:12px;">${item.description || item.product_name}</td>
        <td style="padding:8px 10px; font-size:12px; text-align:center;">${item.quantity}</td>
        <td style="padding:8px 10px; font-size:12px; text-align:right;">€ ${fmt(item.unit_price, lang)}</td>
        <td style="padding:8px 10px; font-size:11px; color:#666;">${optsText}</td>
        <td style="padding:8px 10px; font-size:12px; text-align:right; font-weight:bold;">€ ${fmt(lineValue, lang)}</td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- Header -->
  <tr><td style="background:${GREEN};padding:20px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="font-size:24px;font-weight:bold;color:#fff;font-family:Arial,sans-serif;">Kozegho</span><br/>
          <span style="font-size:11px;color:rgba(255,255,255,.8);font-family:Arial,sans-serif;">Kozegho dosing systems</span></td>
      <td align="right" style="font-family:Arial,sans-serif;color:rgba(255,255,255,.9);font-size:12px;">
        <strong>${L.reference}:</strong> ${p.proposalNumber}<br/>
        ${L.date}: ${fmtDate(p.createdAt, lang)}
      </td>
    </tr></table>
  </td></tr>

  <!-- Subject bar -->
  <tr><td style="background:#EDF7E0;padding:14px 30px;border-bottom:2px solid ${GREEN};">
    <span style="font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:${DARK};">${L.title} – ${p.subject}</span>
  </td></tr>

  <!-- Client info -->
  <tr><td style="padding:20px 30px 10px;">
    <table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:12px;color:${DARK};border:1px solid #E0E0E0;width:100%;">
      <tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;width:30%;">${L.company}</td>
          <td style="padding:6px 10px;">${p.clientCompany}</td></tr>
      ${p.clientName ? `<tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;">${L.contact}</td>
          <td style="padding:6px 10px;">${p.clientName}</td></tr>` : ''}
      <tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;">${L.country}</td>
          <td style="padding:6px 10px;">${p.clientCountry}</td></tr>
      <tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;">${L.validUntil}</td>
          <td style="padding:6px 10px;">${fmtDate(p.validityDate, lang)}</td></tr>
    </table>
  </td></tr>

  <!-- Greeting + intro -->
  <tr><td style="padding:10px 30px 20px;font-family:Arial,sans-serif;font-size:13px;color:${DARK};line-height:1.6;">
    ${p.clientName ? `<p style="margin:0 0 12px;">${L.greeting} <strong>${p.clientName}</strong>,</p>` : ''}
    ${p.introduction ? `<p style="margin:0 0 12px;font-style:italic;color:#555;">${p.introduction}</p>` : ''}
  </td></tr>

  <!-- Products table -->
  <tr><td style="padding:0 30px 20px;">
    <p style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:${GREEN};margin:0 0 8px;">${L.description}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E0E0E0;border-collapse:collapse;">
      <thead>
        <tr style="background:${GREEN};">
          <th style="padding:9px 10px;font-family:Arial,sans-serif;font-size:12px;color:#fff;text-align:left;width:33%;">${L.description}</th>
          <th style="padding:9px 10px;font-family:Arial,sans-serif;font-size:12px;color:#fff;text-align:center;width:7%;">${L.qty}</th>
          <th style="padding:9px 10px;font-family:Arial,sans-serif;font-size:12px;color:#fff;text-align:right;width:15%;">${L.basePrice}</th>
          <th style="padding:9px 10px;font-family:Arial,sans-serif;font-size:12px;color:#fff;text-align:left;width:30%;">${L.options}</th>
          <th style="padding:9px 10px;font-family:Arial,sans-serif;font-size:12px;color:#fff;text-align:right;width:15%;">${L.lineTotal}</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr style="background:#EDF7E0;">
          <td colspan="4" style="padding:10px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:${GREEN};text-align:right;">${L.total}</td>
          <td style="padding:10px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:${GREEN};text-align:right;">€ ${fmt(p.total, lang)}</td>
        </tr>
      </tfoot>
    </table>
  </td></tr>

  <!-- Conditions -->
  <tr><td style="padding:0 30px 20px;">
    <p style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:${GREEN};margin:0 0 8px;">${L.conditions}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:12px;color:${DARK};border:1px solid #E0E0E0;">
      ${p.validityDate ? `<tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;width:30%;">${L.validUntil}</td><td style="padding:6px 10px;">${fmtDate(p.validityDate, lang)}</td></tr>` : ''}
      ${p.deliveryWeeks ? `<tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;">${L.delivery}</td><td style="padding:6px 10px;">${p.deliveryWeeks} ${L.weeks}</td></tr>` : ''}
      ${p.packagingType ? `<tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;">${L.packaging}</td><td style="padding:6px 10px;">${packagingLabel}</td></tr>` : ''}
      ${p.deliveryTerms ? `<tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;">${L.conditions}</td><td style="padding:6px 10px;">${p.deliveryTerms}</td></tr>` : ''}
      ${p.paymentTerms ? `<tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;">${L.paymentTerms}</td><td style="padding:6px 10px;">${p.paymentTerms}</td></tr>` : ''}
      ${p.warranty ? `<tr><td style="background:#F5F5F5;padding:6px 10px;font-weight:bold;">${L.warranty}</td><td style="padding:6px 10px;">${p.warranty}</td></tr>` : ''}
    </table>
    ${p.additionalNotes ? `<p style="font-size:12px;color:#555;margin:8px 0 0;font-style:italic;">${L.notes}: ${p.additionalNotes}</p>` : ''}
  </td></tr>

  <!-- Signature -->
  <tr><td style="padding:10px 30px 24px;font-family:Arial,sans-serif;font-size:13px;color:${DARK};line-height:1.7;">
    <p style="margin:0 0 4px;">${L.closing},</p>
    <p style="margin:0;"><strong>${p.commercialName}</strong><br/>Kozegho, Lda.</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:${GREEN};padding:14px 30px;text-align:center;">
    <span style="font-family:Arial,sans-serif;font-size:11px;color:#fff;">
      Kozegho, Lda.&nbsp;&nbsp;|&nbsp;&nbsp;www.kozegho.com&nbsp;&nbsp;|&nbsp;&nbsp;kozegho@kozegho.com
    </span>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

// ── Edge Function ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return json({ success: false, error: 'RESEND_API_KEY not configured — add it in Supabase Dashboard → Settings → Edge Functions → Secrets' }, 500)
    }

    const payload = (await req.json()) as Payload

    if (!payload.clientEmail || !payload.proposalId) {
      return json({ success: false, error: 'Missing required fields: clientEmail, proposalId' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const lang = payload.language.toLowerCase()
    const langSuffix = lang === 'en' ? 'GB' : lang.toUpperCase()

    // ── Download datasheets (only attachments) ────────────────────────────────
    const attachments: Array<{ filename: string; content: string; content_type: string }> = []

    for (const { path, productName } of payload.datasheetPaths ?? []) {
      if (!path) continue
      try {
        const { data: blob, error } = await supabase.storage.from('datasheets').download(path)
        if (error || !blob) continue
        const base64 = uint8ToBase64(new Uint8Array(await blob.arrayBuffer()))
        attachments.push({
          filename: `${productName}_Datasheet_${langSuffix}.pdf`,
          content: base64,
          content_type: 'application/pdf',
        })
      } catch { /* skip missing datasheets silently */ }
    }

    // ── Build email subject + HTML body ───────────────────────────────────────
    const SUBJECTS: Record<string, string> = {
      pt: 'Proposta Comercial Kozegho', en: 'Kozegho Commercial Proposal',
      fr: 'Offre Commerciale Kozegho', es: 'Propuesta Comercial Kozegho', de: 'Kozegho Angebot',
    }
    const emailSubject = `${SUBJECTS[lang] ?? SUBJECTS.pt} – ${payload.proposalNumber}`
    const emailHtml = buildEmailHtml(payload)

    // ── Send via Resend ───────────────────────────────────────────────────────
    const resend = new Resend(apiKey)
    const { error: sendError } = await resend.emails.send({
      from: 'Kozegho <onboarding@resend.dev>',
      to: [payload.clientEmail],
      subject: emailSubject,
      html: emailHtml,
      ...(payload.senderEmail ? { reply_to: [payload.senderEmail] } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
    })

    if (sendError) return json({ success: false, error: sendError.message }, 400)

    // ── Update proposal record ────────────────────────────────────────────────
    await supabase.from('proposals').update({
      email_sent_at: new Date().toISOString(),
      last_email_to: payload.clientEmail,
      last_email_subject: emailSubject,
    }).eq('id', payload.proposalId)

    return json({ success: true, attachmentsCount: attachments.length })
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
