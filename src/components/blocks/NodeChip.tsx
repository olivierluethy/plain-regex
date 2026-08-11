import { describe, findNode, nodes, type RepeatPreset, type RuleNode } from '@/core'
import { useStore } from '@/store/useStore'
import { MenuItem, Popover } from '@/ui/primitives'
import { Dots, Plus, X } from '@/ui/icons'
import { chipLabel, repeatBadge, REPEAT_OPTIONS } from './labels'
import { NodeEditor } from './NodeEditors'
import { DndReorder, OverlayChip } from './Sortable'

interface SlotProps {
  node: RuleNode
  parentId?: string
  index?: number
  siblingCount?: number
  bound?: boolean // single child of a container: no remove/move/duplicate
  advanced: boolean
}

const LEAF_TYPES = new Set(['literal', 'charType', 'oneOf', 'noneOf', 'anchor'])

export function NodeChip(props: SlotProps) {
  const { node, parentId, index, siblingCount = 1, bound, advanced } = props
  const isRepeat = node.type === 'repeat'
  const inner = isRepeat ? node.child : node

  const replaceNodeById = useStore((s) => s.replaceNodeById)
  const setRepeatPreset = useStore((s) => s.setRepeatPreset)
  const removeNodeById = useStore((s) => s.removeNodeById)
  const duplicateNodeById = useStore((s) => s.duplicateNodeById)
  const moveNode = useStore((s) => s.moveNode)
  const hoverNode = useStore((s) => s.hoverNode)

  const setRepeat = (preset: RepeatPreset) => {
    if (isRepeat) setRepeatPreset(node.id!, preset, node.min || 1, node.max ?? 3)
    else replaceNodeById(inner.id!, nodes.repeat(inner, preset))
  }
  const removeRepeat = () => {
    if (isRepeat) replaceNodeById(node.id!, node.child)
  }

  const canMoveLeft = parentId !== undefined && index !== undefined && index > 0
  const canMoveRight =
    parentId !== undefined && index !== undefined && index < siblingCount - 1

  const menu = (
    <Popover
      align="end"
      width={190}
      trigger={({ open, toggle }) => (
        <button
          onClick={toggle}
          aria-expanded={open}
          aria-label="Block options"
          className="grid h-6 w-6 place-items-center rounded text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Dots width={15} height={15} />
        </button>
      )}
    >
      <div className="eyebrow px-2.5 pb-1 pt-2 text-[0.6875rem]">Repeat</div>
      {REPEAT_OPTIONS.map((o) => (
        <MenuItem key={o.preset} onClick={() => setRepeat(o.preset)}>
          {o.label}
        </MenuItem>
      ))}
      {isRepeat && <MenuItem onClick={removeRepeat}>Don’t repeat</MenuItem>}
      {!bound && (
        <>
          <div className="my-1 h-px bg-border" />
          <MenuItem onClick={() => duplicateNodeById(node.id!)}>Duplicate</MenuItem>
          {canMoveLeft && (
            <MenuItem onClick={() => moveNode(parentId!, index!, index! - 1)}>Move left</MenuItem>
          )}
          {canMoveRight && (
            <MenuItem onClick={() => moveNode(parentId!, index!, index! + 1)}>Move right</MenuItem>
          )}
          <MenuItem danger icon={<X width={14} height={14} />} onClick={() => removeNodeById(node.id!)}>
            Remove
          </MenuItem>
        </>
      )}
    </Popover>
  )

  return (
    <span
      className="group/slot inline-flex items-center gap-1 rounded-md"
      title={describe(node)}
      onMouseEnter={() => hoverNode(node.id ?? null)}
      onMouseLeave={() => hoverNode(null)}
    >
      <NodeContent inner={inner} advanced={advanced} />
      {isRepeat && (
        <Popover
          width={260}
          trigger={({ open, toggle }) => (
            <button
              onClick={toggle}
              aria-expanded={open}
              className="inline-flex h-6 items-center rounded-full bg-brand/15 px-2 text-[0.75rem] font-semibold text-brand transition-colors hover:bg-brand/25"
            >
              {repeatBadge(node)}
            </button>
          )}
        >
          <NodeEditor node={node} />
        </Popover>
      )}
      {menu}
    </span>
  )
}

function NodeContent({ inner, advanced }: { inner: RuleNode; advanced: boolean }) {
  switch (inner.type) {
    case 'choice':
      return <ChoiceContainer node={inner} advanced={advanced} />
    case 'group':
      return <GroupContainer node={inner} advanced={advanced} />
    case 'contains':
      return <WrapContainer node={inner} label="must contain" tone="brand" advanced={advanced} />
    case 'capture':
      return (
        <WrapContainer
          node={inner}
          label={inner.name ? `keep: ${inner.name}` : 'keep'}
          tone="pass"
          advanced={advanced}
        />
      )
    case 'strip':
      return <WrapContainer node={inner} label="remove" tone="fail" advanced={advanced} />
    case 'forbid':
      return (
        <WrapContainer
          node={inner}
          label={inner.scope === 'anywhere' ? 'never allow' : 'not allowed'}
          tone="fail"
          advanced={advanced}
        />
      )
    default:
      return <LeafChip inner={inner} />
  }
}

function LeafChip({ inner }: { inner: RuleNode }) {
  const editable = LEAF_TYPES.has(inner.type)
  const isAnchor = inner.type === 'anchor'

  return (
    <Popover
      width={inner.type === 'charType' ? 260 : 240}
      trigger={({ open, toggle }) => (
        <button
          onClick={toggle}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium transition-colors ${
            isAnchor
              ? 'border-border-strong bg-surface-2 text-ink-muted'
              : 'border-brand/25 bg-brand-tint text-brand hover:border-brand/50'
          }`}
        >
          {isAnchor && <span aria-hidden>⌖</span>}
          <span className="max-w-[220px] truncate">{chipLabel(inner)}</span>
        </button>
      )}
    >
      {editable ? (
        <NodeEditor node={inner} />
      ) : (
        <p className="text-body-sm text-ink-muted">This block has no settings.</p>
      )}
    </Popover>
  )
}

const TONE: Record<string, string> = {
  brand: 'border-brand/30 bg-brand-tint/50 text-brand',
  pass: 'border-pass/30 bg-pass-tint/60 text-pass',
  fail: 'border-fail/30 bg-fail-tint/60 text-fail',
}

/** Container for single-child wrappers: contains / capture / strip. */
function WrapContainer({
  node,
  label,
  tone,
  advanced,
}: {
  node: Extract<RuleNode, { child: RuleNode }>
  label: string
  tone: 'brand' | 'pass' | 'fail'
  advanced: boolean
}) {
  const canEditLabel = node.type === 'capture' || node.type === 'forbid'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border border-dashed px-1.5 py-1 ${TONE[tone]}`}>
      {canEditLabel ? (
        <Popover
          width={240}
          trigger={({ toggle }) => (
            <button onClick={toggle} className="eyebrow px-0.5 text-[0.6875rem]">
              {label}
            </button>
          )}
        >
          <NodeEditor node={node} />
        </Popover>
      ) : (
        <span className="eyebrow px-0.5 text-[0.6875rem]">{label}</span>
      )}
      <NodeChip node={node.child} bound advanced={advanced} />
    </span>
  )
}

/** Container for a group of child blocks. */
function GroupContainer({ node, advanced }: { node: Extract<RuleNode, { type: 'group' }>; advanced: boolean }) {
  const addChild = useStore((s) => s.addChild)
  const moveNode = useStore((s) => s.moveNode)
  const label = node.capture ? (node.name ? `keep: ${node.name}` : 'keep this') : 'group'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border-strong bg-surface-2/50 px-1.5 py-1">
      <Popover
        width={240}
        trigger={({ toggle }) => (
          <button onClick={toggle} className="eyebrow px-0.5 text-[0.6875rem] text-ink-muted">
            {label}
          </button>
        )}
      >
        <NodeEditor node={node} />
      </Popover>
      <span className="inline-flex flex-wrap items-center gap-1">
        <DndReorder
          ids={node.children.map((c) => c.id!)}
          onReorder={(from, to) => moveNode(node.id!, from, to)}
          renderOverlay={(id) => {
            const n = findNode(node, id)
            return n ? <OverlayChip node={n} /> : null
          }}
          renderItem={(_id, i, handle) => (
            <span className="inline-flex items-center gap-0.5">
              {handle}
              <NodeChip
                node={node.children[i]}
                parentId={node.id}
                index={i}
                siblingCount={node.children.length}
                advanced={advanced}
              />
            </span>
          )}
        />
      </span>
      <button
        onClick={() => addChild(node.id!, nodes.literal(''))}
        aria-label="Add block to group"
        className="grid h-6 w-6 place-items-center rounded text-ink-faint hover:bg-surface hover:text-brand"
      >
        <Plus width={14} height={14} />
      </button>
    </span>
  )
}

/** Container for a choice: option or option or … */
function ChoiceContainer({ node, advanced }: { node: Extract<RuleNode, { type: 'choice' }>; advanced: boolean }) {
  const addChild = useStore((s) => s.addChild)
  const moveNode = useStore((s) => s.moveNode)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-md border border-dashed border-brand/30 bg-brand-tint/30 px-1.5 py-1">
      <span className="eyebrow px-0.5 text-[0.6875rem]">one of</span>
      <DndReorder
        ids={node.options.map((o) => o.id!)}
        onReorder={(from, to) => moveNode(node.id!, from, to)}
        renderOverlay={(id) => {
          const n = findNode(node, id)
          return n ? <OverlayChip node={n} /> : null
        }}
        renderItem={(_id, i, handle) => (
          <span className="inline-flex items-center gap-0.5">
            {i > 0 && <span className="mr-0.5 text-xs font-semibold text-brand/70">or</span>}
            {handle}
            <NodeChip
              node={node.options[i]}
              parentId={node.id}
              index={i}
              siblingCount={node.options.length}
              advanced={advanced}
            />
          </span>
        )}
      />
      <button
        onClick={() => addChild(node.id!, nodes.literal(''))}
        aria-label="Add option"
        className="grid h-6 w-6 place-items-center rounded text-brand/70 hover:bg-brand-tint hover:text-brand"
      >
        <Plus width={14} height={14} />
      </button>
    </span>
  )
}
