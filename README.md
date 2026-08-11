# PlainRegex

**Build regular expressions from what you mean, never from syntax.**

PlainRegex turns plain-language building blocks into a correct regular expression — and
now works the other way too: paste a regex you found and it becomes editable blocks you can
read, change and learn from. Everything runs in your browser; nothing is sent anywhere
unless you explicitly turn on AI assist.

---

## What it does

- **Build from meaning.** Compose a rule out of friendly blocks (a letter, a digit, exact
  text, "one of these", "must contain", "not allowed", groups, choices, repeats, anchors…).
  The live `/pattern/flags` bar, plain-English explanation and worked examples all update
  together.
- **Build from an example.** Paste a sample value, select part of it, and pick what that
  part should mean — the selection becomes a block.
- **Paste a regex (import).** Paste a `/pattern/flags` literal or a bare pattern and choose
  **Replace** or **Append**. It’s parsed with a real engine and mapped back into editable
  blocks, so you can understand and modify a pattern from anywhere. Constructs with no
  friendly equivalent (lookbehind, back-references, lazy quantifiers, `\p{…}`) survive as
  **raw blocks** that still compile and round-trip — nothing is lost.
- **Test & explain.** Test a whole corpus line-by-line or as one text, or probe a single
  value in **Quick check**. A pass shows a **part-by-part breakdown** — which block matched
  which characters, in order — hover-linked to the blocks and the REGEX segments. A failure
  names the first condition that broke and what would satisfy it.
- **Use it in your code.** Copy-ready snippets in several languages, with warnings when a
  target engine can’t express part of the pattern (e.g. lookaround on Go/RE2).
- **History.** Every edit is auto-recorded to a right-side drawer with timestamps, a
  pass↔fail diff between versions, and one-click restore.
- **URL mode** and optional **AI assist** for scaffolding rules.

All state persists to `localStorage`. There is no account and no backend.

---

## Tech stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** (design tokens driven by CSS custom properties; light/dark via a `.dark`
  class)
- **Zustand** (with `persist`) for state
- **@eslint-community/regexpp** to parse pasted regexes
- **Prism** for on-palette code highlighting
- Self-hosted fonts via **@fontsource** (Space Grotesk / Inter / JetBrains Mono)

---

## Architecture

The **Rule AST** (`src/core/types.ts`) is the single source of truth. It’s a plain,
serializable discriminated union of nodes. Everything else is a *projection* of that tree,
produced by pure functions:

| Concern              | Module              | Direction        |
| -------------------- | ------------------- | ---------------- |
| Blocks → regex       | `core/compile.ts`   | AST → pattern    |
| Regex → blocks       | `core/import.ts`    | pattern → AST    |
| Plain English        | `core/explain.ts`   | AST → prose      |
| Worked examples      | `core/examples.ts`  | AST → strings    |
| Value probing / trace| `core/check.ts`     | AST + value → result |
| History labels/diff  | `core/label.ts`     | AST × AST → text |

The importer is the inverse of the compiler: it maps the `regexpp` AST onto Rule nodes where
a faithful friendly equivalent exists, and falls back to a `raw` node (verbatim source)
otherwise, so an imported pattern always compiles to an equivalent regex.

State and editing operations live in `src/store/useStore.ts`; UI is in `src/components/`,
with reusable primitives in `src/ui/`.

The visual system is documented in **[`docs/STYLEGUIDE.md`](docs/STYLEGUIDE.md)** and is the
single source of truth for colour, type, spacing and layout.

---

## Development

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build
npm run typecheck
```

---

## Privacy

PlainRegex is fully client-side. Your rules, sample values and test corpus never leave the
browser. The only network activity is optional AI assist, which you turn on yourself and
which uses your own API key.
