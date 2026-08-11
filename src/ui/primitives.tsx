import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ChevronDown } from './icons'

// --- Panel ------------------------------------------------------------------

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className = '',
  bodyClass = '',
}: {
  title?: ReactNode
  eyebrow?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClass?: string
}) {
  return (
    <section className={`panel flex flex-col ${className}`}>
      {(title || actions || eyebrow) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
            {title && <h2 className="text-h3 text-ink sm:text-h2">{title}</h2>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={`px-4 py-3 ${bodyClass}`}>{children}</div>
    </section>
  )
}

// --- Segmented control ------------------------------------------------------

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; title?: string }[]
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-full border border-border bg-surface-2 p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors ${
              size === 'sm' ? 'h-7 px-2.5 text-[0.8125rem]' : 'h-8 px-3.5 text-sm'
            } ${
              active
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// --- Popover / dropdown -----------------------------------------------------

interface PopoverCtx {
  close: () => void
}
const PopoverContext = createContext<PopoverCtx>({ close: () => {} })
export const usePopover = () => useContext(PopoverContext)

export function Popover({
  trigger,
  children,
  align = 'start',
  width,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <PopoverContext.Provider value={{ close: () => setOpen(false) }}>
          <div
            className={`absolute z-30 mt-2 animate-fade-in rounded-lg border border-border bg-surface p-1.5 shadow-lg ${
              align === 'end' ? 'right-0' : 'left-0'
            }`}
            style={{ width, minWidth: width ?? 200 }}
          >
            {children}
          </div>
        </PopoverContext.Provider>
      )}
    </div>
  )
}

export function MenuItem({
  children,
  onClick,
  danger,
  icon,
}: {
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  icon?: ReactNode
}) {
  const { close } = usePopover()
  return (
    <button
      onClick={() => {
        onClick?.()
        close()
      }}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
        danger
          ? 'text-fail hover:bg-fail-tint'
          : 'text-ink hover:bg-surface-2'
      }`}
    >
      {icon && <span className="shrink-0 text-ink-muted">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  )
}

export function Caret({ open }: { open: boolean }) {
  return (
    <ChevronDown
      width={14}
      height={14}
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    />
  )
}

// --- Modal ------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        className="w-full animate-flip-in rounded-xl border border-border bg-surface shadow-lg"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-h2 text-ink">{title}</h2>
          <button className="btn-icon h-8 w-8" onClick={onClose} aria-label="Close">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
