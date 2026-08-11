import { useEffect, useRef, useState } from 'react'
import { nodes } from '@/core'
import type { Mark } from '@/store/types'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Ban, Scissors, Sparkles } from '@/ui/icons'
import { buildIntents, type Intent } from '@/lib/intents'

interface SelState {
  start: number
  end: number
  text: string
  rect: { left: number; bottom: number; width: number }
}

/** Order marks, drop overlaps and out-of-range spans. */
function usableMarks(marks: Mark[], len: number): Mark[] {
  const sorted = marks
    .filter((m) => m.start < m.end && m.end <= len)
    .sort((a, b) => a.start - b.start)
  const out: Mark[] = []
  let cursor = 0
  for (const m of sorted) {
    if (m.start < cursor) continue
    out.push(m)
    cursor = m.end
  }
  return out
}

export function BuildFromExample() {
  const rule = useStore((s) => s.active())
  const setSampleValue = useStore((s) => s.setSampleValue)
  const addFromSelection = useStore((s) => s.addFromSelection)
  const addChild = useStore((s) => s.addChild)
  const removeNodeById = useStore((s) => s.removeNodeById)

  const value = rule.sampleValue
  const containerRef = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<SelState | null>(null)

  // Close the popover on scroll / resize / Escape.
  useEffect(() => {
    if (!sel) return
    const clear = () => setSel(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && clear()
    window.addEventListener('scroll', clear, true)
    window.addEventListener('resize', clear)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', clear, true)
      window.removeEventListener('resize', clear)
      window.removeEventListener('keydown', onKey)
    }
  }, [sel])

  const readSelection = () => {
    const selection = window.getSelection()
    const container = containerRef.current
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !container) {
      setSel(null)
      return
    }
    const range = selection.getRangeAt(0)
    if (!container.contains(range.commonAncestorContainer)) return
    const pre = range.cloneRange()
    pre.selectNodeContents(container)
    pre.setEnd(range.startContainer, range.startOffset)
    const start = pre.toString().length
    const text = range.toString()
    if (!text.trim() && !text) return
    const rect = range.getBoundingClientRect()
    setSel({
      start,
      end: start + text.length,
      text,
      rect: { left: rect.left + rect.width / 2, bottom: rect.bottom, width: rect.width },
    })
  }

  const choose = (intent: Intent) => {
    if (!sel) return
    addFromSelection({ start: sel.start, end: sel.end, node: intent.make(), label: intent.autoLabel })
    window.getSelection()?.removeAllRanges()
    setSel(null)
  }

  const marks = usableMarks(rule.marks, value.length)

  // "Match whole value" toggles start/end anchors on the rule.
  const kids = rule.ast.children
  const hasStart = kids[0]?.type === 'anchor' && kids[0].kind === 'start'
  const last = kids[kids.length - 1]
  const hasEnd = last?.type === 'anchor' && last.kind === 'end'
  const whole = hasStart && hasEnd
  const toggleWhole = () => {
    if (whole) {
      if (hasStart) removeNodeById(kids[0].id!)
      if (hasEnd) removeNodeById(last!.id!)
    } else {
      if (!hasStart) addChild(rule.ast.id!, nodes.anchor('start'), 0)
      if (!hasEnd) addChild(rule.ast.id!, nodes.anchor('end'))
    }
  }

  // Build the rendered, selectable segments.
  const segments: { text: string; mark: boolean }[] = []
  let cursor = 0
  for (const m of marks) {
    if (m.start > cursor) segments.push({ text: value.slice(cursor, m.start), mark: false })
    segments.push({ text: value.slice(m.start, m.end), mark: true })
    cursor = m.end
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor), mark: false })

  return (
    <Panel
      eyebrow="Build from example"
      title="Select part of a value to make a rule"
      actions={
        value.trim() ? (
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[rgb(var(--brand))]"
              checked={whole}
              onChange={toggleWhole}
            />
            Match the whole value
          </label>
        ) : undefined
      }
    >
      <label className="mb-2 block">
        <span className="eyebrow mb-1 block">Sample value</span>
        <input
          className="input font-mono text-mono-sm"
          placeholder="Paste an email, a URL, or any text…"
          value={value}
          onChange={(e) => setSampleValue(e.target.value)}
          spellCheck={false}
        />
      </label>

      {value ? (
        <>
          <div
            ref={containerRef}
            onMouseUp={readSelection}
            className="select-text whitespace-pre-wrap break-all rounded-lg border border-border bg-surface px-3 py-3 font-mono text-mono leading-[1.7] text-ink [cursor:text]"
          >
            {segments.map((seg, i) =>
              seg.mark ? (
                <span
                  key={i}
                  className="rounded-sm bg-brand-tint px-0.5 text-brand underline decoration-brand/40 underline-offset-2"
                >
                  {seg.text}
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </div>
          <p className="mt-2 text-body-sm text-ink-muted">
            Drag to select a span, then pick what it should mean. New blocks appear in Build,
            left-to-right.
          </p>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface-2/40 px-3 py-6 text-center text-body-sm text-ink-muted">
          Paste a value above, then select part of it to turn it into a rule.
        </p>
      )}

      {sel && (
        <div
          className="fixed z-40 w-64 animate-fade-in rounded-lg border border-border bg-surface p-1.5 shadow-lg"
          style={{
            left: Math.min(Math.max(sel.rect.left, 140), window.innerWidth - 140),
            top: sel.rect.bottom + 8,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="eyebrow px-2 pb-1 pt-1 text-[0.6875rem]">
            Selected <span className="font-mono text-brand">“{clip(sel.text)}”</span>
          </div>
          <div className="max-h-[50vh] overflow-y-auto scroll-thin">
            {buildIntents(sel.text).map((intent) => (
              <button
                key={intent.key}
                onClick={() => choose(intent)}
                className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-surface-2"
              >
                <span
                  className={`mt-0.5 shrink-0 ${
                    intent.tone === 'forbid'
                      ? 'text-fail'
                      : intent.tone === 'strip'
                        ? 'text-fail'
                        : 'text-brand'
                  }`}
                >
                  {intent.tone === 'forbid' ? (
                    <Ban width={15} height={15} />
                  ) : intent.tone === 'strip' ? (
                    <Scissors width={15} height={15} />
                  ) : (
                    <Sparkles width={15} height={15} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{intent.label}</span>
                  {intent.hint && <span className="block text-[0.75rem] text-ink-muted">{intent.hint}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

function clip(text: string, max = 22): string {
  const t = text.replace(/\s/g, '·')
  return t.length > max ? `${t.slice(0, max)}…` : t
}
