import type { MatchStep } from '@/core'
import { useStore } from '@/store/useStore'

/**
 * The part-by-part "why it matched" list: each top-level block, in pattern order,
 * with the exact characters it governed. Hovering a row lights the matching block,
 * REGEX segment and character span via the shared hoveredNodeId (two-way link).
 */
export function MatchBreakdown({ steps }: { steps?: MatchStep[] }) {
  const hoverNode = useStore((s) => s.hoverNode)
  const hovered = useStore((s) => s.hoveredNodeId)
  if (!steps || steps.length === 0) return null

  return (
    <ol className="mt-2 flex flex-col gap-0.5">
      {steps.map((s, i) => (
        <li
          key={i}
          onMouseEnter={() => s.nodeId && hoverNode(s.nodeId)}
          onMouseLeave={() => hoverNode(null)}
          className={`flex items-start gap-2 rounded-md px-1.5 py-1 text-body-sm transition-colors ${
            s.nodeId && hovered === s.nodeId ? 'bg-brand-tint/60' : ''
          }`}
        >
          {s.text !== null ? (
            <code className="shrink-0 break-all rounded-sm bg-pass-tint px-1 font-mono text-mono-sm font-semibold text-pass">
              {s.text}
            </code>
          ) : (
            <span className="shrink-0 pt-px text-pass" aria-hidden>
              ✓
            </span>
          )}
          <span className="min-w-0 text-ink-muted">{s.detail}</span>
        </li>
      ))}
    </ol>
  )
}
