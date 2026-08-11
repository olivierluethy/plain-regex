// parseRegexInput(text) — the inverse of compile(): turn a pasted regex into the
// Rule AST so it can be edited as friendly blocks.
//
// We parse with a real engine (@eslint-community/regexpp) and map its AST onto
// ours. Anything with a faithful friendly equivalent becomes a real block;
// anything else survives as a `raw` block that compiles back verbatim — so the
// imported pattern always still works and round-trips, nothing is silently lost.

import { RegExpParser } from '@eslint-community/regexpp'
import { nodes } from './factory'
import { DEFAULT_FLAGS } from './types'
import type { RegexFlags, RuleNode, SequenceNode } from './types'

// regexpp's node types vary a little across versions; we read them structurally.
type RxNode = {
  type: string
  raw: string
  kind?: string
  negate?: boolean
  value?: number
  min?: number | RxNode
  max?: number | RxNode
  greedy?: boolean
  name?: string | null
  element?: RxNode
  elements?: RxNode[]
  alternatives?: RxNode[]
}

export interface ImportResult {
  ok: boolean
  ast?: SequenceNode
  flags?: RegexFlags
  error?: string
}

/** Split `/pattern/flags` or a bare pattern into its two parts. */
function splitInput(input: string): { source: string; flags: string } {
  const t = input.trim()
  if (t.startsWith('/') && t.lastIndexOf('/') > 0) {
    const li = t.lastIndexOf('/')
    const flags = t.slice(li + 1)
    if (/^[a-z]*$/i.test(flags)) return { source: t.slice(1, li), flags }
  }
  return { source: t, flags: '' }
}

function parseFlags(str: string): RegexFlags {
  const f = { ...DEFAULT_FLAGS }
  for (const c of str) {
    if (c === 'i') f.i = true
    else if (c === 'm') f.m = true
    else if (c === 's') f.s = true
    else if (c === 'g') f.g = true
    else if (c === 'u') f.u = true
    // y, d and any others are ignored — they don't map to a friendly block.
  }
  return f
}

// --- char-class mapping -----------------------------------------------------

const LOWER = '97-122'
const UPPER = '65-90'
const DIGIT = '48-57'

function convertClass(el: RxNode): RuleNode {
  const parts = el.elements ?? []
  const complex = parts.some((e) => e.type !== 'Character' && e.type !== 'CharacterClassRange')
  const ranges = parts.filter((e) => e.type === 'CharacterClassRange')
  const singles = parts.filter((e) => e.type === 'Character')

  if (!complex) {
    if (singles.length === 0 && ranges.length > 0) {
      const set = new Set(
        ranges.map((r) => `${(r.min as RxNode).value}-${(r.max as RxNode).value}`),
      )
      const eq = (...xs: string[]) => xs.length === set.size && xs.every((x) => set.has(x))
      if (eq(UPPER, LOWER)) return nodes.charType('letter', el.negate)
      if (eq(UPPER, LOWER, DIGIT)) return nodes.charType('letterOrDigit', el.negate)
      if (eq(DIGIT)) return nodes.charType('digit', el.negate)
    }
    if (ranges.length === 0 && singles.length > 0) {
      const chars = singles.map((s) => String.fromCodePoint(s.value ?? 0)).join('')
      return el.negate ? nodes.noneOf(chars) : nodes.oneOf(chars)
    }
  }
  return nodes.raw(el.raw, `a character set ${el.raw}`)
}

// --- element mapping --------------------------------------------------------

/** Map a repeat's numeric bounds onto a friendly preset. */
function repeatFromBounds(min: number, max: number, inner: RuleNode): RuleNode {
  const inf = max === Infinity
  if (min === 0 && max === 1) return nodes.repeat(inner, 'optional')
  if (min === 0 && inf) return nodes.repeat(inner, 'zeroOrMore')
  if (min === 1 && inf) return nodes.repeat(inner, 'oneOrMore')
  if (inf) return nodes.repeat(inner, 'atLeast', min)
  if (min === max) return nodes.repeat(inner, 'exactly', min)
  return nodes.repeat(inner, 'between', min, max)
}

function convertSet(el: RxNode): RuleNode {
  const negate = Boolean(el.negate)
  switch (el.kind) {
    case 'any':
      return nodes.charType('any')
    case 'digit':
      return nodes.charType('digit', negate)
    case 'word':
      return nodes.charType('wordChar', negate)
    case 'space':
      return nodes.charType('whitespace', negate)
    default:
      // \p{…} property escapes and anything exotic: keep verbatim.
      return nodes.raw(el.raw, 'a Unicode property class')
  }
}

function convertAssertion(el: RxNode): RuleNode {
  switch (el.kind) {
    case 'start':
      return nodes.anchor('start')
    case 'end':
      return nodes.anchor('end')
    case 'word':
      return el.negate
        ? nodes.raw(el.raw, 'a “not a word boundary” assertion')
        : nodes.anchor('wordBoundary')
    case 'lookahead':
      // A negative lookahead is exactly our "not allowed here" block.
      if (el.negate) return nodes.forbid(altsToSingle(el.alternatives ?? []), 'here')
      // Positive lookahead has no faithful friendly node — keep it verbatim.
      return nodes.raw(el.raw, 'a look-ahead: what follows must match this, without consuming it')
    case 'lookbehind':
      return nodes.raw(
        el.raw,
        el.negate ? 'a negative look-behind' : 'a look-behind: what precedes must match this',
      )
    default:
      return nodes.raw(el.raw)
  }
}

function convertElement(el: RxNode): RuleNode {
  switch (el.type) {
    case 'Character':
      return nodes.literal(String.fromCodePoint(el.value ?? 0))

    case 'CharacterSet':
      return convertSet(el)

    case 'CharacterClass':
      return convertClass(el)

    case 'Quantifier': {
      const inner = convertElement(el.element as RxNode)
      // Lazy quantifiers (a*?) can't be modelled by our greedy presets — keep verbatim.
      if (!el.greedy) return nodes.raw(el.raw, 'a lazy (non-greedy) repeat')
      return repeatFromBounds(el.min as number, el.max as number, inner)
    }

    case 'CapturingGroup':
      return nodes.group(altsToChildren(el.alternatives ?? []), true, el.name ?? undefined)

    case 'Group':
      return nodes.group(altsToChildren(el.alternatives ?? []), false)

    case 'Assertion':
      return convertAssertion(el)

    case 'Backreference':
      return nodes.raw(el.raw, 'a back-reference to an earlier kept part')

    default:
      return nodes.raw(el.raw)
  }
}

// --- alternative / sequence assembly ----------------------------------------

/** Convert one alternative's elements, merging runs of plain characters. */
function convertAlternative(alt: RxNode): RuleNode[] {
  const out: RuleNode[] = []
  let buf = ''
  for (const el of alt.elements ?? []) {
    if (el.type === 'Character') {
      buf += String.fromCodePoint(el.value ?? 0)
      continue
    }
    if (buf) {
      out.push(nodes.literal(buf))
      buf = ''
    }
    out.push(convertElement(el))
  }
  if (buf) out.push(nodes.literal(buf))
  return out
}

/** Collapse one alternative into a single node (grouping if it has several parts). */
function altToSingle(alt: RxNode): RuleNode {
  const children = convertAlternative(alt)
  if (children.length === 0) return nodes.literal('')
  if (children.length === 1) return children[0]
  return nodes.group(children, false)
}

/** Collapse a set of alternatives into a single node (a choice when there are several). */
function altsToSingle(alternatives: RxNode[]): RuleNode {
  if (alternatives.length <= 1) return altToSingle(alternatives[0] ?? { type: 'Alternative', raw: '', elements: [] })
  return nodes.choice(alternatives.map(altToSingle))
}

/** Children for a sequence/group context: a lone alternative inlines; several become a choice. */
function altsToChildren(alternatives: RxNode[]): RuleNode[] {
  if (alternatives.length <= 1) return convertAlternative(alternatives[0] ?? { type: 'Alternative', raw: '', elements: [] })
  return [nodes.choice(alternatives.map(altToSingle))]
}

// --- entry point ------------------------------------------------------------

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  // regexpp messages look like "Invalid regular expression: /…/: Unmatched ')'".
  const tail = msg.replace(/^.*?:\s*(?:\/.*?\/[a-z]*:\s*)?/i, '').trim()
  return `That isn’t a valid regex — ${tail || msg}.`
}

/**
 * Parse a pasted regex (a `/pattern/flags` literal or a bare pattern) into a
 * Rule AST + flags. Returns `{ ok: false, error }` for invalid input.
 */
export function parseRegexInput(input: string): ImportResult {
  const { source, flags: flagStr } = splitInput(input)
  if (!source.trim()) return { ok: false, error: 'Paste a regex to import — it looks empty.' }

  const flags = parseFlags(flagStr)
  let pattern: RxNode
  try {
    pattern = new RegExpParser().parsePattern(source, 0, source.length, {
      unicode: flags.u,
    }) as unknown as RxNode
  } catch (e) {
    return { ok: false, error: friendlyError(e) }
  }

  const children = altsToChildren(pattern.alternatives ?? [])
  return { ok: true, ast: nodes.sequence(children), flags }
}
