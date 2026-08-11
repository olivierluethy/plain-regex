// Optional AI assist. The app works fully without a key; AI only translates
// natural language ↔ our AST. Its output is ALWAYS parsed as JSON, validated
// against the AST schema (normalizeAst), and routed through our own compiler,
// so explanation and examples stay consistent. We never accept raw regex.

import type { AiProvider } from '@/store/types'

const SCHEMA_DOC = `You output a JSON object describing a text-matching rule as an AST.
The ROOT must be: { "type": "sequence", "children": [ ...nodes ] }.

Node types (each is a JSON object with a "type" field):
- { "type": "literal", "text": "abc" }  — exact text, matched literally (never write regex; just the plain text).
- { "type": "charType", "kind": K, "negated": false }  — K is one of: "any","digit","letter","letterOrDigit","wordChar","whitespace","punctuation". negated is optional.
- { "type": "oneOf", "chars": "abc" }  — matches any one of these characters.
- { "type": "noneOf", "chars": "abc" }  — matches any character NOT in this set.
- { "type": "sequence", "children": [ ... ] }  — a run of nodes in order.
- { "type": "choice", "options": [ ... ] }  — matches any one of the option nodes ("A or B").
- { "type": "repeat", "child": NODE, "preset": P, "min": N, "max": M }  — P is one of "optional","oneOrMore","zeroOrMore","exactly","atLeast","between". For "exactly"/"atLeast" set min. For "between" set min and max. max may be null.
- { "type": "group", "children": [ ... ], "capture": false, "name": "optional" }  — bundle nodes; set capture true to keep this part.
- { "type": "anchor", "kind": "start" }  — kind is "start" (start of text), "end" (end of text), or "wordBoundary".
- { "type": "contains", "child": NODE }  — the text must contain this somewhere.
- { "type": "capture", "child": NODE, "name": "optional" }  — a kept/captured part.
- { "type": "strip", "child": NODE }  — a part to remove.

Rules:
- Output ONLY the JSON object. No prose, no markdown fences, no regex.
- Prefer anchors ("start"/"end") when the whole string should match.
- Use "literal" for fixed text; never escape characters yourself.`

export interface AiResult {
  ok: boolean
  ast?: unknown
  error?: string
}

const MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-2.0-flash',
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o-mini',
}

/** Pull a JSON object out of a model response that may include fences or prose. */
function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const first = trimmed.indexOf('{')
    const last = trimmed.lastIndexOf('}')
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1))
    }
    throw new Error('The AI response was not valid JSON.')
  }
}

async function callGemini(key: string, system: string, user: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    },
  )
  if (!res.ok) throw new Error(await readError(res))
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function callAnthropic(key: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODELS.anthropic,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = await res.json()
  const block = (data?.content ?? []).find((b: { type: string }) => b.type === 'text')
  return block?.text ?? ''
}

async function callOpenAI(key: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODELS.openai,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    const msg = body?.error?.message ?? body?.error?.type ?? body?.message
    return `${res.status}: ${msg ?? res.statusText}`
  } catch {
    return `${res.status}: ${res.statusText}`
  }
}

function call(provider: AiProvider, key: string, system: string, user: string): Promise<string> {
  if (provider === 'gemini') return callGemini(key, system, user)
  if (provider === 'anthropic') return callAnthropic(key, system, user)
  return callOpenAI(key, system, user)
}

/** "Describe what you want" → AST. */
export async function describeToAst(
  provider: AiProvider,
  key: string,
  description: string,
): Promise<AiResult> {
  try {
    const user = `Build a rule that matches: ${description}`
    const text = await call(provider, key, SCHEMA_DOC, user)
    return { ok: true, ast: extractJson(text) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** "Refine" — apply an instruction to the current AST, returning a new AST. */
export async function refineAst(
  provider: AiProvider,
  key: string,
  currentAst: unknown,
  instruction: string,
): Promise<AiResult> {
  try {
    const user = `Here is the current rule as JSON:\n${JSON.stringify(currentAst)}\n\nApply this change and return the full updated rule JSON: ${instruction}`
    const text = await call(provider, key, SCHEMA_DOC, user)
    return { ok: true, ast: extractJson(text) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const AI_MODELS = MODELS
