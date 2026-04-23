import type { PersistedProposal } from '@/types/proposal'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'
import { shouldShowVatNote } from '@/lib/localisation'
import { format, parseISO } from 'date-fns'

type Client = { name: string; company: string; email: string; country: string }

function fmt(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function exportProposalToPdf(
  proposal: PersistedProposal,
  client: Client
): Promise<void> {
  const L = PROPOSAL_LABELS[proposal.language as keyof typeof PROPOSAL_LABELS]

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${proposal.reference}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; padding: 20mm; }
  @media print {
    body { padding: 15mm; }
    @page { size: A4; margin: 0; }
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .logo-text { font-size: 18pt; font-weight: bold; color: #7AB648; }
  .ref { text-align: right; font-size: 9pt; }
  .green-line { border-top: 2px solid #7AB648; margin: 8px 0 12px; }
  .title { font-size: 16pt; font-weight: bold; color: #7AB648; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .kv-table td { padding: 4px 6px; font-size: 9pt; border: 1px solid #e5e5e5; }
  .kv-table td:first-child { background: #F5F5F5; font-weight: bold; width: 30%; }
  .subject { margin: 8px 0; font-size: 10pt; }
  .intro { font-style: italic; color: #555; margin: 8px 0 12px; font-size: 9pt; line-height: 1.4; }
  .section-title { font-size: 11pt; font-weight: bold; color: #7AB648; margin: 12px 0 6px; }
  .products-table th { background: #7AB648; color: white; padding: 5px 6px; font-size: 8.5pt; text-align: left; }
  .products-table th:not(:first-child) { text-align: right; }
  .products-table td { padding: 5px 6px; font-size: 8.5pt; border-bottom: 1px solid #eee; }
  .products-table td:not(:first-child) { text-align: right; }
  .option-row td { font-size: 8pt; color: #777; padding: 3px 6px 3px 20px; }
  .subtotal-row td { background: #F5F5F5; font-weight: bold; }
  .total-row td { background: #eaf5de; font-weight: bold; color: #7AB648; font-size: 11pt; }
  .vat-note { font-size: 7.5pt; font-style: italic; color: #888; text-align: right; padding: 2px 6px; }
  .footer { margin-top: 20px; text-align: center; font-size: 7.5pt; color: #aaa; border-top: 1px solid #eee; padding-top: 6px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-text">KOZEGHO</div>
    <div class="ref">
      <strong>${L.reference}:</strong> ${proposal.reference}<br>
      ${L.date}: ${format(parseISO(proposal.created_at), 'dd/MM/yyyy')}
    </div>
  </div>
  <div class="green-line"></div>
  <div class="title">${L.commercialProposal}</div>

  <table class="kv-table">
    <tr><td>${L.company}</td><td>${client.company}</td></tr>
    <tr><td>${L.clientContact}</td><td>${client.name}</td></tr>
    <tr><td>${L.email}</td><td>${client.email}</td></tr>
    <tr><td>${L.country}</td><td>${client.country}</td></tr>
    <tr><td>${L.validUntil}</td><td>${format(parseISO(proposal.validity_date), 'dd/MM/yyyy')}</td></tr>
  </table>

  <div class="subject"><strong>${L.subject}:</strong> ${proposal.subject}</div>
  ${proposal.introduction ? `<div class="intro">${proposal.introduction}</div>` : ''}

  <div class="section-title">${L.description}</div>
  <table class="products-table">
    <thead>
      <tr>
        <th style="width:45%">${L.description}</th>
        <th style="width:8%">${L.qtyShort}</th>
        <th style="width:17%">${L.unitPrice}</th>
        <th style="width:10%">${L.discount}</th>
        <th style="width:20%">${L.total}</th>
      </tr>
    </thead>
    <tbody>
      ${proposal.items.map(item => `
        <tr>
          <td><strong>${item.product_name}</strong> — ${item.description}</td>
          <td>${item.quantity}</td>
          <td>€ ${fmt(item.unit_price)}</td>
          <td>${item.discount_percent ? item.discount_percent + '%' : '—'}</td>
          <td>€ ${fmt(item.line_total)}</td>
        </tr>
        ${item.options.map(opt => `
          <tr class="option-row">
            <td>• ${opt.label}</td>
            <td></td>
            <td>€ ${fmt(opt.price)}</td>
            <td></td>
            <td></td>
          </tr>
        `).join('')}
      `).join('')}
      <tr class="subtotal-row">
        <td colspan="4" style="text-align:right">${L.subtotal}</td>
        <td>€ ${fmt(proposal.subtotal)}</td>
      </tr>
      ${shouldShowVatNote(client.country) ? `
        <tr><td colspan="5" class="vat-note">${PROPOSAL_LABELS.PT.vatNote}</td></tr>
      ` : ''}
      <tr class="total-row">
        <td colspan="4" style="text-align:right">${L.total}</td>
        <td>€ ${fmt(proposal.total)}</td>
      </tr>
    </tbody>
  </table>

  ${proposal.additional_notes?.trim() ? `
    <div class="section-title">${L.additionalNotes}</div>
    <p style="font-size:9pt">${proposal.additional_notes}</p>
  ` : ''}

  <div class="section-title">${L.termsAndConditions}</div>
  <table class="kv-table">
    <tr><td>${L.deliveryTime}</td><td>${proposal.delivery_weeks ? proposal.delivery_weeks + ' ' + L.weeks : '—'}</td></tr>
    <tr><td>${L.packaging}</td><td>${proposal.packaging_type === 'ocean' ? L.packagingOcean : L.packagingStandard}</td></tr>
    <tr><td>${L.deliveryTerms}</td><td>${proposal.delivery_terms || '—'}</td></tr>
    <tr><td>${L.paymentTerms}</td><td>${proposal.payment_terms || '—'}</td></tr>
    <tr><td>${L.warranty}</td><td>${proposal.warranty || '—'}</td></tr>
  </table>

  <div class="footer">${L.preparedBy} ${proposal.salesperson_name} · kozegho.com</div>
</body>
</html>
  `

  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow popups for this site to download PDF')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 500)
}
