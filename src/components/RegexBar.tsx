import { useMemo } from 'react'
import { buildRegExp } from '@/core'
import { useStore } from '@/store/useStore'
import { Check, Copy } from '@/ui/icons'
import { useCopy } from '@/ui/useCopy'

/** The live regex, always visible in both Simple and Advanced modes. */
export function RegexBar() {
  const rule = useStore((s) => s.active())
  const compiled = useMemo(() => buildRegExp(rule.ast, rule.flags), [rule.ast, rule.flags])
  const [copied, copy] = useCopy()

  return (
    <div className="mb-3">
      <div className="flex items-stretch gap-2 rounded-md border border-border bg-surface-2">
        <span className="flex shrink-0 items-center rounded-l-md border-r border-border px-2.5 text-label uppercase tracking-[0.08em] text-ink-muted">
          Regex
        </span>
        <div className="min-w-0 flex-1 overflow-x-auto scroll-thin py-2">
          <code className="whitespace-pre font-mono text-mono-sm text-ink">
            <span className="text-ink-faint">/</span>
            {compiled.source}
            <span className="text-ink-faint">/{compiled.flags}</span>
          </code>
        </div>
        <button
          className="btn-ghost btn-sm shrink-0 self-center mr-1.5"
          onClick={() => copy(`/${compiled.source}/${compiled.flags}`)}
          title="Copy regex"
        >
          {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {compiled.error && (
        <p className="mt-1.5 text-body-sm text-fail">This pattern can’t compile: {compiled.error}</p>
      )}
    </div>
  )
}
