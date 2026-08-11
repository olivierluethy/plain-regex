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

function walkNodes(ast: RuleNode, visit: (n: RuleNode) => void): void {
  const go = (n: RuleNode) => {
    visit(n)
    const rec = n as unknown as Record<string, unknown>
    const kids = (rec.children ?? rec.options) as RuleNode[] | undefined
    if (Array.isArray(kids)) kids.forEach(go)
    const child = rec.child as RuleNode | undefined
    if (child && typeof child === 'object') go(child)
  }
  go(ast)
}

/** True if the rule has any "not allowed / forbid" block. */
export function hasForbid(ast: RuleNode): boolean {
  let found = false
  walkNodes(ast, (n) => {
    if (n.type === 'forbid') found = true
  })
  return found
}

/**
 * True if the compiled pattern uses lookaround — i.e. any `contains` or `forbid`
 * block (both compile to lookaheads). Used to warn on engines like Go/RE2.
 */
export function hasLookaround(ast: RuleNode): boolean {
  let found = false
  walkNodes(ast, (n) => {
    if (n.type === 'contains' || n.type === 'forbid') found = true
  })
  return found
}

/**
 * A regex fragment matching just the stripped content (alternation of each strip
 * block's child), for a replace-based "clean" usage. Empty when there are no strips.
 */
export function stripPattern(ast: RuleNode): string {
  const frags: string[] = []
  walkNodes(ast, (n) => {
    if (n.type === 'strip') {
      const f = compile(n.child)
      if (f) frags.push(f)
    }
  })
  if (frags.length === 0) return ''
  if (frags.length === 1) return frags[0]
  return `(?:${frags.join('|')})`
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

// --- trace: which block governs which characters ---------------------------

/** Named-group name for tracing a block (unique, valid identifier). */
function traceGroupName(node: RuleNode): string {
  return `t${(node.id ?? 'x').replace(/[^a-zA-Z0-9]/g, '')}`
}

/** Compile with each top-level block wrapped in a named group, for tracing. */
export function compileTrace(ast: RuleNode): string {
  const kids = topLevel(ast)
  return kids.map((k) => `(?<${traceGroupName(k)}>${compile(k)})`).join('')
}

export interface TracePart {
  nodeId: string
  label: string
  start: number
  end: number
  text: string
}

/**
 * Match `value` and report which top-level block governed which characters.
 * Zero-width blocks (anchors, must-contain, forbid) are omitted from parts.
 */
export function traceMatch(ast: RuleNode, flags: RegexFlags, value: string): TracePart[] {
  const source = compileTrace(ast) || '(?:)'
  let re: RegExp
  try {
    re = new RegExp(source, flagsToString({ ...flags, g: false }) + 'd')
  } catch {
    return []
  }
  const m = re.exec(value) as
    | (RegExpExecArray & { indices?: { groups?: Record<string, [number, number] | undefined> } })
    | null
  if (!m || !m.indices?.groups) return []

  const parts: TracePart[] = []
  for (const node of topLevel(ast)) {
    const span = m.indices.groups[traceGroupName(node)]
    if (span && span[1] > span[0]) {
      parts.push({
        nodeId: node.id ?? '',
        label: describe(node),
        start: span[0],
        end: span[1],
        text: value.slice(span[0], span[1]),
      })
    }
  }
  return parts
}

// --- value probing ----------------------------------------------------------

export type CheckStatus = 'empty' | 'allowed' | 'rejected' | 'error'

export interface CheckFailure {
  /** Characters matched before the failing block. */
  consumed: number
  nodeId?: string
  label?: string
}

export interface CheckResult {
  status: CheckStatus
  reason: string
  cleaned?: string
  removed?: { text: string; start: number; end: number }[]
  /** Which block matched which characters (pass). */
  parts?: TracePart[]
  /** Where and why it broke (reject). */
  fail?: CheckFailure
}

/** Locate the first top-level block that fails to match a prefix of `value`. */
function firstFailure(
  ast: RuleNode,
  flags: RegexFlags,
  value: string,
): { node: RuleNode; consumed: number } | null {
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
    return { node, consumed }
  }
  return null
}

function failureReason(node: RuleNode, value: string, consumed: number): string {
  const prefix = value.slice(0, consumed)
  switch (node.type) {
    case 'anchor':
      if (node.kind === 'end') {
        const extra = value.slice(consumed)
        return extra
          ? `No match — the value should end here, but “${extra}” is still left over.`
          : 'No match — the value ends too early.'
      }
      if (node.kind === 'start') return 'No match — it must start differently.'
      return 'No match — a word boundary is required here.'
    case 'contains':
      return `No match — it must contain ${describe(node.child)} somewhere, but there is none.`
    case 'forbid':
      return node.scope === 'anywhere'
        ? `No match — it contains ${describe(node.child)}, which is not allowed.`
        : `No match — ${describe(node.child)} is not allowed at this point.`
    default:
      return prefix
        ? `No match — after “${prefix}”, expected ${describe(node)}.`
        : `No match — expected ${describe(node)} at the start.`
  }
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
    return {
      status: 'allowed',
      reason,
      cleaned: clean?.cleaned,
      removed: clean?.removed,
      parts: traceMatch(ast, flags, value),
    }
  }

  const fail = firstFailure(ast, flags, value)
  if (!fail) return { status: 'rejected', reason: 'No match — it doesn’t match the rule.' }
  return {
    status: 'rejected',
    reason: failureReason(fail.node, value, fail.consumed),
    fail: { consumed: fail.consumed, nodeId: fail.node.id, label: describe(fail.node) },
  }
}

// --- diagnostics for unsatisfiable rules ------------------------------------

/**
 * When no value can match, explain the conflict in plain English. Returns null
 * if the rule looks satisfiable (or is empty).
 */
export function diagnose(ast: RuleNode): string | null {
  const requires: string[] = []
  const forbids: string[] = []
  const strips: string[] = []
  let blocks = 0
  walkNodes(ast, (n) => {
    if (n.type !== 'sequence') blocks++
    if (n.type === 'contains') requires.push(describe(n.child))
    if (n.type === 'forbid') forbids.push(describe(n.child))
    if (n.type === 'strip') strips.push(describe(n.child))
  })
  if (blocks === 0) return null

  const clauses: string[] = []
  if (requires.length) clauses.push(`requires ${requires.join(', ')}`)
  if (forbids.length) clauses.push(`forbids ${forbids.join(', ')}`)
  if (strips.length) clauses.push(`strips ${strips.join(', ')}`)
  if (clauses.length < 1) {
    return 'No value can satisfy every block at once — the rules contradict each other.'
  }
  return `This rule ${clauses.join(', but ')} — no value satisfies all of them at once.`
}
