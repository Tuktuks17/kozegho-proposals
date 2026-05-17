import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { PersistedProposal } from '@/types/proposal'
import type { Customer, ProposalLine, ProposalLineOption } from '@/types/database'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'

const GREEN = '#7AB648'
const DARK = '#1A1A1A'
const BORDER = '#E5E7E2'
const WHITE = '#FFFFFF'
const INTRO_BG = '#F4F9EE'
const FOOTER_TEXT = '#F0F0F0'

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
  // ── Page ────────────────────────────────────────────────────────────────────
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: DARK,
    // No top/horizontal padding — header is full-bleed; content adds its own
    paddingBottom: 56,
  },

  // ── Top green header band (full-bleed) ──────────────────────────────────────
  headerBand: {
    backgroundColor: GREEN,
    paddingVertical: 14,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 3,
  },
  logo: {
    width: 140,
    height: 40,
    objectFit: 'contain',
    objectPositionX: 0,
    objectPositionY: 'center',
  },
  logoFallback: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  headerRefLabel: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerRefValue: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    letterSpacing: 0.5,
  },
  headerDate: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // ── Content padding wrapper ──────────────────────────────────────────────────
  content: {
    paddingHorizontal: 40,
  },

  // ── Subject block ────────────────────────────────────────────────────────────
  subjectText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    letterSpacing: 0.2,
    marginBottom: 5,
  },
  subjectUnderline: {
    width: 80,
    height: 2,
    backgroundColor: GREEN,
    marginBottom: 16,
  },

  // ── Introduction block ───────────────────────────────────────────────────────
  introBlock: {
    backgroundColor: INTRO_BG,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  introText: {
    fontSize: 9,
    color: '#3A3A3A',
    lineHeight: 1.6,
    textAlign: 'justify',
  },

  // ── Items table ──────────────────────────────────────────────────────────────
  table: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: GREEN,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  th: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
  },
  td: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8.5,
    color: DARK,
  },
  tdBold: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  // Column flex weights
  cDesc:    { flex: 33 },
  cQty:     { flex: 6 },
  cPrice:   { flex: 15 },
  cOptions: { flex: 29 },
  cValue:   { flex: 17 },

  // ── TOTAL row ────────────────────────────────────────────────────────────────
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: WHITE,
    borderTopWidth: 1.5,
    borderTopColor: GREEN,
    alignItems: 'center',
  },
  totalLabelText: {
    flex: 76,
    textAlign: 'right',
    fontSize: 7.5,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingRight: 12,
    fontFamily: 'Helvetica-Bold',
  },
  totalValueText: {
    flex: 24,
    textAlign: 'right',
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    paddingRight: 6,
  },

  // ── Terms ────────────────────────────────────────────────────────────────────
  sectionDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  termsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  termsCol: {
    flex: 1,
    gap: 8,
  },
  termsCell: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
  },
  termsCellBar: {
    width: 2,
    backgroundColor: GREEN,
    marginRight: 8,
  },
  termsCellContent: {
    flex: 1,
  },
  termsCellLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  termsCellValue: {
    fontSize: 8.5,
    color: DARK,
  },

  // ── Attachments ──────────────────────────────────────────────────────────────
  attachmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  attachmentsText: {
    fontSize: 8.5,
    color: '#666666',
  },

  // ── Signature ────────────────────────────────────────────────────────────────
  signatureBlock: {
    marginTop: 4,
    marginBottom: 12,
  },
  signatureLabel: {
    fontSize: 7.5,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  signatureName: {
    fontSize: 9.5,
    color: DARK,
    fontFamily: 'Helvetica-Bold',
  },
  vatNote: {
    fontSize: 7.5,
    color: '#999999',
    marginTop: 6,
  },

  // ── Footer (fixed, full-bleed) ───────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: GREEN,
    paddingVertical: 7,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: FOOTER_TEXT,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    letterSpacing: 0.3,
  },
})

// ── Sub-components ────────────────────────────────────────────────────────────

function TermsCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.termsCell}>
      <View style={s.termsCellBar} />
      <View style={s.termsCellContent}>
        <Text style={s.termsCellLabel}>{label}</Text>
        <Text style={s.termsCellValue}>{value}</Text>
      </View>
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

  const datasheetCount = lines.filter((l) => l.datasheet_url).length
  const datasheetLine =
    datasheetCount === 1
      ? L.datasheetsAttachedSingular
      : L.datasheetsAttachedPlural.replace('{n}', String(datasheetCount))

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── 1. TOP GREEN BAND (full-bleed) ─────────────────────────────────── */}
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            {logoDataUrl ? (
              <Image src={logoDataUrl} style={s.logo} />
            ) : (
              <Text style={s.logoFallback}>KOZEGHO</Text>
            )}
            <Text style={s.tagline}>{L.companyTagline}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerRefLabel}>{L.reference}</Text>
            <Text style={s.headerRefValue}>{proposal.reference}</Text>
            <Text style={s.headerDate}>{fmtDateLong(proposal.created_at, language)}</Text>
          </View>
        </View>

        {/* ── CONTENT AREA (with horizontal padding) ─────────────────────────── */}
        <View style={s.content}>

          {/* ── 2. SUBJECT + GREEN UNDERLINE ─────────────────────────────────── */}
          <View>
            <Text style={s.subjectText}>{proposal.subject}</Text>
            <View style={s.subjectUnderline} />
          </View>

          {/* ── 3. INTRODUCTION BLOCK ────────────────────────────────────────── */}
          {!!proposal.introduction && (
            <View style={s.introBlock}>
              <Text style={s.introText}>{proposal.introduction}</Text>
            </View>
          )}

          {/* ── 4. ITEMS TABLE ───────────────────────────────────────────────── */}
          <View style={s.table}>
            {/* Header row */}
            <View style={s.tableHeaderRow}>
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
            {lines.map((line) => {
              const opts = lineOptions.filter((o) => o.proposal_line_id === line.id)
              const optsTotal = opts.reduce((s, o) => s + (o.price_eur ?? 0), 0)
              const lineValue = line.line_total + optsTotal
              const baseUnitPrice = line.unit_price - optsTotal

              return (
                <View key={line.id} style={s.tableRow} wrap={false}>
                  {/* Description: product name bold + description muted */}
                  <View style={[s.td, s.cDesc]}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>
                      {line.product_name}
                    </Text>
                    {line.description && line.description !== line.product_name && (
                      <Text style={{ fontSize: 8, color: '#666666', marginTop: 2 }}>
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

                  {/* Options as bullet list */}
                  <View style={[s.td, s.cOptions]}>
                    {opts.length === 0 ? (
                      <Text style={{ color: '#AAAAAA' }}>—</Text>
                    ) : (
                      opts.map((opt, j) => (
                        <View
                          key={opt.id}
                          style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: j === 0 ? 0 : 3 }}
                        >
                          <Text style={{ color: GREEN, fontSize: 8, marginRight: 4, lineHeight: 1.3 }}>•</Text>
                          <Text style={{ fontSize: 8, color: '#444444', flex: 1, lineHeight: 1.3 }}>
                            {opt.option_label}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  <Text style={[s.tdBold, s.cValue, { textAlign: 'right' }]}>
                    {fmtCurrency(lineValue, language)}
                  </Text>
                </View>
              )
            })}

            {/* TOTAL row */}
            <View style={s.totalRow}>
              <Text style={s.totalLabelText}>{L.total}</Text>
              <Text style={s.totalValueText}>
                {fmtCurrency(total, language)} €
              </Text>
            </View>
          </View>

          {/* ── 5. TERMS AND CONDITIONS ──────────────────────────────────────── */}
          <View style={s.sectionDivider} />
          <Text style={s.sectionTitle}>{L.termsAndConditions}</Text>
          <View style={s.termsGrid}>
            {/* Left column */}
            <View style={s.termsCol}>
              <TermsCell
                label={L.validUntil}
                value={fmtDateShort(proposal.validity_date, language)}
              />
              {proposal.delivery_weeks ? (
                <TermsCell
                  label={L.deliveryTime}
                  value={`${proposal.delivery_weeks} ${L.weeks}`}
                />
              ) : null}
              <TermsCell
                label={L.deliveryTerms}
                value={proposal.delivery_terms || L.defaultDeliveryTerms}
              />
            </View>
            {/* Right column */}
            <View style={s.termsCol}>
              <TermsCell
                label={L.packaging}
                value={packagingLabel}
              />
              <TermsCell
                label={L.paymentTerms}
                value={proposal.payment_terms || L.defaultPaymentTerms}
              />
              <TermsCell
                label={L.warranty}
                value={proposal.warranty || L.defaultWarranty}
              />
            </View>
          </View>

          {/* ── ADDITIONAL NOTES ──────────────────────────────────────────────── */}
          {!!proposal.additional_notes?.trim() && (
            <Text style={{ fontSize: 8.5, color: '#555555', marginBottom: 10 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{L.additionalNotes}: </Text>
              {proposal.additional_notes}
            </Text>
          )}

          {/* ── 6. ATTACHMENTS LINE ───────────────────────────────────────────── */}
          {datasheetCount > 0 && (
            <View style={s.attachmentsRow}>
              <Text style={{ fontSize: 9, color: GREEN }}>⊕</Text>
              <Text style={s.attachmentsText}>{datasheetLine}</Text>
            </View>
          )}

          {/* ── 7. SIGNATURE ─────────────────────────────────────────────────── */}
          <View style={s.signatureBlock}>
            <Text style={s.signatureLabel}>{L.preparedBy}</Text>
            <Text style={s.signatureName}>{proposal.salesperson_name}</Text>
          </View>

          {/* VAT note */}
          <Text style={s.vatNote}>{L.vatNote}</Text>

        </View>

        {/* ── 8. BOTTOM GREEN FOOTER (fixed, full-bleed) ─────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Kozegho, Lda.{'   |   '}www.kozegho.com{'   |   '}kozegho@kozegho.com
          </Text>
        </View>
      </Page>
    </Document>
  )
}
