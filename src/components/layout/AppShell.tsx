import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { logoUrl } from '@/services/datasheets'

type Props = {
  children: ReactNode
  userName: string
  onSignOut: () => void
}

export function AppShell({ children, userName, onSignOut }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-kozegho-grey">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <img src={logoUrl()} alt="Kozegho" className="h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
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
