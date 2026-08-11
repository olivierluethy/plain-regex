import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { Panel, Popover } from '@/ui/primitives'
import { Link } from '@/ui/icons'
import {
  buildAstFromUrl,
  CONSTRAINT_LABELS,
  defaultConstraint,
  parseUrl,
  type Constraint,
  type ConstraintMode,
  type UrlPart,
} from '@/lib/url'

const MODES: ConstraintMode[] = ['equal', 'contains', 'any', 'remove', 'off']

const TONE: Record<ConstraintMode, string> = {
  equal: 'border-brand/30 bg-brand-tint text-brand',
  contains: 'border-brand/30 bg-brand-tint text-brand',
  any: 'border-border-strong bg-surface-2 text-ink-muted',
  remove: 'border-fail/30 bg-fail-tint text-fail',
  off: 'border-border bg-surface text-ink-faint line-through',
}

const SAMPLE = 'https://www.linkedin.com/jobs/view/software-engineer-4012?refId=abc#top'

export function UrlMode() {
  const loadAst = useStore((s) => s.loadAst)
  const [input, setInput] = useState('')
  const [constraints, setConstraints] = useState<Record<string, Constraint>>({})

  const result = useMemo(() => (input.trim() ? parseUrl(input) : null), [input])
  const parts = result?.ok ? result.parsed.parts : []

  const getC = (p: UrlPart): Constraint => constraints[p.id] ?? defaultConstraint(p)
  const setC = (id: string, patch: Partial<Constraint>) =>
    setConstraints((prev) => {
      const base = prev[id] ?? defaultConstraint(parts.find((p) => p.id === id)!)
      return { ...prev, [id]: { ...base, ...patch } }
    })

  const build = () => {
    const ast = buildAstFromUrl(parts, Object.fromEntries(parts.map((p) => [p.id, getC(p)])))
    loadAst(ast, 'Built from a URL')
  }

  const host = parts.filter((p) => ['subdomain', 'domain', 'tld'].includes(p.group))
  const scheme = parts.find((p) => p.group === 'scheme')
  const path = parts.filter((p) => p.group === 'path')
  const query = parts.filter((p) => p.group === 'query')
  const frag = parts.find((p) => p.group === 'fragment')

  const Sep = ({ children }: { children: string }) => (
    <span className="select-none font-mono text-mono-sm text-ink-faint">{children}</span>
  )

  return (
    <Panel
      eyebrow="URL mode"
      title="Turn a link into a rule"
      actions={
        parts.length > 0 && (
          <button className="btn-primary btn-sm" onClick={build}>
            Build rule from this URL
          </button>
        )
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-ink-faint">
          <Link width={17} height={17} />
        </span>
        <input
          className="input font-mono text-mono-sm"
          placeholder={SAMPLE}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
        />
        {!input && (
          <button className="btn-ghost btn-sm whitespace-nowrap" onClick={() => setInput(SAMPLE)}>
            Try example
          </button>
        )}
      </div>

      {result && !result.ok && (
        <p className="mt-3 text-body-sm text-fail">{result.error}</p>
      )}

      {parts.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2/40 p-3">
            {scheme && <PartChip part={scheme} c={getC(scheme)} setC={setC} />}
            {scheme && <Sep>://</Sep>}
            {host.map((p, i) => (
              <span key={p.id} className="inline-flex items-center gap-1.5">
                {i > 0 && <Sep>.</Sep>}
                <PartChip part={p} c={getC(p)} setC={setC} />
              </span>
            ))}
            {path.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5">
                <Sep>/</Sep>
                <PartChip part={p} c={getC(p)} setC={setC} />
              </span>
            ))}
            {query.map((p, i) => (
              <span key={p.id} className="inline-flex items-center gap-1.5">
                <Sep>{i === 0 ? '?' : '&'}</Sep>
                <span className="font-mono text-mono-sm text-ink-muted">{p.key}=</span>
                <PartChip part={p} c={getC(p)} setC={setC} />
              </span>
            ))}
            {frag && (
              <span className="inline-flex items-center gap-1.5">
                <Sep>#</Sep>
                <PartChip part={frag} c={getC(frag)} setC={setC} />
              </span>
            )}
          </div>
          <p className="mt-3 text-body-sm text-ink-muted">
            Click each part to say what must be true about it, then build the rule. It opens in the
            builder above, ready to fine-tune.
          </p>
        </>
      )}
    </Panel>
  )
}

function PartChip({
  part,
  c,
  setC,
}: {
  part: UrlPart
  c: Constraint
  setC: (id: string, patch: Partial<Constraint>) => void
}) {
  const showValue = c.mode === 'equal' || c.mode === 'contains'
  return (
    <Popover
      width={250}
      trigger={({ open, toggle }) => (
        <button
          onClick={toggle}
          aria-expanded={open}
          className={`inline-flex flex-col items-start rounded-md border px-2 py-1 text-left transition-colors ${TONE[c.mode]}`}
        >
          <span className="font-mono text-[0.8125rem] leading-tight">{part.value || '∅'}</span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide opacity-80">
            {CONSTRAINT_LABELS[c.mode]}
          </span>
        </button>
      )}
    >
      <div className="eyebrow px-1 pb-1.5 pt-1">{part.label}</div>
      <div className="flex flex-col gap-1">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setC(part.id, { mode: m })}
            className={`rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
              c.mode === m ? 'bg-brand-tint text-brand' : 'text-ink hover:bg-surface-2'
            }`}
          >
            {CONSTRAINT_LABELS[m]}
          </button>
        ))}
      </div>
      {showValue && (
        <div className="mt-2 border-t border-border px-1 pt-2">
          <div className="eyebrow mb-1">{c.mode === 'equal' ? 'Exact value' : 'Must contain'}</div>
          <input
            className="input font-mono text-mono-sm"
            value={c.value}
            onChange={(e) => setC(part.id, { value: e.target.value })}
          />
        </div>
      )}
      <label className="mt-2 flex cursor-pointer items-center gap-2 px-1 pt-1 text-sm text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[rgb(var(--brand))]"
          checked={c.keep}
          onChange={(e) => setC(part.id, { keep: e.target.checked })}
          disabled={c.mode === 'remove' || c.mode === 'off'}
        />
        Keep this part
      </label>
    </Popover>
  )
}
