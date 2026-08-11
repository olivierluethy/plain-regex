import { Fragment, useMemo, useState } from 'react'
import {
  buildRegExp,
  findMatches,
  quickCheck,
  testLines,
  type LineResult,
  type RegexFlags,
  type RuleNode,
} from '@/core'
import { useStore } from '@/store/useStore'
import { Panel, Segmented } from '@/ui/primitives'
import { Check, Copy, X } from '@/ui/icons'
import { useCopy } from '@/ui/useCopy'
import { HighlightedValue } from './HighlightedValue'
import { MatchBreakdown } from './MatchBreakdown'

const FLAG_INFO: { key: keyof RegexFlags; label: string; title: string }[] = [
  { key: 'i', label: 'i', title: 'Ignore capitalisation' },
  { key: 'm', label: 'm', title: 'Multiline: start/end match each line' },
  { key: 's', label: 's', title: 'Dot matches new lines too' },
  { key: 'g', label: 'g', title: 'Find every match, not just the first' },
  { key: 'u', label: 'u', title: 'Unicode mode' },
]

export function TestPanel() {
  const rule = useStore((s) => s.active())
  const advanced = useStore((s) => s.experience === 'advanced')
  const testMode = useStore((s) => s.testMode)
  const setTestMode = useStore((s) => s.setTestMode)
  const setTestInput = useStore((s) => s.setTestInput)
  const setFlag = useStore((s) => s.setFlag)
  const [copied, copy] = useCopy()

  const compiled = useMemo(() => buildRegExp(rule.ast, rule.flags), [rule.ast, rule.flags])
  const text = rule.testInput

  return (
    <Panel
      eyebrow="Test corpus"
      title="Paste many lines to test"
      actions={
        <Segmented
          size="sm"
          ariaLabel="Test mode"
          value={testMode}
          onChange={setTestMode}
          options={[
            { value: 'perLine', label: 'Line by line' },
            { value: 'wholeText', label: 'Whole text' },
          ]}
        />
      }
    >
      <textarea
        className="input h-32 resize-y font-mono text-mono-sm scroll-thin"
        placeholder="Paste a URL or some sample text — one item per line."
        value={text}
        onChange={(e) => setTestInput(e.target.value)}
        spellCheck={false}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[rgb(var(--brand))]"
              checked={rule.flags.i}
              onChange={(e) => setFlag('i', e.target.checked)}
            />
            Ignore capital letters
          </label>
          {advanced && (
            <div className="ml-1 flex items-center gap-1">
              {FLAG_INFO.map((f) => (
                <button
                  key={f.key}
                  title={f.title}
                  onClick={() => setFlag(f.key, !rule.flags[f.key])}
                  className={`h-7 w-7 rounded-md border font-mono text-mono-sm transition-colors ${
                    rule.flags[f.key]
                      ? 'border-brand bg-brand text-white'
                      : 'border-border text-ink-muted hover:bg-surface-2'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {advanced && (
          <button className="btn-secondary btn-sm" onClick={() => copy(`/${compiled.source}/${compiled.flags}`)}>
            {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
            {copied ? 'Copied' : 'Copy pattern'}
          </button>
        )}
      </div>

      {compiled.error ? (
        <p className="mt-4 rounded-md bg-fail-tint px-3 py-2 text-body-sm text-fail">
          This rule can’t run yet: {compiled.error}
        </p>
      ) : text.trim() === '' ? (
        <p className="mt-4 text-body-sm text-ink-muted">Results will appear here as you type.</p>
      ) : testMode === 'perLine' ? (
        <PerLineResults compiled={compiled} text={text} ast={rule.ast} flags={rule.flags} />
      ) : (
        <WholeTextResults compiled={compiled} text={text} />
      )}
    </Panel>
  )
}

function PerLineResults({
  compiled,
  text,
  ast,
  flags,
}: {
  compiled: ReturnType<typeof buildRegExp>
  text: string
  ast: RuleNode
  flags: RegexFlags
}) {
  const rows = testLines(compiled, text).filter((r) => r.line.trim() !== '')
  const passCount = rows.filter((r) => r.matched).length

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-3 text-body-sm text-ink-muted">
        <span className="font-medium text-pass">{passCount} match</span>
        <span>·</span>
        <span className="font-medium text-fail">{rows.length - passCount} no match</span>
        <span className="ml-auto text-ink-faint">Click “Why?” for the reason</span>
      </div>
      <ul className="flex max-h-[48vh] flex-col gap-1.5 overflow-y-auto scroll-thin">
        {rows.map((r, i) => (
          <LineRow key={i} r={r} ast={ast} flags={flags} />
        ))}
      </ul>
    </div>
  )
}

function LineRow({ r, ast, flags }: { r: LineResult; ast: RuleNode; flags: RegexFlags }) {
  const [open, setOpen] = useState(false)
  const result = useMemo(() => quickCheck(ast, flags, r.line), [ast, flags, r.line])

  return (
    <li
      className={`rounded-md border-l-2 px-3 py-2 ${
        r.matched ? 'border-pass bg-pass-tint/50' : 'border-fail bg-fail-tint/40'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded ${
            r.matched ? 'bg-pass/15 text-pass' : 'bg-fail/15 text-fail'
          }`}
        >
          {r.matched ? <Check width={13} height={13} /> : <X width={13} height={13} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="block">
            <HighlightedValue value={r.line} parts={result.parts} fail={result.fail} />
          </div>
          {r.matched && <CaptureList groups={r.groups} named={r.namedGroups} />}
        </div>
        <button
          className="btn-ghost btn-sm shrink-0"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title={result.reason}
        >
          Why?
        </button>
      </div>
      {open && (
        <div className="mt-1.5 pl-8">
          <p className={`text-body-sm ${r.matched ? 'text-pass' : 'text-fail'}`}>{result.reason}</p>
          {r.matched && <MatchBreakdown steps={result.breakdown} />}
        </div>
      )}
    </li>
  )
}

function CaptureList({
  groups,
  named,
}: {
  groups: string[]
  named: Record<string, string>
}) {
  const namedKeys = Object.keys(named)
  if (groups.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {groups.map((g, i) => {
        const name = namedKeys.find((k) => named[k] === g)
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded border border-brand/25 bg-brand-tint px-1.5 py-0.5 text-[0.75rem] text-brand"
          >
            <span className="font-semibold">{name ?? `#${i + 1}`}</span>
            <span className="font-mono text-ink-muted">{g || '—'}</span>
          </span>
        )
      })}
    </div>
  )
}

function WholeTextResults({
  compiled,
  text,
}: {
  compiled: ReturnType<typeof buildRegExp>
  text: string
}) {
  const spans = findMatches(compiled, text)
  const segments: { text: string; match: boolean }[] = []
  let cursor = 0
  for (const s of spans) {
    if (s.start > cursor) segments.push({ text: text.slice(cursor, s.start), match: false })
    segments.push({ text: text.slice(s.start, s.end), match: true })
    cursor = s.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false })

  return (
    <div className="mt-4">
      <div className="mb-2 text-body-sm text-ink-muted">
        <span className="font-medium text-pass">{spans.length}</span>{' '}
        {spans.length === 1 ? 'match' : 'matches'} found
      </div>
      <div className="max-h-[48vh] overflow-auto scroll-thin rounded-md border border-border bg-surface-2 px-3 py-2.5">
        <pre className="whitespace-pre-wrap break-words font-mono text-mono-sm text-ink">
          {segments.map((seg, i) =>
            seg.match ? (
              <mark
                key={i}
                className="rounded-sm bg-pass-tint px-0.5 font-semibold text-pass"
              >
                {seg.text}
              </mark>
            ) : (
              <Fragment key={i}>{seg.text}</Fragment>
            ),
          )}
        </pre>
      </div>
      {spans.some((s) => s.groups.length > 0) && (
        <div className="mt-3">
          <div className="eyebrow mb-1.5">Kept parts</div>
          <div className="flex flex-col gap-1.5">
            {spans.map(
              (s, i) =>
                s.groups.length > 0 && (
                  <div key={i} className="flex flex-wrap gap-1.5">
                    {s.groups.map((g) => (
                      <span
                        key={g.index}
                        className="inline-flex items-center gap-1 rounded border border-brand/25 bg-brand-tint px-1.5 py-0.5 text-[0.75rem] text-brand"
                      >
                        <span className="font-semibold">#{g.index}</span>
                        <span className="font-mono text-ink-muted">{g.text}</span>
                      </span>
                    ))}
                  </div>
                ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
