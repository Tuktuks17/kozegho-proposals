import type { ReactNode } from 'react'
import { LogOut, ClipboardList, FilePlus } from 'lucide-react'
import { logoUrl } from '@/services/datasheets'

type View = 'form' | 'history'

type Props = {
  children: ReactNode
  userName: string
  onSignOut: () => void
  view: View
  onViewChange: (v: View) => void
}

export function AppShell({ children, userName, onSignOut, view, onViewChange }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-kozegho-grey">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoUrl()} alt="Kozegho" className="h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <nav className="flex items-center gap-1">
              <button
                onClick={() => onViewChange('form')}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
                  view === 'form'
                    ? 'bg-kozegho-green text-white font-semibold'
                    : 'text-kozegho-grey-text hover:text-kozegho-dark hover:bg-kozegho-grey'
                }`}
              >
                <FilePlus className="w-4 h-4" />
                <span className="hidden sm:block">New Proposal</span>
              </button>
              <button
                onClick={() => onViewChange('history')}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
                  view === 'history'
                    ? 'bg-kozegho-green text-white font-semibold'
                    : 'text-kozegho-grey-text hover:text-kozegho-dark hover:bg-kozegho-grey'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:block">History</span>
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-kozegho-grey-text hidden sm:block">{userName}</span>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-sm text-kozegho-grey-text hover:text-kozegho-dark transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
