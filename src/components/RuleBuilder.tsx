import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { findNode, type RuleNode } from '@/core'
import { Panel, Popover, usePopover } from '@/ui/primitives'
import { Redo, Trash, Undo, X } from '@/ui/icons'
import { AddBlockMenu } from './blocks/AddBlockMenu'
import { NodeChip } from './blocks/NodeChip'
import { DndReorder, OverlayChip, SortableRow } from './blocks/Sortable'
import { RegexBar } from './RegexBar'

export function RuleBuilder() {
  const rule = useStore((s) => s.active())
  const advanced = useStore((s) => s.experience === 'advanced')
  const selectedNodeIds = useStore((s) => s.selectedNodeIds)
  const hoveredNodeId = useStore((s) => s.hoveredNodeId)
  const addChild = useStore((s) => s.addChild)
  const moveNode = useStore((s) => s.moveNode)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const setSelection = useStore((s) => s.setSelection)
  const toggleSelection = useStore((s) => s.toggleSelection)
  const clearSelection = useStore((s) => s.clearSelection)
  const deleteSelected = useStore((s) => s.deleteSelected)
  const clearRule = useStore((s) => s.clearRule)

  const canUndo = rule.historyIndex > 0
  const canRedo = rule.historyIndex < rule.history.length - 1

  const root = rule.ast
  const children = root.children
  const onAdd = (node: RuleNode) => addChild(root.id!, node)
  const anchorRef = useRef<number | null>(null)

  const selectAt = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }, index: number, id: string) => {
    if (e.shiftKey) {
      const a = anchorRef.current ?? index
      const [lo, hi] = a <= index ? [a, index] : [index, a]
      setSelection(children.slice(lo, hi + 1).map((c) => c.id!))
    } else if (e.metaKey || e.ctrlKey) {
      toggleSelection(id)
      anchorRef.current = index
    } else {
      setSelection([id])
      anchorRef.current = index
    }
  }

  // Delete/Backspace removes the selection; Esc clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return
      const sel = useStore.getState().selectedNodeIds
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape' && sel.length) {
        clearSelection()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [deleteSelected, clearSelection])

  const selCount = children.filter((c) => selectedNodeIds.includes(c.id!)).length

  return (
    <Panel
      eyebrow="Build"
      title="Your rule, in plain blocks"
      actions={
        <>
          {children.length > 0 && (
            <Popover
              align="end"
              width={220}
              trigger={({ open, toggle }) => (
                <button
                  onClick={toggle}
                  aria-expanded={open}
                  className="btn-ghost btn-sm text-fail hover:bg-fail-tint"
                  title="Clear all blocks"
                >
                  <Trash width={15} height={15} />
                  Clear all
                </button>
              )}
            >
              <ClearAllConfirm onConfirm={clearRule} />
            </Popover>
          )}
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

      {selCount > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-md border border-brand/30 bg-brand-tint/50 px-3 py-1.5 text-body-sm">
          <span className="font-medium text-brand">
            {selCount} block{selCount > 1 ? 's' : ''} selected
          </span>
          <button className="btn-ghost btn-sm text-fail hover:bg-fail-tint" onClick={deleteSelected}>
            <Trash width={14} height={14} />
            Delete
          </button>
          <button className="btn-ghost btn-sm ml-auto" onClick={clearSelection}>
            <X width={14} height={14} />
            Clear selection
          </button>
        </div>
      )}

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
              {children.map((child, i) => {
                const id = child.id!
                const selected = selectedNodeIds.includes(id)
                const hovered = hoveredNodeId === id
                return (
                  <SortableRow key={child.id} id={id}>
                    {({ handle }) => (
                      <span
                        onClickCapture={(e) => {
                          if (e.shiftKey || e.metaKey || e.ctrlKey) {
                            e.preventDefault()
                            e.stopPropagation()
                            selectAt(e, i, id)
                          }
                        }}
                        onClick={(e) => {
                          if (!(e.shiftKey || e.metaKey || e.ctrlKey)) selectAt(e, i, id)
                        }}
                        className={`inline-flex items-center gap-0.5 rounded-md px-0.5 transition-shadow ${
                          selected
                            ? 'bg-brand-tint/40 ring-2 ring-brand'
                            : hovered
                              ? 'ring-1 ring-brand/40'
                              : ''
                        }`}
                      >
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
                )
              })}
            </DndReorder>
            <AddBlockMenu onAdd={onAdd} advanced={advanced} compact />
          </div>
        )}
      </div>
      <p className="mt-3 text-body-sm text-ink-muted">
        Drag the handle to reorder. Click a block to edit it; ⌘/Ctrl-click or Shift-click to select
        several, then press Delete.
      </p>
    </Panel>
  )
}

function ClearAllConfirm({ onConfirm }: { onConfirm: () => void }) {
  const { close } = usePopover()
  return (
    <div className="p-1">
      <p className="px-1 pb-2 text-body-sm text-ink">Clear all blocks and start over?</p>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary btn-sm" onClick={close}>
          Cancel
        </button>
        <button
          className="btn btn-sm bg-fail text-white hover:bg-fail/90"
          onClick={() => {
            onConfirm()
            close()
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
