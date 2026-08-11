import { nodes, type RuleNode } from '@/core'
import { MenuItem, Popover } from '@/ui/primitives'
import { Plus } from '@/ui/icons'

function SectionLabel({ children }: { children: string }) {
  return <div className="eyebrow px-2.5 pb-1 pt-2 text-[0.6875rem]">{children}</div>
}

export function AddBlockMenu({
  onAdd,
  advanced,
  compact,
}: {
  onAdd: (node: RuleNode) => void
  advanced: boolean
  compact?: boolean
}) {
  return (
    <Popover
      width={240}
      trigger={({ open, toggle }) => (
        <button
          onClick={toggle}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 rounded-md border border-dashed border-brand/40 px-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand-tint ${
            compact ? 'h-8' : 'h-9'
          }`}
        >
          <Plus width={15} height={15} />
          Add
        </button>
      )}
    >
      <div className="max-h-[60vh] overflow-y-auto scroll-thin">
        <SectionLabel>Characters</SectionLabel>
        <MenuItem onClick={() => onAdd(nodes.charType('letter'))}>A letter</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.charType('digit'))}>A digit</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.charType('letterOrDigit'))}>A letter or digit</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.charType('any'))}>Any character</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.charType('whitespace'))}>A space</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.charType('punctuation'))}>A punctuation mark</MenuItem>

        <SectionLabel>Text &amp; sets</SectionLabel>
        <MenuItem onClick={() => onAdd(nodes.literal(''))}>Exact text…</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.oneOf(''))}>One of these characters…</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.noneOf(''))}>None of these characters…</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.choice([nodes.literal(''), nodes.literal('')]))}>
          Either… or…
        </MenuItem>

        <SectionLabel>Rules &amp; position</SectionLabel>
        <MenuItem onClick={() => onAdd(nodes.contains(nodes.literal('')))}>Must contain…</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.anchor('start'))}>Start of text</MenuItem>
        <MenuItem onClick={() => onAdd(nodes.anchor('end'))}>End of text</MenuItem>

        {advanced && (
          <>
            <MenuItem onClick={() => onAdd(nodes.anchor('wordBoundary'))}>Word boundary</MenuItem>
            <SectionLabel>Advanced</SectionLabel>
            <MenuItem onClick={() => onAdd(nodes.group([nodes.literal('')], false))}>
              Group (bundle blocks)
            </MenuItem>
            <MenuItem onClick={() => onAdd(nodes.capture(nodes.literal('')))}>
              Keep this part (capture)
            </MenuItem>
            <MenuItem onClick={() => onAdd(nodes.strip(nodes.literal('')))}>
              Mark to remove (strip)
            </MenuItem>
          </>
        )}
      </div>
    </Popover>
  )
}
