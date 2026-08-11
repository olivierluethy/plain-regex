import { Fragment, useMemo, useState } from 'react'
import { quickCheck } from '@/core'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Check, Copy, X } from '@/ui/icons'
import { useCopy } from '@/ui/useCopy'
import { HighlightedValue } from './HighlightedValue'

function Verdict({ status }: { status: string }) {
  if (status === 'allowed') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-pass-tint px-2.5 py-1 text-sm font-semibold text-pass">
        <Check width={15} height={15} /> Allowed
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-fail-tint px-2.5 py-1 text-sm font-semibold text-fail">
        <X width={15} height={15} /> Rejected
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1 text-sm font-medium text-ink-faint">
      ? Waiting
    </span>
  )
}

export function QuickCheck() {
  const rule = useStore((s) => s.active())
  const [value, setValue] = useState('')
  const [copied, copy] = useCopy()

  const result = useMemo(() => quickCheck(rule.ast, rule.flags, value), [rule.ast, rule.flags, value])

  // Build a struck-through view of the original showing removed spans.
  const removedView = () => {
    if (!result.removed || result.removed.length === 0) return null
    const parts: { text: string; removed: boolean }[] = []
    let cursor = 0
    for (const span of [...result.removed].sort((a, b) => a.start - b.start)) {
      if (span.start > cursor) parts.push({ text: value.slice(cursor, span.start), removed: false })
      parts.push({ text: value.slice(span.start, span.end), removed: true })
      cursor = span.end
    }
    if (cursor < value.length) parts.push({ text: value.slice(cursor), removed: false })
    return parts
  }
  const view = removedView()

  return (
    <Panel eyebrow="Quick check" title="Try a single value">
      <input
        className="input font-mono text-mono-sm"
        placeholder={rule.sampleValue || 'Type one value to test it…'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
      />

      <div className="mt-3 flex items-start gap-3">
        <Verdict status={result.status} />
        <p
          className={`pt-1 text-body-sm ${
            result.status === 'empty' ? 'text-ink-muted' : 'text-ink'
          }`}
        >
          {result.reason}
        </p>
      </div>

      {value && (result.status === 'allowed' || result.status === 'rejected') && (
        <div
          className={`mt-3 rounded-md border-l-2 px-3 py-2 ${
            result.status === 'allowed' ? 'border-pass bg-pass-tint/40' : 'border-fail bg-fail-tint/30'
          }`}
        >
          <HighlightedValue value={value} parts={result.parts} fail={result.fail} />
        </div>
      )}

      {result.cleaned !== undefined && result.removed && result.removed.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface-2/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Cleaned result</span>
            <button className="btn-ghost btn-sm" onClick={() => copy(result.cleaned ?? '')}>
              {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {view && (
            <div className="mb-2 break-all font-mono text-mono-sm">
              {view.map((p, i) =>
                p.removed ? (
                  <span key={i} className="text-fail line-through decoration-fail/60">
                    {p.text}
                  </span>
                ) : (
                  <Fragment key={i}>{p.text}</Fragment>
                ),
              )}
            </div>
          )}
          <div className="rounded-md bg-surface px-2.5 py-1.5">
            <code className="break-all font-mono text-mono-sm text-pass">
              {result.cleaned || '(empty)'}
            </code>
          </div>
        </div>
      )}
    </Panel>
  )
}
