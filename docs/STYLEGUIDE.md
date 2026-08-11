# PlainRegex — Style Guide

The single source of truth for the visual system. Every feature must look like it was
always part of the product. Colours and typography defined here do not change.

> **Density revision (v2).** The palette, dark theme, brand identity and component
> language below are unchanged. What changed in this revision is **scale**: a tighter
> type ramp, smaller controls, reduced section padding, a **full-width** app layout that
> spends the old left/right gutters, and an **inner-scroll panel** pattern so long result
> lists scroll inside their panel instead of growing the page. Sections 3, 4, 5, 8 and the
> new section 14 carry the denser tokens; they supersede the earlier sizing.

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

### Scale (rem, 16px base) — denser v2 ramp

The base body size is **15px** (`0.9375rem`). The ramp is tuned for information density:
compact enough to fit a full workspace without page-scrolling, still legible and
accessible. `body`/`body-sm` are now **real tokens** (previously undefined, so those
classes were no-ops that fell back to 16px) — defining them is what densifies running text.

| Name        | Size / line-height | Weight | Role    | Use                          |
| ----------- | ------------------ | ------ | ------- | ---------------------------- |
| `display`   | 2.0 / 1.1          | 700    | Display | Hero wordmark                |
| `h1`        | 1.375 / 1.2        | 600    | Display | Page/section title           |
| `h2`        | 1.0625 / 1.25      | 600    | Display | Panel title                  |
| `h3`        | 0.9375 / 1.35      | 600    | Display | Sub-panel                    |
| `body`      | 0.9375 / 1.5       | 400    | Body    | Default text                 |
| `body-sm`   | 0.8125 / 1.45      | 400    | Body    | Secondary                    |
| `label`     | 0.6875 / 1.3       | 600    | Body    | Uppercase eyebrows (tracked) |
| `mono`      | 0.875 / 1.5        | 500    | Mono    | Regex & tokens               |
| `mono-sm`   | 0.78 / 1.5         | 500    | Mono    | Inline tokens                |

Eyebrow labels: `letter-spacing: 0.08em`, `text-transform: uppercase`, `--ink-muted`.
On phones (`sm` and below) headings step down one rung (e.g. panel titles read as `h3`).

---

## 4. Spacing, radius, shadow

**Spacing scale** (Tailwind default 4px step) — denser v2. Panels are tight but not
cramped: **section/column gaps `16px`** (`12px` on mobile), **panel padding `12–16px`**
(`px-4 py-3`), control gaps `6–8px`. The old `20–32px` rhythm is retired — it wasted
vertical space and forced page-scrolling.

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
- Sizes (denser v2): sm (h 28), md (h 34), lg (h 40). Icon buttons square. Inputs use
  `py-1.5`. Touch targets on mobile stay ≥ 40px via full-width buttons (see §8).

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

## 8. Layout — full-width v2

- **Workspace:** near-full-width, `max-width 1720px`, centred, `24px` gutters (`16px` on
  mobile). The old `1400px` cap left wide empty gutters on desktop — retired.
- **Desktop columns:**
  - `≥1536px` (2xl): **three columns.** Col 1 build + explanation; col 2 build-from-example,
    test corpus, quick check; col 3 examples + code export. This is what spends the reclaimed
    gutters — each panel is comfortably wide, nothing is stretched.
  - `1024–1535px` (lg/xl): **two columns** (build/explanation/examples · sample/test/quick/code).
  - `<1024px`: **single column**, panels stack in priority order.
- **Full-width strips:** URL mode, AI assist and **Paste-a-regex import** span the full width
  above the columns when open, so a whole-app action reads as global.
- **Header:** wordmark left; Simple/Advanced toggle, theme toggle, rules menu, settings right.
- Content never exceeds viewport width; wide regex/code scrolls inside its own
  `overflow-x:auto` container. Long lists scroll **inside their panel** (see §14).

### Mobile density (`sm` and below)

Concrete rules applied at `sm` and below, logic unchanged: reduce section vertical padding
(`py-3`), scale decorative icons down (`h-16` → `h-12`), step headings down one rung
(`h2` → `h3`), body drops to `body-sm`, tighten grid/flex gaps (`gap-4` → `gap-3`), and make
primary buttons `w-full` for thumb reach (`w-auto` from `sm:` up). Keep the layout functional,
never stretched.

---

## 9. Voice & copy

- Plain verbs, sentence case, no jargon in Simple mode (the word "regex" never appears there).
- Buttons name the action: "Add rule", "Copy pattern", "Restore this version".
- Empty states invite action: "Paste a URL or some sample text to begin."
- Errors are specific and calm: "That doesn't look like a URL yet — need a scheme like https://".
- Green/red columns are labelled "These would match" / "These would not match".

---

## 10. Selection & direct-manipulation surfaces

These extend the existing system for the reverse (select-to-rule) workflow, drag reordering,
single-value probing and exclusion rules. **They reuse existing tokens only** — indigo `--brand`
for build/selection, `--pass`/`--fail` reserved for allowed/rejected, existing radii/shadows.

**Selectable example surface (Build from example).** A `--surface` well (radius `lg`, `1px --border`)
holding one sample value in **mono** (`mono` size), `user-select: text`, comfortable `1.7`
line-height so spans are easy to grab. Already-marked spans get a persistent `--brand-tint` background
with a `1px` `--brand`/30 underline (they read as chips baked into the text). Hover over the surface
shows `cursor: text`.

**Selection popover.** Same shell as the existing `Popover`/`Modal` (radius `lg`, `--surface`,
`shadow-lg`, `1px --border`), but **anchored to the selected span** via fixed positioning at the
selection's bounding rect (above the span, or below if it would clip the top). Header: an eyebrow
label showing the selected text in mono, truncated. Body: a vertical list of plain-language intent
buttons (same styling as segmented-list option buttons — `--surface-2` hover, `--brand-tint` +
`--brand` when it's the recommended/primary intent). A faint caret/triangle (6px) points at the span.

**Drag handle & drop indicator (BUILD).** Each reorderable chip gains a **grip handle** on its left:
a 6-dot grip glyph in `--ink-faint`, `cursor: grab` (→ `grabbing` while dragging), `20px` wide, only
visible/emphasised on hover or focus of the slot (keep chips calm at rest). The dragged chip lifts:
`shadow-md`, `--surface` background, slight scale, `opacity: 0.9`. The **drop indicator** is a
`2px` vertical bar in `--brand` (radius `full`) rendered in the gap the chip would land in. Reduced
motion: no scale/lift, just the drop bar and an instant reorder.

**Quick-check verdict.** A single-line mono input (same `.input` treatment) with an inline verdict
pill to its right: **Allowed** uses `--pass` text on `--pass-tint`, a ✓ badge; **Rejected** uses
`--fail` on `--fail-tint`, a ✗ badge; empty/❓ state is `--ink-faint` on `--surface-2`. Below the
input, one calm sentence in `body-sm` `--ink-muted` names the part that matched or failed
(e.g. "Rejected — after "alice", expected the exact text "@"."). Never shows regex.

**Cleaned-output preview.** When a strip/exclude rule exists, show a labelled row (eyebrow
"Cleaned result") with the original value struck/tinted where removed and the cleaned string in mono
on a `--surface-2` inset. The removed span is shown in `--fail` with a strike-through; the kept text
in `--ink`. Copy button reuses the existing ghost `Copy` control.

**Voice for the new surfaces:**
- Selection intents are verbs the user recognises: "Match this exactly", "Any letters like this",
  "Allow anything here", "Make this optional", "Must contain this", "Strip this out", "Forbid this".
- Rejected reasons are specific and blame the rule, not the user: "Rejected — "!" is not allowed here."
- Exclusion label: "Cleaned result" with the stripped span called out.

---

## 11. Regex output & code export

Extends the system so the user can get the pattern out. **Reuses existing tokens** — mono for code,
`--brand` for the active tab, `--warn` for unsupported-target notices, existing copy affordance.

**Regex bar (always visible, both modes).** A single mono row at the top of the BUILD panel body:
`/pattern/flags` in `mono` size on a `--surface-2` inset (radius `md`, `1px --border`), the `/`…`/`
delimiters and flags in `--ink-faint`, the pattern body in `--ink`. Wide patterns scroll inside their
own `overflow-x:auto` container — the row never widens the panel. A ghost **Copy** button (existing
`Copy`/`Check` swap) sits at the right. On a compile error the row shows the message in `--fail`.

**Code block.** `--surface-2` background (a touch deeper than the page), radius `lg`, `1px --border`,
`mono-sm`, `1.6` line-height, `16px` padding, `overflow-x:auto` with the thin scrollbar. Syntax colours
come from Prism classes mapped to our tokens (defined once in `index.css`), so highlighting matches the
palette in light and dark — never an off-palette Prism theme:
- comments → `--ink-faint`; keywords/operators → `--brand`; strings/regex → `--pass`;
  functions/class-names → `--ink` (semibold); numbers/booleans → `--warn`; punctuation → `--ink-muted`.

**Language tabs.** A horizontal, scrollable row of small tab buttons above the code block (same metrics
as the segmented control). Inactive: `--ink-muted`, hover `--surface-2`. Active: `--ink` with a `2px`
`--brand` underline (radius `full`) and `--surface` fill. JavaScript is first/default. The tab row
scrolls horizontally on narrow screens; it never wraps mid-tab.

**Copy affordances.** Two: **Copy code** (primary ghost button on the code block header) and **Copy
pattern** (secondary, in the panel header) — both use the existing copied-state swap (Copy → Check,
"Copied" for ~1.4s).

**Inline warning banner.** When the active target can't compile the current pattern (e.g. lookaround on
Go/RE2) or a flag has no equivalent, show a banner above the code: `--warn` text/icon on a faint
`--warn`/`--fail`-tinted row (radius `md`, `1px` tinted border). A **blocker** (no valid code) replaces
the snippet with the banner; a **note** (e.g. a dropped `g` flag) sits above the still-valid snippet.

**Voice:** "Use it in your code". Buttons: "Copy code", "Copy pattern". Warnings name the limitation and
the fix: "Go's RE2 engine has no lookahead — 'must contain' / 'not allowed' rules can't compile here."

---

## 12. Explanations, rule↔text linking & onboarding

Extends the system to connect rules to the tested text and explain outcomes. **Reuses existing tokens.**

**Per-result reason (why matched / why not).** Each test row and the Quick check expose a one-line
reason and expand (click) to detail. Pass reasons use `--pass`; fail reasons use `--fail`, name the
**first failing condition**, and end with what would satisfy it. The callout is a tinted row (radius `md`,
`--pass-tint` / `--fail-tint`, matching left border 2px) holding the reason in `body-sm` and, below it, the
value re-rendered with **character highlights**: the matched prefix in `--pass-tint`, the exact failure
point in `--fail` (bg `--fail-tint`, weight 600), untouched tail in `--ink-muted`.

**Character ↔ block highlight.** Inside any rendered value (Sample value, matched corpus lines, matching
examples), a span governed by a specific block is tinted `--brand-tint`. When a BUILD block is hovered,
the span it governs gets a stronger cue: `--brand` text on `--brand-tint` with a `1px --brand` ring
(radius `sm`). Hover is a two-way link — hovering the span and hovering the block both light the pair.
Reduced motion: no transition, just the colour change.

**Block tooltip.** Hovering a block shows its plain effect ("requires one or more digits here") — a small
`--surface` tooltip (radius `md`, `shadow-md`, `1px --border`, `body-sm`) or the native title, anchored
under the chip. Never shows regex in Simple mode.

**Sample-value rule popover (inspect / remove).** Hovering a marked span in the Sample value raises a
popover (existing Popover shell) listing the governing rule(s) in plain English, each with a small
**Remove** control (danger-ghost: `--fail` text, `--fail-tint` hover). Removing updates blocks, regex,
examples, tests and history.

**Diagnostic banner (unsatisfiable rule).** When no value can match, the examples "would match" column is
replaced by a diagnostic: `--warn` icon + text on a faint `--warn`-tinted row (radius `md`, `1px` tinted
border), naming the conflicting constraints ("requires 'c' but forbids 'example' — no value satisfies all").

**Onboarding hints.** Unobtrusive, dismissible. A per-panel one-line hint sits under the panel title in
`body-sm --ink-muted`, prefixed by a small `--brand` dot. A first-run explainer is a dismissible card
(`--surface`, `1px --border`, radius `lg`) with the 4-step flow; dismissal persists in `localStorage`.
Empty states already invite action — keep them, add a hint only where the next action isn't obvious.

**Voice:** reasons are specific and blame the rule ("No match — needs a “c” somewhere, but there is
none"). Hints are short imperatives ("Select part of the value to turn it into a rule").

---

## 13. Deletion, drag confidence, traceable regex & History drawer

Extends the system for control and traceability. **Reuses existing tokens.**

**Clear all / Reset.** A ghost/secondary button in the BUILD header (danger-ghost: `--fail` text,
`--fail-tint` hover) with a **lightweight inline confirm** — a small `Popover` reading "Clear all
blocks?" with Cancel (secondary) + Clear (danger). Never a native `confirm()`. It is undoable.

**Block selection (multi-delete).** A selected block shows a `2px --brand` ring (radius `md`) and a
faint `--brand-tint` wash — the same cue whether one or several are selected. A slim selection toolbar
appears in the BUILD header when ≥1 is selected: "N selected · Delete · Clear" (`body-sm`, Delete in
danger-ghost). Plain click selects one (and still opens its editor); ⌘/Ctrl-click toggles; Shift-click
ranges; Delete/Backspace removes all selected; Esc clears. Keyboard hint sits under the canvas.

**Drag insertion indicator.** While dragging: the source block dims to `opacity: 0.3` in place
(a placeholder), a `DragOverlay` ghost (existing OverlayChip, lifted `shadow-md`) follows the cursor,
and a **`3px --brand` vertical bar** (radius `full`, `~28px` tall) marks the exact gap the block will
drop into. The bar is the promise "it lands here". Reduced motion: no lift/scale, bar + instant reflow.

**Traceable REGEX bar.** The pattern renders as **hoverable segments**, one per top-level block, in the
same mono type. At rest they read as one continuous pattern (no chrome). On hover a segment gets
`--brand-tint` bg + `--brand` text (radius `sm`); simultaneously the matching BUILD block rings and the
matching IN-PLAIN-ENGLISH step tints — all driven by the shared `hoveredNodeId`, so the link fires from
any of the three surfaces. The `/`…`/` delimiters and flags stay `--ink-faint`. A **Step-through**
control (‹ Prev · "3 / 7" · Next ›, small secondary buttons) walks the pattern left→right; the active
segment is emphasised everywhere and a one-line "what happens here" note (`body-sm --ink-muted`,
`--brand` dot) sits under the bar.

**IN-PLAIN-ENGLISH step highlight.** Each numbered step is hoverable and, when its block is the active/
hovered node, its number badge fills `--brand`/white and the row tints `--brand-tint` — the reverse
link back to the regex segment and block.

**History drawer.** Opening History slides a panel in from the **right** (fixed, `--surface`, `1px
--border` left edge, `shadow-lg`, width ~420px, full height, scrolls internally) over a `--ink/40`
scrim — so it appears immediately, never off-screen below the fold. Header: "History" + close. Body: a
newest-first vertical rail of snapshots (existing dot-rail styling) each with time (`mono-sm --ink-
muted`), an auto-label, a **Restore** button, and, expanded under the selected entry, the pass↔fail
diff vs the previous snapshot (existing green/red diff columns). The **current** entry is marked "now".
Empty/near-empty state: "Your changes are saved here automatically as you edit — no setup needed."
Mobile: the drawer becomes full-width.

**Voice:** "Clear all", "Delete", "Restore", "Step through the pattern". History empty state reassures
it is automatic: "Saved automatically as you edit."

---

## 14. Inner-scroll panels, regex import & the match breakdown (v2)

Extends the system for the density revision. **Reuses existing tokens.**

**Inner-scroll panel.** A panel whose body can grow unbounded (Test corpus results, Examples
columns, Code snippet, the rules list) caps its scrolling region with `max-height` + `overflow-y:auto`
and the existing `.scroll-thin` thumb, so the panel header and the page stay put. Only the *long*
region scrolls — inputs, toggles and summaries above it remain visible. Caps sit around `44–52vh`
so several panels coexist on one screen. The scroll region always paints an explicit token bg.

**Raw-regex block (import escape hatch).** A construct with no friendly equivalent survives as a
**raw block**: a `mono-sm` chip on `--surface-2` with a `1px --border-strong` (dashed) edge and a
small `‹ ›`/`.*` glyph in `--ink-faint`, so it reads as "verbatim pattern", visibly distinct from the
indigo meaning-chips. It round-trips and compiles unchanged; its popover holds the raw source in a
mono input and a one-line best-effort note. Never green/red — it carries no pass/fail meaning.

**Paste-a-regex import.** A full-width strip (same shell as URL mode) with: a mono input accepting a
`/pattern/flags` literal or a bare pattern; **Replace** (primary) and **Append** (secondary) actions;
and, on bad input, one calm `--fail`-tinted line naming the problem ("That isn't a valid regex —
unbalanced `(`."). On success it rebuilds blocks, the REGEX bar, explanation, examples, tests and
Quick check, and logs a History snapshot "Imported a regex". A short hint sits under the title
("Paste a regex you found — we'll turn it into editable blocks.").

**Match breakdown (deeper "Why?").** A passing value's reason is no longer one generic sentence. It
is a **part-by-part list**, in pattern order, each row: a `mono-sm` chip of the exact characters that
matched (`--pass-tint` bg, `--pass` text) — or a zero-width marker "✓ start of text" for anchors /
"must contain" / "not allowed" — followed by the plain-English rule that governed it (`body-sm`). Each
row is hover-linked to its block via the shared `hoveredNodeId` (same two-way highlight as §12), so
hovering a row lights the block, the REGEX segment and the character span together. A one-line summary
sits above ("Allowed — all N parts matched, in order."). No-match keeps the first-failing-condition
detail from §12. **Trivial/empty rules read sensibly** — an empty rule says "This rule is empty, so it
accepts any value," never "matches every part"; an all-empty choice says "an empty choice — fill in the
options," never "either nothing or nothing."
