import { useState } from 'react'

// Shared follow-up review/send modal. Presentation-only: the caller owns the draft source
// (AI-generated in the Intelligence Hub, or the agent's stored draft on a follow-up task) and
// the Gmail send flow (useFollowUp.sendEmail → sendProposalEmail). No send pipeline lives here.

export type FollowUpModalProps = {
  headerTitle: string
  headerSubtitle: string
  recipientEmail: string
  draft: { subject: string; body: string } | null
  generating: boolean
  sending: boolean
  sent: boolean
  error: string | null
  onSend: (to: string, subject: string, body: string) => void
  onClose: () => void
  onRetry?: () => void
}

export function FollowUpModal({
  headerTitle, headerSubtitle, recipientEmail,
  draft, generating, sending, sent, error, onSend, onClose, onRetry,
}: FollowUpModalProps) {
  const [editSubject, setEditSubject] = useState(draft?.subject ?? '')
  const [editBody, setEditBody] = useState(draft?.body ?? '')

  const hasDraft = !generating && draft !== null && !sent
  const hasGenerationError = !generating && draft === null && !sent && error !== null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] shadow-[var(--kz-shadow-card)] max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        <div>
          <p className="text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wider">Follow-up Draft</p>
          <p className="text-sm font-medium text-[var(--kz-text)] mt-1">{headerTitle}</p>
          <p className="text-xs text-[var(--kz-text-muted)]">{headerSubtitle}</p>
        </div>

        {generating && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-5 h-5 border-2 border-[var(--kz-green)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--kz-text-secondary)]">Generating follow-up draft...</p>
          </div>
        )}

        {hasDraft && (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--kz-text-secondary)] block mb-1">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full border border-[var(--kz-border)] rounded-[var(--kz-radius-input)] p-2 text-sm text-[var(--kz-text)] focus:outline-none focus:border-[var(--kz-green)] focus:ring-2 focus:ring-[var(--kz-green-ring)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--kz-text-secondary)] block mb-1">Body (HTML)</label>
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="w-full border border-[var(--kz-border)] rounded-[var(--kz-radius-input)] p-2 text-sm text-[var(--kz-text)] min-h-48 focus:outline-none focus:border-[var(--kz-green)] focus:ring-2 focus:ring-[var(--kz-green-ring)] resize-y font-mono"
                />
              </div>
            </div>
            {error && <p className="text-sm text-[var(--kz-text-secondary)]">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={sending}
                className="border border-[var(--kz-border)] text-[var(--kz-text-secondary)] px-4 py-2 rounded-[var(--kz-radius-button)] text-sm hover:bg-[var(--kz-surface-hover)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onSend(recipientEmail, editSubject, editBody)}
                disabled={sending}
                className="bg-[var(--kz-green)] hover:bg-[var(--kz-green-hover)] text-white px-4 py-2 rounded-[var(--kz-radius-button)] text-sm transition-colors disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </>
        )}

        {sent && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-[var(--kz-green)]">Follow-up sent successfully.</p>
            <button
              onClick={onClose}
              className="border border-[var(--kz-border)] text-[var(--kz-text-secondary)] px-4 py-2 rounded-[var(--kz-radius-button)] text-sm hover:bg-[var(--kz-surface-hover)] transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {hasGenerationError && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-[var(--kz-text-secondary)]">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="border border-[var(--kz-border)] text-[var(--kz-text-secondary)] px-4 py-2 rounded-[var(--kz-radius-button)] text-sm hover:bg-[var(--kz-surface-hover)] transition-colors"
              >
                Cancel
              </button>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="bg-[var(--kz-green)] hover:bg-[var(--kz-green-hover)] text-white px-4 py-2 rounded-[var(--kz-radius-button)] text-sm transition-colors"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
