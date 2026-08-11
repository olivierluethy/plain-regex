import { useMemo, useState } from 'react'
import { diffSnapshots } from '@/core'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Check, Clock, X } from '@/ui/icons'
import type { Snapshot } from '@/store/types'

function timeLabel(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Timeline() {
  const rule = useStore((s) => s.active())
  const restoreSnapshot = useStore((s) => s.restoreSnapshot)
  const [selected, setSelected] = useState<string[]>([])

  // Newest first for display.
  const ordered = useMemo(() => [...rule.history].reverse(), [rule.history])
  const currentId = rule.history[rule.historyIndex]?.id

  const toggle = (id: string) =>
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })

  const pair = selected
    .map((id) => rule.history.find((h) => h.id === id))
    .filter(Boolean) as Snapshot[]
  const [a, b] =
    pair.length === 2
      ? [pair[0], pair[1]].sort((x, y) => x.timestamp - y.timestamp)
      : [undefined, undefined]

  const diff = useMemo(
    () => (a && b ? diffSnapshots(a.ast, a.flags, b.ast, b.flags) : null),
    [a, b],
  )

  return (
    <Panel
      eyebrow="History"
      title="How this rule changed"
      actions={
        selected.length > 0 && (
          <button className="btn-ghost btn-sm" onClick={() => setSelected([])}>
            Clear selection
          </button>
        )
      }
    >
      <p className="mb-3 text-body-sm text-ink-muted">
        Every change is saved. Pick any two versions to see which examples flipped between matching
        and not.
      </p>

      <ol className="relative flex flex-col gap-1 border-l border-border-strong pl-4">
        {ordered.map((snap) => {
          const isCurrent = snap.id === currentId
          const isSelected = selected.includes(snap.id)
          return (
            <li key={snap.id} className="relative">
              <span
                className={`absolute -left-[1.32rem] top-2.5 h-2.5 w-2.5 rounded-full border-2 ${
                  isCurrent
                    ? 'border-brand bg-brand'
                    : 'border-border-strong bg-surface'
                }`}
              />
              <div
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors ${
                  isSelected ? 'bg-brand-tint ring-1 ring-brand/40' : 'hover:bg-surface-2'
                }`}
              >
                <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => toggle(snap.id)}>
                  <span className="inline-flex items-center gap-1 font-mono text-[0.75rem] text-ink-muted">
                    <Clock width={12} height={12} />
                    {timeLabel(snap.timestamp)}
                  </span>
                  <span className="truncate text-body-sm text-ink">{snap.autoLabel}</span>
                  {isCurrent && (
                    <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-brand">
                      now
                    </span>
                  )}
                </button>
                {!isCurrent && (
                  <button
                    className="btn-ghost btn-sm shrink-0"
                    onClick={() => restoreSnapshot(snap.id)}
                  >
                    Restore
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {a && b && diff && (
        <div className="mt-4 rounded-lg border border-border bg-surface-2/50 p-4">
          <div className="mb-3 text-body-sm text-ink">
            Comparing <b>{timeLabel(a.timestamp)}</b> → <b>{timeLabel(b.timestamp)}</b>
          </div>
          {diff.unchanged ? (
            <p className="text-body-sm text-ink-muted">These two versions match the same text.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <DiffColumn
                title="Newly allowed"
                items={diff.nowAllowed}
                tone="pass"
                empty="Nothing new was allowed."
              />
              <DiffColumn
                title="No longer allowed"
                items={diff.noLongerAllowed}
                tone="fail"
                empty="Nothing was newly blocked."
              />
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

function DiffColumn({
  title,
  items,
  tone,
  empty,
}: {
  title: string
  items: string[]
  tone: 'pass' | 'fail'
  empty: string
}) {
  const Icon = tone === 'pass' ? Check : X
  const badge = tone === 'pass' ? 'bg-pass/15 text-pass' : 'bg-fail/15 text-fail'
  const row =
    tone === 'pass' ? 'border-pass bg-pass-tint/50' : 'border-fail bg-fail-tint/50'
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`grid h-5 w-5 place-items-center rounded ${badge}`}>
          <Icon width={13} height={13} />
        </span>
        <h3 className="text-h3 text-ink">{title}</h3>
      </div>
      {items.length ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((v, i) => (
            <li key={i} className={`rounded-md border-l-2 px-3 py-1.5 ${row}`}>
              <code className="break-all font-mono text-mono-sm text-ink">{v || '(empty)'}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-ink-muted">{empty}</p>
      )}
    </div>
  )
}
