import { useRef, useState } from 'react'
import { buildRegExp } from '@/core'
import { exportRuleJson, useStore } from '@/store/useStore'
import { MenuItem, Modal, Popover } from '@/ui/primitives'
import { Copy, Download, Pencil, Plus, Trash, Upload } from '@/ui/icons'

function download(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rule'
}

export function RulesMenu() {
  const rules = useStore((s) => s.rules)
  const active = useStore((s) => s.active())
  const setActiveRule = useStore((s) => s.setActiveRule)
  const createRule = useStore((s) => s.createRule)
  const duplicateRule = useStore((s) => s.duplicateRule)
  const deleteRule = useStore((s) => s.deleteRule)
  const renameRule = useStore((s) => s.renameRule)
  const importRule = useStore((s) => s.importRule)

  const fileRef = useRef<HTMLInputElement>(null)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const onImportFile = async (file: File) => {
    const text = await file.text()
    const res = importRule(text)
    if (!res.ok) setImportError(res.error ?? 'Could not read that file.')
  }

  return (
    <>
      <Popover
        width={280}
        trigger={({ open, toggle }) => (
          <button
            onClick={toggle}
            aria-expanded={open}
            className="inline-flex h-9 max-w-[240px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            <span className="truncate">{active.name}</span>
            <span className="text-ink-faint">▾</span>
          </button>
        )}
      >
        <div className="max-h-64 overflow-y-auto scroll-thin">
          <div className="eyebrow px-2.5 pb-1 pt-1.5 text-[0.6875rem]">Your rules</div>
          {rules.map((r) => (
            <MenuItem key={r.id} onClick={() => setActiveRule(r.id)}>
              <span className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${r.id === active.id ? 'bg-brand' : 'bg-transparent'}`}
                />
                {r.name}
              </span>
            </MenuItem>
          ))}
        </div>
        <div className="my-1 h-px bg-border" />
        <MenuItem icon={<Plus width={15} height={15} />} onClick={() => createRule()}>
          New rule
        </MenuItem>
        <MenuItem icon={<Copy width={15} height={15} />} onClick={() => duplicateRule(active.id)}>
          Duplicate
        </MenuItem>
        <MenuItem
          icon={<Pencil width={15} height={15} />}
          onClick={() => {
            setNameDraft(active.name)
            setRenaming(true)
          }}
        >
          Rename
        </MenuItem>
        <div className="my-1 h-px bg-border" />
        <MenuItem icon={<Upload width={15} height={15} />} onClick={() => fileRef.current?.click()}>
          Import rule…
        </MenuItem>
        <MenuItem
          icon={<Download width={15} height={15} />}
          onClick={() => download(`${slug(active.name)}.plainregex.json`, exportRuleJson(active))}
        >
          Export rule (JSON)
        </MenuItem>
        <MenuItem
          icon={<Copy width={15} height={15} />}
          onClick={() => {
            const c = buildRegExp(active.ast, active.flags)
            download(`${slug(active.name)}.regex.txt`, `/${c.source}/${c.flags}`, 'text/plain')
          }}
        >
          Export pattern (text)
        </MenuItem>
        <div className="my-1 h-px bg-border" />
        <MenuItem danger icon={<Trash width={15} height={15} />} onClick={() => deleteRule(active.id)}>
          Delete rule
        </MenuItem>
      </Popover>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onImportFile(f)
          e.target.value = ''
        }}
      />

      <Modal open={renaming} onClose={() => setRenaming(false)} title="Rename rule" width={420}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (nameDraft.trim()) renameRule(active.id, nameDraft.trim())
            setRenaming(false)
          }}
        >
          <input
            autoFocus
            className="input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Rule name"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-secondary btn-md" onClick={() => setRenaming(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-md">
              Save name
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(importError)} onClose={() => setImportError(null)} title="Couldn’t import" width={420}>
        <p className="text-body-sm text-ink">{importError}</p>
        <div className="mt-4 flex justify-end">
          <button className="btn-primary btn-md" onClick={() => setImportError(null)}>
            OK
          </button>
        </div>
      </Modal>
    </>
  )
}
