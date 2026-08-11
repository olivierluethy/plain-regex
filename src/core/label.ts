// Auto-labels for history snapshots, and the pass↔fail diff that makes the
// timeline legible ("after this change, X is no longer allowed").

import { buildRegExp } from './compile'
import { generateExamples } from './examples'
import type { RegexFlags, RuleNode, RuleNodeType } from './types'

const FRIENDLY: Record<RuleNodeType, string> = {
  literal: 'exact text',
  charType: 'a character block',
  oneOf: 'a set of allowed characters',
  noneOf: 'a set of forbidden characters',
  sequence: 'a group',
  choice: 'a choice',
  repeat: 'a repeat',
  group: 'a group',
  anchor: 'a position marker',
  contains: 'a “must contain” rule',
  capture: 'a kept part',
  strip: 'a part to remove',
  forbid: 'a “not allowed” rule',
  raw: 'a raw pattern',
}

function collectTypes(node: RuleNode, acc: RuleNodeType[] = []): RuleNodeType[] {
  acc.push(node.type)
  const rec = node as unknown as Record<string, unknown>
  const kids = (rec.children ?? rec.options) as RuleNode[] | undefined
  if (Array.isArray(kids)) kids.forEach((k) => collectTypes(k, acc))
  const child = rec.child as RuleNode | undefined
  if (child && typeof child === 'object') collectTypes(child, acc)
  return acc
}

function multiset(types: RuleNodeType[]): Map<RuleNodeType, number> {
  const m = new Map<RuleNodeType, number>()
  types.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1))
  return m
}

/** A short, human sentence describing what changed between two ASTs. */
export function autoLabel(prev: RuleNode | null, next: RuleNode): string {
  if (!prev) return 'Created the rule'
  const a = multiset(collectTypes(prev))
  const b = multiset(collectTypes(next))
  const added: RuleNodeType[] = []
  const removed: RuleNodeType[] = []
  const all = new Set<RuleNodeType>([...a.keys(), ...b.keys()])
  for (const t of all) {
    const delta = (b.get(t) ?? 0) - (a.get(t) ?? 0)
    for (let i = 0; i < delta; i++) added.push(t)
    for (let i = 0; i < -delta; i++) removed.push(t)
  }
  if (added.length === 0 && removed.length === 0) return 'Adjusted a block'
  if (added.length === 1 && removed.length === 0) return `Added ${FRIENDLY[added[0]]}`
  if (removed.length === 1 && added.length === 0) return `Removed ${FRIENDLY[removed[0]]}`
  if (added.length && removed.length) return 'Replaced a block'
  if (added.length) return `Added ${added.length} blocks`
  return `Removed ${removed.length} blocks`
}

export interface SnapshotDiff {
  nowAllowed: string[]
  noLongerAllowed: string[]
  unchanged: boolean
}

/** Which example strings flipped pass↔fail between two rule versions. */
export function diffSnapshots(
  prevAst: RuleNode,
  prevFlags: RegexFlags,
  nextAst: RuleNode,
  nextFlags: RegexFlags,
): SnapshotDiff {
  const before = buildRegExp(prevAst, { ...prevFlags, g: false })
  const after = buildRegExp(nextAst, { ...nextFlags, g: false })

  // Pool of probe strings drawn from both versions' examples.
  const pool = new Set<string>()
  for (const src of [
    generateExamples(prevAst, prevFlags, 8),
    generateExamples(nextAst, nextFlags, 8),
  ]) {
    src.positives.forEach((s) => pool.add(s))
    src.negatives.forEach((s) => pool.add(s))
  }

  const test = (re: RegExp | null, s: string) => (re ? re.test(s) : false)
  const nowAllowed: string[] = []
  const noLongerAllowed: string[] = []
  for (const s of pool) {
    const wasMatch = test(before.regex, s)
    const isMatch = test(after.regex, s)
    if (wasMatch === isMatch) continue
    if (isMatch) nowAllowed.push(s)
    else noLongerAllowed.push(s)
  }
  return {
    nowAllowed: nowAllowed.slice(0, 8),
    noLongerAllowed: noLongerAllowed.slice(0, 8),
    unchanged: before.source === after.source && before.flags === after.flags,
  }
}
