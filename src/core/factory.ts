// Node constructors, id assignment, and validation/normalisation of untrusted
// AST (imported JSON or AI output). Everything that enters the editor passes
// through normalizeAst so ids exist and repeat bounds match their preset.

import type {
  AnchorKind,
  CharTypeKind,
  ChoiceNode,
  ContainsNode,
  GroupNode,
  RepeatNode,
  RepeatPreset,
  RuleNode,
  SequenceNode,
} from './types'

let counter = 0
export function newId(): string {
  counter += 1
  return `n${counter.toString(36)}_${(counter * 2654435761).toString(36).slice(-4)}`
}

export function repeatBounds(
  preset: RepeatPreset,
  n = 1,
  m = 3,
): { min: number; max: number | null } {
  switch (preset) {
    case 'optional':
      return { min: 0, max: 1 }
    case 'oneOrMore':
      return { min: 1, max: null }
    case 'zeroOrMore':
      return { min: 0, max: null }
    case 'exactly':
      return { min: n, max: n }
    case 'atLeast':
      return { min: n, max: null }
    case 'between':
      return { min: n, max: m }
    default:
      return { min: 1, max: 1 }
  }
}

// --- constructors -----------------------------------------------------------

export const nodes = {
  literal: (text = ''): RuleNode => ({ id: newId(), type: 'literal', text }),
  charType: (kind: CharTypeKind = 'letter', negated = false): RuleNode => ({
    id: newId(),
    type: 'charType',
    kind,
    negated,
  }),
  oneOf: (chars = ''): RuleNode => ({ id: newId(), type: 'oneOf', chars }),
  noneOf: (chars = ''): RuleNode => ({ id: newId(), type: 'noneOf', chars }),
  sequence: (children: RuleNode[] = []): SequenceNode => ({
    id: newId(),
    type: 'sequence',
    children,
  }),
  choice: (options: RuleNode[] = []): ChoiceNode => ({ id: newId(), type: 'choice', options }),
  repeat: (child: RuleNode, preset: RepeatPreset = 'oneOrMore', n = 1, m = 3): RepeatNode => ({
    id: newId(),
    type: 'repeat',
    child,
    preset,
    ...repeatBounds(preset, n, m),
  }),
  group: (children: RuleNode[] = [], capture = false, name?: string): GroupNode => ({
    id: newId(),
    type: 'group',
    children,
    capture,
    name,
  }),
  anchor: (kind: AnchorKind): RuleNode => ({ id: newId(), type: 'anchor', kind }),
  contains: (child: RuleNode): ContainsNode => ({ id: newId(), type: 'contains', child }),
  capture: (child: RuleNode, name?: string): RuleNode => ({
    id: newId(),
    type: 'capture',
    child,
    name,
  }),
  strip: (child: RuleNode): RuleNode => ({ id: newId(), type: 'strip', child }),
}

export function emptyRuleAst(): SequenceNode {
  return nodes.sequence([])
}

// --- validation / normalisation --------------------------------------------

const CHAR_KINDS: CharTypeKind[] = [
  'any',
  'digit',
  'letter',
  'letterOrDigit',
  'wordChar',
  'whitespace',
  'punctuation',
]
const ANCHOR_KINDS: AnchorKind[] = ['start', 'end', 'wordBoundary']
const REPEAT_PRESETS: RepeatPreset[] = [
  'optional',
  'oneOrMore',
  'zeroOrMore',
  'exactly',
  'atLeast',
  'between',
]

export class AstError extends Error {}

function asString(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new AstError(`Expected "${field}" to be text.`)
  return v
}

/** Validate + normalise an untrusted node. Throws AstError on malformed input. */
export function normalizeNode(input: unknown): RuleNode {
  if (!input || typeof input !== 'object') throw new AstError('Each block must be an object.')
  const raw = input as Record<string, unknown>
  const type = raw.type

  switch (type) {
    case 'literal':
      return nodes.literal(asString(raw.text ?? '', 'text'))

    case 'charType': {
      const kind = raw.kind as CharTypeKind
      if (!CHAR_KINDS.includes(kind)) throw new AstError(`Unknown character kind "${String(kind)}".`)
      return nodes.charType(kind, Boolean(raw.negated))
    }

    case 'oneOf':
      return nodes.oneOf(asString(raw.chars ?? '', 'chars'))

    case 'noneOf':
      return nodes.noneOf(asString(raw.chars ?? '', 'chars'))

    case 'sequence':
      return nodes.sequence(normalizeChildren(raw.children))

    case 'choice':
      return nodes.choice(normalizeChildren(raw.options))

    case 'repeat': {
      const preset = raw.preset as RepeatPreset
      if (!REPEAT_PRESETS.includes(preset)) throw new AstError(`Unknown repeat "${String(preset)}".`)
      const child = normalizeNode(raw.child)
      const n = typeof raw.min === 'number' ? raw.min : 1
      const m = typeof raw.max === 'number' ? raw.max : 3
      return nodes.repeat(child, preset, n, m)
    }

    case 'group':
      return nodes.group(
        normalizeChildren(raw.children),
        Boolean(raw.capture),
        typeof raw.name === 'string' ? raw.name : undefined,
      )

    case 'anchor': {
      const kind = raw.kind as AnchorKind
      if (!ANCHOR_KINDS.includes(kind)) throw new AstError(`Unknown anchor "${String(kind)}".`)
      return nodes.anchor(kind)
    }

    case 'contains':
      return nodes.contains(normalizeNode(raw.child))

    case 'capture':
      return nodes.capture(
        normalizeNode(raw.child),
        typeof raw.name === 'string' ? raw.name : undefined,
      )

    case 'strip':
      return nodes.strip(normalizeNode(raw.child))

    default:
      throw new AstError(`Unknown block type "${String(type)}".`)
  }
}

function normalizeChildren(input: unknown): RuleNode[] {
  if (!Array.isArray(input)) return []
  return input.map(normalizeNode)
}

/** Normalise a top-level AST; always returns a sequence at the root. */
export function normalizeAst(input: unknown): SequenceNode {
  const node = normalizeNode(input)
  if (node.type === 'sequence') return node
  return nodes.sequence([node])
}
