// URL mode: parse a URL into meaningful parts, then build a Rule AST from the
// user's per-part choices. This is the motivating workflow — express
// "these two path segments must exist, and the last must contain a dash"
// without typing any regex.

import { nodes, type RuleNode, type SequenceNode } from '@/core'

export type PartGroup = 'scheme' | 'subdomain' | 'domain' | 'tld' | 'path' | 'query' | 'fragment'

export interface UrlPart {
  id: string
  group: PartGroup
  /** Human label, e.g. "path 1" or a query key. */
  label: string
  value: string
  /** For query params. */
  key?: string
}

export type ConstraintMode = 'equal' | 'contains' | 'any' | 'remove' | 'off'

export interface Constraint {
  mode: ConstraintMode
  value: string
  keep: boolean
}

export interface ParsedUrl {
  parts: UrlPart[]
}

/** Characters that separate URL parts; inner matchers must not cross them. */
const SEP_CLASS = '/.?#: &='

let seq = 0
const pid = (g: string) => `${g}_${seq++}`

export function parseUrl(input: string): { ok: true; parsed: ParsedUrl } | { ok: false; error: string } {
  const raw = input.trim()
  if (!raw) return { ok: false, error: 'Paste a URL to get started.' }
  let url: URL
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`)
  } catch {
    return { ok: false, error: 'That doesn’t look like a URL yet — try something like https://example.com/path.' }
  }

  const parts: UrlPart[] = []
  parts.push({ id: pid('scheme'), group: 'scheme', label: 'scheme', value: url.protocol.replace(':', '') })

  const labels = url.hostname.split('.').filter(Boolean)
  const tld = labels.length > 1 ? labels[labels.length - 1] : ''
  const domain = labels.length > 1 ? labels[labels.length - 2] : labels[0] ?? ''
  const subs = labels.slice(0, Math.max(0, labels.length - 2))
  subs.forEach((s, i) =>
    parts.push({ id: pid('sub'), group: 'subdomain', label: `subdomain ${i + 1}`, value: s }),
  )
  if (domain) parts.push({ id: pid('domain'), group: 'domain', label: 'domain', value: domain })
  if (tld) parts.push({ id: pid('tld'), group: 'tld', label: 'tld', value: tld })

  const segs = url.pathname.split('/').filter(Boolean)
  segs.forEach((s, i) =>
    parts.push({ id: pid('path'), group: 'path', label: `path ${i + 1}`, value: decodeURIComponent(s) }),
  )

  url.searchParams.forEach((value, key) => {
    parts.push({ id: pid('q'), group: 'query', label: key, value, key })
  })

  if (url.hash) {
    parts.push({ id: pid('frag'), group: 'fragment', label: 'fragment', value: url.hash.replace('#', '') })
  }

  return { ok: true, parsed: { parts } }
}

/** Default constraint per part: structural parts must equal; extras are off. */
export function defaultConstraint(part: UrlPart): Constraint {
  const off = part.group === 'query' || part.group === 'fragment'
  return { mode: off ? 'off' : 'equal', value: part.value, keep: false }
}

function nonSep(preset: 'oneOrMore' | 'zeroOrMore') {
  return nodes.repeat(nodes.noneOf(SEP_CLASS), preset)
}

/** The matcher for a single part's value, before keep/remove wrapping. */
function valueNode(c: Constraint): RuleNode {
  switch (c.mode) {
    case 'equal':
      return nodes.literal(c.value)
    case 'contains':
      // Bounded "contains X" within this part: [^sep]* X [^sep]*
      return nodes.group([nonSep('zeroOrMore'), nodes.literal(c.value), nonSep('zeroOrMore')])
    case 'any':
      return nonSep('oneOrMore')
    case 'remove':
      return nodes.strip(c.value ? nodes.literal(c.value) : nonSep('oneOrMore'))
    default:
      return nodes.literal(c.value)
  }
}

function wrap(part: UrlPart, c: Constraint, node: RuleNode): RuleNode {
  if (c.keep && c.mode !== 'remove') {
    return nodes.capture(node, part.label.replace(/[^a-zA-Z0-9]/g, '') || undefined)
  }
  return node
}

/** Build a Rule AST from parsed parts + chosen constraints. */
export function buildAstFromUrl(
  parts: UrlPart[],
  constraints: Record<string, Constraint>,
): SequenceNode {
  const children: RuleNode[] = [nodes.anchor('start')]
  const get = (p: UrlPart) => constraints[p.id] ?? defaultConstraint(p)
  const on = (p: UrlPart) => get(p).mode !== 'off'

  const scheme = parts.find((p) => p.group === 'scheme')
  if (scheme && on(scheme)) {
    children.push(wrap(scheme, get(scheme), valueNode(get(scheme))))
    children.push(nodes.literal('://'))
  }

  const hostParts = parts.filter((p) =>
    p.group === 'subdomain' || p.group === 'domain' || p.group === 'tld',
  )
  hostParts.forEach((p, i) => {
    if (i > 0) children.push(nodes.literal('.'))
    children.push(wrap(p, get(p), valueNode(get(p))))
  })

  const pathParts = parts.filter((p) => p.group === 'path')
  pathParts.forEach((p) => {
    children.push(nodes.literal('/'))
    children.push(wrap(p, get(p), valueNode(get(p))))
  })

  const queryParts = parts.filter((p) => p.group === 'query' && on(p))
  queryParts.forEach((p, i) => {
    children.push(nodes.literal(i === 0 ? '?' : '&'))
    children.push(nodes.literal(`${p.key}=`))
    children.push(wrap(p, get(p), valueNode(get(p))))
  })

  const frag = parts.find((p) => p.group === 'fragment')
  if (frag && on(frag)) {
    children.push(nodes.literal('#'))
    children.push(wrap(frag, get(frag), valueNode(get(frag))))
  }

  children.push(nodes.anchor('end'))
  return nodes.sequence(children)
}

export const CONSTRAINT_LABELS: Record<ConstraintMode, string> = {
  equal: 'must equal',
  contains: 'must contain',
  any: 'anything here',
  remove: 'strip / remove',
  off: 'ignore',
}
