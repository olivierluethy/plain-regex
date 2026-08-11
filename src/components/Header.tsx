import { useStore } from '@/store/useStore'
import { Segmented } from '@/ui/primitives'
import { Moon, Monitor, Settings, Sun } from '@/ui/icons'
import type { ThemePref } from '@/store/types'
import { RulesMenu } from './RulesMenu'

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const experience = useStore((s) => s.experience)
  const setExperience = useStore((s) => s.setExperience)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  const themeIcon: Record<ThemePref, JSX.Element> = {
    light: <Sun width={17} height={17} />,
    dark: <Moon width={17} height={17} />,
    system: <Monitor width={17} height={17} />,
  }
  const nextTheme: Record<ThemePref, ThemePref> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1720px] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand font-mono text-sm font-bold text-white shadow-sm">
            .*
          </span>
          <div className="leading-tight">
            <div className="font-display text-[1.05rem] font-bold text-ink">PlainRegex</div>
            <div className="hidden text-[0.7rem] text-ink-muted sm:block">patterns from meaning</div>
          </div>
        </div>

        <div className="ml-2 hidden md:block">
          <RulesMenu />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Segmented
            ariaLabel="Experience level"
            value={experience}
            onChange={setExperience}
            options={[
              { value: 'simple', label: 'Simple' },
              { value: 'advanced', label: 'Advanced' },
            ]}
          />
          <button
            className="btn-icon h-9 w-9"
            onClick={() => setTheme(nextTheme[theme])}
            title={`Theme: ${theme}`}
            aria-label={`Switch theme (currently ${theme})`}
          >
            {themeIcon[theme]}
          </button>
          <button
            className="btn-icon h-9 w-9"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings"
          >
            <Settings width={18} height={18} />
          </button>
        </div>
      </div>
      <div className="mx-auto block max-w-[1720px] px-4 pb-3 md:hidden">
        <RulesMenu />
      </div>
    </header>
  )
}
