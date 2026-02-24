import type { GlossaryCategory, GlossaryEntry } from '../glossary'
import raw from '../data/glossary.json'

export const GLOSSARY_CATEGORIES = raw.categories as Record<GlossaryCategory, string>
export const GLOSSARY: GlossaryEntry[] = raw.entries as GlossaryEntry[]
