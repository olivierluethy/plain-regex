import { useMemo } from 'react'
import { cleanValue, diagnose, generateExamples, hasStrips, traceMatch } from '@/core'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Check, Scissors, X } from '@/ui/icons'
import { HighlightedValue } from './HighlightedValue'

function ExampleValue({ value }: { value: string }) {
  if (value === '') return <span className="italic text-ink-faint">(empty)</span>
  return <code className="break-all font-mono text-mono-sm">{value}</code>
}

export function ExamplesPanel({ className = '' }: { className?: string }) {
  const rule = useStore((s) => s.active())
  const { positives, negatives } = useMemo(
    () => generateExamples(rule.ast, rule.flags, 5),
    [rule.ast, rule.flags],
  )
  const conflict = useMemo(
    () => (positives.length === 0 ? diagnose(rule.ast) : null),
    [positives.length, rule.ast],
  )

  const cleanedDemo = useMemo(() => {
    if (!hasStrips(rule.ast)) return null
    for (const p of positives) {
      const c = cleanValue(rule.ast, rule.flags, p)
      if (c && c.matched && c.removed.length) return { value: p, cleaned: c.cleaned }
    }
    return null
  }, [rule.ast, rule.flags, positives])

  return (
    <Panel eyebrow="See it" title="Examples, generated for you" className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-pass/15 text-pass">
              <Check width={13} height={13} />
            </span>
            <h3 className="text-h3 text-ink">These would match</h3>
          </div>
          {positives.length ? (
            <ul className="flex flex-col gap-1.5">
              {positives.map((v, i) => (
                <li
                  key={i}
                  className="animate-flip-in rounded-md border-l-2 border-pass bg-pass-tint/50 px-3 py-1.5 text-ink"
                >
                  <HighlightedValue value={v} parts={traceMatch(rule.ast, rule.flags, v)} />
                </li>
              ))}
            </ul>
          ) : conflict ? (
            <div className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-2.5 text-body-sm text-warn">
              <span aria-hidden className="mt-px">
                ⚠
              </span>
              <span>{conflict}</span>
            </div>
          ) : (
            <p className="text-body-sm text-ink-muted">Add a block to see matching examples.</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-fail/15 text-fail">
              <X width={13} height={13} />
            </span>
            <h3 className="text-h3 text-ink">These would be rejected</h3>
          </div>
          {negatives.length ? (
            <ul className="flex flex-col gap-1.5">
              {negatives.map((v, i) => (
                <li
                  key={i}
                  className="animate-flip-in rounded-md border-l-2 border-fail bg-fail-tint/40 px-3 py-1.5 text-ink"
                >
                  <ExampleValue value={v} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-ink-muted">
              This rule is broad — almost anything is allowed.
            </p>
          )}
        </div>
      </div>

      {cleanedDemo && (
        <div className="mt-4 rounded-lg border border-border bg-surface-2/50 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-fail/15 text-fail">
              <Scissors width={13} height={13} />
            </span>
            <span className="eyebrow">Cleaned result</span>
          </div>
          <p className="text-body-sm text-ink-muted">
            With the strip rule, <code className="font-mono text-ink">{cleanedDemo.value}</code>{' '}
            becomes{' '}
            <code className="break-all font-mono text-pass">{cleanedDemo.cleaned || '(empty)'}</code>.
          </p>
        </div>
      )}
    </Panel>
  )
}
