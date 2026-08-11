import { useState, type ReactNode } from 'react'
import { useTheme } from '@/ui/useTheme'
import { Clock, Link, Sparkles } from '@/ui/icons'
import { Header } from '@/components/Header'
import { RuleBuilder } from '@/components/RuleBuilder'
import { ExplanationPanel } from '@/components/ExplanationPanel'
import { TestPanel } from '@/components/TestPanel'
import { ExamplesPanel } from '@/components/ExamplesPanel'
import { UrlMode } from '@/components/UrlMode'
import { Timeline } from '@/components/Timeline'
import { AiAssist } from '@/components/AiAssist'
import { SettingsModal } from '@/components/SettingsModal'

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
  const [aiOpen, setAiOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
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

        {urlOpen && (
          <div className="mb-5">
            <UrlMode />
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <RuleBuilder />
            {aiOpen && <AiAssist onOpenSettings={() => setSettingsOpen(true)} />}
            <ExplanationPanel />
          </div>
          <div className="flex flex-col gap-5">
            <TestPanel />
            <ExamplesPanel />
          </div>
        </div>

        {historyOpen && (
          <div className="mt-5">
            <Timeline />
          </div>
        )}

        <footer className="mt-10 border-t border-border pt-5 text-center text-body-sm text-ink-muted">
          PlainRegex — build patterns from meaning. Everything runs in your browser; nothing is sent
          anywhere unless you turn on AI assist.
        </footer>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
