import type { CharTypeKind, RepeatNode, RuleNode } from '@/core'

export const CHARTYPE_LABEL: Record<CharTypeKind, string> = {
  any: 'any character',
  digit: 'digit',
  letter: 'letter',
  letterOrDigit: 'letter or digit',
  wordChar: 'word character',
  whitespace: 'space',
  punctuation: 'punctuation',
}

/** Short label shown inside a chip. */
export function chipLabel(node: RuleNode): string {
  switch (node.type) {
    case 'literal':
      return node.text ? `“${node.text}”` : 'text…'
    case 'charType':
      return (node.negated ? 'not a ' : '') + CHARTYPE_LABEL[node.kind]
    case 'oneOf':
      return node.chars ? `one of ${node.chars}` : 'one of…'
    case 'noneOf':
      return node.chars ? `none of ${node.chars}` : 'none of…'
    case 'anchor':
      return node.kind === 'start'
        ? 'start of text'
        : node.kind === 'end'
          ? 'end of text'
          : 'word boundary'
    case 'contains':
      return 'must contain'
    case 'choice':
      return 'one of these'
    case 'group':
      return node.capture ? (node.name ? `keep: ${node.name}` : 'keep this') : 'group'
    case 'capture':
      return node.name ? `keep: ${node.name}` : 'keep this'
    case 'strip':
      return 'remove this'
    case 'repeat':
      return chipLabel(node.child)
    case 'sequence':
      return 'group'
    default:
      return 'block'
  }
}

/** Compact badge text for a repeat modifier. */
export function repeatBadge(node: RepeatNode): string {
  switch (node.preset) {
    case 'optional':
      return 'optional'
    case 'oneOrMore':
      return '1 or more'
    case 'zeroOrMore':
      return '0 or more'
    case 'exactly':
      return `exactly ${node.min}`
    case 'atLeast':
      return `${node.min} or more`
    case 'between':
      return `${node.min}–${node.max}`
    default:
      return 'repeat'
  }
}

export const REPEAT_OPTIONS: { preset: RepeatNode['preset']; label: string }[] = [
  { preset: 'optional', label: 'Optional (0 or 1)' },
  { preset: 'oneOrMore', label: 'One or more' },
  { preset: 'zeroOrMore', label: 'Any number (0 or more)' },
  { preset: 'exactly', label: 'Exactly…' },
  { preset: 'atLeast', label: 'At least…' },
  { preset: 'between', label: 'Between…' },
]
