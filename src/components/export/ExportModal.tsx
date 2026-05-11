import { useState } from 'react'
import { FileDown, FileText, CheckCircle, Loader2, X, Mail, Send } from 'lucide-react'
import type { PersistedProposal } from '@/types/proposal'
import type { Customer, ProposalLine, ProposalLineOption } from '@/types/database'
import { exportWord } from '@/services/exportWord'
import { generateProposalPdf } from '@/services/generateProposalPdf'
import { fetchDatasheetBytes, logoUrl } from '@/services/datasheets'
import { supabase } from '@/lib/supabase'
import { buildEmailSubject } from '@/utils/emailTemplates'

type Props = {
  proposal: PersistedProposal
  customer: Customer
  onClose: () => void
}

type DownloadState = 'idle' | 'loading' | 'done' | 'error'
type SendState = 'idle' | 'preview' | 'sending' | 'sent' | 'error'

function toLines(proposal: PersistedProposal): { lines: ProposalLine[]; lineOptions: ProposalLineOption[] } {
  const lines: ProposalLine[] = proposal.items.map((item, i) => ({
    id: item.id,
    proposal_id: proposal.id,
    product_id: item.product_id,
    product_name: item.product_name,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent,
    line_total: item.line_total,
    sort_order: i,
    datasheet_url: item.datasheet_url,
    created_at: proposal.created_at,
  }))
  const lineOptions: ProposalLineOption[] = proposal.items.flatMap((item) =>
    item.options.map((opt) => ({
      id: opt.code,
      proposal_line_id: item.id,
      option_code: opt.code,
      option_label: opt.label,
      price_eur: opt.price,
      created_at: proposal.created_at,
    }))
  )
  return { lines, lineOptions }
}

export function ExportModal({ proposal, customer, onClose }: Props) {
  const [wordState, setWordState] = useState<DownloadState>('idle')
  const [pdfState, setPdfState] = useState<DownloadState>('idle')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [recipientEmail, setRecipientEmail] = useState(customer.email || '')
  const [sendError, setSendError] = useState<string | null>(null)
  const [sentAt, setSentAt] = useState<string | null>(proposal.email_sent_at ?? null)

  const datasheetPaths = proposal.items
    .filter((item) => !!item.datasheet_url)
    .map((item) => ({
      path: item.datasheet_url!.split('/datasheets/')[1] ?? '',
      productName: item.product_name,
    }))
    .filter((d) => !!d.path)

  const emailSubject = buildEmailSubject(proposal.language, proposal.reference)
  const clientName = customer.name || ''

  const datasheetAttachmentNames = datasheetPaths.length > 0
    ? datasheetPaths.map((d) => `${d.productName}_Datasheet_${proposal.language.toUpperCase()}.pdf`)
    : null

  // ── Download handlers ─────────────────────────────────────────────────────

  const handleWordExport = async () => {
    setWordState('loading')
    try {
      let logoBytes: ArrayBuffer | null = null
      try { logoBytes = await fetchDatasheetBytes(logoUrl()) } catch { /* no logo */ }
      await exportWord(proposal, customer, logoBytes)
      setWordState('done')
    } catch { setWordState('error') }
  }

  const handlePdfExport = async () => {
    setPdfState('loading')
    try {
      const { lines, lineOptions } = toLines(proposal)
      const blob = await generateProposalPdf({ proposal, customer, lines, lineOptions, language: proposal.language })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${proposal.reference.replace(/\//g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setPdfState('done')
    } catch (e) {
      console.error('PDF generation failed:', e)
      setPdfState('error')
    }
  }

  // ── Email send handler ────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!recipientEmail.trim()) return
    setSendState('sending')
    setSendError(null)

    try {
      const { data, error } = await supabase.functions.invoke('send-proposal', {
        body: {
          proposalNumber: proposal.reference,
          subject: proposal.subject,
          createdAt: proposal.created_at,
          validityDate: proposal.validity_date,
          deliveryWeeks: proposal.delivery_weeks,
          packagingType: proposal.packaging_type,
          deliveryTerms: proposal.delivery_terms,
          paymentTerms: proposal.payment_terms,
          warranty: proposal.warranty,
          additionalNotes: proposal.additional_notes,
          introduction: proposal.introduction,
          subtotal: proposal.subtotal,
          total: proposal.total,
          language: proposal.language.toLowerCase(),
          items: proposal.items.map((item) => ({
            product_name: item.product_name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            line_total: item.line_total,
            options: item.options.map((o) => ({ label: o.label, price: o.price })),
          })),
          clientEmail: recipientEmail.trim(),
          clientName,
          clientCompany: customer.company,
          clientCountry: customer.country,
          commercialName: proposal.salesperson_name,
          datasheetPaths,
          proposalId: proposal.id,
        },
      })

      if (error || data?.success === false) {
        throw new Error(data?.error ?? error?.message ?? 'Envio falhou')
      }

      setSentAt(new Date().toISOString())
      setSendState('sent')
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e))
      setSendState('error')
    }
  }

  // ── Icon helper ───────────────────────────────────────────────────────────

  const DlIcon = ({ state, icon: Icon }: { state: DownloadState; icon: typeof FileDown }) => {
    if (state === 'loading') return <Loader2 className="w-5 h-5 animate-spin" />
    if (state === 'done') return <CheckCircle className="w-5 h-5 text-kozegho-green" />
    if (state === 'error') return <Icon className="w-5 h-5 text-red-500" />
    return <Icon className="w-5 h-5" />
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-card w-full max-w-md p-6 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-kozegho-dark">Proposal Ready!</h2>
            <p className="text-sm text-kozegho-grey-text mt-0.5">{proposal.reference} · {customer.company}</p>
          </div>
          <button onClick={onClose} className="text-kozegho-grey-text hover:text-kozegho-dark"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={handleWordExport} disabled={wordState === 'loading'}
            className="flex items-center gap-3 w-full rounded-md border-2 border-blue-200 bg-blue-50 px-4 py-3 text-left hover:border-blue-400 transition-colors disabled:opacity-60">
            <DlIcon state={wordState} icon={FileDown} />
            <div>
              <p className="text-sm font-semibold text-kozegho-dark">Download Word (.docx)</p>
              <p className="text-xs text-kozegho-grey-text">Documento editável com todos os detalhes</p>
            </div>
          </button>

          <button onClick={handlePdfExport} disabled={pdfState === 'loading'}
            className="flex items-center gap-3 w-full rounded-md border-2 border-kozegho-green border-opacity-30 bg-kozegho-green-light px-4 py-3 text-left hover:border-opacity-60 transition-colors disabled:opacity-60">
            <DlIcon state={pdfState} icon={FileText} />
            <div>
              <p className="text-sm font-semibold text-kozegho-dark">Download PDF</p>
              <p className="text-xs text-kozegho-grey-text">PDF Kozegho para arquivo local</p>
            </div>
          </button>
        </div>

        <div className="border-t border-border pt-3">
          {sendState === 'idle' && (
            <button onClick={() => setSendState('preview')}
              className="flex items-center justify-between w-full rounded-md border-2 border-orange-200 bg-orange-50 px-4 py-3 text-left hover:border-orange-400 transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-kozegho-dark">Send by Email</p>
                  <p className="text-xs text-kozegho-grey-text">
                    Proposal in email body
                    {datasheetPaths.length > 0 ? ` + ${datasheetPaths.length} datasheet(s) attached` : ''}
                  </p>
                </div>
              </div>
              {sentAt && <span className="text-xs text-kozegho-green font-medium shrink-0 ml-2">✓ Sent</span>}
            </button>
          )}

          {sendState === 'sent' && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Proposal sent successfully!</p>
                  <p className="text-xs text-green-700">To: {recipientEmail}</p>
                  {sentAt && (
                    <p className="text-xs text-green-600 mt-0.5">
                      {new Date(sentAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setSendState('preview')}
                className="text-xs text-green-700 hover:text-green-900 shrink-0 underline">Resend</button>
            </div>
          )}

          {(sendState === 'preview' || sendState === 'error') && (
            <div className="rounded-md border border-border bg-kozegho-grey p-4 flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-kozegho-dark">Confirm email send</h3>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Para</label>
                <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green" />
              </div>

              <div>
                <p className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide mb-0.5">Subject</p>
                <p className="text-sm text-kozegho-dark">{emailSubject}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide mb-1">Corpo do email</p>
                <p className="text-xs text-kozegho-dark">Full proposal (products table, terms, signature)</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide mb-1">Attachments</p>
                {datasheetAttachmentNames ? (
                  <ul className="text-xs text-kozegho-dark space-y-0.5">
                    {datasheetAttachmentNames.map((name) => (
                      <li key={name} className="flex items-center gap-1.5"><span className="text-kozegho-green">📄</span>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-kozegho-grey-text italic">No datasheets available yet</p>
                )}
              </div>

              {sendState === 'error' && sendError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{sendError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={handleSend} disabled={!recipientEmail.trim()}
                  className="flex items-center gap-1.5 rounded-md bg-kozegho-green px-4 py-2 text-sm font-semibold text-white hover:bg-kozegho-green-dark transition-colors disabled:opacity-50">
                  <Send className="w-4 h-4" /> Confirm Send
                </button>
                <button onClick={() => { setSendState('idle'); setSendError(null) }}
                  className="rounded-md border border-border bg-white px-4 py-2 text-sm text-kozegho-dark hover:bg-kozegho-grey transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {sendState === 'sending' && (
            <div className="rounded-md border border-border bg-kozegho-grey px-4 py-3 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-kozegho-green" />
              <div>
                <p className="text-sm font-semibold text-kozegho-dark">Sending proposal by email…</p>
                <p className="text-xs text-kozegho-grey-text">Processing and sending</p>
              </div>
            </div>
          )}
        </div>

        <button onClick={onClose}
          className="w-full rounded-md bg-kozegho-grey py-2.5 text-sm font-medium text-kozegho-dark hover:bg-border transition-colors">
          New proposal
        </button>
      </div>
    </div>
  )
}
