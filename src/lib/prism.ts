// Prism setup: import core + the languages we generate, in dependency order.
// We do NOT import a Prism theme — token colours are mapped to our own tokens in
// index.css so highlighting stays on-palette in light and dark.

import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-ruby'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Highlight `code` for `lang`, returning HTML. Falls back to escaped text. */
export function highlight(code: string, lang: string | null): string {
  if (lang && Prism.languages[lang]) {
    try {
      return Prism.highlight(code, Prism.languages[lang], lang)
    } catch {
      return escapeHtml(code)
    }
  }
  return escapeHtml(code)
}
