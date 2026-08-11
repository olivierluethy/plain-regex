import { Fragment } from 'react'
import type { CheckFailure, TracePart } from '@/core'
import { useStore } from '@/store/useStore'

/**
 * Render a value with character highlights. Pass `parts` (which block matched
 * which characters) for a match, or `fail` (where it broke) for a no-match.
 * A block hovered anywhere in the app emphasises the span it governs here.
 */
export function HighlightedValue({
  value,
  parts,
  fail,
}: {
  value: string
  parts?: TracePart[]
  fail?: CheckFailure
}) {
  const hovered = useStore((s) => s.hoveredNodeId)

  if (value === '') return <span className="italic text-ink-faint">(empty)</span>

  if (fail) {
    const consumed = Math.min(fail.consumed, value.length)
    const prefix = value.slice(0, consumed)
    const failCh = value.slice(consumed, consumed + 1)
    const tail = value.slice(consumed + 1)
    return (
      <span className="break-all font-mono text-mono-sm">
        {prefix && <span className="rounded-sm bg-pass-tint/60 text-ink">{prefix}</span>}
        {failCh ? (
          <span className="rounded-sm bg-fail-tint font-semibold text-fail">{failCh}</span>
        ) : (
          <span className="rounded-sm bg-fail-tint px-0.5 font-semibold text-fail">∎</span>
        )}
        {tail && <span className="text-ink-muted">{tail}</span>}
      </span>
    )
  }

  const list = (parts ?? []).filter((p) => p.end > p.start).sort((a, b) => a.start - b.start)
  const segs: { text: string; part: TracePart | null }[] = []
  let cursor = 0
  for (const p of list) {
    if (p.start < cursor) continue // overlap guard
    if (p.start > cursor) segs.push({ text: value.slice(cursor, p.start), part: null })
    segs.push({ text: value.slice(p.start, p.end), part: p })
    cursor = p.end
  }
  if (cursor < value.length) segs.push({ text: value.slice(cursor), part: null })

  return (
    <span className="break-all font-mono text-mono-sm">
      {segs.map((seg, i) =>
        seg.part ? (
          <span
            key={i}
            title={seg.part.label}
            className={`rounded-sm ${
              hovered === seg.part.nodeId
                ? 'bg-brand-tint font-semibold text-brand ring-1 ring-brand'
                : 'bg-brand-tint/60 text-brand'
            }`}
          >
            {seg.text}
          </span>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </span>
  )
}
