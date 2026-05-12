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
const DARK = '#1C2B1C'
const GREY_BG = '#F5F5F5'
const BORDER = '#E0E0E0'
const LOGO_URL = 'https://yrlnvtiuonrjkvdoievj.supabase.co/storage/v1/object/public/logos/kozegho-logo.png'

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

function packagingLabel(type: PackagingType | null | undefined, language: string): string {
  const lbl = PROPOSAL_LABELS[language as keyof typeof PROPOSAL_LABELS] ?? PROPOSAL_LABELS.EN
  if (!type) return lbl.packagingStandard
  return type === 'ocean' ? lbl.packagingOcean : lbl.packagingStandard
}

function itemsTable(items: ProposalItem[], language: string): string {
  const lbl = PROPOSAL_LABELS[language as keyof typeof PROPOSAL_LABELS] ?? PROPOSAL_LABELS.EN
  const headerCells = [lbl.description, lbl.qtyShort, `${lbl.unitPrice} (€)`, lbl.options, `${lbl.total} (€)`]
  const header = `
    <tr>
      ${headerCells.map(c => `<th style="background:${GREEN};color:#fff;padding:10px 12px;text-align:left;font-size:13px;font-weight:600;border:none;">${c}</th>`).join('')}
    </tr>`

  const rows = items.map((item, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#FAFAFA'
    const optsList = item.options.length > 0
      ? `<ul style="margin:4px 0 0 0;padding:0 0 0 16px;font-size:12px;color:#555;">${item.options.map(o => `<li>${o.label}${o.price > 0 ? ` (+${fmtMoney(o.price, language)} €)` : ''}</li>`).join('')}</ul>`
      : '<span style="color:#aaa;font-size:12px;">—</span>'
    const desc = (item.description && item.description !== item.product_name)
      ? `<div style="font-weight:700;color:${DARK};font-size:13px;">${item.product_name}</div><div style="color:#666;font-size:12px;margin-top:2px;">${item.description}</div>`
      : `<div style="font-weight:700;color:${DARK};font-size:13px;">${item.product_name}</div>`
    const td = (content: string, align = 'left') =>
      `<td style="padding:10px 12px;border-bottom:1px solid ${BORDER};vertical-align:top;text-align:${align};background:${bg};">${content}</td>`
    const basePrice = item.unit_price - item.options.reduce((s, o) => s + o.price, 0)
    return `<tr>
      ${td(desc)}
      ${td(`<span style="font-size:13px;">${item.quantity}</span>`, 'center')}
      ${td(`<span style="font-size:13px;">${fmtMoney(basePrice, language)}</span>`, 'right')}
      ${td(optsList)}
      ${td(`<span style="font-size:13px;font-weight:600;">${fmtMoney(item.line_total, language)}</span>`, 'right')}
    </tr>`
  }).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;">
      <thead>${header}</thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="4" style="padding:12px;text-align:right;font-weight:700;font-size:14px;color:${DARK};background:${GREY_BG};border-top:2px solid ${GREEN};">
            ${language.toUpperCase() === 'PT' ? `${lbl.total.toUpperCase()} (sem IVA)` : lbl.total.toUpperCase()}
          </td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:${GREEN};background:${GREY_BG};border-top:2px solid ${GREEN};">
            ${fmtMoney(items.reduce((s, i) => s + i.line_total, 0), language)} €
          </td>
        </tr>
      </tbody>
    </table>`
}

function termsGrid(params: EmailParams, language: string): string {
  const lbl = PROPOSAL_LABELS[language as keyof typeof PROPOSAL_LABELS] ?? PROPOSAL_LABELS.EN
  const cell = (icon: string, label: string, value: string) => `
    <td style="width:50%;padding:10px 12px;vertical-align:top;">
      <div style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;margin-bottom:2px;">${icon} ${label}</div>
      <div style="font-size:13px;color:${DARK};">${value || '—'}</div>
    </td>`
  const rows = [
    [cell('📅', lbl.validUntil, fmtDate(params.validUntil, language)),
     cell('📦', lbl.packaging, packagingLabel(params.packagingType, language))],
    [cell('🕐', lbl.deliveryTime, params.deliveryWeeks ? `${params.deliveryWeeks} ${lbl.weeks}` : '—'),
     cell('💶', lbl.paymentTerms, params.paymentTerms || lbl.defaultPaymentTerms)],
    [cell('📍', lbl.deliveryTerms, params.deliveryTerms || lbl.defaultDeliveryTerms),
     cell('🛡️', lbl.warranty, params.warranty || lbl.defaultWarranty)],
  ]
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;background:#fff;">
      ${rows.map(([a, b]) => `<tr style="border-bottom:1px solid ${BORDER};">${a}${b}</tr>`).join('')}
    </table>`
}

export function buildEmailBody(language: string, params: EmailParams): string {
  const lang = language.toUpperCase() as keyof typeof PROPOSAL_LABELS
  const lbl = PROPOSAL_LABELS[lang] ?? PROPOSAL_LABELS.EN
  const dateStr = fmtDate(params.createdAt ?? new Date().toISOString(), language)

  const intro = params.introduction?.trim()
    || lbl.fallbackIntroduction

  const hasItems = params.items && params.items.length > 0

  return `<!DOCTYPE html>
<html lang="${lang.toLowerCase()}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${params.subject}</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

  <!-- HEADER -->
  <tr>
    <td style="background:${GREEN};padding:20px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${LOGO_URL}" alt="Kozegho" height="72" style="display:block;height:72px;max-height:72px;" />
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <div style="color:#fff;font-size:12px;opacity:0.85;">${lbl.reference}</div>
            <div style="color:#fff;font-size:15px;font-weight:700;margin-top:2px;">${params.proposalNumber}</div>
            <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:6px;">${dateStr}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- SUBJECT BAR -->
  <tr>
    <td style="background:${GREY_BG};padding:14px 28px;border-bottom:2px solid ${GREEN};">
      <div style="font-size:16px;font-weight:700;color:${DARK};">${params.subject}</div>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="padding:24px 28px;">

      <!-- Introduction -->
      <p style="margin:0 0 20px 0;font-size:14px;color:#333;line-height:1.7;font-style:italic;border-left:3px solid ${GREEN};padding-left:12px;">${intro}</p>

      ${hasItems ? `
      <!-- Products Table -->
      <div style="margin-bottom:20px;">
        ${itemsTable(params.items!, language)}
      </div>` : ''}

      ${(params.validUntil || params.deliveryWeeks || params.paymentTerms || params.deliveryTerms || params.warranty || params.packagingType) ? `
      <!-- Terms -->
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;font-weight:700;color:${DARK};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${lbl.termsAndConditions}</div>
        ${termsGrid(params, language)}
      </div>` : ''}

      ${params.additionalNotes ? `
      <!-- Additional Notes -->
      <div style="margin-bottom:20px;background:${GREY_BG};border-radius:4px;padding:12px 16px;">
        <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px;">${lbl.additionalNotes}</div>
        <div style="font-size:13px;color:#333;">${params.additionalNotes}</div>
      </div>` : ''}

      ${params.datasheetCount > 0 ? `
      <!-- Attachments note -->
      <div style="margin-bottom:20px;font-size:13px;color:#555;">
        📎 ${language.toUpperCase() === 'PT'
          ? `${params.datasheetCount} ficha${params.datasheetCount > 1 ? 's' : ''} técnica${params.datasheetCount > 1 ? 's' : ''} anexada${params.datasheetCount > 1 ? 's' : ''}`
          : `${params.datasheetCount} datasheet${params.datasheetCount > 1 ? 's' : ''} attached`
        }
      </div>` : ''}

      <!-- Signature -->
      <div style="border-top:1px solid ${BORDER};padding-top:16px;margin-top:8px;">
        <div style="font-size:14px;font-weight:600;color:${DARK};">${params.commercialName}</div>
      </div>

    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:${GREEN};padding:14px 28px;text-align:center;">
      <span style="color:#fff;font-size:12px;">Kozegho, Lda. &nbsp;|&nbsp; www.kozegho.com &nbsp;|&nbsp; kozegho@kozegho.com</span>
    </td>
  </tr>

</table>
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
