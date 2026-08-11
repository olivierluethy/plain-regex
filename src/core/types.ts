// The Rule AST — the single source of truth.
//
// Nodes are plain, serializable objects (a discriminated union on `type`).
// Regex, plain-English explanation, and worked examples are all *projections*
// of this tree, produced by pure functions in compile.ts / explain.ts /
// examples.ts. We never parse a regex string back into meaning — the AST is
// authored directly by the UI (or validated AI output), so the projections
// are always faithful to it.

export type CharTypeKind =
  | 'any'
  | 'digit'
  | 'letter'
  | 'letterOrDigit'
  | 'wordChar'
  | 'whitespace'
  | 'punctuation'

export type AnchorKind = 'start' | 'end' | 'wordBoundary'

/** Friendly repeat presets, plus an escape hatch for exact counts. */
export type RepeatPreset =
  | 'optional' // 0–1
  | 'oneOrMore' // 1–∞
  | 'zeroOrMore' // 0–∞
  | 'exactly' // n
  | 'atLeast' // n–∞
  | 'between' // n–m

export interface BaseNode {
  /** Stable id for editor selection; not required by the projections. */
  id?: string
}

export interface LiteralNode extends BaseNode {
  type: 'literal'
  /** Raw text; auto-escaped at compile time. The user never types a backslash. */
  text: string
}

export interface CharTypeNode extends BaseNode {
  type: 'charType'
  kind: CharTypeKind
  negated?: boolean
}

export interface OneOfNode extends BaseNode {
  type: 'oneOf'
  /** Set of individual characters, e.g. "aeiou". */
  chars: string
}

export interface NoneOfNode extends BaseNode {
  type: 'noneOf'
  chars: string
}

export interface SequenceNode extends BaseNode {
  type: 'sequence'
  children: RuleNode[]
}

export interface ChoiceNode extends BaseNode {
  type: 'choice'
  options: RuleNode[]
}

export interface RepeatNode extends BaseNode {
  type: 'repeat'
  child: RuleNode
  preset: RepeatPreset
  /** Concrete bounds derived from the preset (min always set, max null = ∞). */
  min: number
  max: number | null
}

export interface GroupNode extends BaseNode {
  type: 'group'
  children: RuleNode[]
  capture?: boolean
  name?: string
}

export interface AnchorNode extends BaseNode {
  type: 'anchor'
  kind: AnchorKind
}

export interface ContainsNode extends BaseNode {
  type: 'contains'
  child: RuleNode
}

/** URL semantics: a part to keep (a capturing group, optionally named). */
export interface CaptureNode extends BaseNode {
  type: 'capture'
  child: RuleNode
  name?: string
}

/** URL semantics: a part to remove. Still matched, but flagged for stripping. */
export interface StripNode extends BaseNode {
  type: 'strip'
  child: RuleNode
}

/**
 * A forbidden pattern — the value must NOT contain the child here (scope: 'here')
 * or anywhere ahead (scope: 'anywhere'). Compiled as a negative lookahead.
 */
export interface ForbidNode extends BaseNode {
  type: 'forbid'
  child: RuleNode
  scope: 'here' | 'anywhere'
}

/**
 * A verbatim regex fragment with no friendly-block equivalent. Produced by the
 * regex importer when it meets a construct we can't map (lookbehind, backreference,
 * unicode property, lazy quantifier…). It compiles to `source` unchanged, so the
 * imported pattern keeps working and round-trips; `note` is a best-effort plain
 * description shown in the UI. This is the only node whose meaning is *not* fully
 * modelled by the AST — everything else is.
 */
export interface RawNode extends BaseNode {
  type: 'raw'
  /** Exact regex fragment, spliced into the compiled pattern as-is. */
  source: string
  /** Best-effort plain-English description of what it does. */
  note?: string
}

export type RuleNode =
  | LiteralNode
  | CharTypeNode
  | OneOfNode
  | NoneOfNode
  | SequenceNode
  | ChoiceNode
  | RepeatNode
  | GroupNode
  | AnchorNode
  | ContainsNode
  | CaptureNode
  | StripNode
  | ForbidNode
  | RawNode

export type RuleNodeType = RuleNode['type']

export interface RegexFlags {
  i: boolean // ignore case
  m: boolean // multiline (^ and $ per line)
  s: boolean // dotAll (. matches newline)
  g: boolean // global
  u: boolean // unicode
}

export const DEFAULT_FLAGS: RegexFlags = { i: false, m: false, s: false, g: false, u: false }

export function flagsToString(flags: RegexFlags): string {
  return (
    (flags.g ? 'g' : '') +
    (flags.i ? 'i' : '') +
    (flags.m ? 'm' : '') +
    (flags.s ? 's' : '') +
    (flags.u ? 'u' : '')
  )
}
