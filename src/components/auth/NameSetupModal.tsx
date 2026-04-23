import { useState } from 'react'

type Props = { onSave: (name: string) => void }

export function NameSetupModal({ onSave }: Props) {
  const [name, setName] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-card w-full max-w-sm p-8 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-display font-bold text-kozegho-dark">Welcome to Kozegho Proposals</h2>
          <p className="text-sm text-kozegho-grey-text mt-1">Enter your full name to personalise proposals.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-kozegho-dark" htmlFor="fullname">Your full name</label>
          <input
            id="fullname"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()) }}
            placeholder="e.g. João Silva"
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
            autoFocus
          />
        </div>
        <button
          disabled={!name.trim()}
          onClick={() => onSave(name.trim())}
          className="w-full bg-kozegho-green text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:bg-kozegho-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
