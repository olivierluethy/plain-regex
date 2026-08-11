import { useMemo } from 'react'
import { buildRegExp, explain } from '@/core'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Check, Copy } from '@/ui/icons'
import { useCopy } from '@/ui/useCopy'

export function ExplanationPanel() {
  const rule = useStore((s) => s.active())
  const advanced = useStore((s) => s.experience === 'advanced')
  const [copied, copy] = useCopy()

  const explanation = useMemo(() => explain(rule.ast), [rule.ast])
  const compiled = useMemo(() => buildRegExp(rule.ast, rule.flags), [rule.ast, rule.flags])

  return (
    <Panel eyebrow="In plain English" title="What this rule does">
      <p className="text-body text-ink">{explanation.summary}</p>

      <ol className="mt-4 flex flex-col gap-2">
        {explanation.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-tint text-[0.75rem] font-semibold text-brand">
              {i + 1}
            </span>
            <span className="text-body-sm text-ink">{step}</span>
          </li>
        ))}
      </ol>

      {advanced && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="eyebrow">Raw pattern</div>
            <button
              className="btn-ghost btn-sm"
              onClick={() => copy(`/${compiled.source}/${compiled.flags}`)}
            >
              {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="overflow-x-auto scroll-thin rounded-md border border-border bg-surface-2 px-3 py-2.5">
            <code className="whitespace-pre font-mono text-mono-sm text-ink">
              <span className="text-ink-faint">/</span>
              {compiled.source}
              <span className="text-ink-faint">/{compiled.flags}</span>
            </code>
          </div>
          {compiled.error && (
            <p className="mt-2 text-body-sm text-fail">This pattern can’t compile: {compiled.error}</p>
          )}
        </div>
      )}
    </Panel>
  )
}
