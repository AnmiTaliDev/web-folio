import en from '../../../legal/terms.en.md?raw'
import kk from '../../../legal/terms.kk.md?raw'
import ru from '../../../legal/terms.ru.md?raw'

export type TermsSection = { id: string; title: string; paragraphs?: string[]; items?: string[]; closing?: string[] }
export type TermsText = { title: string; intro: string; sections: TermsSection[] }

export function parseTerms(source: string): TermsText & { version: string } {
  const match = /^---\nversion: (\d{4}-\d{2}-\d{2})\n---\n/.exec(source)
  if (!match) {
    throw new Error('Terms file has no version header')
  }
  const blocks = source
    .slice(match[0].length)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  const text: TermsText & { version: string } = { version: match[1] ?? '', title: '', intro: '', sections: [] }
  for (const block of blocks) {
    const section = text.sections[text.sections.length - 1]
    if (block.startsWith('# ')) {
      text.title = block.slice(2)
    } else if (block.startsWith('## ')) {
      const heading = /^## (.+) \{#([a-z-]+)\}$/.exec(block)
      if (!heading?.[1] || !heading[2]) {
        throw new Error(`Invalid section heading: ${block}`)
      }
      text.sections.push({ id: heading[2], title: heading[1] })
    } else if (!section) {
      text.intro = block
    } else if (block.startsWith('- ')) {
      section.items = block.split('\n').map((line) => line.replace(/^- /, ''))
    } else if (section.items) {
      section.closing = [...(section.closing ?? []), block]
    } else {
      section.paragraphs = [...(section.paragraphs ?? []), block]
    }
  }
  return text
}

const parsed = { ru: parseTerms(ru), en: parseTerms(en), kk: parseTerms(kk) }
if (parsed.ru.version !== parsed.en.version || parsed.ru.version !== parsed.kk.version) {
  throw new Error('Terms versions differ between languages')
}

export const TERMS_VERSION = parsed.ru.version
export const TERMS: Record<'ru' | 'en' | 'kk', TermsText> = { ru: parsed.ru, en: parsed.en, kk: parsed.kk }
