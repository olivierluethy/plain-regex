// Single-value probing: "can I enter THIS value, and what happens exactly?"
// Also cleaned-output for strip/exclusion rules. Uses native RegExp only.

import { buildRegExp, compile, compileClean, stripGroupName } from './compile'
import { describe } from './explain'
import type { RegexFlags, RuleNode, SequenceNode } from './types'
import { flagsToString } from './types'

function topLevel(ast: RuleNode): RuleNode[] {
  return ast.type === 'sequence' ? ast.children : [ast]
}

/** Names of the strip groups in this AST (empty = no exclusion rules). */
export function collectStripNames(ast: RuleNode): string[] {
  const out: string[] = []
  const walk = (n: RuleNode) => {
    if (n.type === 'strip') out.push(stripGroupName(n))
    const rec = n as unknown as Record<string, unknown>
    const kids = (rec.children ?? rec.options) as RuleNode[] | undefined
    if (Array.isArray(kids)) kids.forEach(walk)
    const child = rec.child as RuleNode | undefined
    if (child && typeof child === 'object') walk(child)
  }
  walk(ast)
  return out
}

export function hasStrips(ast: RuleNode): boolean {
  return collectStripNames(ast).length > 0
}

export interface CleanResult {
  matched: boolean
  cleaned: string
  removed: { text: string; start: number; end: number }[]
}

/**
 * Remove strip spans from `value` to produce a cleaned result. Returns null when
 * the rule has no strip rules. `matched` is false when the value doesn't match.
 */
export function cleanValue(ast: RuleNode, flags: RegexFlags, value: string): CleanResult | null {
  const names = collectStripNames(ast)
  if (names.length === 0) return null

  const source = compileClean(ast) || '(?:)'
  let re: RegExp
  try {
    // 'd' flag exposes match indices (per-group start/end offsets).
    re = new RegExp(source, flagsToString({ ...flags, g: false }) + 'd')
  } catch {
    return { matched: false, cleaned: value, removed: [] }
  }

  const m = re.exec(value) as (RegExpExecArray & { indices?: { groups?: Record<string, [number, number] | undefined> } }) | null
  if (!m || !m.indices?.groups) return { matched: Boolean(m), cleaned: value, removed: [] }

  const spans: { text: string; start: number; end: number }[] = []
  for (const name of names) {
    const span = m.indices.groups[name]
    if (span) spans.push({ start: span[0], end: span[1], text: value.slice(span[0], span[1]) })
  }
  spans.sort((a, b) => a.start - b.start)

  // Remove right-to-left so earlier offsets stay valid.
  let cleaned = value
  for (const span of [...spans].sort((a, b) => b.start - a.start)) {
    cleaned = cleaned.slice(0, span.start) + cleaned.slice(span.end)
  }
  return { matched: true, cleaned, removed: spans }
}

export type CheckStatus = 'empty' | 'allowed' | 'rejected' | 'error'

export interface CheckResult {
  status: CheckStatus
  reason: string
  cleaned?: string
  removed?: { text: string; start: number; end: number }[]
}

/** Locate the first failing block and phrase a plain-English reason. */
function failureReason(ast: RuleNode, flags: RegexFlags, value: string): string {
  const children = topLevel(ast)
  const flagStr = flagsToString({ ...flags, g: false })
  let src = ''
  let consumed = 0

  for (const node of children) {
    const frag = compile(node)
    let ok = false
    try {
      const m = new RegExp('^' + src + frag, flagStr).exec(value)
      if (m) {
        ok = true
        consumed = m[0].length
      }
    } catch {
      ok = true // a fragment we can't test in isolation — skip past it
    }
    if (ok) {
      src += frag
      continue
    }

    // This node is where it breaks.
    const prefix = value.slice(0, consumed)
    switch (node.type) {
      case 'anchor':
        if (node.kind === 'end') {
          const extra = value.slice(consumed)
          return extra
            ? `Rejected — the value should end here, but “${extra}” is still left over.`
            : 'Rejected — the value ends too early.'
        }
        if (node.kind === 'start') return 'Rejected — it must start differently.'
        return 'Rejected — a word boundary is required here.'
      case 'contains':
        return `Rejected — it must contain ${describe(node.child)} somewhere.`
      case 'forbid':
        return node.scope === 'anywhere'
          ? `Rejected — it contains ${describe(node.child)}, which is not allowed.`
          : `Rejected — ${describe(node.child)} is not allowed at this point.`
      default:
        return prefix
          ? `Rejected — after “${prefix}”, expected ${describe(node)}.`
          : `Rejected — expected ${describe(node)} at the start.`
    }
  }
  return 'Rejected — it doesn’t match the rule.'
}

/** Probe a single value against the rule. */
export function quickCheck(ast: RuleNode, flags: RegexFlags, value: string): CheckResult {
  if (value === '') return { status: 'empty', reason: 'Type a value to check it instantly.' }

  const compiled = buildRegExp(ast as SequenceNode, { ...flags, g: false })
  if (!compiled.regex) {
    return { status: 'error', reason: 'This rule can’t run yet — finish a block first.' }
  }

  const clean = cleanValue(ast, flags, value)
  const allowed = compiled.regex.test(value)

  if (allowed) {
    const reason = clean && clean.removed.length
      ? `Allowed — it matches, and “${clean.removed.map((r) => r.text).join('”, “')}” would be stripped out.`
      : 'Allowed — this value matches every part of the rule.'
    return { status: 'allowed', reason, cleaned: clean?.cleaned, removed: clean?.removed }
  }

  return { status: 'rejected', reason: failureReason(ast, flags, value) }
}
