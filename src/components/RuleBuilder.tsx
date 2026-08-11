import { useStore } from '@/store/useStore'
import { findNode, type RuleNode } from '@/core'
import { Panel } from '@/ui/primitives'
import { Redo, Undo } from '@/ui/icons'
import { AddBlockMenu } from './blocks/AddBlockMenu'
import { NodeChip } from './blocks/NodeChip'
import { DndReorder, OverlayChip, SortableRow } from './blocks/Sortable'
import { RegexBar } from './RegexBar'

export function RuleBuilder() {
  const rule = useStore((s) => s.active())
  const advanced = useStore((s) => s.experience === 'advanced')
  const addChild = useStore((s) => s.addChild)
  const moveNode = useStore((s) => s.moveNode)
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
      <RegexBar />
      <div className="rounded-lg border border-border bg-surface-2/40 p-4">
        {children.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-body text-ink-muted">
              No blocks yet. Add one, or select text over in “Build from example”.
            </p>
            <AddBlockMenu onAdd={onAdd} advanced={advanced} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2.5">
            <DndReorder
              ids={children.map((c) => c.id!)}
              onReorder={(from, to) => moveNode(root.id!, from, to)}
              renderOverlay={(id) => {
                const n = findNode(root, id)
                return n ? <OverlayChip node={n} /> : null
              }}
            >
              {children.map((child, i) => (
                <SortableRow key={child.id} id={child.id!}>
                  {({ handle }) => (
                    <span className="inline-flex items-center gap-0.5">
                      {handle}
                      <NodeChip
                        node={child}
                        parentId={root.id}
                        index={i}
                        siblingCount={children.length}
                        advanced={advanced}
                      />
                    </span>
                  )}
                </SortableRow>
              ))}
            </DndReorder>
            <AddBlockMenu onAdd={onAdd} advanced={advanced} compact />
          </div>
        )}
      </div>
      <p className="mt-3 text-body-sm text-ink-muted">
        Drag the handle to reorder a block. Click a block to change it, or use its ••• menu.
      </p>
    </Panel>
  )
}
