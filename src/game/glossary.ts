// 게임 용어/요소 백과사전

export type GlossaryCategory = 'basic' | 'economy' | 'asset' | 'competition' | 'info' | 'meta'

export interface GlossaryEntry {
  id: string
  term: string
  category: GlossaryCategory
  description: string
  formula?: string
}

// 데이터 → data/glossary.json + schema/glossary.schema.ts
export { GLOSSARY_CATEGORIES, GLOSSARY } from './schema/glossary.schema'
