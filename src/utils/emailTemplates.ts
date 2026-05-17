import type { ProposalItem, PackagingType } from '@/types/proposal'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'

type EmailParams = {
  clientName: string
  clientCompany: string
  proposalNumber: string
  subject: string
  commercialName: string
  datasheetCount: number
  introduction?: string | null
  items?: ProposalItem[]
  subtotal?: number
  total?: number
  validUntil?: string | null
  deliveryWeeks?: number | null
  packagingType?: PackagingType | null
  deliveryTerms?: string | null
  paymentTerms?: string | null
  warranty?: string | null
  additionalNotes?: string | null
  createdAt?: string
}

const GREEN = '#7AB648'
const DARK = '#333333'
const BORDER = '#E5E5E5'
const INTRO_BG = '#F4F9EE'
const TOTAL_BG = '#EDF7E0'
// White logo on transparent background — for use on green header band in email.
// DO NOT use filter:brightness(0) invert(1) here — Gmail strips CSS filter.
const LOGO_URL_WHITE = 'https://yrlnvtiuonrjkvdoievj.supabase.co/storage/v1/object/public/logos/kozegho-logo-white.png'

function fmtDate(iso: string | null | undefined, language: string): string {
  if (!iso) return ''
  try {
    const locale = language === 'PT' ? 'pt-PT' : language === 'DE' ? 'de-DE' : language === 'FR' ? 'fr-FR' : language === 'ES' ? 'es-ES' : 'en-GB'
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function fmtMoney(value: number | undefined, language: string): string {
  if (value == null) return ''
  const locale = language === 'PT' || language === 'ES' || language === 'FR' ? 'pt-PT' : language === 'DE' ? 'de-DE' : 'en-GB'
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function getPkgLabel(type: PackagingType | null | undefined, language: string): string {
  const lbl = PROPOSAL_LABELS[language as keyof typeof PROPOSAL_LABELS] ?? PROPOSAL_LABELS.EN
  if (!type) return lbl.packagingStandard
  return type === 'ocean' ? lbl.packagingOcean : lbl.packagingStandard
}

// ── Items table (email-safe: tables only, inline CSS) ──────────────────────────

function itemsTable(items: ProposalItem[], language: string, totalOverride?: number): string {
  const lbl = PROPOSAL_LABELS[language as keyof typeof PROPOSAL_LABELS] ?? PROPOSAL_LABELS.EN

  const thStyle = `background-color:${GREEN};color:#ffffff;padding:10px 12px;text-align:left;font-size:12px;font-weight:700;border:none;`
  const header = `
    <tr>
      <th style="${thStyle}">${lbl.description}</th>
      <th style="${thStyle}text-align:center;">${lbl.qtyShort}</th>
      <th style="${thStyle}text-align:right;white-space:nowrap;">${lbl.unitPrice} (€)</th>
      <th style="${thStyle}">${lbl.options}</th>
      <th style="${thStyle}text-align:right;white-space:nowrap;">${lbl.total} (€)</th>
    </tr>`

  const rows = items.map((item) => {
    const tdBase = `padding:10px 12px;border-bottom:1px solid ${BORDER};vertical-align:top;font-size:13px;color:${DARK};`
    const basePrice = item.unit_price - item.options.reduce((s, o) => s + o.price, 0)

    // Description: product name bold + description variant below
    const descHtml = (item.description && item.description !== item.product_name)
      ? `<div style="font-weight:700;color:${DARK};font-size:13px;">${item.product_name}</div><div style="color:#666666;font-size:12px;margin-top:3px;">${item.description}</div>`
      : `<div style="font-weight:700;color:${DARK};font-size:13px;">${item.product_name}</div>`

    // Options: one bullet row per option (email-safe, no <ul>)
    const optsHtml = item.options.length === 0
      ? `<span style="color:#AAAAAA;font-size:12px;">&#8212;</span>`
      : item.options.map(o => {
          const priceStr = o.price > 0
            ? ` (+${fmtMoney(o.price, language)}&nbsp;&#8364;)`
            : o.price < 0
            ? ` (${fmtMoney(o.price, language)}&nbsp;&#8364;)`
            : ''
          return `<div style="font-size:12px;color:#444444;line-height:1.4;padding:1px 0;"><span style="color:${GREEN};margin-right:4px;">&#8226;</span>${o.label}${priceStr}</div>`
        }).join('')

    return `<tr>
      <td style="${tdBase}">${descHtml}</td>
      <td style="${tdBase}text-align:center;">${item.quantity}</td>
      <td style="${tdBase}text-align:right;">${fmtMoney(basePrice, language)}</td>
      <td style="${tdBase}">${optsHtml}</td>
      <td style="${tdBase}text-align:right;font-weight:700;">${fmtMoney(item.line_total, language)}</td>
    </tr>`
  }).join('')

  const displayTotal = totalOverride ?? items.reduce((s, i) => s + i.line_total, 0)
  const totalRow = `
    <tr>
      <td colspan="4" style="padding:10px 12px;text-align:right;font-weight:700;font-size:12px;color:${DARK};background-color:${TOTAL_BG};text-transform:uppercase;letter-spacing:0.5px;">
        ${lbl.total}
      </td>
      <td style="padding:10px 12px;text-align:right;font-weight:700;font-size:15px;color:${GREEN};background-color:${TOTAL_BG};white-space:nowrap;">
        ${fmtMoney(displayTotal, language)}&nbsp;&#8364;
      </td>
    </tr>`

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER};">
      <thead>${header}</thead>
      <tbody>${rows}${totalRow}</tbody>
    </table>`
}

// ── Terms 2-column grid (email-safe: nested tables, no emoji) ──────────────────

function termsGrid(params: EmailParams, language: string): string {
  const lbl = PROPOSAL_LABELS[language as keyof typeof PROPOSAL_LABELS] ?? PROPOSAL_LABELS.EN

  // Each cell: 3px green left bar (dedicated narrow <td>) + content <td>
  // width="3" HTML attr + min-width:3px prevent collapse in Outlook; no border-collapse on inner table
  const cell = (label: string, value: string) => `
    <table cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
      <tr>
        <td width="3" style="width:3px;min-width:3px;background-color:${GREEN};padding:0;font-size:0;line-height:0;">&nbsp;</td>
        <td style="padding:10px 14px;vertical-align:top;">
          <div style="font-size:10px;font-weight:700;color:${GREEN};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;font-family:Arial,Helvetica,sans-serif;">${label}</div>
          <div style="font-size:13px;color:${DARK};font-family:Arial,Helvetica,sans-serif;">${value || '&#8212;'}</div>
        </td>
      </tr>
    </table>`

  const validUntil = fmtDate(params.validUntil, language)
  const deliveryTime = params.deliveryWeeks ? `${params.deliveryWeeks} ${lbl.weeks}` : '&#8212;'
  const delivery = params.deliveryTerms || lbl.defaultDeliveryTerms
  const pkg = getPkgLabel(params.packagingType, language)
  const payment = params.paymentTerms || lbl.defaultPaymentTerms
  const warranty = params.warranty || lbl.defaultWarranty

  const rows = [
    [{ label: lbl.validUntil, value: validUntil }, { label: lbl.packaging, value: pkg }],
    [{ label: lbl.deliveryTime, value: deliveryTime }, { label: lbl.paymentTerms, value: payment }],
    [{ label: lbl.deliveryTerms, value: delivery }, { label: lbl.warranty, value: warranty }],
  ]

  const tableRows = rows.map(([left, right], i) => {
    const borderBottom = i < rows.length - 1 ? `border-bottom:1px solid ${BORDER};` : ''
    return `
      <tr>
        <td style="width:50%;${borderBottom}padding:0;vertical-align:top;">
          ${cell(left.label, left.value)}
        </td>
        <td style="width:50%;${borderBottom}padding:0;vertical-align:top;">
          ${cell(right.label, right.value)}
        </td>
      </tr>`
  }).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${tableRows}
    </table>`
}

// ── Main email builder ─────────────────────────────────────────────────────────

export function buildEmailBody(language: string, params: EmailParams): string {
  const lang = language.toUpperCase() as keyof typeof PROPOSAL_LABELS
  const lbl = PROPOSAL_LABELS[lang] ?? PROPOSAL_LABELS.EN
  const dateStr = fmtDate(params.createdAt ?? new Date().toISOString(), language)

  const intro = params.introduction?.trim() || lbl.fallbackIntroduction
  const hasItems = params.items && params.items.length > 0
  const hasTerms = !!(params.validUntil || params.deliveryWeeks || params.paymentTerms || params.deliveryTerms || params.warranty || params.packagingType)

  const datasheetLine = params.datasheetCount === 1
    ? lbl.datasheetsAttachedSingular
    : lbl.datasheetsAttachedPlural.replace('{n}', String(params.datasheetCount))

  return `<!DOCTYPE html>
<html lang="${lang.toLowerCase()}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${params.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F0F0;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F0F0;padding:24px 0;">
<tr><td align="center">

<!-- ═══ OUTER CARD ═══════════════════════════════════════════════════════════ -->
<table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background-color:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px #CCCCCC;">

  <!-- ── 1. GREEN HEADER BAND: logo left | divider | reference right ──────── -->
  <tr>
    <td style="background-color:${GREEN};padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- DO NOT add filter CSS here — Gmail strips it. Use the real white PNG. -->
          <td style="padding:20px 28px;vertical-align:middle;">
            <img src="${LOGO_URL_WHITE}" alt="Kozegho dosing systems"
                 width="180" height="60"
                 style="display:block;border:0;outline:none;text-decoration:none;" />
          </td>
          <!-- Vertical divider line -->
          <td width="1" style="width:1px;background-color:#9CC676;padding:0;font-size:0;line-height:0;">&nbsp;</td>
          <!-- Reference block: white text right-aligned -->
          <td style="padding:20px 28px;vertical-align:middle;text-align:right;">
            <div style="font-size:11px;color:#D5E8C6;font-family:Arial,Helvetica,sans-serif;">${lbl.reference}</div>
            <div style="font-size:20px;font-weight:700;color:#ffffff;margin-top:3px;font-family:Arial,Helvetica,sans-serif;">${params.proposalNumber}</div>
            <div style="font-size:12px;color:#D5E8C6;margin-top:5px;font-family:Arial,Helvetica,sans-serif;">${dateStr}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── 2. GREEN DIVIDER LINE ────────────────────────────────────────────── -->
  <tr>
    <td style="height:2px;background-color:${GREEN};font-size:0;line-height:0;">&nbsp;</td>
  </tr>

  <!-- ── 3. SUBJECT + GREEN UNDERLINE ─────────────────────────────────────── -->
  <tr>
    <td width="100%" style="width:100%;padding:24px 28px 0 28px;background-color:#ffffff;">
      <div style="font-size:22px;font-weight:700;color:${DARK};font-family:Arial,Helvetica,sans-serif;line-height:1.2;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;text-transform:capitalize;">${params.subject}</div>
      <div style="width:80px;height:2px;background-color:${GREEN};margin-top:6px;"></div>
    </td>
  </tr>

  <!-- ── BODY CONTENT ──────────────────────────────────────────────────────── -->
  <tr>
    <td style="padding:20px 28px 28px 28px;background-color:#ffffff;">

      <!-- ── 4. INTRO BLOCK: light green bg + green left bar ──────────────── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
        <tr>
          <td style="background-color:${INTRO_BG};padding:0;border-radius:4px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:3px;background-color:${GREEN};">&nbsp;</td>
                <td style="padding:14px 16px;">
                  <p style="margin:0;font-size:14px;color:#3A3A3A;line-height:1.75;font-style:italic;font-family:Arial,Helvetica,sans-serif;">${intro}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- ── 5. ITEMS TABLE ────────────────────────────────────────────────── -->
      ${hasItems ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
        <tr><td>${itemsTable(params.items!, language, params.total)}</td></tr>
      </table>` : ''}

      <!-- ── 6. TERMS AND CONDITIONS ───────────────────────────────────────── -->
      ${hasTerms ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
        <!-- Section divider -->
        <tr><td style="height:1px;background-color:${BORDER};font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Section title -->
        <tr>
          <td style="padding:16px 0 10px 0;">
            <div style="font-size:11px;font-weight:700;color:#555555;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">${lbl.termsAndConditions}</div>
          </td>
        </tr>
        <!-- Terms grid -->
        <tr><td>${termsGrid(params, language)}</td></tr>
      </table>` : ''}

      <!-- ── ADDITIONAL NOTES ──────────────────────────────────────────────── -->
      ${params.additionalNotes ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
        <tr>
          <td style="background-color:#F5F5F5;border-radius:4px;padding:12px 16px;">
            <div style="font-size:11px;font-weight:700;color:#888888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-family:Arial,Helvetica,sans-serif;">${lbl.additionalNotes}</div>
            <div style="font-size:13px;color:${DARK};font-family:Arial,Helvetica,sans-serif;">${params.additionalNotes}</div>
          </td>
        </tr>
      </table>` : ''}

      <!-- ── 7. ATTACHMENTS LINE ───────────────────────────────────────────── -->
      ${params.datasheetCount > 0 ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="height:1px;background-color:#E5E5E5;font-size:0;line-height:0;padding-bottom:16px;">&nbsp;</td></tr>
        <tr>
          <td style="font-size:13px;color:#555555;font-family:Arial,Helvetica,sans-serif;">
            <span style="margin-right:4px;">📎</span>${datasheetLine}
          </td>
        </tr>
      </table>` : ''}

      <!-- ── 8. SIGNATURE ─────────────────────────────────────────────────── -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-top:1px solid ${BORDER};padding-top:16px;margin-top:8px;">
            <div style="font-size:15px;font-weight:700;color:${DARK};font-family:Arial,Helvetica,sans-serif;">${params.commercialName}</div>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- ── 9. BOTTOM GREEN FOOTER BAND ──────────────────────────────────────── -->
  <tr>
    <td style="background-color:${GREEN};padding:14px 28px;text-align:center;">
      <span style="color:#ffffff;font-size:12px;font-family:Arial,Helvetica,sans-serif;">
        Kozegho, Lda.&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://www.kozegho.com" style="color:#ffffff;text-decoration:underline;font-family:Arial,Helvetica,sans-serif;">www.kozegho.com</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="mailto:kozegho@kozegho.com" style="color:#ffffff;text-decoration:underline;font-family:Arial,Helvetica,sans-serif;">kozegho@kozegho.com</a>
      </span>
    </td>
  </tr>

</table>
<!-- ═══ END CARD ════════════════════════════════════════════════════════════ -->

</td></tr>
</table>

</body>
</html>`
}

export const EMAIL_SUBJECTS: Record<string, string> = {
  PT: 'Proposta Comercial Kozegho',
  EN: 'Kozegho Commercial Proposal',
  FR: 'Offre Commerciale Kozegho',
  ES: 'Propuesta Comercial Kozegho',
  DE: 'Kozegho Angebot',
}

export function buildEmailSubject(language: string, proposalNumber: string): string {
  const lang = language.toUpperCase()
  const prefix = EMAIL_SUBJECTS[lang] ?? EMAIL_SUBJECTS.PT
  return `${prefix} – ${proposalNumber}`
}
