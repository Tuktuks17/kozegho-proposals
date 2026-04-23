import {
  Document, Page, Text, View, Image, StyleSheet, pdf, Font
} from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import type { PersistedProposal, ProposalItem } from '@/types/proposal'
import type { Customer } from '@/types/database'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'
import { formatCurrency, formatDate } from '@/lib/utils'
import { fetchDatasheetBytes, logoUrl } from './datasheets'

Font.register({
  family: 'Calibri',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 }
  ]
})

const GREEN = '#7AB648'
const DARK = '#333333'
const GREY = '#F5F5F5'
const GREY_TEXT = '#6b6b6b'

const s = StyleSheet.create({
  page: { fontFamily: 'Calibri', fontSize: 10, color: DARK, paddingHorizontal: 45, paddingVertical: 40 },
  logo: { width: 130, height: 43, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: GREEN, marginBottom: 16 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { fontWeight: 700, width: 120 },
  metaValue: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: GREEN, marginTop: 20, marginBottom: 8 },
  intro: { lineHeight: 1.5, marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: GREEN, paddingVertical: 5, paddingHorizontal: 4 },
  tableHeaderCell: { color: '#fff', fontWeight: 700, textAlign: 'center', fontSize: 9 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingVertical: 4, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: GREY },
  descCol: { width: '45%' },
  qtyCol: { width: '8%', textAlign: 'center' },
  priceCol: { width: '15%', textAlign: 'right' },
  discCol: { width: '10%', textAlign: 'center' },
  totalCol: { width: '15%', textAlign: 'right', fontWeight: 700 },
  optRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, backgroundColor: GREY },
  optLabel: { width: '45%', color: GREY_TEXT, fontSize: 9 },
  subtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, gap: 8 },
  subtotalLabel: { fontWeight: 700 },
  subtotalValue: { width: 100, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2, gap: 8 },
  totalLabel: { fontWeight: 700, fontSize: 11 },
  totalValue: { width: 100, textAlign: 'right', fontWeight: 700, fontSize: 11 },
  termsSection: { marginTop: 20 },
  termRow: { flexDirection: 'row', marginBottom: 4 },
  termLabel: { fontWeight: 700, width: 160 },
  termValue: { flex: 1 },
  vatNote: { marginTop: 12, fontSize: 9, color: GREY_TEXT, fontStyle: 'italic' },
  preparedBy: { marginTop: 16 },
  footer: { position: 'absolute', bottom: 20, left: 45, right: 45, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: GREY_TEXT }
})

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

type PdfDocProps = {
  proposal: PersistedProposal
  customer: Customer
  logoDataUrl: string | null
}

function ItemRow({ item, idx }: { item: ProposalItem; idx: number }) {
  const alt = idx % 2 === 1
  return (
    <>
      <View style={[s.tableRow, alt ? s.tableRowAlt : {}]}>
        <Text style={s.descCol}>{item.description || item.product_name}</Text>
        <Text style={s.qtyCol}>{item.quantity}</Text>
        <Text style={s.priceCol}>{formatCurrency(item.unit_price)}</Text>
        <Text style={s.discCol}>{item.discount_percent > 0 ? `${item.discount_percent}%` : '—'}</Text>
        <Text style={s.totalCol}>{formatCurrency(item.line_total)}</Text>
      </View>
      {item.options.map((opt) => (
        <View key={opt.code} style={s.optRow}>
          <Text style={s.optLabel}>  + {opt.label}</Text>
          <Text style={s.qtyCol}>1</Text>
          <Text style={s.priceCol}>{formatCurrency(opt.price)}</Text>
          <Text style={s.discCol}>—</Text>
          <Text style={s.totalCol}>{formatCurrency(opt.price)}</Text>
        </View>
      ))}
    </>
  )
}

function ProposalPdfDoc({ proposal, customer, logoDataUrl }: PdfDocProps) {
  const labels = PROPOSAL_LABELS[proposal.language]

  return (
    <Document title={`${proposal.reference} — ${labels.commercialProposal}`}>
      <Page size="A4" style={s.page}>
        {logoDataUrl && <Image src={logoDataUrl} style={s.logo} />}

        <Text style={s.title}>{labels.commercialProposal}</Text>

        <View style={s.metaRow}><Text style={s.metaLabel}>{labels.reference}</Text><Text style={s.metaValue}>{proposal.reference}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>{labels.date}</Text><Text style={s.metaValue}>{formatDate(proposal.created_at)}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>{labels.validUntil}</Text><Text style={s.metaValue}>{formatDate(proposal.validity_date)}</Text></View>

        <Text style={s.sectionTitle}>{labels.client}</Text>
        <View style={s.metaRow}><Text style={s.metaLabel}>{labels.company}</Text><Text style={s.metaValue}>{customer.company}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>{labels.clientContact}</Text><Text style={s.metaValue}>{customer.name}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>{labels.email}</Text><Text style={s.metaValue}>{customer.email}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>{labels.country}</Text><Text style={s.metaValue}>{customer.country}</Text></View>

        <Text style={s.sectionTitle}>{labels.subject}</Text>
        <Text style={{ marginBottom: 8 }}>{proposal.subject}</Text>

        {proposal.introduction ? (
          <>
            <Text style={s.sectionTitle}>{labels.introduction}</Text>
            <Text style={s.intro}>{proposal.introduction}</Text>
          </>
        ) : null}

        <Text style={s.sectionTitle}>{labels.description}</Text>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.descCol]}>{labels.description}</Text>
          <Text style={[s.tableHeaderCell, s.qtyCol]}>{labels.qtyShort}</Text>
          <Text style={[s.tableHeaderCell, s.priceCol]}>{labels.unitPrice}</Text>
          <Text style={[s.tableHeaderCell, s.discCol]}>{labels.discount}</Text>
          <Text style={[s.tableHeaderCell, s.totalCol]}>{labels.total}</Text>
        </View>
        {proposal.items.map((item, idx) => <ItemRow key={item.id} item={item} idx={idx} />)}

        <View style={s.subtotalRow}>
          <Text style={s.subtotalLabel}>{labels.subtotal}</Text>
          <Text style={s.subtotalValue}>{formatCurrency(proposal.subtotal)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{labels.total}</Text>
          <Text style={s.totalValue}>{formatCurrency(proposal.total)}</Text>
        </View>

        <View style={s.termsSection}>
          <Text style={s.sectionTitle}>{labels.termsAndConditions}</Text>
          {proposal.delivery_weeks != null && (
            <View style={s.termRow}>
              <Text style={s.termLabel}>{labels.deliveryTime}</Text>
              <Text style={s.termValue}>{proposal.delivery_weeks} {labels.weeks}</Text>
            </View>
          )}
          <View style={s.termRow}>
            <Text style={s.termLabel}>{labels.packaging}</Text>
            <Text style={s.termValue}>{proposal.packaging_type === 'ocean' ? labels.packagingOcean : labels.packagingStandard}</Text>
          </View>
          <View style={s.termRow}>
            <Text style={s.termLabel}>{labels.deliveryTerms}</Text>
            <Text style={s.termValue}>{proposal.delivery_terms}</Text>
          </View>
          <View style={s.termRow}>
            <Text style={s.termLabel}>{labels.paymentTerms}</Text>
            <Text style={s.termValue}>{proposal.payment_terms}</Text>
          </View>
          <View style={s.termRow}>
            <Text style={s.termLabel}>{labels.warranty}</Text>
            <Text style={s.termValue}>{proposal.warranty}</Text>
          </View>
          {proposal.additional_notes ? (
            <View style={s.termRow}><Text>{proposal.additional_notes}</Text></View>
          ) : null}
        </View>

        <Text style={s.vatNote}>{labels.vatNote}</Text>
        <View style={s.preparedBy}>
          <Text><Text style={{ fontWeight: 700 }}>{labels.preparedBy}: </Text>{proposal.salesperson_name}</Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Kozegho · {proposal.reference}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function exportPdf(proposal: PersistedProposal, customer: Customer) {
  // Fetch logo as blob → data URL using native FileReader (avoids Buffer dependency)
  let logoDataUrl: string | null = null
  try {
    const resp = await fetch(logoUrl())
    if (resp.ok) {
      const blob = await resp.blob()
      logoDataUrl = await blobToDataUrl(blob)
    }
  } catch {
    logoDataUrl = null
  }

  const docBlob = await pdf(
    <ProposalPdfDoc proposal={proposal} customer={customer} logoDataUrl={logoDataUrl} />
  ).toBlob()

  // Collect datasheet PDFs
  const datasheetBuffers: ArrayBuffer[] = []
  for (const item of proposal.items) {
    if (!item.datasheet_url) continue
    const buf = await fetchDatasheetBytes(item.datasheet_url)
    if (buf) datasheetBuffers.push(buf)
  }

  if (datasheetBuffers.length === 0) {
    saveAs(docBlob, `${proposal.reference}_${proposal.language}.pdf`)
    return
  }

  // Merge with datasheets using pdf-lib (lazy import)
  const { PDFDocument } = await import('pdf-lib')
  const merged = await PDFDocument.create()

  const mainBytes = await docBlob.arrayBuffer()
  const mainDoc = await PDFDocument.load(mainBytes)
  const mainPages = await merged.copyPages(mainDoc, mainDoc.getPageIndices())
  mainPages.forEach((p) => merged.addPage(p))

  for (const buf of datasheetBuffers) {
    try {
      const dsDoc = await PDFDocument.load(buf)
      const dsPages = await merged.copyPages(dsDoc, dsDoc.getPageIndices())
      dsPages.forEach((p) => merged.addPage(p))
    } catch { /* corrupt/unsupported PDF — skip */ }
  }

  const mergedBytes = await merged.save()
  saveAs(new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' }), `${proposal.reference}_${proposal.language}.pdf`)
}
