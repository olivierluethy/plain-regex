// compile(node) — turn an AST node into a correct regex fragment.
// buildRegExp(ast, flags) — assemble the full pattern and construct a RegExp.

import { escapeClass, escapeLiteral } from './escape'
import type { RegexFlags, RuleNode, StripNode } from './types'
import { flagsToString } from './types'

// ASCII punctuation, expressed as class ranges: ! " # $ … ~ (minus letters/digits/space).
const PUNCT_CLASS = '!-\\/:-@\\[-`{-~'

/** Stable, unique named-capture-group name for a strip node (for cleaned output). */
export function stripGroupName(node: StripNode): string {
  const id = (node.id ?? 'x').replace(/[^a-zA-Z0-9]/g, '')
  return `strip${id}`
}

function charTypeFragment(kind: string, negated: boolean): string {
  switch (kind) {
    case 'any':
      // `.` already means "any except newline"; negating "any" is meaningless,
      // so we keep `.` and let the s-flag decide newline behaviour.
      return '.'
    case 'digit':
      return negated ? '\\D' : '\\d'
    case 'letter':
      return negated ? '[^A-Za-z]' : '[A-Za-z]'
    case 'letterOrDigit':
      return negated ? '[^A-Za-z0-9]' : '[A-Za-z0-9]'
    case 'wordChar':
      return negated ? '\\W' : '\\w'
    case 'whitespace':
      return negated ? '\\S' : '\\s'
    case 'punctuation':
      return negated ? `[^${PUNCT_CLASS}]` : `[${PUNCT_CLASS}]`
    default:
      return '.'
  }
}

/** Does this compiled node behave as a single atom for quantification? */
function isAtom(node: RuleNode): boolean {
  switch (node.type) {
    case 'literal':
      return Array.from(node.text).length <= 1
    case 'charType':
    case 'oneOf':
    case 'noneOf':
    case 'group':
    case 'capture':
    case 'choice':
    case 'contains':
    case 'forbid':
      return true
    case 'anchor':
      return true
    case 'strip':
      return isAtom(node.child)
    default:
      return false
  }
}

/** Compile a node and wrap it in a non-capturing group if a quantifier needs it. */
function atomize(node: RuleNode, captureStrips: boolean): string {
  const frag = compileNode(node, captureStrips)
  return isAtom(node) ? frag : `(?:${frag})`
}

function quantifier(min: number, max: number | null): string {
  if (min === 1 && max === 1) return ''
  if (min === 0 && max === 1) return '?'
  if (min === 0 && max === null) return '*'
  if (min === 1 && max === null) return '+'
  if (max === null) return `{${min},}`
  if (min === max) return `{${min}}`
  return `{${min},${max}}`
}

/**
 * Compile a node. When `captureStrips` is true, strip nodes become NAMED capture
 * groups so cleaned-output logic can locate and remove them; the default (false)
 * keeps them non-capturing so the main pattern's group numbering stays clean.
 */
function compileNode(node: RuleNode, captureStrips: boolean): string {
  switch (node.type) {
    case 'literal':
      return escapeLiteral(node.text)

    case 'charType':
      return charTypeFragment(node.kind, Boolean(node.negated))

    case 'oneOf':
      return node.chars.length ? `[${escapeClass(node.chars)}]` : ''

    case 'noneOf':
      return node.chars.length ? `[^${escapeClass(node.chars)}]` : ''

    case 'sequence':
      return node.children.map((c) => compileNode(c, captureStrips)).join('')

    case 'choice': {
      const opts = node.options.filter(Boolean).map((o) => compileNode(o, captureStrips))
      if (opts.length === 0) return ''
      if (opts.length === 1) return opts[0]
      return `(?:${opts.join('|')})`
    }

    case 'repeat':
      return atomize(node.child, captureStrips) + quantifier(node.min, node.max)

    case 'group': {
      const inner = node.children.map((c) => compileNode(c, captureStrips)).join('')
      if (node.capture) {
        return node.name ? `(?<${node.name}>${inner})` : `(${inner})`
      }
      return `(?:${inner})`
    }

    case 'anchor':
      return node.kind === 'start' ? '^' : node.kind === 'end' ? '$' : '\\b'

    case 'contains':
      // Non-consuming "must contain X somewhere ahead".
      return `(?=[\\s\\S]*${compileNode(node.child, captureStrips)})`

    case 'forbid':
      // Negative lookahead: the child must NOT appear here / anywhere ahead.
      return node.scope === 'anywhere'
        ? `(?![\\s\\S]*${compileNode(node.child, captureStrips)})`
        : `(?!${compileNode(node.child, captureStrips)})`

    case 'capture':
      return node.name
        ? `(?<${node.name}>${compileNode(node.child, captureStrips)})`
        : `(${compileNode(node.child, captureStrips)})`

    case 'strip': {
      const inner = compileNode(node.child, captureStrips)
      // Still matched so surrounding anchors line up. Non-capturing by default;
      // named-capturing when we need to locate it for cleaned output.
      return captureStrips ? `(?<${stripGroupName(node)}>${inner})` : `(?:${inner})`
    }

    default:
      return ''
  }
}

/** Compile a node into a regex fragment (strips stay non-capturing). */
export function compile(node: RuleNode): string {
  return compileNode(node, false)
}

/** Compile with strip nodes as named capture groups (for cleaned-output logic). */
export function compileClean(node: RuleNode): string {
  return compileNode(node, true)
}

export interface CompileResult {
  source: string
  flags: string
  regex: RegExp | null
  error: string | null
}

/** Compile the whole AST and try to construct a RegExp. */
export function buildRegExp(ast: RuleNode, flags: RegexFlags): CompileResult {
  const source = compile(ast) || '(?:)'
  const flagStr = flagsToString(flags)
  try {
    return { source, flags: flagStr, regex: new RegExp(source, flagStr), error: null }
  } catch (e) {
    return {
      source,
      flags: flagStr,
      regex: null,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
