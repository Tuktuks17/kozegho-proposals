import type { ReactNode } from 'react'
import { LogOut, ClipboardList, FilePlus, Users, TrendingUp } from 'lucide-react'
import { logoUrl } from '@/services/datasheets'
import { useAlertCount } from '@/hooks/useAlertCount'
import { useRole } from '@/hooks/useRole'

type View = 'form' | 'history' | 'customers' | 'intelligence'

type Props = {
  children: ReactNode
  userName: string
  onSignOut: () => void
  view: View
  onViewChange: (v: View) => void
}

export function AppShell({ children, userName, onSignOut, view, onViewChange }: Props) {
  // Keep hook alive — badge data is still fetched, just not displayed
  useAlertCount()
  const { isManager } = useRole()

  return (
    <div className="kz-grid-bg min-h-screen flex flex-col">
      {/* White header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[var(--kz-border)]">
        {/* Green accent bar across top */}
        <div className="h-[3px] bg-[var(--kz-green)]" />
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <img
              src={logoUrl()}
              alt="Kozegho"
              className="h-8 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <nav className="flex items-center gap-1">
              <button
                onClick={() => onViewChange('form')}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors font-medium ${
                  view === 'form'
                    ? 'bg-[var(--kz-green)] text-white'
                    : 'text-[var(--kz-text)] hover:bg-[var(--kz-surface-hover)]'
                }`}
              >
                <FilePlus className={`w-4 h-4 ${view === 'form' ? 'text-white' : 'text-[var(--kz-text-secondary)]'}`} />
                <span className="hidden sm:block">New Proposal</span>
              </button>

              <button
                onClick={() => onViewChange('customers')}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors font-medium ${
                  view === 'customers'
                    ? 'bg-[var(--kz-green)] text-white'
                    : 'text-[var(--kz-text)] hover:bg-[var(--kz-surface-hover)]'
                }`}
              >
                <Users className={`w-4 h-4 ${view === 'customers' ? 'text-white' : 'text-[var(--kz-text-secondary)]'}`} />
                <span className="hidden sm:block">Customers</span>
              </button>

              {isManager && (
                <button
                  onClick={() => onViewChange('intelligence')}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors font-medium ${
                    view === 'intelligence'
                      ? 'bg-[var(--kz-green)] text-white'
                      : 'text-[var(--kz-text)] hover:bg-[var(--kz-surface-hover)]'
                  }`}
                >
                  <TrendingUp className={`w-4 h-4 ${view === 'intelligence' ? 'text-white' : 'text-[var(--kz-text-secondary)]'}`} />
                  <span className="hidden sm:block">Intelligence</span>
                </button>
              )}

              <button
                onClick={() => onViewChange('history')}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors font-medium ${
                  view === 'history'
                    ? 'bg-[var(--kz-green)] text-white'
                    : 'text-[var(--kz-text)] hover:bg-[var(--kz-surface-hover)]'
                }`}
              >
                <ClipboardList className={`w-4 h-4 ${view === 'history' ? 'text-white' : 'text-[var(--kz-text-secondary)]'}`} />
                <span className="hidden sm:block">History</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--kz-text)] hidden sm:block">{userName}</span>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-sm text-[var(--kz-text-secondary)] hover:text-[var(--kz-text)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}
