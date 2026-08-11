import { useMemo } from 'react'
import { generateExamples } from '@/core'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Check, X } from '@/ui/icons'

function ExampleValue({ value }: { value: string }) {
  if (value === '') return <span className="italic text-ink-faint">(empty)</span>
  return <code className="break-all font-mono text-mono-sm">{value}</code>
}

export function ExamplesPanel() {
  const rule = useStore((s) => s.active())
  const { positives, negatives } = useMemo(
    () => generateExamples(rule.ast, rule.flags, 5),
    [rule.ast, rule.flags],
  )

  return (
    <Panel eyebrow="See it" title="Examples, generated for you">
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
                  <ExampleValue value={v} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-ink-muted">Add a block to see matching examples.</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-fail/15 text-fail">
              <X width={13} height={13} />
            </span>
            <h3 className="text-h3 text-ink">These would not</h3>
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
              This rule is broad — almost anything matches it.
            </p>
          )}
        </div>
      </div>
    </Panel>
  )
}
