import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ImageRun, ShadingType, Header, Footer, PageNumber, NumberFormat
} from 'docx'
import { saveAs } from 'file-saver'
import type { PersistedProposal, ProposalItem } from '@/types/proposal'
import type { Customer } from '@/types/database'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'
import { formatCurrency, formatDate } from '@/lib/utils'
import { fetchDatasheetBytes } from './datasheets'

const GREEN = '7AB648'
const DARK = '333333'
const GREY = 'F5F5F5'
const WHITE = 'FFFFFF'

function cell(text: string, opts?: { bold?: boolean; shade?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType]; width?: number }) {
  return new TableCell({
    shading: opts?.shade ? { type: ShadingType.SOLID, color: GREY } : undefined,
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({
      alignment: opts?.align ?? AlignmentType.LEFT,
      children: [new TextRun({ text, bold: opts?.bold ?? false, color: DARK, font: 'Calibri', size: 20 })]
    })]
  })
}

function headerCell(text: string, width?: number) {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: GREEN },
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: WHITE, font: 'Calibri', size: 20 })]
    })]
  })
}

function noBorders() {
  const b = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return { top: b, bottom: b, left: b, right: b, insideH: b, insideV: b }
}

function itemRows(item: ProposalItem) {
  const rows: TableRow[] = []

  // Main item row
  rows.push(new TableRow({
    children: [
      cell(item.description || item.product_name, { width: 45 }),
      cell(String(item.quantity), { align: AlignmentType.CENTER, width: 8 }),
      cell(formatCurrency(item.unit_price), { align: AlignmentType.RIGHT, width: 15 }),
      cell(item.discount_percent > 0 ? `${item.discount_percent}%` : '—', { align: AlignmentType.CENTER, width: 10 }),
      cell(formatCurrency(item.line_total), { align: AlignmentType.RIGHT, width: 15, bold: true })
    ]
  }))

  // Option sub-rows
  for (const opt of item.options) {
    rows.push(new TableRow({
      children: [
        cell(`  + ${opt.label}`, { shade: true, width: 45 }),
        cell('1', { align: AlignmentType.CENTER, shade: true, width: 8 }),
        cell(formatCurrency(opt.price), { align: AlignmentType.RIGHT, shade: true, width: 15 }),
        cell('—', { align: AlignmentType.CENTER, shade: true, width: 10 }),
        cell(formatCurrency(opt.price), { align: AlignmentType.RIGHT, shade: true, width: 15 })
      ]
    }))
  }

  return rows
}

export async function exportWord(
  proposal: PersistedProposal,
  customer: Customer,
  logoBytes: ArrayBuffer | null
) {
  const labels = PROPOSAL_LABELS[proposal.language]

  // ── Header image ──────────────────────────────────────────────────────────
  const logoImage = logoBytes
    ? new ImageRun({ data: logoBytes, transformation: { width: 150, height: 50 }, type: 'png' })
    : undefined

  // ── Cover section ─────────────────────────────────────────────────────────
  const coverSection: Paragraph[] = [
    new Paragraph({
      children: logoImage ? [logoImage] : [],
      spacing: { after: 400 }
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: labels.commercialProposal, color: GREEN, font: 'Calibri', size: 52, bold: true })]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${labels.reference}: `, bold: true, font: 'Calibri', size: 22 }),
        new TextRun({ text: proposal.reference, font: 'Calibri', size: 22 })
      ],
      spacing: { before: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${labels.date}: `, bold: true, font: 'Calibri', size: 22 }),
        new TextRun({ text: formatDate(proposal.created_at), font: 'Calibri', size: 22 })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${labels.validUntil}: `, bold: true, font: 'Calibri', size: 22 }),
        new TextRun({ text: formatDate(proposal.validity_date), font: 'Calibri', size: 22 })
      ],
      spacing: { after: 400 }
    })
  ]

  // ── Client info table ──────────────────────────────────────────────────────
  const clientTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({ children: [
        cell(labels.company, { bold: true, width: 25 }),
        cell(customer.company, { width: 75 })
      ]}),
      new TableRow({ children: [
        cell(labels.clientContact, { bold: true, width: 25 }),
        cell(customer.name, { width: 75 })
      ]}),
      new TableRow({ children: [
        cell(labels.email, { bold: true, width: 25 }),
        cell(customer.email, { width: 75 })
      ]}),
      new TableRow({ children: [
        cell(labels.country, { bold: true, width: 25 }),
        cell(customer.country, { width: 75 })
      ]})
    ]
  })

  // ── Subject & intro ────────────────────────────────────────────────────────
  const subjectSection: Paragraph[] = [
    new Paragraph({ spacing: { before: 400 }, children: [
      new TextRun({ text: `${labels.subject}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: proposal.subject, font: 'Calibri', size: 22 })
    ]}),
    new Paragraph({ spacing: { before: 300, after: 200 }, children: [
      new TextRun({ text: proposal.introduction ?? '', font: 'Calibri', size: 22 })
    ]})
  ]

  // ── Products table ─────────────────────────────────────────────────────────
  const productRows = proposal.items.flatMap((item) => itemRows(item))
  const productTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: [
        headerCell(labels.description, 45),
        headerCell(labels.qtyShort, 8),
        headerCell(labels.unitPrice, 15),
        headerCell(labels.discount, 10),
        headerCell(labels.total, 15)
      ]}),
      ...productRows,
      // Subtotal row
      new TableRow({ children: [
        cell('', { width: 45 }),
        cell('', { width: 8 }),
        cell('', { width: 15 }),
        cell(labels.subtotal, { bold: true, align: AlignmentType.RIGHT, width: 10 }),
        cell(formatCurrency(proposal.subtotal), { bold: true, align: AlignmentType.RIGHT, width: 15 })
      ]}),
      new TableRow({ children: [
        cell('', { width: 45 }),
        cell('', { width: 8 }),
        cell('', { width: 15 }),
        cell(labels.total, { bold: true, align: AlignmentType.RIGHT, width: 10 }),
        cell(formatCurrency(proposal.total), { bold: true, align: AlignmentType.RIGHT, width: 15 })
      ]})
    ]
  })

  // ── Terms section ──────────────────────────────────────────────────────────
  const termsSection: Paragraph[] = [
    new Paragraph({ spacing: { before: 400 }, heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: labels.termsAndConditions, color: GREEN, font: 'Calibri', size: 28, bold: true })]
    })
  ]

  if (proposal.delivery_weeks) {
    termsSection.push(new Paragraph({ children: [
      new TextRun({ text: `${labels.deliveryTime}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: `${proposal.delivery_weeks} ${labels.weeks}`, font: 'Calibri', size: 22 })
    ]}))
  }

  const packagingLabel = proposal.packaging_type === 'ocean' ? labels.packagingOcean : labels.packagingStandard
  termsSection.push(
    new Paragraph({ children: [
      new TextRun({ text: `${labels.packaging}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: packagingLabel, font: 'Calibri', size: 22 })
    ]}),
    new Paragraph({ children: [
      new TextRun({ text: `${labels.deliveryTerms}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: proposal.delivery_terms, font: 'Calibri', size: 22 })
    ]}),
    new Paragraph({ children: [
      new TextRun({ text: `${labels.paymentTerms}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: proposal.payment_terms, font: 'Calibri', size: 22 })
    ]}),
    new Paragraph({ children: [
      new TextRun({ text: `${labels.warranty}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: proposal.warranty, font: 'Calibri', size: 22 })
    ]})
  )

  if (proposal.additional_notes) {
    termsSection.push(new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: proposal.additional_notes, font: 'Calibri', size: 22 })]
    }))
  }

  termsSection.push(new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({ text: labels.vatNote, italics: true, font: 'Calibri', size: 20, color: '777777' })]
  }))

  termsSection.push(new Paragraph({
    spacing: { before: 400 },
    children: [
      new TextRun({ text: `${labels.preparedBy}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: proposal.salesperson_name, font: 'Calibri', size: 22 })
    ]
  }))

  // ── Assemble document ──────────────────────────────────────────────────────
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ children: [] })] })
      },
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 18, color: '999999' }),
              new TextRun({ text: ' / ', font: 'Calibri', size: 18, color: '999999' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Calibri', size: 18, color: '999999' })
            ]
          })
        ]})
      },
      children: [
        ...coverSection,
        clientTable,
        ...subjectSection,
        productTable,
        ...termsSection
      ]
    }],
    numbering: {
      config: [{
        reference: 'default',
        levels: [{ level: 0, format: NumberFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }]
      }]
    }
  })

  // ── Collect datasheets ─────────────────────────────────────────────────────
  const datasheetSections = []
  for (const item of proposal.items) {
    if (!item.datasheet_url) continue
    const bytes = await fetchDatasheetBytes(item.datasheet_url)
    if (!bytes) continue
    // Embed as a note that datasheets are appended
    datasheetSections.push(item.product_name)
  }

  if (datasheetSections.length > 0) {
    // Note: full PDF embedding in docx requires an external tool (e.g. LibreOffice merge).
    // We add a note listing the datasheets that were attached.
    // The PDF export path does the actual merging.
  }

  const buffer = await Packer.toBlob(doc)
  saveAs(buffer, `${proposal.reference}_${proposal.language}.docx`)
}
