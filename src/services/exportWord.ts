import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
  ImageRun, ShadingType
} from 'docx'
import { saveAs } from 'file-saver'
import type { PersistedProposal, ProposalItem } from '@/types/proposal'
import type { Customer } from '@/types/database'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN = '7AB648'
const GREEN_LIGHT_DIVIDER = 'A8D17A'
const GREEN_INTRO_BG = 'F4F9EE'
const GREEN_TOTAL_BG = 'EDF7E0'
const BORDER_GRAY = 'E5E5E5'
const DARK = '333333'
const WHITE = 'FFFFFF'
const REF_MUTED = 'D5E8C6'

// ── Utility: no-border spec ───────────────────────────────────────────────────
function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
}
function noBorders() {
  const b = noBorder()
  return { top: b, bottom: b, left: b, right: b, insideH: b, insideV: b }
}

// ── Simple plain cell ─────────────────────────────────────────────────────────
function plainCell(
  text: string,
  opts?: {
    bold?: boolean
    color?: string
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    width?: number
    shading?: string
    italic?: boolean
    size?: number
  }
) {
  return new TableCell({
    shading: opts?.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: noBorders(),
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts?.bold ?? false,
            italics: opts?.italic ?? false,
            color: opts?.color ?? DARK,
            font: 'Calibri',
            size: opts?.size ?? 20,
          }),
        ],
      }),
    ],
  })
}

// ── Green header cell ─────────────────────────────────────────────────────────
function greenCell(children: Paragraph[], widthPct: number) {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: GREEN },
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    children,
  })
}

// ── Terms cell: green 3pt left border + label + value ─────────────────────────
function termsCell(label: string, value: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder(),
      right: noBorder(),
      bottom: noBorder(),
      left: { style: BorderStyle.SINGLE, size: 18, color: GREEN },
    },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({ text: label.toUpperCase(), bold: true, color: GREEN, font: 'Calibri', size: 16 }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: value || '—', color: DARK, font: 'Calibri', size: 20 }),
        ],
      }),
    ],
  })
}

// ── Items table row ───────────────────────────────────────────────────────────
function itemRow(item: ProposalItem) {
  const basePrice = item.unit_price - item.options.reduce((s, o) => s + o.price, 0)
  const lineTotal = item.line_total

  // Description: product name + description variant
  const descChildren: TextRun[] = [
    new TextRun({ text: item.product_name, bold: true, font: 'Calibri', size: 20, color: DARK }),
  ]
  if (item.description && item.description !== item.product_name) {
    descChildren.push(new TextRun({ text: '\n' + item.description, font: 'Calibri', size: 18, color: '666666' }))
  }

  // Options as bullet paragraphs
  const optionParagraphs: Paragraph[] = item.options.length === 0
    ? [new Paragraph({ children: [new TextRun({ text: '—', color: 'AAAAAA', font: 'Calibri', size: 18 })] })]
    : item.options.map(o => new Paragraph({
        spacing: { before: 0, after: 20 },
        children: [
          new TextRun({ text: `• ${o.label}${o.price > 0 ? ` (+${formatCurrency(o.price)})` : o.price < 0 ? ` (${formatCurrency(o.price)})` : ''}`, font: 'Calibri', size: 18, color: '444444' }),
        ],
      }))

  return new TableRow({
    children: [
      new TableCell({
        width: { size: 33, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        children: [new Paragraph({ children: descChildren })],
      }),
      plainCell(String(item.quantity), { align: AlignmentType.CENTER, width: 7 }),
      plainCell(formatCurrency(basePrice), { align: AlignmentType.RIGHT, width: 15 }),
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        children: optionParagraphs,
      }),
      plainCell(formatCurrency(lineTotal), { align: AlignmentType.RIGHT, width: 17, bold: true }),
    ],
  })
}

// ── Main export function ──────────────────────────────────────────────────────

export async function exportWord(
  proposal: PersistedProposal,
  _customer: Customer,
  logoBytes: ArrayBuffer | null
) {
  const L = PROPOSAL_LABELS[proposal.language as keyof typeof PROPOSAL_LABELS] ?? PROPOSAL_LABELS.EN
  const packagingLabel = proposal.packaging_type === 'ocean' ? L.packagingOcean : L.packagingStandard

  // Logo image (colored — displays on green bg in header band)
  const logoImage = logoBytes
    ? new ImageRun({ data: logoBytes, transformation: { width: 150, height: 50 }, type: 'png' })
    : undefined

  // Datasheet count (deduplicated)
  const datasheetCount = new Set(
    proposal.items.filter(i => i.datasheet_url).map(i => i.datasheet_url)
  ).size
  const datasheetLine = datasheetCount === 1
    ? L.datasheetsAttachedSingular
    : L.datasheetsAttachedPlural.replace('{n}', String(datasheetCount))

  // ── 1. GREEN HEADER BAND TABLE ──────────────────────────────────────────────
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          // Logo cell
          greenCell([
            new Paragraph({
              spacing: { before: 100, after: 100 },
              children: logoImage ? [logoImage] : [
                new TextRun({ text: 'Kozegho', bold: true, color: WHITE, font: 'Calibri', size: 36 }),
              ],
            }),
          ], 49),
          // Thin divider
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN_LIGHT_DIVIDER },
            width: { size: 2, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [new Paragraph({ children: [] })],
          }),
          // Reference info cell (right-aligned)
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN },
            width: { size: 49, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 60 },
                children: [new TextRun({ text: L.reference, color: REF_MUTED, font: 'Calibri', size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: proposal.reference, bold: true, color: WHITE, font: 'Calibri', size: 28 })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [new TextRun({ text: formatDate(proposal.created_at), color: REF_MUTED, font: 'Calibri', size: 18 })],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  // ── 2. SUBJECT ──────────────────────────────────────────────────────────────
  const subjectPara = new Paragraph({
    spacing: { before: 360, after: 80 },
    children: [
      new TextRun({ text: proposal.subject ?? '', bold: true, font: 'Calibri', size: 36, color: DARK }),
    ],
  })
  // Green underline (2pt green bottom border paragraph)
  const subjectUnderline = new Paragraph({
    spacing: { before: 0, after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 4 } },
    children: [],
  })

  // ── 3. INTRO CARD ───────────────────────────────────────────────────────────
  const introTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN_INTRO_BG },
            borders: {
              top: noBorder(),
              right: noBorder(),
              bottom: noBorder(),
              left: { style: BorderStyle.SINGLE, size: 24, color: GREEN },
            },
            children: [
              new Paragraph({
                spacing: { before: 100, after: 100 },
                children: [
                  new TextRun({
                    text: proposal.introduction ?? L.fallbackIntroduction,
                    italics: true,
                    font: 'Calibri',
                    size: 20,
                    color: '3A3A3A',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  // ── 4. ITEMS TABLE ──────────────────────────────────────────────────────────
  const total = proposal.items.reduce((s, i) => s + i.line_total, 0)
  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header row
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN },
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [new Paragraph({ children: [new TextRun({ text: L.description, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN },
            width: { size: 7, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: L.qtyShort, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN },
            width: { size: 15, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${L.unitPrice} (€)`, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN },
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [new Paragraph({ children: [new TextRun({ text: L.options, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN },
            width: { size: 17, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${L.total} (€)`, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
          }),
        ],
      }),
      // Item rows
      ...proposal.items.map(item => itemRow(item)),
      // TOTAL row
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN_TOTAL_BG },
            width: { size: 83, type: WidthType.PERCENTAGE },
            columnSpan: 4,
            borders: noBorders(),
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: L.total.toUpperCase(), bold: true, color: DARK, font: 'Calibri', size: 22 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN_TOTAL_BG },
            width: { size: 17, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${formatCurrency(total)} €`, bold: true, color: GREEN, font: 'Calibri', size: 24 })] })],
          }),
        ],
      }),
    ],
  })

  // ── 5. TERMS AND CONDITIONS ─────────────────────────────────────────────────
  const termsTitlePara = new Paragraph({
    spacing: { before: 360, after: 160 },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY } },
    children: [
      new TextRun({ text: L.termsAndConditions.toUpperCase(), bold: true, font: 'Calibri', size: 22, color: '555555' }),
    ],
  })

  const termsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Row 1: Valid Until | Packaging
      new TableRow({
        children: [
          termsCell(L.validUntil, formatDate(proposal.validity_date), 48),
          new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: noBorders(), children: [new Paragraph({ children: [] })] }),
          termsCell(L.packaging, packagingLabel, 48),
        ],
      }),
      // Row 2: Delivery Time | Payment Terms
      new TableRow({
        children: [
          termsCell(L.deliveryTime, proposal.delivery_weeks ? `${proposal.delivery_weeks} ${L.weeks}` : '—', 48),
          new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: noBorders(), children: [new Paragraph({ children: [] })] }),
          termsCell(L.paymentTerms, proposal.payment_terms || L.defaultPaymentTerms, 48),
        ],
      }),
      // Row 3: Delivery Terms | Warranty
      new TableRow({
        children: [
          termsCell(L.deliveryTerms, proposal.delivery_terms || L.defaultDeliveryTerms, 48),
          new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: noBorders(), children: [new Paragraph({ children: [] })] }),
          termsCell(L.warranty, proposal.warranty || L.defaultWarranty, 48),
        ],
      }),
    ],
  })

  // ── ADDITIONAL NOTES ────────────────────────────────────────────────────────
  const additionalNotesPara = proposal.additional_notes?.trim()
    ? new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({ text: `${L.additionalNotes}: `, bold: true, font: 'Calibri', size: 20 }),
          new TextRun({ text: proposal.additional_notes, font: 'Calibri', size: 20, color: '555555' }),
        ],
      })
    : undefined

  // ── 6. DATASHEETS LINE (gray top + bottom borders) ──────────────────────────
  const datasheetsLinePara = datasheetCount > 0
    ? new Paragraph({
        spacing: { before: 200, after: 200 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY, space: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY, space: 4 },
        },
        children: [
          new TextRun({ text: `• ${datasheetLine}`, font: 'Calibri', size: 20, color: '555555' }),
        ],
      })
    : undefined

  // ── 7. SIGNATURE (name only, no "Prepared by" label) ───────────────────────
  const signaturePara = new Paragraph({
    spacing: { before: 240 },
    children: [
      new TextRun({ text: proposal.salesperson_name, bold: true, font: 'Calibri', size: 22, color: DARK }),
    ],
  })

  // ── 8. VAT NOTE ─────────────────────────────────────────────────────────────
  const vatPara = new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [
      new TextRun({ text: L.vatNote, italics: true, font: 'Calibri', size: 18, color: '999999' }),
    ],
  })

  // ── 9. GREEN FOOTER BAND ────────────────────────────────────────────────────
  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: GREEN },
            borders: noBorders(),
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: 'Kozegho, Lda.   |   www.kozegho.com   |   kozegho@kozegho.com', color: WHITE, font: 'Calibri', size: 18 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const children = [
    headerTable,
    subjectPara,
    subjectUnderline,
    introTable,
    itemsTable,
    termsTitlePara,
    termsTable,
    ...(additionalNotesPara ? [additionalNotesPara] : []),
    ...(datasheetsLinePara ? [datasheetsLinePara] : []),
    signaturePara,
    vatPara,
    footerTable,
  ]

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 800, bottom: 800, left: 1000, right: 1000 } } },
      children,
    }],
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await Packer.toBlob(doc as any)
  saveAs(buffer, `${proposal.reference.replace(/\//g, '-')}_${proposal.language}.docx`)
}
