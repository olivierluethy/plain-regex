// Generate copy-ready code that embeds the compiled regex, per target language.
// Each generator handles the target's own string/literal escaping, its flag
// translation, and an idiomatic usage that reflects the rule's semantics:
//   validate → test/match ·  reject → same but rejecting forbidden values ·
//   clean → a replace that produces the stripped/cleaned output.

import type { RegexFlags } from '@/core'
import { flagsToString } from '@/core'

export type Mode = 'validate' | 'reject' | 'clean'

export interface CodegenInput {
  /** Main compiled pattern (validate / reject). */
  pattern: string
  flags: RegexFlags
  mode: Mode
  /** Pattern matching just the stripped content (clean mode). */
  stripPattern: string
  /** Rule uses lookaround (contains / forbid) — unsupported on RE2. */
  hasLookaround: boolean
}

export interface Warning {
  level: 'blocker' | 'note'
  text: string
}

export interface Snippet {
  code: string
  /** Prism language id for highlighting, or null for plain. */
  prism: string | null
  warnings: Warning[]
}

export interface LanguageMeta {
  id: string
  label: string
}

export const LANGUAGES: LanguageMeta[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'react', label: 'React' },
  { id: 'python', label: 'Python' },
  { id: 'php', label: 'PHP' },
  { id: 'java', label: 'Java' },
  { id: 'go', label: 'Go' },
  { id: 'csharp', label: 'C# / .NET' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'pattern', label: 'Pattern only' },
]

// --- escaping helpers -------------------------------------------------------

/** Escape for a double-quoted string in C-family languages (JS/TS/Java). */
function dq(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Escape for a PHP single-quoted string (doubling backslashes is safe here). */
function phpSingle(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/** Escape for a C# verbatim string @"...". */
function csVerbatim(s: string): string {
  return s.replace(/"/g, '""')
}

/** Choose a Python raw-string form, falling back to an escaped string if needed. */
function pyString(s: string): string {
  if (!s.includes('"')) return `r"${s}"`
  if (!s.includes("'")) return `r'${s}'`
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Go raw string in backticks; fall back to a quoted string if a backtick appears. */
function goString(s: string): { text: string; note?: string } {
  if (!s.includes('`')) return { text: '`' + s + '`' }
  return { text: `"${dq(s)}"`, note: 'Pattern contains a backtick, so a quoted string is used.' }
}

// --- flag translation -------------------------------------------------------

/** JS flags for a stateless test (drop g); optionally force g for replace-all. */
function jsFlags(f: RegexFlags, forceGlobal: boolean): string {
  return flagsToString({ ...f, g: forceGlobal })
}

function droppedGlobalNote(f: RegexFlags): Warning[] {
  return f.g
    ? [{ level: 'note', text: 'The global (g) flag was dropped — a validation regex must be stateless.' }]
    : []
}

// --- usage comments ---------------------------------------------------------

function comment(mode: Mode): string {
  if (mode === 'clean') return 'Removes the stripped part(s) and returns the cleaned value'
  if (mode === 'reject') return 'Returns true only when allowed (forbidden values are rejected)'
  return 'Returns true when the value matches the rule'
}

// --- per-language generators ------------------------------------------------

function genJavaScript(input: CodegenInput, ts: boolean): Snippet {
  const { pattern, flags, mode, stripPattern } = input
  const vf = jsFlags(flags, false)
  const cf = jsFlags(flags, true)
  const strTy = ts ? ': string' : ''
  const boolTy = ts ? ': boolean' : ''
  const retStr = ts ? ': string' : ''

  let body: string
  if (mode === 'clean') {
    const g = cf.includes('g') ? cf : cf + 'g'
    body = [
      `const pattern = /${stripPattern || pattern}/${g};`,
      '',
      `// ${comment('clean')}`,
      `export function clean(value${strTy})${retStr} {`,
      `  return value.replace(pattern, '');`,
      `}`,
    ].join('\n')
  } else {
    body = [
      `// Regex literal`,
      `const pattern = /${pattern}/${vf};`,
      '',
      `// Or build it from a string`,
      `const pattern2 = new RegExp("${dq(pattern)}"${vf ? `, "${vf}"` : ''});`,
      '',
      `// ${comment(mode)}`,
      `export function isValid(value${strTy})${boolTy} {`,
      `  return pattern.test(value);`,
      `}`,
    ].join('\n')
  }
  return { code: body, prism: ts ? 'typescript' : 'javascript', warnings: droppedGlobalNote(flags) }
}

function genReact(input: CodegenInput): Snippet {
  const { pattern, flags, mode, stripPattern } = input
  const vf = jsFlags(flags, false)
  const cf = jsFlags(flags, true)

  let body: string
  if (mode === 'clean') {
    const g = cf.includes('g') ? cf : cf + 'g'
    body = [
      `import { useMemo } from 'react'`,
      '',
      `const PATTERN = /${stripPattern || pattern}/${g};`,
      '',
      `// ${comment('clean')}`,
      `export function useCleaned(value: string): string {`,
      `  return useMemo(() => value.replace(PATTERN, ''), [value]);`,
      `}`,
    ].join('\n')
  } else {
    body = [
      `import { useMemo } from 'react'`,
      '',
      `const PATTERN = /${pattern}/${vf};`,
      '',
      `// ${comment(mode)}`,
      `export function useIsValid(value: string): boolean {`,
      `  return useMemo(() => PATTERN.test(value), [value]);`,
      `}`,
    ].join('\n')
  }
  return { code: body, prism: 'jsx', warnings: droppedGlobalNote(flags) }
}

function genPython(input: CodegenInput): Snippet {
  const { pattern, flags, mode, stripPattern } = input
  const warnings: Warning[] = []
  const parts: string[] = []
  if (flags.i) parts.push('re.I')
  if (flags.m) parts.push('re.M')
  if (flags.s) parts.push('re.S')
  const flagArg = parts.length ? `, ${parts.join(' | ')}` : ''
  if (flags.g) {
    warnings.push({ level: 'note', text: 'Python has no g/y flags — they were omitted (re.sub already replaces all).' })
  }

  let body: string
  if (mode === 'clean') {
    body = [
      `import re`,
      '',
      `pattern = re.compile(${pyString(stripPattern || pattern)}${flagArg})`,
      '',
      `# ${comment('clean')}`,
      `def clean(value: str) -> str:`,
      `    return pattern.sub('', value)`,
    ].join('\n')
  } else {
    body = [
      `import re`,
      '',
      `pattern = re.compile(${pyString(pattern)}${flagArg})`,
      '',
      `# ${comment(mode)}`,
      `def is_valid(value: str) -> bool:`,
      `    return pattern.search(value) is not None`,
    ].join('\n')
  }
  return { code: body, prism: 'python', warnings }
}

function genPhp(input: CodegenInput): Snippet {
  const { pattern, flags, mode, stripPattern } = input
  const warnings: Warning[] = []
  let mods = ''
  if (flags.i) mods += 'i'
  if (flags.m) mods += 'm'
  if (flags.s) mods += 's'
  if (flags.u) mods += 'u'
  if (flags.g) {
    warnings.push({ level: 'note', text: 'PHP has no g/y modifiers here — preg_match is single, preg_replace already replaces all.' })
  }

  let body: string
  if (mode === 'clean') {
    body = [
      `<?php`,
      `$pattern = '/${phpSingle(stripPattern || pattern)}/${mods}';`,
      '',
      `// ${comment('clean')}`,
      `function clean(string $value): string {`,
      `    return preg_replace($pattern, '', $value);`,
      `}`,
    ].join('\n')
  } else {
    body = [
      `<?php`,
      `$pattern = '/${phpSingle(pattern)}/${mods}';`,
      '',
      `// ${comment(mode)}`,
      `function is_valid(string $value): bool {`,
      `    return preg_match($pattern, $value) === 1;`,
      `}`,
    ].join('\n')
  }
  return { code: body, prism: 'php', warnings }
}

function genJava(input: CodegenInput): Snippet {
  const { pattern, flags, mode, stripPattern } = input
  const opts: string[] = []
  if (flags.i) opts.push('Pattern.CASE_INSENSITIVE')
  if (flags.m) opts.push('Pattern.MULTILINE')
  if (flags.s) opts.push('Pattern.DOTALL')
  if (flags.u) opts.push('Pattern.UNICODE_CASE')
  const optArg = opts.length ? `, ${opts.join(' | ')}` : ''

  let body: string
  if (mode === 'clean') {
    body = [
      `import java.util.regex.Pattern;`,
      `import java.util.regex.Matcher;`,
      '',
      `static final Pattern PATTERN = Pattern.compile("${dq(stripPattern || pattern)}"${optArg});`,
      '',
      `// ${comment('clean')}`,
      `static String clean(String value) {`,
      `    return PATTERN.matcher(value).replaceAll("");`,
      `}`,
    ].join('\n')
  } else {
    body = [
      `import java.util.regex.Pattern;`,
      '',
      `static final Pattern PATTERN = Pattern.compile("${dq(pattern)}"${optArg});`,
      '',
      `// ${comment(mode)}`,
      `static boolean isValid(String value) {`,
      `    return PATTERN.matcher(value).find();`,
      `}`,
    ].join('\n')
  }
  return { code: body, prism: 'java', warnings: [] }
}

function genGo(input: CodegenInput): Snippet {
  const { pattern, flags, mode, stripPattern, hasLookaround } = input
  if (hasLookaround) {
    return {
      code: '',
      prism: null,
      warnings: [
        {
          level: 'blocker',
          text: "Go's RE2 engine has no lookahead — “must contain” / “not allowed” rules can't compile here. Validate those parts with a separate string check in Go.",
        },
      ],
    }
  }
  // RE2 has no flags argument — use inline flags at the front.
  let inline = ''
  if (flags.i) inline += 'i'
  if (flags.m) inline += 'm'
  if (flags.s) inline += 's'
  const prefix = inline ? `(?${inline})` : ''
  const src = goString(prefix + (mode === 'clean' ? stripPattern || pattern : pattern))
  const warnings: Warning[] = src.note ? [{ level: 'note', text: src.note }] : []

  let body: string
  if (mode === 'clean') {
    body = [
      `package main`,
      '',
      `import "regexp"`,
      '',
      `var pattern = regexp.MustCompile(${src.text})`,
      '',
      `// ${comment('clean')}`,
      `func Clean(value string) string {`,
      `\treturn pattern.ReplaceAllString(value, "")`,
      `}`,
    ].join('\n')
  } else {
    body = [
      `package main`,
      '',
      `import "regexp"`,
      '',
      `var pattern = regexp.MustCompile(${src.text})`,
      '',
      `// ${comment(mode)}`,
      `func IsValid(value string) bool {`,
      `\treturn pattern.MatchString(value)`,
      `}`,
    ].join('\n')
  }
  return { code: body, prism: 'go', warnings }
}

function genCSharp(input: CodegenInput): Snippet {
  const { pattern, flags, mode, stripPattern } = input
  const opts: string[] = []
  if (flags.i) opts.push('RegexOptions.IgnoreCase')
  if (flags.m) opts.push('RegexOptions.Multiline')
  if (flags.s) opts.push('RegexOptions.Singleline')
  const optArg = opts.length ? `, ${opts.join(' | ')}` : ''

  let body: string
  if (mode === 'clean') {
    body = [
      `using System.Text.RegularExpressions;`,
      '',
      `static readonly Regex pattern = new Regex(@"${csVerbatim(stripPattern || pattern)}"${optArg});`,
      '',
      `// ${comment('clean')}`,
      `static string Clean(string value) => pattern.Replace(value, "");`,
    ].join('\n')
  } else {
    body = [
      `using System.Text.RegularExpressions;`,
      '',
      `static readonly Regex pattern = new Regex(@"${csVerbatim(pattern)}"${optArg});`,
      '',
      `// ${comment(mode)}`,
      `static bool IsValid(string value) => pattern.IsMatch(value);`,
    ].join('\n')
  }
  return { code: body, prism: 'csharp', warnings: [] }
}

function genRuby(input: CodegenInput): Snippet {
  const { pattern, flags, mode, stripPattern } = input
  const warnings: Warning[] = []
  // Ruby: /i case-insensitive, /m means DOTALL (JS `s`). ^/$ are already per-line.
  let mods = ''
  if (flags.i) mods += 'i'
  if (flags.s) mods += 'm'
  if (flags.m) {
    warnings.push({ level: 'note', text: 'In Ruby, ^ and $ already match at line breaks — no separate multiline flag is needed.' })
  }

  let body: string
  if (mode === 'clean') {
    body = [
      `PATTERN = /${stripPattern || pattern}/${mods}`,
      '',
      `# ${comment('clean')}`,
      `def clean(value)`,
      `  value.gsub(PATTERN, '')`,
      `end`,
    ].join('\n')
  } else {
    body = [
      `PATTERN = /${pattern}/${mods}`,
      '',
      `# ${comment(mode)}`,
      `def valid?(value)`,
      `  PATTERN.match?(value)`,
      `end`,
    ].join('\n')
  }
  return { code: body, prism: 'ruby', warnings }
}

function genPatternOnly(input: CodegenInput): Snippet {
  const { pattern, flags } = input
  const f = flagsToString(flags)
  const code = f ? `${pattern}\n\nflags: ${f}` : pattern
  return { code, prism: null, warnings: [] }
}

// --- entry point ------------------------------------------------------------

export function generate(langId: string, input: CodegenInput): Snippet {
  switch (langId) {
    case 'javascript':
      return genJavaScript(input, false)
    case 'typescript':
      return genJavaScript(input, true)
    case 'react':
      return genReact(input)
    case 'python':
      return genPython(input)
    case 'php':
      return genPhp(input)
    case 'java':
      return genJava(input)
    case 'go':
      return genGo(input)
    case 'csharp':
      return genCSharp(input)
    case 'ruby':
      return genRuby(input)
    default:
      return genPatternOnly(input)
  }
}
