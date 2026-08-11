// Immutable operations over the AST tree, addressed by node id. The editor
// never mutates nodes in place — every edit returns a fresh root.

import type { RuleNode } from './types'

/** Array-typed children slots, by node type. */
function arrayKey(node: RuleNode): 'children' | 'options' | null {
  if (node.type === 'sequence' || node.type === 'group') return 'children'
  if (node.type === 'choice') return 'options'
  return null
}

/** Single-child slot, by node type. */
function hasChildSlot(node: RuleNode): boolean {
  return (
    node.type === 'repeat' ||
    node.type === 'contains' ||
    node.type === 'capture' ||
    node.type === 'strip'
  )
}

export function findNode(root: RuleNode, id: string): RuleNode | null {
  if (root.id === id) return root
  const key = arrayKey(root)
  if (key) {
    for (const child of (root as never as Record<string, RuleNode[]>)[key]) {
      const found = findNode(child, id)
      if (found) return found
    }
  } else if (hasChildSlot(root)) {
    return findNode((root as never as { child: RuleNode }).child, id)
  }
  return null
}

type Rec = Record<string, unknown>

/** Replace the node with `id` using `fn(node) -> node`. */
export function transformNode(
  root: RuleNode,
  id: string,
  fn: (node: RuleNode) => RuleNode,
): RuleNode {
  if (root.id === id) return fn(root)
  const key = arrayKey(root)
  if (key) {
    const list = (root as unknown as Rec)[key] as RuleNode[]
    return { ...root, [key]: list.map((c) => transformNode(c, id, fn)) } as RuleNode
  }
  if (hasChildSlot(root)) {
    const child = (root as unknown as Rec).child as RuleNode
    return { ...root, child: transformNode(child, id, fn) } as RuleNode
  }
  return root
}

/** Shallow-merge a patch into the node with `id`. */
export function updateNode(root: RuleNode, id: string, patch: Partial<RuleNode>): RuleNode {
  return transformNode(root, id, (n) => ({ ...n, ...patch }) as RuleNode)
}

/** Replace the node with `id` entirely. */
export function replaceNode(root: RuleNode, id: string, next: RuleNode): RuleNode {
  return transformNode(root, id, () => next)
}

/** Remove the node with `id` from whichever array-parent holds it. */
export function removeNode(root: RuleNode, id: string): RuleNode {
  const key = arrayKey(root)
  if (key) {
    const list = (root as unknown as Rec)[key] as RuleNode[]
    const filtered = list.filter((c) => c.id !== id).map((c) => removeNode(c, id))
    return { ...root, [key]: filtered } as RuleNode
  }
  if (hasChildSlot(root)) {
    const child = (root as unknown as Rec).child as RuleNode
    return { ...root, child: removeNode(child, id) } as RuleNode
  }
  return root
}

/** Insert `node` into the array-parent `parentId` at `index` (default: end). */
export function insertChild(
  root: RuleNode,
  parentId: string,
  node: RuleNode,
  index?: number,
): RuleNode {
  return transformNode(root, parentId, (parent) => {
    const key = arrayKey(parent)
    if (!key) return parent
    const list = ((parent as unknown as Rec)[key] as RuleNode[]).slice()
    const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length))
    list.splice(at, 0, node)
    return { ...parent, [key]: list } as RuleNode
  })
}

/** Move a child within its array-parent from one index to another. */
export function moveChild(root: RuleNode, parentId: string, from: number, to: number): RuleNode {
  return transformNode(root, parentId, (parent) => {
    const key = arrayKey(parent)
    if (!key) return parent
    const list = ((parent as unknown as Rec)[key] as RuleNode[]).slice()
    if (from < 0 || from >= list.length) return parent
    const [moved] = list.splice(from, 1)
    const at = Math.max(0, Math.min(to, list.length))
    list.splice(at, 0, moved)
    return { ...parent, [key]: list } as RuleNode
  })
}

/** Deep clone with fresh ids (for duplicate). */
export function cloneWithNewIds(node: RuleNode, newId: () => string): RuleNode {
  const copy = { ...node, id: newId() } as RuleNode
  const key = arrayKey(copy)
  if (key) {
    const list = (copy as unknown as Rec)[key] as RuleNode[]
    ;(copy as unknown as Rec)[key] = list.map((c) => cloneWithNewIds(c, newId))
  } else if (hasChildSlot(copy)) {
    const child = (copy as unknown as Rec).child as RuleNode
    ;(copy as unknown as Rec).child = cloneWithNewIds(child, newId)
  }
  return copy
}
