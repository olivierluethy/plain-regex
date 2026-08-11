import type { RegexFlags, SequenceNode } from '@/core'

export interface Snapshot {
  id: string
  timestamp: number
  autoLabel: string
  ast: SequenceNode
  flags: RegexFlags
}

export interface Rule {
  id: string
  name: string
  ast: SequenceNode
  flags: RegexFlags
  testInput: string
  history: Snapshot[]
  historyIndex: number
  createdAt: number
  updatedAt: number
}

export type ExperienceLevel = 'simple' | 'advanced'
export type ThemePref = 'light' | 'dark' | 'system'
export type TestMode = 'perLine' | 'wholeText'
export type AiProvider = 'gemini' | 'anthropic' | 'openai'

export interface AiSettings {
  provider: AiProvider
  keys: Partial<Record<AiProvider, string>>
}
