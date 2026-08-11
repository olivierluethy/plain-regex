import { useStore } from '@/store/useStore'
import type { AnchorKind, CharTypeKind, RuleNode } from '@/core'
import { CHARTYPE_LABEL, REPEAT_OPTIONS } from './labels'

const CHAR_KINDS: CharTypeKind[] = [
  'letter',
  'digit',
  'letterOrDigit',
  'wordChar',
  'any',
  'whitespace',
  'punctuation',
]

function FieldLabel({ children }: { children: string }) {
  return <div className="eyebrow mb-1.5">{children}</div>
}

/** The body of the popover that configures a single block. */
export function NodeEditor({ node }: { node: RuleNode }) {
  const update = useStore((s) => s.updateNodeById)
  const setRepeatPreset = useStore((s) => s.setRepeatPreset)

  switch (node.type) {
    case 'literal':
      return (
        <div>
          <FieldLabel>Exact text</FieldLabel>
          <input
            autoFocus
            className="input font-mono text-mono-sm"
            value={node.text}
            placeholder="e.g. https://"
            onChange={(e) => update(node.id!, { text: e.target.value })}
          />
          <p className="mt-2 text-body-sm text-ink-muted">
            Typed exactly as-is. Special characters are handled for you.
          </p>
        </div>
      )

    case 'charType':
      return (
        <div>
          <FieldLabel>Kind of character</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {CHAR_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => update(node.id!, { kind: k })}
                className={`rounded-md border px-2 py-1.5 text-left text-[0.8125rem] transition-colors ${
                  node.kind === k
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-border text-ink hover:bg-surface-2'
                }`}
              >
                {CHARTYPE_LABEL[k]}
              </button>
            ))}
          </div>
          {node.kind !== 'any' && (
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[rgb(var(--brand))]"
                checked={Boolean(node.negated)}
                onChange={(e) => update(node.id!, { negated: e.target.checked })}
              />
              Match anything <em>except</em> this
            </label>
          )}
        </div>
      )

    case 'oneOf':
    case 'noneOf':
      return (
        <div>
          <FieldLabel>{node.type === 'oneOf' ? 'Allowed characters' : 'Forbidden characters'}</FieldLabel>
          <input
            autoFocus
            className="input font-mono text-mono-sm"
            value={node.chars}
            placeholder="e.g. -_."
            onChange={(e) => update(node.id!, { chars: e.target.value })}
          />
          <p className="mt-2 text-body-sm text-ink-muted">
            {node.type === 'oneOf'
              ? 'Any one of these characters will match here.'
              : 'Any character that is not in this list will match here.'}
          </p>
        </div>
      )

    case 'anchor': {
      const opts: { kind: AnchorKind; label: string }[] = [
        { kind: 'start', label: 'Start of text' },
        { kind: 'end', label: 'End of text' },
        { kind: 'wordBoundary', label: 'Word boundary' },
      ]
      return (
        <div>
          <FieldLabel>Position</FieldLabel>
          <div className="flex flex-col gap-1.5">
            {opts.map((o) => (
              <button
                key={o.kind}
                onClick={() => update(node.id!, { kind: o.kind })}
                className={`rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors ${
                  node.kind === o.kind
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-border text-ink hover:bg-surface-2'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )
    }

    case 'repeat':
      return (
        <div>
          <FieldLabel>How many times?</FieldLabel>
          <div className="flex flex-col gap-1.5">
            {REPEAT_OPTIONS.map((o) => (
              <button
                key={o.preset}
                onClick={() => setRepeatPreset(node.id!, o.preset, node.min || 1, node.max ?? 3)}
                className={`rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors ${
                  node.preset === o.preset
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-border text-ink hover:bg-surface-2'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {(node.preset === 'exactly' || node.preset === 'atLeast' || node.preset === 'between') && (
            <div className="mt-3 flex items-center gap-2">
              <NumberField
                label={node.preset === 'between' ? 'From' : 'Count'}
                value={node.min}
                onChange={(n) => setRepeatPreset(node.id!, node.preset, n, node.max ?? n + 2)}
              />
              {node.preset === 'between' && (
                <NumberField
                  label="To"
                  value={node.max ?? node.min + 2}
                  onChange={(m) => setRepeatPreset(node.id!, node.preset, node.min, m)}
                />
              )}
            </div>
          )}
        </div>
      )

    case 'capture':
    case 'group':
      return (
        <div className="flex flex-col gap-3">
          {node.type === 'group' && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[rgb(var(--brand))]"
                checked={Boolean(node.capture)}
                onChange={(e) => update(node.id!, { capture: e.target.checked })}
              />
              Keep this part (capture group)
            </label>
          )}
          <div>
            <FieldLabel>Name (optional)</FieldLabel>
            <input
              className="input text-sm"
              value={node.name ?? ''}
              placeholder="e.g. username"
              onChange={(e) =>
                update(node.id!, { name: e.target.value.replace(/[^a-zA-Z0-9]/g, '') || undefined })
              }
            />
          </div>
          <p className="text-body-sm text-ink-muted">Edit the blocks inside directly on the canvas.</p>
        </div>
      )

    case 'contains':
      return (
        <p className="text-body-sm text-ink-muted">
          The text must contain the block inside this, somewhere. Edit that block directly on the
          canvas.
        </p>
      )

    case 'strip':
      return (
        <p className="text-body-sm text-ink-muted">
          This part is still matched, but marked as something to remove. Edit the block inside
          directly on the canvas.
        </p>
      )

    case 'choice':
      return (
        <p className="text-body-sm text-ink-muted">
          Any one of the options will match. Add or edit options directly on the canvas.
        </p>
      )

    case 'forbid':
      return (
        <div>
          <FieldLabel>Where is it not allowed?</FieldLabel>
          <div className="flex flex-col gap-1.5">
            {(['here', 'anywhere'] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => update(node.id!, { scope: sc })}
                className={`rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors ${
                  node.scope === sc
                    ? 'border-fail bg-fail-tint text-fail'
                    : 'border-border text-ink hover:bg-surface-2'
                }`}
              >
                {sc === 'here' ? 'Not allowed at this position' : 'Not allowed anywhere in the value'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-body-sm text-ink-muted">
            A value that has this is rejected. Edit the forbidden block on the canvas.
          </p>
        </div>
      )

    default:
      return null
  }
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="flex-1">
      <div className="eyebrow mb-1">{label}</div>
      <input
        type="number"
        min={0}
        className="input text-sm"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </label>
  )
}
