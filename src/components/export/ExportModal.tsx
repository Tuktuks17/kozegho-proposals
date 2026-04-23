import { useState } from 'react'
import { FileDown, FileText, CheckCircle, Loader2, X } from 'lucide-react'
import type { PersistedProposal } from '@/types/proposal'
import type { Customer } from '@/types/database'
import { exportWord } from '@/services/exportWord'
import { exportPdf } from '@/services/exportPdf'
import { fetchDatasheetBytes, logoUrl } from '@/services/datasheets'

type Props = {
  proposal: PersistedProposal
  customer: Customer
  onClose: () => void
}

type ExportState = 'idle' | 'loading' | 'done' | 'error'

export function ExportModal({ proposal, customer, onClose }: Props) {
  const [wordState, setWordState] = useState<ExportState>('idle')
  const [pdfState, setPdfState] = useState<ExportState>('idle')

  const getLogoBytes = async (): Promise<ArrayBuffer | null> => {
    try {
      return await fetchDatasheetBytes(logoUrl())
    } catch {
      return null
    }
  }

  const handleWordExport = async () => {
    setWordState('loading')
    try {
      const logoBytes = await getLogoBytes()
      await exportWord(proposal, customer, logoBytes)
      setWordState('done')
    } catch {
      setWordState('error')
    }
  }

  const handlePdfExport = async () => {
    setPdfState('loading')
    try {
      const logoBytes = await getLogoBytes()
      await exportPdf(proposal, customer, logoBytes)
      setPdfState('done')
    } catch {
      setPdfState('error')
    }
  }

  const Icon = ({ state, icon: DefaultIcon }: { state: ExportState; icon: typeof FileDown }) => {
    if (state === 'loading') return <Loader2 className="w-5 h-5 animate-spin" />
    if (state === 'done') return <CheckCircle className="w-5 h-5 text-kozegho-green" />
    return <DefaultIcon className="w-5 h-5" />
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-card w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-kozegho-dark">Proposal Ready!</h2>
            <p className="text-sm text-kozegho-grey-text mt-0.5">{proposal.reference} · {customer.company}</p>
          </div>
          <button onClick={onClose} className="text-kozegho-grey-text hover:text-kozegho-dark"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleWordExport}
            disabled={wordState === 'loading'}
            className="flex items-center gap-3 w-full rounded-md border-2 border-blue-200 bg-blue-50 px-4 py-3.5 text-left hover:border-blue-400 transition-colors disabled:opacity-60"
          >
            <Icon state={wordState} icon={FileDown} />
            <div>
              <p className="text-sm font-semibold text-kozegho-dark">Download Word (.docx)</p>
              <p className="text-xs text-kozegho-grey-text">Editable document with all proposal details</p>
            </div>
          </button>

          <button
            onClick={handlePdfExport}
            disabled={pdfState === 'loading'}
            className="flex items-center gap-3 w-full rounded-md border-2 border-kozegho-green border-opacity-30 bg-kozegho-green-light px-4 py-3.5 text-left hover:border-opacity-60 transition-colors disabled:opacity-60"
          >
            <Icon state={pdfState} icon={FileText} />
            <div>
              <p className="text-sm font-semibold text-kozegho-dark">Download PDF</p>
              <p className="text-xs text-kozegho-grey-text">
                PDF with datasheets appended
                {proposal.items.filter((i) => i.datasheet_url).length > 0
                  ? ` (${proposal.items.filter((i) => i.datasheet_url).length} datasheet(s))`
                  : ''}
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-md bg-kozegho-grey py-2.5 text-sm font-medium text-kozegho-dark hover:bg-border transition-colors"
        >
          Start new proposal
        </button>
      </div>
    </div>
  )
}
