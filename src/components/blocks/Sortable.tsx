import { useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RuleNode } from '@/core'
import { Grip } from '@/ui/icons'
import { chipLabel } from './labels'

/** Compact chip clone shown floating under the cursor while dragging. */
export function OverlayChip({ node }: { node: RuleNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand-tint px-2.5 py-1 text-sm font-medium text-brand shadow-md">
      {chipLabel(node)}
    </span>
  )
}

/**
 * Wrap a row of reorderable chips. Reordering is scoped to this context, so
 * a group's blocks reorder within the group and the top-level sequence reorders
 * on its own — chips never jump out of their container.
 */
export function DndReorder({
  ids,
  onReorder,
  renderOverlay,
  children,
}: {
  ids: string[]
  onReorder: (from: number, to: number) => void
  renderOverlay?: (id: string) => ReactNode
  children: ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    // A small drag threshold keeps clicks (opening popovers) working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from >= 0 && to >= 0) onReorder(from, to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId && renderOverlay ? (
          <div className="pointer-events-none scale-105 opacity-95 drop-shadow-md">
            {renderOverlay(activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/** A single sortable slot. Gives the child a drag handle and its dragging state. */
export function SortableRow({
  id,
  children,
}: {
  id: string
  children: (p: { handle: ReactNode; isDragging: boolean }) => ReactNode
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({ id })
  const style = { transform: CSS.Translate.toString(transform), transition }

  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className="grid h-6 w-4 shrink-0 cursor-grab touch-none place-items-center rounded text-ink-faint opacity-40 transition-opacity hover:bg-surface-2 hover:text-ink-muted group-hover/slot:opacity-100 active:cursor-grabbing motion-reduce:transition-none"
    >
      <Grip width={13} height={13} />
    </button>
  )

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={`group/slot inline-flex items-center rounded-md ${isDragging ? 'opacity-40' : ''}`}
    >
      {children({ handle, isDragging })}
    </span>
  )
}
