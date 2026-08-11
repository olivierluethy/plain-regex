// Matching helpers for the live test panel. Uses native RegExp only.

import type { CompileResult } from './compile'

export interface LineResult {
  line: string
  matched: boolean
  /** First match's captured groups (index 1..n) if any. */
  groups: string[]
  namedGroups: Record<string, string>
}

/** Test each line independently (per-line mode). */
export function testLines(compiled: CompileResult, text: string): LineResult[] {
  const { regex } = compiled
  const lines = text.split('\n')
  return lines.map((line) => {
    if (!regex) return { line, matched: false, groups: [], namedGroups: {} }
    // Fresh, non-global regex so `.exec` is stateless per line.
    const re = new RegExp(regex.source, regex.flags.replace('g', ''))
    const m = re.exec(line)
    if (!m) return { line, matched: false, groups: [], namedGroups: {} }
    return {
      line,
      matched: true,
      groups: m.slice(1).map((g) => g ?? ''),
      namedGroups: (m.groups as Record<string, string>) ?? {},
    }
  })
}

export interface MatchSpan {
  start: number
  end: number
  text: string
  groups: { index: number; start: number; end: number; text: string }[]
}

/**
 * Find all match spans across the whole text (whole-text mode), with per-match
 * capture-group spans located inside the match.
 */
export function findMatches(compiled: CompileResult, text: string, limit = 5000): MatchSpan[] {
  const { regex } = compiled
  if (!regex) return []
  const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g'
  const re = new RegExp(regex.source, flags)
  const spans: MatchSpan[] = []
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    if (guard++ > limit) break
    const start = m.index
    const end = m.index + m[0].length
    const groups: MatchSpan['groups'] = []
    // Locate each captured group inside the match text (best-effort).
    let searchFrom = start
    for (let i = 1; i < m.length; i++) {
      const g = m[i]
      if (g == null || g === '') continue
      const gi = text.indexOf(g, searchFrom)
      if (gi >= 0 && gi + g.length <= end) {
        groups.push({ index: i, start: gi, end: gi + g.length, text: g })
        searchFrom = gi + g.length
      }
    }
    spans.push({ start, end, text: m[0], groups })
    // Avoid infinite loop on zero-width matches.
    if (m[0].length === 0) re.lastIndex++
  }
  return spans
}
