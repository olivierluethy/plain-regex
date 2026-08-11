import { useEffect, useMemo, useState } from 'react'
import { buildRegExp, diffSnapshots, explain } from '@/core'
import { useStore } from '@/store/useStore'
import { Check, Clock, X } from '@/ui/icons'
import type { Snapshot } from '@/store/types'

function timeLabel(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** History as a right slide-over drawer — opens immediately, records automatically. */
export function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rule = useStore((s) => s.active())
  const restoreSnapshot = useStore((s) => s.restoreSnapshot)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Newest first, but keep each snapshot's chronological index for diffing.
  const ordered = useMemo(
    () => rule.history.map((snap, i) => ({ snap, i })).reverse(),
    [rule.history],
  )
  const currentId = rule.history[rule.historyIndex]?.id

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[420px] flex-col border-l border-border bg-surface shadow-lg motion-safe:animate-slide-in">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="eyebrow mb-0.5">History</div>
            <h2 className="text-h2 text-ink">How this rule changed</h2>
            <p className="mt-1 text-body-sm text-ink-muted">Saved automatically as you edit.</p>
          </div>
          <button className="btn-icon h-8 w-8 shrink-0" onClick={onClose} aria-label="Close history">
            <X width={17} height={17} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
          {rule.history.length <= 1 && (
            <p className="mb-4 rounded-md border border-dashed border-border bg-surface-2/40 px-3 py-3 text-body-sm text-ink-muted">
              Your changes are saved here automatically as you edit — no setup needed. Make a change
              to the rule and it will appear at the top.
            </p>
          )}

          <ol className="relative flex flex-col gap-1 border-l border-border-strong pl-4">
            {ordered.map(({ snap, i }) => {
              const isCurrent = snap.id === currentId
              const isOpen = expanded === snap.id
              const prev = i > 0 ? rule.history[i - 1] : null
              return (
                <li key={snap.id} className="relative">
                  <span
                    className={`absolute -left-[1.32rem] top-3 h-2.5 w-2.5 rounded-full border-2 ${
                      isCurrent ? 'border-brand bg-brand' : 'border-border-strong bg-surface'
                    }`}
                  />
                  <div
                    className={`rounded-md transition-colors ${
                      isOpen ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 px-2.5 py-2">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => setExpanded(isOpen ? null : snap.id)}
                      >
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
                          className="btn-secondary btn-sm shrink-0"
                          onClick={() => restoreSnapshot(snap.id)}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                    {isOpen && <SnapshotDetail snap={snap} prev={prev} />}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </aside>
    </div>
  )
}

function SnapshotDetail({ snap, prev }: { snap: Snapshot; prev: Snapshot | null }) {
  const compiled = useMemo(() => buildRegExp(snap.ast, snap.flags), [snap])
  const summary = useMemo(() => explain(snap.ast).summary, [snap])
  const diff = useMemo(
    () => (prev ? diffSnapshots(prev.ast, prev.flags, snap.ast, snap.flags) : null),
    [prev, snap],
  )

  return (
    <div className="border-t border-border px-3 py-3">
      <div className="mb-2 overflow-x-auto scroll-thin rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
        <code className="whitespace-pre font-mono text-mono-sm text-ink">
          <span className="text-ink-faint">/</span>
          {compiled.source}
          <span className="text-ink-faint">/{compiled.flags}</span>
        </code>
      </div>
      <p className="mb-3 text-body-sm text-ink-muted">{summary}</p>

      {!prev ? (
        <p className="text-body-sm text-ink-muted">This is the first version of the rule.</p>
      ) : diff && diff.unchanged ? (
        <p className="text-body-sm text-ink-muted">Matches the same text as the previous version.</p>
      ) : diff ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DiffColumn title="Newly allowed" items={diff.nowAllowed} tone="pass" empty="Nothing new was allowed." />
          <DiffColumn
            title="No longer allowed"
            items={diff.noLongerAllowed}
            tone="fail"
            empty="Nothing was newly blocked."
          />
        </div>
      ) : null}
    </div>
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
  const row = tone === 'pass' ? 'border-pass bg-pass-tint/50' : 'border-fail bg-fail-tint/50'
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`grid h-5 w-5 place-items-center rounded ${badge}`}>
          <Icon width={13} height={13} />
        </span>
        <h3 className="text-h3 text-ink">{title}</h3>
      </div>
      {items.length ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((v, i) => (
            <li key={i} className={`rounded-md border-l-2 px-2.5 py-1 ${row}`}>
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
