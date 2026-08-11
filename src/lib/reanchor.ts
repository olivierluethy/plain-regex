// Deterministic re-anchoring of Sample-value rule marks across an edit.
//
// Given the old text, the new text and the current marks, decide for each mark:
//  - unchanged region → keep (shifted by the edit delta where needed)
//  - overlaps the edit but the marked text still exists → relocate to it
//  - only partially survives → keep the surviving prefix/suffix portion
//  - fully removed → drop the mark and report its node id for rule removal

import type { Mark } from '@/store/types'

function commonPrefixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a[i] === b[i]) i++
  return i
}

function commonSuffixLen(a: string, b: string, limit: number): number {
  let s = 0
  while (s < limit && a[a.length - 1 - s] === b[b.length - 1 - s]) s++
  return s
}

export interface Reanchored {
  marks: Mark[]
  removed: string[]
}

export function reanchorMarks(oldText: string, newText: string, marks: Mark[]): Reanchored {
  if (oldText === newText) return { marks, removed: [] }

  const oldLen = oldText.length
  const newLen = newText.length
  const p = commonPrefixLen(oldText, newText)
  const s = commonSuffixLen(oldText, newText, Math.min(oldLen - p, newLen - p))
  const changedOldEnd = oldLen - s
  const delta = newLen - oldLen

  const kept: Mark[] = []
  const removed: string[] = []

  for (const m of marks) {
    // Entirely within the unchanged prefix.
    if (m.end <= p) {
      kept.push(m)
      continue
    }
    // Entirely within the unchanged suffix.
    if (m.start >= changedOldEnd) {
      kept.push({ ...m, start: m.start + delta, end: m.end + delta })
      continue
    }

    // Overlaps the edited region — try to relocate by its content.
    const txt = oldText.slice(m.start, m.end)
    if (txt.length > 0) {
      let idx = newText.indexOf(txt, Math.max(0, Math.min(m.start, newLen)))
      if (idx < 0) idx = newText.indexOf(txt)
      if (idx >= 0) {
        kept.push({ ...m, start: idx, end: idx + txt.length })
        continue
      }
    }

    // Keep a surviving prefix-side portion, if any.
    if (m.start < p) {
      kept.push({ ...m, start: m.start, end: p })
      continue
    }
    // Keep a surviving suffix-side portion, if any.
    if (m.end > changedOldEnd) {
      kept.push({ ...m, start: changedOldEnd + delta, end: m.end + delta })
      continue
    }

    // Nothing survived — drop the mark; its rule should be removed.
    removed.push(m.nodeId)
  }

  return { marks: kept, removed }
}
