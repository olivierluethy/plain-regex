import { useState, type ReactNode } from 'react'
import { useTheme } from '@/ui/useTheme'
import { Clock, Link, Sparkles, Wand } from '@/ui/icons'
import { Header } from '@/components/Header'
import { RuleBuilder } from '@/components/RuleBuilder'
import { ExplanationPanel } from '@/components/ExplanationPanel'
import { BuildFromExample } from '@/components/BuildFromExample'
import { TestPanel } from '@/components/TestPanel'
import { QuickCheck } from '@/components/QuickCheck'
import { ExamplesPanel } from '@/components/ExamplesPanel'
import { CodePanel } from '@/components/CodePanel'
import { UrlMode } from '@/components/UrlMode'
import { ImportRegex } from '@/components/ImportRegex'
import { HistoryDrawer } from '@/components/Timeline'
import { AiAssist } from '@/components/AiAssist'
import { SettingsModal } from '@/components/SettingsModal'
import { FirstRun } from '@/components/FirstRun'

function ToggleButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
        active
          ? 'border-brand/40 bg-brand-tint text-brand'
          : 'border-border bg-surface text-ink-muted hover:bg-surface-2 hover:text-ink'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

export default function App() {
  useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto max-w-[1720px] px-4 py-4 sm:px-6">
        <FirstRun />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ToggleButton
            active={importOpen}
            onClick={() => setImportOpen((v) => !v)}
            icon={<Wand width={16} height={16} />}
          >
            Paste a regex
          </ToggleButton>
          <ToggleButton active={urlOpen} onClick={() => setUrlOpen((v) => !v)} icon={<Link width={16} height={16} />}>
            URL mode
          </ToggleButton>
          <ToggleButton active={aiOpen} onClick={() => setAiOpen((v) => !v)} icon={<Sparkles width={16} height={16} />}>
            AI assist
          </ToggleButton>
          <ToggleButton
            active={historyOpen}
            onClick={() => setHistoryOpen((v) => !v)}
            icon={<Clock width={16} height={16} />}
          >
            History
          </ToggleButton>
        </div>

        {importOpen && (
          <div className="mb-4">
            <ImportRegex onDone={() => setImportOpen(false)} />
          </div>
        )}

        {urlOpen && (
          <div className="mb-4">
            <UrlMode />
          </div>
        )}

        {/*
          Full-width v2 layout: 1 col on phones, 2 cols on lg, 3 cols on 2xl —
          spending the reclaimed gutters. Panels distributed so each column stays
          balanced and long lists scroll inside their panel (see styleguide §8/§14).
        */}
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <div className="flex flex-col gap-4">
            <RuleBuilder />
            {aiOpen && <AiAssist onOpenSettings={() => setSettingsOpen(true)} />}
            <ExplanationPanel />
            <ExamplesPanel className="2xl:hidden" />
          </div>
          <div className="flex flex-col gap-4">
            <BuildFromExample />
            <TestPanel />
            <QuickCheck />
            <CodePanel className="2xl:hidden" />
          </div>
          <div className="hidden flex-col gap-4 2xl:flex">
            <ExamplesPanel />
            <CodePanel />
          </div>
        </div>

        <footer className="mt-8 border-t border-border pt-4 text-center text-body-sm text-ink-muted">
          PlainRegex — build patterns from meaning. Everything runs in your browser; nothing is sent
          anywhere unless you turn on AI assist.
        </footer>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}
