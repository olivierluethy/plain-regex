import { useState } from 'react'
import { X } from '@/ui/icons'

const KEY = 'plainregex.onboarded'

const STEPS = [
  'Paste a value (an email, a URL, any text) into “Build from example”.',
  'Select part of it, then pick what that part should mean.',
  'Watch the blocks, the live regex, the explanation and examples update together.',
  'Copy a ready-to-paste snippet from “Use it in your code”.',
]

/** A one-time, dismissible explainer of the flow. */
export function FirstRun() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  if (dismissed) return null

  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-0.5">New here?</div>
          <h2 className="text-h3 text-ink">Build a rule from meaning in four steps</h2>
        </div>
        <button className="btn-icon h-8 w-8 shrink-0" onClick={close} aria-label="Dismiss">
          <X width={16} height={16} />
        </button>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-tint text-[0.75rem] font-semibold text-brand">
              {i + 1}
            </span>
            <span className="text-body-sm text-ink">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
