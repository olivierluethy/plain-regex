// Turn a selected span of the sample value into rule blocks. Each intent is a
// plain-language choice that maps to one or more Rule AST nodes.

import { nodes, type CharTypeKind, type RuleNode } from '@/core'

export interface Intent {
  key: string
  label: string
  hint?: string
  tone: 'build' | 'strip' | 'forbid'
  /** Fresh node(s) for this intent; always a single top-level block. */
  make: () => RuleNode
  /** History snapshot label. */
  autoLabel: string
}

/** Detect a uniform character shape, so we can offer "generalise". */
function shapeOf(text: string): { kind: CharTypeKind; plural: string } | null {
  if (/^[0-9]+$/.test(text)) return { kind: 'digit', plural: 'digits' }
  if (/^[A-Za-z]+$/.test(text)) return { kind: 'letter', plural: 'letters' }
  if (/^[A-Za-z0-9]+$/.test(text)) return { kind: 'letterOrDigit', plural: 'letters or digits' }
  return null
}

function clip(text: string, max = 18): string {
  const t = text.replace(/\s/g, '·')
  return t.length > max ? `${t.slice(0, max)}…` : t
}

export function buildIntents(selText: string): Intent[] {
  const shown = clip(selText)
  const shape = shapeOf(selText)
  const list: Intent[] = []

  list.push({
    key: 'exact',
    label: `Match “${shown}” exactly`,
    hint: 'Only this literal text is allowed here.',
    tone: 'build',
    make: () => nodes.literal(selText),
    autoLabel: `Added from selection: exact “${shown}”`,
  })

  if (shape) {
    list.push({
      key: 'generalise',
      label: `Any ${shape.plural} like this`,
      hint: `One or more ${shape.plural}, any value.`,
      tone: 'build',
      make: () => nodes.repeat(nodes.charType(shape.kind), 'oneOrMore'),
      autoLabel: `Added from selection: any ${shape.plural}`,
    })
  }

  list.push({
    key: 'anything',
    label: 'Allow anything here',
    hint: 'One or more characters, no restriction.',
    tone: 'build',
    make: () => nodes.repeat(nodes.charType('any'), 'oneOrMore'),
    autoLabel: 'Added from selection: anything here',
  })

  list.push({
    key: 'optional',
    label: 'Make this optional',
    hint: `“${shown}” may be present or absent.`,
    tone: 'build',
    make: () => nodes.repeat(nodes.literal(selText), 'optional'),
    autoLabel: `Added from selection: optional “${shown}”`,
  })

  list.push({
    key: 'contains',
    label: `Must contain “${shown}”`,
    hint: 'Required somewhere, position not fixed.',
    tone: 'build',
    make: () => nodes.contains(nodes.literal(selText)),
    autoLabel: `Added from selection: must contain “${shown}”`,
  })

  list.push({
    key: 'strip',
    label: `Strip “${shown}” out`,
    hint: 'Matched, then removed from the cleaned result.',
    tone: 'strip',
    make: () => nodes.strip(nodes.literal(selText)),
    autoLabel: `Added from selection: strip “${shown}”`,
  })

  list.push({
    key: 'forbid',
    label: `Forbid “${shown}” here`,
    hint: 'A value with this here is rejected.',
    tone: 'forbid',
    make: () => nodes.forbid(nodes.literal(selText), 'here'),
    autoLabel: `Added from selection: forbid “${shown}”`,
  })

  return list
}
