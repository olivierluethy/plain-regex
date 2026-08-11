import { useEffect, useMemo, useState } from 'react'
import { buildRegExp, regexSegments } from '@/core'
import { useStore } from '@/store/useStore'
import { Check, Copy } from '@/ui/icons'
import { useCopy } from '@/ui/useCopy'

/** The live regex, rendered as hoverable segments mapped to their blocks. */
export function RegexBar() {
  const rule = useStore((s) => s.active())
  const hoverNode = useStore((s) => s.hoverNode)
  const hoveredNodeId = useStore((s) => s.hoveredNodeId)
  const [copied, copy] = useCopy()

  const compiled = useMemo(() => buildRegExp(rule.ast, rule.flags), [rule.ast, rule.flags])
  const segments = useMemo(() => regexSegments(rule.ast), [rule.ast])

  // Step-through: -1 = off, else the active segment index.
  const [step, setStep] = useState(-1)
  useEffect(() => {
    if (step >= segments.length) setStep(-1)
  }, [segments.length, step])
  useEffect(() => {
    if (step >= 0 && segments[step]) hoverNode(segments[step].nodeId)
    else if (step < 0) hoverNode(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const stepping = step >= 0 && Boolean(segments[step])

  return (
    <div className="mb-3">
      <div className="flex items-stretch gap-2 rounded-md border border-border bg-surface-2">
        <span className="flex shrink-0 items-center rounded-l-md border-r border-border px-2.5 text-label uppercase tracking-[0.08em] text-ink-muted">
          Regex
        </span>
        <div className="min-w-0 flex-1 overflow-x-auto scroll-thin py-2">
          <code className="whitespace-pre font-mono text-mono-sm text-ink">
            <span className="text-ink-faint">/</span>
            {segments.length === 0 ? (
              <span className="text-ink-faint">{compiled.source}</span>
            ) : (
              segments.map((seg) => {
                const active = hoveredNodeId === seg.nodeId
                return (
                  <span
                    key={seg.nodeId}
                    onMouseEnter={() => hoverNode(seg.nodeId)}
                    onMouseLeave={() => hoverNode(stepping ? segments[step].nodeId : null)}
                    className={`cursor-default rounded-sm ${
                      active ? 'bg-brand-tint font-semibold text-brand ring-1 ring-brand/50' : ''
                    }`}
                    title={seg.note}
                  >
                    {seg.text}
                  </span>
                )
              })
            )}
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

      {segments.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!stepping ? (
            <button className="btn-secondary btn-sm" onClick={() => setStep(0)}>
              Step through the pattern
            </button>
          ) : (
            <>
              <div className="inline-flex items-center gap-1">
                <button
                  className="btn-secondary btn-sm disabled:opacity-40"
                  onClick={() => setStep((v) => Math.max(0, v - 1))}
                  disabled={step <= 0}
                  aria-label="Previous segment"
                >
                  ‹
                </button>
                <span className="min-w-[3rem] text-center font-mono text-mono-sm text-ink-muted">
                  {step + 1} / {segments.length}
                </span>
                <button
                  className="btn-secondary btn-sm disabled:opacity-40"
                  onClick={() => setStep((v) => Math.min(segments.length - 1, v + 1))}
                  disabled={step >= segments.length - 1}
                  aria-label="Next segment"
                >
                  ›
                </button>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setStep(-1)}>
                Done
              </button>
              <p className="flex min-w-0 flex-1 items-center gap-1.5 text-body-sm text-ink-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span className="truncate">{segments[step].note}</span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
