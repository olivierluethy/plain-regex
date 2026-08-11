// generateExamples(ast, flags) — worked "would match" / "would not match" lists.
//
// Strategy: sample candidate strings from the AST, then VERIFY each against the
// real compiled regex. Verification is what makes the panel trustworthy — even
// if sampling heuristics are imperfect (lookaheads, tricky nesting), we only
// ever show strings the actual engine agrees with. Negatives are positives
// mutated by exactly one violation and confirmed to fail.

import { compile } from './compile'
import type { RegexFlags, RuleNode } from './types'
import { flagsToString } from './types'
import { hashString, makeRng, pick, randInt } from './rng'

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'
const LETTERS_UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const ALNUM = LETTERS + DIGITS
const PUNCT = '-._@!?#'
const DISRUPTORS = ['#', ' ', '§', '!', 'Z', '9', '~']

function sampleChar(kind: string, negated: boolean, rng: () => number): string {
  const from = (s: string) => s[Math.floor(rng() * s.length)]
  if (!negated) {
    switch (kind) {
      case 'any':
        return from(ALNUM)
      case 'digit':
        return from(DIGITS)
      case 'letter':
        return from(rng() < 0.5 ? LETTERS : LETTERS_UP)
      case 'letterOrDigit':
        return from(ALNUM)
      case 'wordChar':
        return from(ALNUM + '_')
      case 'whitespace':
        return ' '
      case 'punctuation':
        return from(PUNCT)
      default:
        return from(ALNUM)
    }
  }
  // Negated: pick something outside the class.
  switch (kind) {
    case 'digit':
      return from(LETTERS)
    case 'letter':
      return from(DIGITS)
    case 'letterOrDigit':
      return from(PUNCT)
    case 'wordChar':
      return from('-.!?@ ')
    case 'whitespace':
      return from(ALNUM)
    case 'punctuation':
      return from(ALNUM)
    default:
      return from(ALNUM)
  }
}

function sampleNode(node: RuleNode, rng: () => number): string {
  switch (node.type) {
    case 'literal':
      return node.text

    case 'charType':
      return sampleChar(node.kind, Boolean(node.negated), rng)

    case 'oneOf': {
      const arr = Array.from(node.chars)
      return arr.length ? pick(rng, arr) : ''
    }

    case 'noneOf': {
      const set = new Set(Array.from(node.chars))
      const pool = Array.from(ALNUM).filter((c) => !set.has(c))
      return pool.length ? pick(rng, pool) : '#'
    }

    case 'sequence':
      return node.children.map((c) => sampleNode(c, rng)).join('')

    case 'choice':
      return node.options.length ? sampleNode(pick(rng, node.options), rng) : ''

    case 'repeat': {
      const hi = node.max ?? node.min + 2
      const count = randInt(rng, node.min, Math.min(hi, node.min + 3))
      let out = ''
      for (let i = 0; i < count; i++) out += sampleNode(node.child, rng)
      return out
    }

    case 'group':
      return node.children.map((c) => sampleNode(c, rng)).join('')

    case 'capture':
    case 'strip':
      return sampleNode(node.child, rng)

    case 'anchor':
    case 'contains':
      // Zero-width; rely on siblings to satisfy lookaheads, verification filters.
      return ''

    default:
      return ''
  }
}

function mutate(s: string, rng: () => number): string[] {
  const out: string[] = []
  const chars = Array.from(s)
  // Change one character.
  if (chars.length) {
    const i = Math.floor(rng() * chars.length)
    const d = pick(rng, DISRUPTORS)
    if (d !== chars[i]) {
      const copy = chars.slice()
      copy[i] = d
      out.push(copy.join(''))
    }
  }
  // Drop one character.
  if (chars.length > 1) {
    const i = Math.floor(rng() * chars.length)
    out.push(chars.slice(0, i).concat(chars.slice(i + 1)).join(''))
  }
  // Insert a stray character in the middle.
  {
    const i = Math.floor(rng() * (chars.length + 1))
    out.push(chars.slice(0, i).concat([' ']).concat(chars.slice(i)).join(''))
  }
  // Break a leading anchor.
  out.push('x' + s)
  // Break a trailing anchor.
  out.push(s + 'x')
  // Flip case of the first letter (breaks case-sensitive literals).
  const li = chars.findIndex((c) => /[a-z]/i.test(c))
  if (li >= 0) {
    const copy = chars.slice()
    const c = copy[li]
    copy[li] = c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()
    out.push(copy.join(''))
  }
  // Empty string.
  if (s.length) out.push('')
  return out
}

export interface ExamplesResult {
  positives: string[]
  negatives: string[]
}

/** Build the RegExp used for verification (never global, so `.test` is stateless). */
function verifier(ast: RuleNode, flags: RegexFlags): RegExp | null {
  const source = compile(ast) || '(?:)'
  const flagStr = flagsToString({ ...flags, g: false })
  try {
    return new RegExp(source, flagStr)
  } catch {
    return null
  }
}

export function generateExamples(
  ast: RuleNode,
  flags: RegexFlags,
  want = 5,
): ExamplesResult {
  const re = verifier(ast, flags)
  if (!re) return { positives: [], negatives: [] }

  const seed = hashString(JSON.stringify(ast) + flagsToString(flags))
  const rng = makeRng(seed)

  const positives: string[] = []
  const seenPos = new Set<string>()
  // Oversample, then keep only strings the engine confirms.
  for (let i = 0; i < 200 && positives.length < want + 4; i++) {
    const cand = sampleNode(ast, rng)
    if (seenPos.has(cand)) continue
    seenPos.add(cand)
    if (re.test(cand)) positives.push(cand)
  }

  const negatives: string[] = []
  const seenNeg = new Set<string>()
  const bases = positives.length ? positives : ['']
  for (let round = 0; round < 6 && negatives.length < want; round++) {
    for (const base of bases) {
      for (const m of mutate(base, rng)) {
        if (seenNeg.has(m) || seenPos.has(m)) continue
        seenNeg.add(m)
        if (!re.test(m)) {
          negatives.push(m)
          if (negatives.length >= want) break
        }
      }
      if (negatives.length >= want) break
    }
  }

  return { positives: positives.slice(0, want), negatives: negatives.slice(0, want) }
}
