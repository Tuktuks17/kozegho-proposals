import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'
import type { PersistedProposal } from '@/types/proposal'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'
import { shouldShowVatNote } from '@/lib/localisation'
import { fetchDatasheetBytes, logoUrl } from '@/services/datasheets'
import { rasterisePdf } from '@/lib/pdfjs'
import { format, parseISO } from 'date-fns'

type Client = { name: string; company: string; email: string; country: string }

const GREEN: [number, number, number] = [122, 182, 72]
const DARK: [number, number, number] = [51, 51, 51]
const GREY: [number, number, number] = [245, 245, 245]
const WHITE: [number, number, number] = [255, 255, 255]

function fmt(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function exportProposalToPdf(
  proposal: PersistedProposal,
  client: Client
): Promise<void> {
  const L = PROPOSAL_LABELS[proposal.language]
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 14
  const contentW = W - margin * 2
  let y = margin

  // ── Logo ──────────────────────────────────────────────────────────────────
  let logoDataUrl: string | null = null
  try {
    const resp = await fetch(logoUrl())
    if (resp.ok) {
      const blob = await resp.blob()
      logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }
  } catch {
    logoDataUrl = null
  }

  // ── Header ────────────────────────────────────────────────────────────────
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, y, 40, 13)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.text(`${L.reference}: ${proposal.reference}`, W - margin, y + 4, { align: 'right' })
  doc.text(`${L.date}: ${format(parseISO(proposal.created_at), 'dd/MM/yyyy')}`, W - margin, y + 9, { align: 'right' })
  y += 18

  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2])
  doc.setLineWidth(0.8)
  doc.line(margin, y, W - margin, y)
  y += 6

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
  doc.text(L.commercialProposal, margin, y)
  y += 8

  // ── Client block ──────────────────────────────────────────────────────────
  const kvRows: [string, string][] = [
    [L.company, client.company],
    [L.clientContact, client.name],
    [L.email, client.email],
    [L.country, client.country],
    [L.validUntil, format(parseISO(proposal.validity_date), 'dd/MM/yyyy')]
  ]
  for (const [k, v] of kvRows) {
    doc.setFillColor(GREY[0], GREY[1], GREY[2])
    doc.rect(margin, y, contentW * 0.35, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(DARK[0], DARK[1], DARK[2])
    doc.text(k, margin + 2, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(v, margin + contentW * 0.35 + 2, y + 5)
    y += 7
  }
  y += 4

  // ── Subject ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  const subjectLabel = `${L.subject}: `
  doc.text(subjectLabel, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(proposal.subject, margin + doc.getTextWidth(subjectLabel), y)
  y += 8

  // ── Introduction ──────────────────────────────────────────────────────────
  if (proposal.introduction) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    const introLines = doc.splitTextToSize(proposal.introduction, contentW)
    doc.text(introLines, margin, y)
    y += introLines.length * 5 + 4
  }

  // ── Products table ────────────────────────────────────────────────────────
  const colW = [contentW * 0.4, 15, 30, 20, 30]
  const headers = [L.description, L.qtyShort, L.unitPrice, L.discount, L.total]

  doc.setFillColor(GREEN[0], GREEN[1], GREEN[2])
  doc.rect(margin, y, contentW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
  let x = margin
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 2, y + 5)
    x += colW[i]
  }
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  for (const item of proposal.items) {
    if (y > 260) { doc.addPage(); y = margin }
    doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
    doc.rect(margin, y, contentW, 7, 'F')
    doc.setDrawColor(230, 230, 230)
    doc.line(margin, y + 7, margin + contentW, y + 7)
    x = margin
    const cells = [
      item.description || item.product_name,
      String(item.quantity),
      `€ ${fmt(item.unit_price)}`,
      item.discount_percent ? `${item.discount_percent}%` : '—',
      `€ ${fmt(item.line_total)}`
    ]
    for (let i = 0; i < cells.length; i++) {
      doc.text(cells[i], x + 2, y + 5)
      x += colW[i]
    }
    y += 7

    for (const opt of item.options) {
      if (y > 260) { doc.addPage(); y = margin }
      doc.setFontSize(7.5)
      doc.setTextColor(100, 100, 100)
      doc.text(`  • ${opt.label}`, margin + 4, y + 5)
      doc.text(`€ ${fmt(opt.price)}`, margin + colW[0] + colW[1] + 2, y + 5)
      doc.setTextColor(DARK[0], DARK[1], DARK[2])
      doc.setFontSize(8)
      y += 6
    }
  }

  // Subtotal
  if (y > 255) { doc.addPage(); y = margin }
  doc.setFillColor(GREY[0], GREY[1], GREY[2])
  doc.rect(margin, y, contentW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.text(L.subtotal, W - margin - 35, y + 5, { align: 'right' })
  doc.text(`€ ${fmt(proposal.subtotal)}`, W - margin - 2, y + 5, { align: 'right' })
  y += 7

  if (shouldShowVatNote(client.country)) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(L.vatNote, W - margin - 2, y + 4, { align: 'right' })
    doc.setTextColor(DARK[0], DARK[1], DARK[2])
    y += 6
  }

  // Total
  doc.setFillColor(234, 245, 222)
  doc.rect(margin, y, contentW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
  doc.text(L.total, W - margin - 35, y + 6, { align: 'right' })
  doc.text(`€ ${fmt(proposal.total)}`, W - margin - 2, y + 6, { align: 'right' })
  y += 12

  // ── Additional notes ──────────────────────────────────────────────────────
  if (proposal.additional_notes?.trim()) {
    if (y > 250) { doc.addPage(); y = margin }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(DARK[0], DARK[1], DARK[2])
    doc.text(L.additionalNotes, margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(proposal.additional_notes, contentW)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 5 + 4
  }

  // ── Terms ─────────────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = margin }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
  doc.text(L.termsAndConditions, margin, y)
  y += 5

  const terms: [string, string][] = [
    [L.deliveryTime, proposal.delivery_weeks ? `${proposal.delivery_weeks} ${L.weeks}` : '—'],
    [L.packaging, proposal.packaging_type === 'ocean' ? L.packagingOcean : L.packagingStandard],
    [L.deliveryTerms, proposal.delivery_terms || '—'],
    [L.paymentTerms, proposal.payment_terms || '—'],
    [L.warranty, proposal.warranty || '—']
  ]
  for (const [k, v] of terms) {
    if (y > 270) { doc.addPage(); y = margin }
    doc.setFillColor(GREY[0], GREY[1], GREY[2])
    doc.rect(margin, y, contentW * 0.35, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(DARK[0], DARK[1], DARK[2])
    doc.text(k, margin + 2, y + 5)
    doc.setFont('helvetica', 'normal')
    const vLines = doc.splitTextToSize(v, contentW * 0.63)
    doc.text(vLines[0] as string, margin + contentW * 0.35 + 2, y + 5)
    y += 7
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `${L.preparedBy} ${proposal.salesperson_name} · kozegho.com`,
      W / 2, 292, { align: 'center' }
    )
  }

  // ── Datasheet pages (pdf.js rasterisation) ────────────────────────────────
  for (const item of proposal.items) {
    if (!item.datasheet_url) continue
    const bytes = await fetchDatasheetBytes(item.datasheet_url)
    if (!bytes) continue
    try {
      const pngs = await rasterisePdf(bytes, 1.5)
      for (const png of pngs) {
        doc.addPage()
        doc.addImage(png, 'PNG', 0, 0, 210, 297)
      }
    } catch {
      // skip datasheet if rasterisation fails
    }
  }

  saveAs(doc.output('blob'), `${proposal.reference}.pdf`)
}
