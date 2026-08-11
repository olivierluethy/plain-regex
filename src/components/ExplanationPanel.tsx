import { useMemo } from 'react'
import { buildRegExp, explain } from '@/core'
import { useStore } from '@/store/useStore'
import { Panel } from '@/ui/primitives'
import { Check, Copy } from '@/ui/icons'
import { useCopy } from '@/ui/useCopy'

export function ExplanationPanel() {
  const rule = useStore((s) => s.active())
  const advanced = useStore((s) => s.experience === 'advanced')
  const hoverNode = useStore((s) => s.hoverNode)
  const hoveredNodeId = useStore((s) => s.hoveredNodeId)
  const [copied, copy] = useCopy()

  const explanation = useMemo(() => explain(rule.ast), [rule.ast])
  const compiled = useMemo(() => buildRegExp(rule.ast, rule.flags), [rule.ast, rule.flags])
  const children = rule.ast.children

  return (
    <Panel eyebrow="In plain English" title="What this rule does">
      <p className="text-body text-ink">{explanation.summary}</p>

      <ol className="mt-4 flex flex-col gap-1">
        {explanation.steps.map((step, i) => {
          const nodeId = children[i]?.id ?? null
          const active = nodeId !== null && hoveredNodeId === nodeId
          return (
            <li
              key={i}
              onMouseEnter={() => nodeId && hoverNode(nodeId)}
              onMouseLeave={() => hoverNode(null)}
              className={`flex gap-3 rounded-md px-1.5 py-1 transition-colors ${
                active ? 'bg-brand-tint' : ''
              }`}
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold ${
                  active ? 'bg-brand text-white' : 'bg-brand-tint text-brand'
                }`}
              >
                {i + 1}
              </span>
              <span className="text-body-sm text-ink">{step}</span>
            </li>
          )
        })}
      </ol>

      {advanced && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="eyebrow">Raw pattern</div>
            <button
              className="btn-ghost btn-sm"
              onClick={() => copy(`/${compiled.source}/${compiled.flags}`)}
            >
              {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="overflow-x-auto scroll-thin rounded-md border border-border bg-surface-2 px-3 py-2.5">
            <code className="whitespace-pre font-mono text-mono-sm text-ink">
              <span className="text-ink-faint">/</span>
              {compiled.source}
              <span className="text-ink-faint">/{compiled.flags}</span>
            </code>
          </div>
          {compiled.error && (
            <p className="mt-2 text-body-sm text-fail">This pattern can’t compile: {compiled.error}</p>
          )}
        </div>
      )}
    </Panel>
  )
}
