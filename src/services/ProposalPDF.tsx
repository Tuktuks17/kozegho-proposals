import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { PersistedProposal } from '@/types/proposal'
import type { Customer, ProposalLine, ProposalLineOption } from '@/types/database'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'

const GREEN = '#7AB648'
const DARK = '#333333'
const GREY_ROW = '#F9F9F9'
const BORDER = '#E0E0E0'
const WHITE = '#FFFFFF'
const TOTAL_BG = '#EDF7E0'

const LOCALE_MAP: Record<string, string> = {
  PT: 'pt-PT', EN: 'en-GB', FR: 'fr-FR', DE: 'de-DE', ES: 'es-ES'
}

function fmtCurrency(amount: number, lang: string): string {
  const locale = LOCALE_MAP[lang] ?? 'pt-PT'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount)
}

function fmtDateLong(isoDate: string | null | undefined, lang: string): string {
  if (!isoDate) return '—'
  const locale = LOCALE_MAP[lang] ?? 'pt-PT'
  return new Date(isoDate).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function fmtDateShort(isoDate: string | null | undefined, lang: string): string {
  if (!isoDate) return '—'
  const locale = LOCALE_MAP[lang] ?? 'pt-PT'
  return new Date(isoDate).toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: DARK,
    paddingTop: 28,
    paddingHorizontal: 40,
    paddingBottom: 48,
  },
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerLeft: { flexDirection: 'column', gap: 2 },
  logo: { width: 165, height: 56, objectFit: 'contain' },
  logoFallback: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: GREEN },
  tagline: { fontSize: 7.5, color: '#888888', marginTop: 2 },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', paddingTop: 4 },
  refLine: { fontSize: 9, color: DARK },
  // ── Divider ─────────────────────────────────────────────────────────────────
  greenLine: { height: 2, backgroundColor: GREEN, marginBottom: 10 },
  // ── Title block ─────────────────────────────────────────────────────────────
  title: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 3,
  },
  dateRow: { fontSize: 9, color: '#555555', marginBottom: 8 },
  // ── Introduction ────────────────────────────────────────────────────────────
  intro: {
    fontSize: 9,
    color: '#444444',
    lineHeight: 1.55,
    marginBottom: 12,
  },
  // ── Table ───────────────────────────────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: { backgroundColor: GREY_ROW },
  tableRowTotal: { backgroundColor: TOTAL_BG, borderBottomWidth: 0 },
  th: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    backgroundColor: GREEN,
  },
  td: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 8.5,
    color: DARK,
  },
  tdBold: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  // Column flex weights (out of 100)
  cDesc:    { flex: 33 },
  cQty:     { flex: 6 },
  cPrice:   { flex: 14 },
  cOptions: { flex: 30 },
  cValue:   { flex: 17 },
  // ── Conditions ──────────────────────────────────────────────────────────────
  conditions: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  condCol: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
  condDivider: { width: 1.5, backgroundColor: GREEN },
  condItem: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  condMarker: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    width: 12,
    marginTop: 1,
  },
  condLabelBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK },
  condText: { fontSize: 8.5, color: '#444444', flex: 1 },
  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: GREEN,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { color: WHITE, fontSize: 8, fontFamily: 'Helvetica' },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function CondItem({ marker, label, value }: { marker: string; label: string; value: string }) {
  return (
    <View style={s.condItem}>
      <Text style={s.condMarker}>{marker}</Text>
      <Text style={s.condText}>
        <Text style={s.condLabelBold}>{label}: </Text>
        {value}
      </Text>
    </View>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export type ProposalPDFProps = {
  proposal: PersistedProposal
  customer: Customer
  lines: ProposalLine[]
  lineOptions: ProposalLineOption[]
  language: string
  logoDataUrl: string | null
}

export function ProposalPDFDocument({
  proposal,
  customer: _customer,
  lines,
  lineOptions,
  language,
  logoDataUrl,
}: ProposalPDFProps) {
  const L = PROPOSAL_LABELS[language as keyof typeof PROPOSAL_LABELS] ?? PROPOSAL_LABELS.EN

  const total = lines.reduce((sum, line) => {
    const opts = lineOptions.filter((o) => o.proposal_line_id === line.id)
    const optsTotal = opts.reduce((s, o) => s + (o.price_eur ?? 0), 0)
    return sum + line.line_total + optsTotal
  }, 0)

  const packagingLabel =
    proposal.packaging_type === 'ocean' ? L.packagingOcean : L.packagingStandard

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {logoDataUrl ? (
              <Image src={logoDataUrl} style={s.logo} />
            ) : (
              <Text style={s.logoFallback}>Kozegho</Text>
            )}
          </View>
          <View style={s.headerRight}>
            <Text style={s.refLine}>
              {L.reference}: {proposal.reference}
            </Text>
          </View>
        </View>

        {/* ── GREEN LINE ─────────────────────────────────────────────────────── */}
        <View style={s.greenLine} />

        {/* ── TITLE BLOCK ────────────────────────────────────────────────────── */}
        <Text style={s.title}>
          {L.commercialProposal} – {proposal.subject}
        </Text>
        <Text style={s.dateRow}>
          {L.date}: {fmtDateLong(proposal.created_at, language)}
        </Text>

        {/* ── INTRODUCTION ───────────────────────────────────────────────────── */}
        {!!proposal.introduction && (
          <Text style={s.intro}>{proposal.introduction}</Text>
        )}

        {/* ── PRODUCTS TABLE ─────────────────────────────────────────────────── */}
        <View style={s.table}>
          {/* Header row */}
          <View style={s.tableRow}>
            <Text style={[s.th, s.cDesc]}>{L.description}</Text>
            <Text style={[s.th, s.cQty, { textAlign: 'center' }]}>{L.qtyShort}</Text>
            <Text style={[s.th, s.cPrice, { textAlign: 'right' }]}>
              {L.unitPrice} (€)
            </Text>
            <Text style={[s.th, s.cOptions]}>{L.options}</Text>
            <Text style={[s.th, s.cValue, { textAlign: 'right' }]}>
              {L.lineTotal} (€)
            </Text>
          </View>

          {/* Data rows */}
          {lines.map((line, i) => {
            const opts = lineOptions.filter((o) => o.proposal_line_id === line.id)
            const optsTotal = opts.reduce((s, o) => s + (o.price_eur ?? 0), 0)
            const optionsText = opts.map((o) => o.option_label).join(' + ')
            const lineValue = line.line_total + optsTotal
            const baseUnitPrice = line.unit_price - optsTotal
            const isAlt = i % 2 === 1

            return (
              <View key={line.id} style={[s.tableRow, isAlt ? s.tableRowAlt : {}]}>
                <View style={[s.td, s.cDesc]}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>
                    {line.product_name}
                  </Text>
                  {line.description && line.description !== line.product_name && (
                    <Text style={{ fontSize: 8, color: '#666666', marginTop: 1 }}>
                      {line.description}
                    </Text>
                  )}
                </View>
                <Text style={[s.td, s.cQty, { textAlign: 'center' }]}>
                  {line.quantity}
                </Text>
                <Text style={[s.td, s.cPrice, { textAlign: 'right' }]}>
                  {fmtCurrency(baseUnitPrice, language)}
                </Text>
                <Text style={[s.td, s.cOptions, { fontSize: 8, color: '#555555' }]}>
                  {optionsText || '—'}
                </Text>
                <Text style={[s.tdBold, s.cValue, { textAlign: 'right' }]}>
                  {fmtCurrency(lineValue, language)}
                </Text>
              </View>
            )
          })}

          {/* Total row */}
          <View style={[s.tableRow, s.tableRowTotal]}>
            <Text
              style={[
                s.tdBold,
                { flex: 68, textAlign: 'right', textTransform: 'uppercase' },
              ]}
            >
              {language === 'PT' ? `${L.total} (sem IVA)` : L.total}
            </Text>
            <Text style={[s.tdBold, { flex: 24, textAlign: 'right', paddingVertical: 5, paddingHorizontal: 5, fontSize: 8.5 }]}>
              {fmtCurrency(total, language)} €
            </Text>
          </View>
        </View>

        {/* ── COMMERCIAL CONDITIONS ──────────────────────────────────────────── */}
        <View style={s.conditions}>
          {/* Left column */}
          <View style={s.condCol}>
            <CondItem
              marker="■"
              label={L.validUntil}
              value={fmtDateShort(proposal.validity_date, language)}
            />
            {proposal.delivery_weeks && (
              <CondItem
                marker="■"
                label={L.deliveryTime}
                value={`${proposal.delivery_weeks} ${L.weeks}`}
              />
            )}
            <CondItem
              marker="■"
              label={L.deliveryTerms}
              value={proposal.delivery_terms || '—'}
            />
          </View>

          {/* Green vertical divider */}
          <View style={s.condDivider} />

          {/* Right column */}
          <View style={s.condCol}>
            <CondItem
              marker="■"
              label={L.packaging}
              value={packagingLabel}
            />
            <CondItem
              marker="■"
              label={L.warranty}
              value={proposal.warranty || '—'}
            />
            <CondItem
              marker="■"
              label={L.paymentTerms}
              value={proposal.payment_terms || '—'}
            />
          </View>
        </View>

        {/* ── ADDITIONAL NOTES ────────────────────────────────────────────────── */}
        {!!proposal.additional_notes?.trim() && (
          <Text style={{ fontSize: 8.5, color: '#555555', marginBottom: 10 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{L.additionalNotes}: </Text>
            {proposal.additional_notes}
          </Text>
        )}

        {/* ── FOOTER (fixed, appears on every page) ──────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Kozegho, Lda.{'   |   '}www.kozegho.com{'   |   '}kozegho@kozegho.com
          </Text>
        </View>
      </Page>
    </Document>
  )
}
