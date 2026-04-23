import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  const install = async () => {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-50 flex items-center gap-3 bg-white border border-border rounded-md shadow-card px-4 py-3">
      <Download className="w-4 h-4 text-kozegho-green shrink-0" />
      <span className="text-sm text-kozegho-dark">Install Kozegho Proposals for offline access</span>
      <button onClick={install} className="ml-auto text-sm font-semibold text-kozegho-green hover:text-kozegho-green-dark shrink-0">Install</button>
      <button onClick={() => setDismissed(true)} className="text-kozegho-grey-text hover:text-kozegho-dark">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
