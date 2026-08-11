import { useState } from 'react'
import { stripIdsForAi, useStore } from '@/store/useStore'
import { describeToAst, refineAst } from '@/lib/ai'
import { Panel } from '@/ui/primitives'
import { Sparkles, Wand } from '@/ui/icons'

export function AiAssist({ onOpenSettings }: { onOpenSettings: () => void }) {
  const ai = useStore((s) => s.ai)
  const rule = useStore((s) => s.active())
  const loadAst = useStore((s) => s.loadAst)
  const key = ai.keys[ai.provider]

  const [describe, setDescribe] = useState('')
  const [refine, setRefine] = useState('')
  const [busy, setBusy] = useState<null | 'describe' | 'refine'>(null)
  const [error, setError] = useState<string | null>(null)

  if (!key) {
    return (
      <Panel eyebrow="AI assist" title="Describe it in your own words">
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-surface-2/40 p-4">
          <p className="text-body-sm text-ink-muted">
            Add an API key to turn a plain-language description (in any language) into a rule you can
            tweak. Everything else works without it.
          </p>
          <button className="btn-secondary btn-sm" onClick={onOpenSettings}>
            <Sparkles width={15} height={15} />
            Add a key to enable AI help
          </button>
        </div>
      </Panel>
    )
  }

  const run = async (which: 'describe' | 'refine') => {
    setError(null)
    setBusy(which)
    const res =
      which === 'describe'
        ? await describeToAst(ai.provider, key, describe)
        : await refineAst(ai.provider, key, stripIdsForAi(rule.ast), refine)
    setBusy(null)
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.')
      return
    }
    const loaded = loadAst(res.ast, which === 'describe' ? 'Built from a description' : 'Refined with AI')
    if (!loaded.ok) {
      setError(loaded.error ?? 'The AI returned a rule we couldn’t read.')
      return
    }
    if (which === 'describe') setDescribe('')
    else setRefine('')
  }

  return (
    <Panel eyebrow="AI assist" title="Describe it in your own words">
      <div className="flex flex-col gap-4">
        <div>
          <label className="eyebrow mb-1.5 block">Describe what you want</label>
          <textarea
            className="input h-20 resize-y text-sm"
            placeholder="e.g. an email address, or a LinkedIn job URL that ends in a slug with a dash"
            value={describe}
            onChange={(e) => setDescribe(e.target.value)}
          />
          <button
            className="btn-primary btn-sm mt-2"
            disabled={busy !== null || !describe.trim()}
            onClick={() => run('describe')}
          >
            <Sparkles width={15} height={15} />
            {busy === 'describe' ? 'Building…' : 'Build the rule'}
          </button>
        </div>

        <div className="border-t border-border pt-4">
          <label className="eyebrow mb-1.5 block">Refine the current rule</label>
          <input
            className="input text-sm"
            placeholder="e.g. also allow a plus sign, or make the last part optional"
            value={refine}
            onChange={(e) => setRefine(e.target.value)}
          />
          <button
            className="btn-secondary btn-sm mt-2"
            disabled={busy !== null || !refine.trim()}
            onClick={() => run('refine')}
          >
            <Wand width={15} height={15} />
            {busy === 'refine' ? 'Refining…' : 'Apply change'}
          </button>
        </div>

        {error && <p className="rounded-md bg-fail-tint px-3 py-2 text-body-sm text-fail">{error}</p>}
        <p className="text-body-sm text-ink-muted">
          The AI only proposes a structure — PlainRegex checks it and builds the pattern, so the
          explanation and examples always match.
        </p>
      </div>
    </Panel>
  )
}
