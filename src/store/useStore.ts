import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  autoLabel,
  cloneWithNewIds,
  DEFAULT_FLAGS,
  emptyRuleAst,
  insertChild,
  moveChild,
  newId,
  nodes,
  normalizeAst,
  removeNode,
  repeatBounds,
  replaceNode,
  updateNode,
} from '@/core'
import type { RegexFlags, RepeatPreset, RuleNode, SequenceNode } from '@/core'
import type {
  AiProvider,
  AiSettings,
  ExperienceLevel,
  Rule,
  Snapshot,
  TestMode,
  ThemePref,
} from './types'

const COALESCE_MS = 700

function now(): number {
  return Date.now()
}

function makeSnapshot(ast: SequenceNode, flags: RegexFlags, label: string): Snapshot {
  return { id: newId(), timestamp: now(), autoLabel: label, ast, flags }
}

/** A friendly starter rule: an email address. */
function starterRule(): Rule {
  const ast = nodes.sequence([
    nodes.anchor('start'),
    nodes.repeat(nodes.charType('wordChar'), 'oneOrMore'),
    nodes.literal('@'),
    nodes.repeat(nodes.charType('letterOrDigit'), 'oneOrMore'),
    nodes.literal('.'),
    nodes.repeat(nodes.charType('letter'), 'atLeast', 2),
    nodes.anchor('end'),
  ]) as SequenceNode
  const flags = { ...DEFAULT_FLAGS }
  const snap = makeSnapshot(ast, flags, 'Created the rule')
  const ts = now()
  return {
    id: newId(),
    name: 'Email address',
    ast,
    flags,
    testInput: 'alice@example.com\nbob.smith@mail.co.uk\nnot an email\n@missing.local\nhi@site',
    history: [snap],
    historyIndex: 0,
    createdAt: ts,
    updatedAt: ts,
  }
}

function freshRule(name: string): Rule {
  const ast = emptyRuleAst()
  const flags = { ...DEFAULT_FLAGS }
  const ts = now()
  return {
    id: newId(),
    name,
    ast,
    flags,
    testInput: '',
    history: [makeSnapshot(ast, flags, 'Created the rule')],
    historyIndex: 0,
    createdAt: ts,
    updatedAt: ts,
  }
}

interface StoreState {
  rules: Rule[]
  activeRuleId: string
  experience: ExperienceLevel
  theme: ThemePref
  testMode: TestMode
  selectedNodeId: string | null
  ai: AiSettings

  // derived
  active: () => Rule

  // rule CRUD
  createRule: (name?: string) => void
  deleteRule: (id: string) => void
  duplicateRule: (id: string) => void
  renameRule: (id: string, name: string) => void
  setActiveRule: (id: string) => void
  importRule: (json: string) => { ok: boolean; error?: string }

  // ast editing
  setAst: (ast: SequenceNode, opts?: { commit?: boolean; label?: string }) => void
  addChild: (parentId: string, node: RuleNode, index?: number) => void
  updateNodeById: (id: string, patch: Partial<RuleNode>) => void
  replaceNodeById: (id: string, node: RuleNode) => void
  removeNodeById: (id: string) => void
  moveNode: (parentId: string, from: number, to: number) => void
  duplicateNodeById: (id: string) => void
  setRepeatPreset: (id: string, preset: RepeatPreset, n?: number, m?: number) => void
  loadAst: (ast: unknown, label: string) => { ok: boolean; error?: string }

  // flags & test input
  setFlag: (flag: keyof RegexFlags, value: boolean) => void
  setTestInput: (text: string) => void

  // history
  undo: () => void
  redo: () => void
  restoreSnapshot: (snapId: string) => void

  // ui
  setExperience: (level: ExperienceLevel) => void
  setTheme: (theme: ThemePref) => void
  setTestMode: (mode: TestMode) => void
  selectNode: (id: string | null) => void

  // ai
  setAiProvider: (p: AiProvider) => void
  setAiKey: (p: AiProvider, key: string) => void
}

function replaceActive(rules: Rule[], id: string, fn: (r: Rule) => Rule): Rule[] {
  return rules.map((r) => (r.id === id ? fn(r) : r))
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** Commit a new AST (and/or flags) to the active rule's timeline. */
      function commit(
        rule: Rule,
        ast: SequenceNode,
        flags: RegexFlags,
        opts: { force?: boolean; label?: string },
      ): Rule {
        const trimmed = rule.history.slice(0, rule.historyIndex + 1)
        const top = trimmed[trimmed.length - 1]
        const base = trimmed[trimmed.length - 2]?.ast ?? null
        const ts = now()
        const coalesce = !opts.force && top && ts - top.timestamp < COALESCE_MS

        if (coalesce && top) {
          const label = opts.label ?? autoLabel(base, ast)
          trimmed[trimmed.length - 1] = { ...top, ast, flags, autoLabel: label }
        } else {
          const label = opts.label ?? autoLabel(top?.ast ?? null, ast)
          trimmed.push(makeSnapshot(ast, flags, label))
        }
        return {
          ...rule,
          ast,
          flags,
          history: trimmed,
          historyIndex: trimmed.length - 1,
          updatedAt: ts,
        }
      }

      function mutateAst(
        transform: (ast: SequenceNode) => SequenceNode,
        opts: { force?: boolean; label?: string } = { force: true },
      ) {
        set((s) => {
          const rule = s.rules.find((r) => r.id === s.activeRuleId)
          if (!rule) return s
          const next = transform(rule.ast)
          return { rules: replaceActive(s.rules, rule.id, (r) => commit(r, next, r.flags, opts)) }
        })
      }

      return {
        rules: [starterRule()],
        activeRuleId: '',
        experience: 'simple',
        theme: 'system',
        testMode: 'perLine',
        selectedNodeId: null,
        ai: { provider: 'gemini', keys: {} },

        active: () => {
          const s = get()
          return s.rules.find((r) => r.id === s.activeRuleId) ?? s.rules[0]
        },

        createRule: (name) =>
          set((s) => {
            const rule = freshRule(name?.trim() || `Rule ${s.rules.length + 1}`)
            return { rules: [...s.rules, rule], activeRuleId: rule.id, selectedNodeId: null }
          }),

        deleteRule: (id) =>
          set((s) => {
            if (s.rules.length <= 1) {
              const fresh = freshRule('Untitled rule')
              return { rules: [fresh], activeRuleId: fresh.id, selectedNodeId: null }
            }
            const rules = s.rules.filter((r) => r.id !== id)
            const activeRuleId = s.activeRuleId === id ? rules[0].id : s.activeRuleId
            return { rules, activeRuleId, selectedNodeId: null }
          }),

        duplicateRule: (id) =>
          set((s) => {
            const src = s.rules.find((r) => r.id === id)
            if (!src) return s
            const ast = cloneWithNewIds(src.ast, newId) as SequenceNode
            const ts = now()
            const copy: Rule = {
              ...src,
              id: newId(),
              name: `${src.name} copy`,
              ast,
              history: [makeSnapshot(ast, src.flags, 'Created the rule')],
              historyIndex: 0,
              createdAt: ts,
              updatedAt: ts,
            }
            const idx = s.rules.findIndex((r) => r.id === id)
            const rules = s.rules.slice()
            rules.splice(idx + 1, 0, copy)
            return { rules, activeRuleId: copy.id, selectedNodeId: null }
          }),

        renameRule: (id, name) =>
          set((s) => ({ rules: replaceActive(s.rules, id, (r) => ({ ...r, name })) })),

        setActiveRule: (id) => set({ activeRuleId: id, selectedNodeId: null }),

        importRule: (json) => {
          try {
            const parsed = JSON.parse(json) as { name?: string; ast?: unknown; flags?: RegexFlags }
            const ast = normalizeAst(parsed.ast ?? parsed)
            const flags = { ...DEFAULT_FLAGS, ...(parsed.flags ?? {}) }
            const ts = now()
            const rule: Rule = {
              id: newId(),
              name: parsed.name?.trim() || 'Imported rule',
              ast,
              flags,
              testInput: '',
              history: [makeSnapshot(ast, flags, 'Imported the rule')],
              historyIndex: 0,
              createdAt: ts,
              updatedAt: ts,
            }
            set((s) => ({ rules: [...s.rules, rule], activeRuleId: rule.id, selectedNodeId: null }))
            return { ok: true }
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'Could not read that file.' }
          }
        },

        setAst: (ast, opts) =>
          mutateAst(() => ast, { force: opts?.commit ?? false, label: opts?.label }),

        addChild: (parentId, node, index) =>
          mutateAst((ast) => insertChild(ast, parentId, node, index) as SequenceNode),

        updateNodeById: (id, patch) =>
          mutateAst((ast) => updateNode(ast, id, patch) as SequenceNode, { force: false }),

        replaceNodeById: (id, node) =>
          mutateAst((ast) => replaceNode(ast, id, node) as SequenceNode),

        removeNodeById: (id) => {
          mutateAst((ast) => removeNode(ast, id) as SequenceNode)
          if (get().selectedNodeId === id) set({ selectedNodeId: null })
        },

        moveNode: (parentId, from, to) =>
          mutateAst((ast) => moveChild(ast, parentId, from, to) as SequenceNode),

        duplicateNodeById: (id) =>
          mutateAst((ast) => {
            const clone = (n: RuleNode): RuleNode => cloneWithNewIds(n, newId)
            // find node & its parent array to insert a clone after it
            return duplicateInTree(ast, id, clone) as SequenceNode
          }),

        setRepeatPreset: (id, preset, n, m) =>
          mutateAst(
            (ast) =>
              updateNode(ast, id, { preset, ...repeatBounds(preset, n, m) } as Partial<RuleNode>) as SequenceNode,
          ),

        loadAst: (input, label) => {
          try {
            const ast = normalizeAst(input)
            mutateAst(() => ast, { force: true, label })
            return { ok: true }
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'Invalid rule.' }
          }
        },

        setFlag: (flag, value) =>
          set((s) => {
            const rule = s.rules.find((r) => r.id === s.activeRuleId)
            if (!rule) return s
            const flags = { ...rule.flags, [flag]: value }
            return {
              rules: replaceActive(s.rules, rule.id, (r) =>
                commit(r, r.ast, flags, { force: true, label: `Changed the ${flag}-flag` }),
              ),
            }
          }),

        setTestInput: (text) =>
          set((s) => ({
            rules: replaceActive(s.rules, s.activeRuleId, (r) => ({ ...r, testInput: text })),
          })),

        undo: () =>
          set((s) => {
            const rule = s.rules.find((r) => r.id === s.activeRuleId)
            if (!rule || rule.historyIndex <= 0) return s
            const idx = rule.historyIndex - 1
            const snap = rule.history[idx]
            return {
              rules: replaceActive(s.rules, rule.id, (r) => ({
                ...r,
                ast: snap.ast,
                flags: snap.flags,
                historyIndex: idx,
              })),
            }
          }),

        redo: () =>
          set((s) => {
            const rule = s.rules.find((r) => r.id === s.activeRuleId)
            if (!rule || rule.historyIndex >= rule.history.length - 1) return s
            const idx = rule.historyIndex + 1
            const snap = rule.history[idx]
            return {
              rules: replaceActive(s.rules, rule.id, (r) => ({
                ...r,
                ast: snap.ast,
                flags: snap.flags,
                historyIndex: idx,
              })),
            }
          }),

        restoreSnapshot: (snapId) =>
          set((s) => {
            const rule = s.rules.find((r) => r.id === s.activeRuleId)
            if (!rule) return s
            const snap = rule.history.find((h) => h.id === snapId)
            if (!snap) return s
            return {
              rules: replaceActive(s.rules, rule.id, (r) =>
                commit(r, snap.ast, snap.flags, { force: true, label: 'Restored an earlier version' }),
              ),
            }
          }),

        setExperience: (level) => set({ experience: level }),
        setTheme: (theme) => set({ theme }),
        setTestMode: (mode) => set({ testMode: mode }),
        selectNode: (id) => set({ selectedNodeId: id }),

        setAiProvider: (p) => set((s) => ({ ai: { ...s.ai, provider: p } })),
        setAiKey: (p, key) =>
          set((s) => ({ ai: { ...s.ai, keys: { ...s.ai.keys, [p]: key } } })),
      }
    },
    {
      name: 'plainregex.v1',
      version: 1,
      partialize: (s) => ({
        rules: s.rules,
        activeRuleId: s.activeRuleId,
        experience: s.experience,
        theme: s.theme,
        testMode: s.testMode,
        ai: s.ai,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && (!state.activeRuleId || !state.rules.find((r) => r.id === state.activeRuleId))) {
          state.activeRuleId = state.rules[0]?.id ?? ''
        }
      },
    },
  ),
)

// Ensure a valid activeRuleId on first load (starter rule id is generated lazily).
{
  const s = useStore.getState()
  if (!s.activeRuleId && s.rules[0]) useStore.setState({ activeRuleId: s.rules[0].id })
}

/** Insert a fresh-id clone of node `id` right after it in its array-parent. */
function duplicateInTree(
  root: RuleNode,
  id: string,
  clone: (n: RuleNode) => RuleNode,
): RuleNode {
  const rec = root as unknown as Record<string, unknown>
  const key = root.type === 'choice' ? 'options' : 'children'
  const list = rec[key] as RuleNode[] | undefined
  if (Array.isArray(list)) {
    const idx = list.findIndex((c) => c.id === id)
    if (idx >= 0) {
      const next = list.slice()
      next.splice(idx + 1, 0, clone(list[idx]))
      return { ...root, [key]: next.map((c) => (c.id === id ? c : duplicateInTree(c, id, clone))) } as RuleNode
    }
    return { ...root, [key]: list.map((c) => duplicateInTree(c, id, clone)) } as RuleNode
  }
  const child = rec.child as RuleNode | undefined
  if (child) return { ...root, child: duplicateInTree(child, id, clone) } as RuleNode
  return root
}

export function exportRuleJson(rule: Rule): string {
  return JSON.stringify(
    { name: rule.name, ast: stripIds(rule.ast), flags: rule.flags },
    null,
    2,
  )
}

/** A clean, id-free copy of an AST for sending to an AI provider. */
export function stripIdsForAi(node: RuleNode): unknown {
  return stripIds(node)
}

/** Strip editor ids for a clean, portable export. */
function stripIds(node: RuleNode): unknown {
  const rec = node as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rec)) {
    if (k === 'id') continue
    if (Array.isArray(v)) out[k] = v.map((c) => stripIds(c as RuleNode))
    else if (v && typeof v === 'object' && 'type' in (v as object)) out[k] = stripIds(v as RuleNode)
    else out[k] = v
  }
  return out
}
