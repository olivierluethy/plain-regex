import { useMemo, useState } from 'react'
import { buildRegExp, hasForbid, hasLookaround, hasStrips, stripPattern } from '@/core'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Check, Copy } from '@/ui/icons'
import { useCopy } from '@/ui/useCopy'
import { generate, LANGUAGES, type Mode } from '@/lib/codegen'
import { highlight } from '@/lib/prism'

export function CodePanel() {
  const rule = useStore((s) => s.active())
  const [lang, setLang] = useState('javascript')
  const [copiedCode, copyCode] = useCopy()
  const [copiedPattern, copyPattern] = useCopy()

  const compiled = useMemo(() => buildRegExp(rule.ast, rule.flags), [rule.ast, rule.flags])

  const input = useMemo(() => {
    const mode: Mode = hasStrips(rule.ast) ? 'clean' : hasForbid(rule.ast) ? 'reject' : 'validate'
    return {
      pattern: compiled.source,
      flags: rule.flags,
      mode,
      stripPattern: stripPattern(rule.ast),
      hasLookaround: hasLookaround(rule.ast),
    }
  }, [rule.ast, rule.flags, compiled.source])

  const snippet = useMemo(() => generate(lang, input), [lang, input])
  const blocker = snippet.warnings.find((w) => w.level === 'blocker')
  const notes = snippet.warnings.filter((w) => w.level === 'note')
  const html = useMemo(
    () => (blocker ? '' : highlight(snippet.code, snippet.prism)),
    [snippet.code, snippet.prism, blocker],
  )

  return (
    <Panel
      eyebrow="Use it in your code"
      title="Copy-ready snippets"
      actions={
        <button
          className="btn-secondary btn-sm"
          onClick={() => copyPattern(compiled.source)}
          title="Copy just the pattern"
        >
          {copiedPattern ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
          {copiedPattern ? 'Copied' : 'Copy pattern'}
        </button>
      }
    >
      <p className="mb-3 flex items-center gap-1.5 text-body-sm text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        Pick a language, then Copy code — the complete pattern is embedded, nothing to stitch in.
      </p>

      {compiled.error && (
        <p className="mb-3 rounded-md border border-fail/30 bg-fail-tint px-3 py-2 text-body-sm text-fail">
          The rule isn’t valid yet ({compiled.error}) — the snippet below won’t run until it compiles.
        </p>
      )}

      {/* Language tabs */}
      <div className="mb-3 overflow-x-auto scroll-thin">
        <div className="flex w-max items-center gap-1 border-b border-border pb-px">
          {LANGUAGES.map((l) => {
            const active = l.id === lang
            return (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                aria-selected={active}
                className={`relative whitespace-nowrap rounded-t-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-surface text-ink'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {notes.map((n, i) => (
        <p
          key={i}
          className="mb-2 flex items-start gap-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-body-sm text-warn"
        >
          <span aria-hidden>⚠</span>
          <span>{n.text}</span>
        </p>
      ))}

      {blocker ? (
        <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-4 py-4 text-body-sm text-warn">
          <span aria-hidden className="text-lg leading-none">
            ⚠
          </span>
          <span>{blocker.text}</span>
        </div>
      ) : (
        <div className="relative">
          <button
            className="btn-secondary btn-sm absolute right-2 top-2 z-10"
            onClick={() => copyCode(snippet.code)}
            title="Copy the snippet"
          >
            {copiedCode ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
            {copiedCode ? 'Copied' : 'Copy code'}
          </button>
          <pre className="code-block overflow-x-auto scroll-thin rounded-lg border border-border bg-surface-2 p-4 text-mono-sm leading-[1.6]">
            <code
              className={snippet.prism ? `language-${snippet.prism}` : undefined}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </pre>
        </div>
      )}
    </Panel>
  )
}
