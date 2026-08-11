// explain(node) — plain-English projection of the AST.
// No regex vocabulary leaks out; this is what Simple mode reads from.

import { compile } from './compile'
import type { CharTypeKind, RepeatPreset, RuleNode } from './types'

function quote(text: string): string {
  return `“${text}”`
}

function joinList(items: string[], conj = 'and'): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, ${conj} ${items[items.length - 1]}`
}

const CHARTYPE_SINGULAR: Record<CharTypeKind, string> = {
  any: 'any character',
  digit: 'a digit (0–9)',
  letter: 'a letter',
  letterOrDigit: 'a letter or digit',
  wordChar: 'a letter, digit or underscore',
  whitespace: 'a space',
  punctuation: 'a punctuation mark',
}

const CHARTYPE_PLURAL: Record<CharTypeKind, string> = {
  any: 'characters',
  digit: 'digits',
  letter: 'letters',
  letterOrDigit: 'letters or digits',
  wordChar: 'letters, digits or underscores',
  whitespace: 'spaces',
  punctuation: 'punctuation marks',
}

function charTypeSingular(kind: CharTypeKind, negated: boolean): string {
  if (!negated) return CHARTYPE_SINGULAR[kind]
  switch (kind) {
    case 'digit':
      return 'any character that is not a digit'
    case 'letter':
      return 'any character that is not a letter'
    case 'letterOrDigit':
      return 'any character that is not a letter or digit'
    case 'wordChar':
      return 'any character that is not a letter, digit or underscore'
    case 'whitespace':
      return 'any character that is not a space'
    case 'punctuation':
      return 'any character that is not punctuation'
    default:
      return 'any character'
  }
}

function charTypePlural(kind: CharTypeKind, negated: boolean): string {
  if (!negated) return CHARTYPE_PLURAL[kind]
  return `characters that are not ${CHARTYPE_PLURAL[kind]}`
}

/** A noun phrase for repetition ("one or more <plural>"). */
function pluralPhrase(node: RuleNode): string {
  switch (node.type) {
    case 'charType':
      return charTypePlural(node.kind, Boolean(node.negated))
    case 'oneOf':
      return `characters from the set ${charList(node.chars)}`
    case 'noneOf':
      return `characters other than ${charList(node.chars)}`
    case 'literal':
      return `copies of ${quote(node.text)}`
    default:
      return `occurrences of ${describe(node)}`
  }
}

function charList(chars: string): string {
  const arr = Array.from(chars)
  return joinList(arr.map(quote), 'or')
}

function repeatPhrase(preset: RepeatPreset, min: number, max: number | null, child: RuleNode): string {
  const plural = pluralPhrase(child)
  const singular = describe(child)
  switch (preset) {
    case 'optional':
      return `optionally, ${singular}`
    case 'oneOrMore':
      return `one or more ${plural}`
    case 'zeroOrMore':
      return `any number of ${plural}`
    case 'exactly':
      return min === 1 ? singular : `exactly ${min} ${plural}`
    case 'atLeast':
      return `at least ${min} ${plural}`
    case 'between':
      return `between ${min} and ${max} ${plural}`
    default:
      return `${min} to ${max ?? 'many'} ${plural}`
  }
}

/** Inline description (a phrase, lower-case, no trailing period). */
export function describe(node: RuleNode): string {
  switch (node.type) {
    case 'literal':
      return node.text.length ? `the exact text ${quote(node.text)}` : 'nothing'

    case 'charType':
      return charTypeSingular(node.kind, Boolean(node.negated))

    case 'oneOf':
      return `one of these characters: ${charList(node.chars)}`

    case 'noneOf':
      return `any character except ${charList(node.chars)}`

    case 'sequence': {
      const parts = node.children.map(describe).filter(Boolean)
      return joinList(parts, 'then').replace(/, then /g, ', then ')
    }

    case 'choice': {
      const opts = node.options.map(describe)
      return `either ${joinList(opts, 'or')}`
    }

    case 'repeat':
      return repeatPhrase(node.preset, node.min, node.max, node.child)

    case 'group': {
      const inner = joinList(node.children.map(describe), 'then')
      if (node.capture) {
        return node.name
          ? `a kept part named ${quote(node.name)} containing ${inner}`
          : `a kept part containing ${inner}`
      }
      return inner || 'nothing'
    }

    case 'anchor':
      return node.kind === 'start'
        ? 'the very start of the text'
        : node.kind === 'end'
          ? 'the very end of the text'
          : 'a word boundary'

    case 'contains':
      return `somewhere it contains ${describe(node.child)}`

    case 'capture':
      return node.name
        ? `a kept part named ${quote(node.name)} (${describe(node.child)})`
        : `a kept part (${describe(node.child)})`

    case 'strip':
      return `${describe(node.child)} — marked to remove`

    case 'forbid':
      return node.scope === 'anywhere'
        ? `${describe(node.child)} is not allowed anywhere`
        : `${describe(node.child)} is not allowed here`

    default:
      return 'something'
  }
}

/** Turn a node into a stand-alone imperative step sentence. */
function stepSentence(node: RuleNode): string {
  switch (node.type) {
    case 'anchor':
      if (node.kind === 'start') return 'The match must begin at the very start of the text.'
      if (node.kind === 'end') return 'The match must reach the very end of the text.'
      return 'There must be a word boundary here.'
    case 'contains':
      return `Somewhere in the text there must be ${describe(node.child)}.`
    case 'forbid':
      return node.scope === 'anywhere'
        ? `The text must never contain ${describe(node.child)}.`
        : `${cap(describe(node.child))} is not allowed at this position.`
    case 'literal':
      return node.text.length
        ? `Match the exact text ${quote(node.text)}.`
        : 'Match nothing here.'
    default: {
      const phrase = describe(node)
      return `Match ${phrase}.`
    }
  }
}

export interface Explanation {
  summary: string
  steps: string[]
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function explain(ast: RuleNode): Explanation {
  const children = ast.type === 'sequence' ? ast.children : [ast]
  const steps = children.filter(Boolean).map(stepSentence)

  const startAnchored = children[0]?.type === 'anchor' && (children[0] as { kind: string }).kind === 'start'
  const endAnchored =
    children[children.length - 1]?.type === 'anchor' &&
    (children[children.length - 1] as { kind: string }).kind === 'end'

  const core = children.filter((c) => c.type !== 'anchor')
  const corePhrase = joinList(core.map(describe), 'then')

  let summary: string
  if (startAnchored && endAnchored) {
    summary = `This matches text that, from start to finish, is ${corePhrase || 'empty'}.`
  } else if (core.length === 0) {
    summary = 'This matches an exact position in the text.'
  } else {
    summary = cap(`this pattern looks for ${corePhrase}.`)
  }

  return { summary, steps: steps.length ? steps : ['Match nothing yet — add a block to begin.'] }
}

/** One hoverable regex segment, mapped to the top-level block that produced it. */
export interface RegexSegment {
  nodeId: string
  /** The compiled regex fragment for this block. */
  text: string
  /** A one-line "what happens here" note for step-through. */
  note: string
}

function segmentNote(node: RuleNode): string {
  switch (node.type) {
    case 'anchor':
      return node.kind === 'start'
        ? 'Anchors to the very start of the text.'
        : node.kind === 'end'
          ? 'Requires the very end of the text here.'
          : 'Requires a word boundary here.'
    case 'contains':
      return `Somewhere it must contain ${describe(node.child)}.`
    case 'forbid':
      return node.scope === 'anywhere'
        ? `${cap(describe(node.child))} is not allowed anywhere.`
        : `${cap(describe(node.child))} is not allowed here.`
    default:
      return `Matches ${describe(node)}.`
  }
}

/**
 * Split the compiled pattern into hoverable segments, one per top-level block.
 * Concatenating `text` reproduces the full pattern; empty fragments are skipped.
 */
export function regexSegments(ast: RuleNode): RegexSegment[] {
  const kids = ast.type === 'sequence' ? ast.children : [ast]
  const out: RegexSegment[] = []
  for (const k of kids) {
    const text = compile(k)
    if (!text) continue
    out.push({ nodeId: k.id ?? '', text, note: segmentNote(k) })
  }
  return out
}
