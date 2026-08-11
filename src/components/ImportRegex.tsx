import { useMemo, useState } from 'react'
import { explain, parseRegexInput, type RuleNode } from '@/core'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Wand } from '@/ui/icons'

const SAMPLE = String.raw`/^(\d{3})-(\d{4})$/`

/** Does the parsed tree contain any raw (unmapped) fragment? */
function hasRaw(node: RuleNode): boolean {
  if (node.type === 'raw') return true
  const rec = node as unknown as Record<string, unknown>
  const kids = (rec.children ?? rec.options) as RuleNode[] | undefined
  if (Array.isArray(kids)) return kids.some(hasRaw)
  const child = rec.child as RuleNode | undefined
  return child ? hasRaw(child) : false
}

export function ImportRegex({ onDone }: { onDone?: () => void }) {
  const importRegex = useStore((s) => s.importRegex)
  const [input, setInput] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)

  const preview = useMemo(() => (input.trim() ? parseRegexInput(input) : null), [input])
  const explanation = useMemo(
    () => (preview?.ok && preview.ast ? explain(preview.ast) : null),
    [preview],
  )
  const rawInside = useMemo(
    () => Boolean(preview?.ok && preview.ast && hasRaw(preview.ast)),
    [preview],
  )

  const liveError = applyError ?? (input.trim() && preview && !preview.ok ? preview.error : null)
  const ready = Boolean(preview?.ok)

  const apply = (mode: 'replace' | 'append') => {
    const res = importRegex(input, mode)
    if (!res.ok) {
      setApplyError(res.error ?? 'Could not read that regex.')
      return
    }
    setApplyError(null)
    setInput('')
    onDone?.()
  }

  return (
    <Panel eyebrow="Paste a regex" title="Turn an existing pattern into blocks">
      <p className="mb-2 flex items-center gap-1.5 text-body-sm text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        Paste a regex you found — we’ll turn it into editable blocks you can read, change and learn
        from. Replace this rule, or add it to the end.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input flex-1 font-mono text-mono-sm"
          placeholder={`e.g. ${SAMPLE}`}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setApplyError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ready) apply('replace')
          }}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={Boolean(liveError)}
        />
        <div className="flex gap-2">
          <button
            className="btn-primary btn-md w-full sm:w-auto"
            onClick={() => apply('replace')}
            disabled={!ready}
          >
            <Wand width={15} height={15} />
            Replace
          </button>
          <button
            className="btn-secondary btn-md w-full sm:w-auto"
            onClick={() => apply('append')}
            disabled={!ready}
          >
            Append
          </button>
        </div>
      </div>

      {liveError && (
        <p className="mt-2 rounded-md border border-fail/30 bg-fail-tint px-3 py-2 text-body-sm text-fail">
          {liveError}
        </p>
      )}

      {ready && explanation && (
        <div className="mt-3 rounded-lg border border-border bg-surface-2/50 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="eyebrow">This becomes</span>
            {rawInside && (
              <span className="rounded-md border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-muted">
                includes raw pattern
              </span>
            )}
          </div>
          <p className="mb-2 text-body-sm text-ink">{explanation.summary}</p>
          <ol className="flex max-h-[30vh] list-decimal flex-col gap-1 overflow-y-auto scroll-thin pl-5 text-body-sm text-ink-muted">
            {explanation.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {rawInside && (
            <p className="mt-2 text-body-sm text-ink-muted">
              Parts we couldn’t turn into a friendly block are kept as raw patterns — they still work
              and you can edit them by hand.
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
