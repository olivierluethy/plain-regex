import { useStore } from '@/store/useStore'
import type { RuleNode } from '@/core'
import { Panel } from '@/ui/primitives'
import { Redo, Undo } from '@/ui/icons'
import { AddBlockMenu } from './blocks/AddBlockMenu'
import { NodeChip } from './blocks/NodeChip'

export function RuleBuilder() {
  const rule = useStore((s) => s.active())
  const advanced = useStore((s) => s.experience === 'advanced')
  const addChild = useStore((s) => s.addChild)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)

  const canUndo = rule.historyIndex > 0
  const canRedo = rule.historyIndex < rule.history.length - 1

  const root = rule.ast
  const children = root.children
  const onAdd = (node: RuleNode) => addChild(root.id!, node)

  return (
    <Panel
      eyebrow="Build"
      title="Your rule, in plain blocks"
      actions={
        <>
          <button
            className="btn-icon h-8 w-8 disabled:opacity-40"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo"
          >
            <Undo width={17} height={17} />
          </button>
          <button
            className="btn-icon h-8 w-8 disabled:opacity-40"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo"
          >
            <Redo width={17} height={17} />
          </button>
        </>
      }
    >
      <div className="rounded-lg border border-border bg-surface-2/40 p-4">
        {children.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-body text-ink-muted">
              No blocks yet. Add one to describe what you want to match.
            </p>
            <AddBlockMenu onAdd={onAdd} advanced={advanced} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5">
            {children.map((child, i) => (
              <NodeChip
                key={child.id}
                node={child}
                parentId={root.id}
                index={i}
                siblingCount={children.length}
                advanced={advanced}
              />
            ))}
            <AddBlockMenu onAdd={onAdd} advanced={advanced} compact />
          </div>
        )}
      </div>
      <p className="mt-3 text-body-sm text-ink-muted">
        Click a block to change it. Use its ••• menu to repeat, duplicate, reorder or remove it.
      </p>
    </Panel>
  )
}
