import { Fragment, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
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

/** The vertical bar showing exactly where a dragged block will land. */
function InsertionLine() {
  return (
    <span
      aria-hidden
      className="mx-0.5 inline-block h-7 w-[3px] shrink-0 rounded-full bg-brand motion-safe:animate-fade-in"
    />
  )
}

/**
 * Reorderable row of chips with an explicit insertion indicator. The list stays
 * still while dragging (a dimmed source placeholder + a floating overlay + a
 * brand insertion bar), so it's always clear where the block will drop.
 * Reordering is scoped to this context — chips never leave their container.
 */
export function DndReorder({
  ids,
  onReorder,
  renderItem,
  renderOverlay,
}: {
  ids: string[]
  onReorder: (from: number, to: number) => void
  renderItem: (id: string, index: number, handle: ReactNode, isDragging: boolean) => ReactNode
  renderOverlay?: (id: string) => ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const sensors = useSensors(
    // A small drag threshold keeps clicks (open editor, select) working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reset = () => {
    setActiveId(null)
    setOverIndex(null)
  }

  const onDragOver = (e: DragOverEvent) => {
    setOverIndex(e.over ? ids.indexOf(String(e.over.id)) : null)
  }

  const onDragEnd = (e: DragEndEvent) => {
    reset()
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from >= 0 && to >= 0) onReorder(from, to)
  }

  const activeIndex = activeId ? ids.indexOf(activeId) : -1
  const insertionIndex =
    activeIndex >= 0 && overIndex != null
      ? activeIndex < overIndex
        ? overIndex + 1
        : overIndex
      : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
    >
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        {ids.map((id, i) => (
          <Fragment key={id}>
            {insertionIndex === i && <InsertionLine />}
            <SortableRow id={id}>
              {({ handle, isDragging }) => renderItem(id, i, handle, isDragging)}
            </SortableRow>
          </Fragment>
        ))}
        {insertionIndex === ids.length && <InsertionLine />}
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

/**
 * A single sortable slot. The list stays static during a drag (no transforms),
 * so the insertion bar is the single source of truth for the drop position;
 * the source just dims in place.
 */
function SortableRow({
  id,
  children,
}: {
  id: string
  children: (p: { handle: ReactNode; isDragging: boolean }) => ReactNode
}) {
  const { setNodeRef, transition, attributes, listeners, isDragging } = useSortable({ id })

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
      style={{ transition }}
      className={`group/slot inline-flex items-center rounded-md ${isDragging ? 'opacity-30' : ''}`}
    >
      {children({ handle, isDragging })}
    </span>
  )
}
