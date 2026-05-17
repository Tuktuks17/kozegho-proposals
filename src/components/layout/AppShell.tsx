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
  const { count: alertCount, loading: alertLoading } = useAlertCount()
  const { isManager } = useRole()

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-40"
        style={{ background: 'rgba(11,11,13,0.95)', borderBottom: '1px solid rgba(122,182,72,0.08)', backdropFilter: 'blur(8px)' }}
      >
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
                onClick={() => onViewChange('customers')}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
                  view === 'customers'
                    ? 'bg-kozegho-green text-white font-semibold'
                    : 'text-kozegho-grey-text hover:text-kozegho-dark hover:bg-kozegho-grey'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:block">Customers</span>
              </button>
              {isManager && (
                <button
                  onClick={() => onViewChange('intelligence')}
                  className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
                    view === 'intelligence'
                      ? 'bg-kozegho-green text-white font-semibold'
                      : 'text-kozegho-grey-text hover:text-kozegho-dark hover:bg-kozegho-grey'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:block">Intelligence</span>
                  {alertCount > 0 && !alertLoading && view !== 'intelligence' && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-kozegho-green text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 pointer-events-none">
                      {alertCount}
                    </span>
                  )}
                </button>
              )}
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
