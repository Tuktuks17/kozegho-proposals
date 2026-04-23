import { useOnline } from '@/hooks/useOnline'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 flex items-center gap-2 bg-kozegho-dark text-white text-sm px-3 py-2 rounded-md shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You are offline — exports will use cached data</span>
    </div>
  )
}
