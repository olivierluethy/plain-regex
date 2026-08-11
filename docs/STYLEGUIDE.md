# PlainRegex — Style Guide

The single source of truth for the visual system. Every feature must look like it was
always part of the product. Colours and typography defined here do not change.

---

## 1. Design thesis

Regex is cryptic; PlainRegex is the opposite. The product turns *meaning* into a pattern,
so the interface must read as **calm, precise, and legible** — a well-lit instrument bench
for language, not a code editor.

Two ideas carry the personality:

1. **Semantic truth is a colour.** Green means *pass*, red means *fail*. These two hues are
   **reserved** — they never decorate, they only ever mean "this matches" / "this does not".
2. **Build is a different colour.** All interactive/brand accents use **indigo**, kept
   distinct from green/red so the semantic language is never diluted.

Signature element: plain-language **chips** that visibly compile into a pattern, flanked by
always-live **green "would match" / red "would not match"** columns.

---

## 2. Colour tokens

Defined as CSS custom properties on `:root` (light) and `.dark` (dark). Tailwind consumes
them via `rgb(var(--token) / <alpha>)`. All values are stored as space-separated RGB triplets.

### Light (default)

| Token             | RGB            | Hex        | Use                                   |
| ----------------- | -------------- | ---------- | ------------------------------------- |
| `--bg`            | `247 248 251`  | `#F7F8FB`  | App background (cool near-white)      |
| `--surface`       | `255 255 255`  | `#FFFFFF`  | Cards, panels                         |
| `--surface-2`     | `242 244 249`  | `#F2F4F9`  | Insets, wells, hover fills            |
| `--ink`           | `26 29 41`     | `#1A1D29`  | Primary text                          |
| `--ink-muted`     | `91 97 114`    | `#5B6172`  | Secondary text, labels                |
| `--ink-faint`     | `140 146 162`  | `#8C92A2`  | Placeholder, disabled                 |
| `--border`        | `226 230 239`  | `#E2E6EF`  | Hairline borders                      |
| `--border-strong` | `205 211 224`  | `#CDD3E0`  | Emphasised borders, dividers          |
| `--brand`         | `91 84 232`    | `#5B54E8`  | Interactive accent (indigo)           |
| `--brand-strong`  | `67 60 200`    | `#433CC8`  | Hover/active accent                   |
| `--brand-tint`    | `237 236 253`  | `#EDECFD`  | Chip fills, accent backgrounds        |
| `--pass`          | `22 163 74`    | `#16A34A`  | **Reserved** — matches / valid        |
| `--pass-tint`     | `223 244 230`  | `#DFF4E6`  | Pass backgrounds                      |
| `--fail`          | `220 38 38`    | `#DC2626`  | **Reserved** — no match / invalid     |
| `--fail-tint`     | `250 228 228`  | `#FAE4E4`  | Fail backgrounds                      |
| `--warn`          | `194 120 3`    | `#C27803`  | Cautions, "needs a key"               |

### Dark

| Token             | RGB            | Hex        |
| ----------------- | -------------- | ---------- |
| `--bg`            | `14 16 23`     | `#0E1017`  |
| `--surface`       | `23 26 36`     | `#171A24`  |
| `--surface-2`     | `31 35 48`     | `#1F2330`  |
| `--ink`           | `232 234 242`  | `#E8EAF2`  |
| `--ink-muted`     | `146 152 171`  | `#9298AB`  |
| `--ink-faint`     | `99 105 122`   | `#63697A`  |
| `--border`        | `38 43 57`     | `#262B39`  |
| `--border-strong` | `55 62 82`     | `#373E52`  |
| `--brand`         | `124 116 255`  | `#7C74FF`  |
| `--brand-strong`  | `151 145 255`  | `#9791FF`  |
| `--brand-tint`    | `36 36 66`     | `#242442`  |
| `--pass`          | `52 211 153`   | `#34D399`  |
| `--pass-tint`     | `18 45 38`     | `#122D26`  |
| `--fail`          | `248 113 113`  | `#F87171`  |
| `--fail-tint`     | `54 27 30`     | `#361B1E`  |
| `--warn`          | `234 179 8`    | `#EAB308`  |

**Rule:** green (`--pass`) and red (`--fail`) are *only* used for match/no-match truth.
Never use them for generic UI accents. Interactive elements use `--brand`.

---

## 3. Typography

Three roles. Loaded via `@fontsource` (self-contained, offline-friendly).

| Role    | Family           | Usage                                                        |
| ------- | ---------------- | ----------------------------------------------------------- |
| Display | **Space Grotesk**| Headings, wordmark, section titles. Weights 500/600/700.    |
| UI/Body | **Inter**        | All interface text, labels, paragraphs. Weights 400/500/600.|
| Mono    | **JetBrains Mono**| Regex output, tokens, code, URL parts. Weights 400/500/700. |

### Scale (rem, 16px base)

| Name        | Size / line-height | Weight | Role    | Use                          |
| ----------- | ------------------ | ------ | ------- | ---------------------------- |
| `display`   | 2.5 / 1.1          | 700    | Display | Hero wordmark                |
| `h1`        | 1.75 / 1.2         | 600    | Display | Page/section title           |
| `h2`        | 1.25 / 1.3         | 600    | Display | Panel title                  |
| `h3`        | 1.0625 / 1.4       | 600    | Display | Sub-panel                    |
| `body`      | 1.0 / 1.6          | 400    | Body    | Default text (large-ish)     |
| `body-sm`   | 0.875 / 1.5        | 400    | Body    | Secondary                    |
| `label`     | 0.8125 / 1.4       | 600    | Body    | Uppercase eyebrows (tracked) |
| `mono`      | 0.9375 / 1.5       | 500    | Mono    | Regex & tokens               |
| `mono-sm`   | 0.8125 / 1.5       | 500    | Mono    | Inline tokens                |

Eyebrow labels: `letter-spacing: 0.08em`, `text-transform: uppercase`, `--ink-muted`.
Body text is intentionally generous (16px+) — this is an accessibility-first tool.

---

## 4. Spacing, radius, shadow

**Spacing scale** (Tailwind default 4px step). Panels breathe: section gaps `24–32px`,
card padding `20–24px`, control gaps `8–12px`.

**Radius**

| Token   | px  | Use                          |
| ------- | --- | ---------------------------- |
| `sm`    | 6   | Inputs, small buttons        |
| `md`    | 10  | Chips, buttons               |
| `lg`    | 14  | Cards, panels                |
| `xl`    | 20  | Outer workspace containers   |
| `full`  | 999 | Pills, toggles               |

**Shadow** (soft, low-spread; dark theme leans on borders not shadows)

| Token       | Light                                             |
| ----------- | ------------------------------------------------- |
| `shadow-sm` | `0 1px 2px rgb(26 29 41 / 0.06)`                  |
| `shadow-md` | `0 4px 16px rgb(26 29 41 / 0.08)`                 |
| `shadow-lg` | `0 12px 40px rgb(26 29 41 / 0.12)`                |
| `shadow-focus` | `0 0 0 3px rgb(var(--brand) / 0.35)`          |

Borders are `1px solid rgb(var(--border))`. Emphasised dividers use `--border-strong`.

---

## 5. Components

**Chip (signature).** Pill, radius `md`, `--brand-tint` fill, `--brand` text, `1px` brand-tinted
border. Contains a plain-language label. Hover lifts fill; selected shows a filled indigo state.
A chip with a menu shows a small caret. Chips flow inline and wrap — reading like a sentence.

**Panel/Card.** `--surface`, radius `lg`, `1px --border`, `shadow-sm`. Header row: `h2`/`h3` title
left, optional controls right, then content. Optional eyebrow label above title.

**Buttons.**
- Primary: `--brand` fill, white text, radius `md`, `shadow-sm`; hover `--brand-strong`.
- Secondary: `--surface` fill, `1px --border-strong`, `--ink` text; hover `--surface-2`.
- Ghost: transparent, `--ink-muted` text; hover `--surface-2`.
- Danger-ghost: `--fail` text on hover fill `--fail-tint`.
- Sizes: sm (h 32), md (h 38), lg (h 44). Icon buttons square.

**Toggle / Segmented control.** Pill track `--surface-2`, active segment `--surface` with
`shadow-sm` and `--ink`. Used for Simple/Advanced and per-line/whole-text modes.

**Inputs / textarea.** `--surface`, `1px --border`, radius `sm`, focus ring `shadow-focus` +
`--brand` border. Mono textarea for sample text.

**Pass/Fail markers.** ✓ in `--pass`, ✗ in `--fail`, both in a small rounded square badge with
the matching tint background. Test lines: pass line gets a left border `2px --pass` + faint
`--pass-tint`; fail line `--fail` equivalents.

**Match highlight.** Inline `<mark>`: `--pass-tint` bg, `--pass` text weight 600, radius `sm`.
Capture groups get a slightly deeper underline in `--brand`.

**Example columns.** Two stacked/side-by-side lists. "Would match" header with ✓ badge in green,
items in mono on `--pass-tint`-edged rows. "Would not match" mirrored in red. Items animate a
subtle flip when they change state between snapshots.

**Timeline snapshot.** Row with timestamp (mono-sm, muted), auto-label (body-sm), and a dot on a
vertical rail (`--border-strong`). Selected snapshots for diff get a `--brand` ring.

---

## 6. Interactive states

- **Hover:** background shifts one step (`--surface` → `--surface-2`), 120ms ease.
- **Focus-visible:** always `shadow-focus` ring; never remove outlines. Keyboard-first.
- **Active/pressed:** translateY(1px) or brand-strong fill.
- **Selected:** filled brand state (chips), or surface+shadow (segmented).
- **Disabled:** `--ink-faint` text, `--surface-2` fill, no shadow, `cursor: not-allowed`.
- **Transitions:** 120–180ms `ease-out` for colour/shadow; 200–300ms for example flips.
- Respect `prefers-reduced-motion`: disable flips/transforms, keep instant state changes.

---

## 7. Theme handling

- Default follows `prefers-color-scheme`; user can override to light/dark; choice persists in
  `localStorage` (`plainregex.theme`).
- Dark mode is applied via `.dark` class on `<html>`. All colours come from tokens — no hard-coded
  hex in components.
- Every surface paints an explicit token background; never rely on inherited/transparent bg.

---

## 8. Layout

- **Workspace:** max-width `1400px`, centred, `24px` gutters (`16px` on mobile).
- **Desktop (≥1024px):** two-column workspace — builder + explanation on the left, test + examples
  on the right — under a full-width header. URL mode spans full width above the columns when active.
- **Tablet/mobile:** single column, panels stack in priority order: builder → explanation → test →
  examples → timeline. Chips wrap; segmented controls stay reachable.
- **Header:** wordmark left; Simple/Advanced toggle, theme toggle, rules menu, settings right.
- Touch targets ≥ 40px. Content never exceeds viewport width; wide regex/code scrolls inside its own
  `overflow-x:auto` container.

---

## 9. Voice & copy

- Plain verbs, sentence case, no jargon in Simple mode (the word "regex" never appears there).
- Buttons name the action: "Add rule", "Copy pattern", "Restore this version".
- Empty states invite action: "Paste a URL or some sample text to begin."
- Errors are specific and calm: "That doesn't look like a URL yet — need a scheme like https://".
- Green/red columns are labelled "These would match" / "These would not match".
