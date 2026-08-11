import { useStore } from '@/store/useStore'
import { Modal, Segmented } from '@/ui/primitives'
import { AI_MODELS } from '@/lib/ai'
import type { AiProvider } from '@/store/types'

const PROVIDER_LABEL: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
}

const KEY_HELP: Record<AiProvider, string> = {
  gemini: 'Get a key at aistudio.google.com/apikey',
  anthropic: 'Get a key at console.anthropic.com',
  openai: 'Get a key at platform.openai.com/api-keys',
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ai = useStore((s) => s.ai)
  const setAiProvider = useStore((s) => s.setAiProvider)
  const setAiKey = useStore((s) => s.setAiKey)

  return (
    <Modal open={open} onClose={onClose} title="Settings" width={520}>
      <div className="flex flex-col gap-5">
        <section>
          <div className="eyebrow mb-2">AI assist (optional)</div>
          <p className="mb-3 text-body-sm text-ink-muted">
            Everything in PlainRegex works without AI. Add a key to turn plain-language descriptions
            into rules. Your key is stored only in this browser and is sent directly to the provider.
          </p>

          <div className="mb-3">
            <Segmented
              ariaLabel="AI provider"
              value={ai.provider}
              onChange={(p) => setAiProvider(p)}
              options={[
                { value: 'gemini', label: 'Gemini' },
                { value: 'anthropic', label: 'Anthropic' },
                { value: 'openai', label: 'OpenAI' },
              ]}
            />
          </div>

          <label className="block">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink">{PROVIDER_LABEL[ai.provider]} API key</span>
              <span className="font-mono text-[0.7rem] text-ink-faint">{AI_MODELS[ai.provider]}</span>
            </div>
            <input
              type="password"
              className="input font-mono text-mono-sm"
              placeholder="Paste your API key"
              value={ai.keys[ai.provider] ?? ''}
              onChange={(e) => setAiKey(ai.provider, e.target.value)}
              autoComplete="off"
            />
            <p className="mt-1.5 text-body-sm text-ink-muted">{KEY_HELP[ai.provider]}</p>
          </label>
        </section>

        <section className="rounded-md border border-border bg-surface-2/50 p-3">
          <div className="eyebrow mb-1.5">How AI is used</div>
          <p className="text-body-sm text-ink-muted">
            The model only proposes a rule structure. PlainRegex validates it, builds the pattern
            itself, and generates the explanation and examples — so what you see always matches what
            the pattern really does.
          </p>
        </section>

        <div className="flex justify-end">
          <button className="btn-primary btn-md" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
