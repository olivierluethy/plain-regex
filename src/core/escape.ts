// Rigorous auto-escaping. The user never types regex metacharacters; the AST
// stores plain text and we escape it correctly for each context.

/** Characters that must be escaped outside a character class. */
const OUTSIDE_CLASS = /[.*+?^${}()|[\]\\/-]/g

/** Escape a run of literal text for use outside a character class. */
export function escapeLiteral(text: string): string {
  return text.replace(OUTSIDE_CLASS, (m) => '\\' + m)
}

/**
 * Escape a single character for use *inside* a character class `[...]`.
 * Inside a class the reserved set is smaller: `] \ ^ -` (and we escape `[`
 * too for safety). We also escape `/` so patterns embed cleanly in `/.../`.
 */
export function escapeClassChar(ch: string): string {
  if (ch === '\\' || ch === ']' || ch === '^' || ch === '-' || ch === '[' || ch === '/') {
    return '\\' + ch
  }
  // Control characters -> safe escapes.
  if (ch === '\n') return '\\n'
  if (ch === '\t') return '\\t'
  if (ch === '\r') return '\\r'
  return ch
}

/** Escape a whole string for use inside a character class. */
export function escapeClass(chars: string): string {
  return Array.from(chars).map(escapeClassChar).join('')
}
