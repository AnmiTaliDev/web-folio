import { describe, expect, it } from 'vitest'
import { TERMS, TERMS_VERSION } from './terms.ts'

describe('terms of service text', () => {
  it('has the same sections in the same order in both languages', () => {
    expect(TERMS.ru.sections.map((section) => section.id)).toEqual(TERMS.en.sections.map((section) => section.id))
  })

  it('covers the required topics', () => {
    const ids = TERMS.en.sections.map((section) => section.id)
    for (const id of ['who', 'data', 'rights', 'ai', 'rules', 'children', 'law', 'contact']) {
      expect(ids).toContain(id)
    }
  })

  it('has content in every section and no empty strings', () => {
    for (const language of ['ru', 'en'] as const) {
      for (const section of TERMS[language].sections) {
        const pieces = [...(section.paragraphs ?? []), ...(section.items ?? []), ...(section.closing ?? [])]
        expect(pieces.length, `${language}:${section.id}`).toBeGreaterThan(0)
        for (const piece of pieces) {
          expect(piece.trim(), `${language}:${section.id}`).not.toBe('')
        }
      }
    }
  })

  it('contains no em dashes and keeps the language of each version', () => {
    for (const language of ['ru', 'en'] as const) {
      const all = JSON.stringify(TERMS[language])
      expect(all).not.toContain('—')
    }
    expect(JSON.stringify(TERMS.ru)).toMatch(/[А-Яа-я]/)
    expect(JSON.stringify(TERMS.en)).not.toMatch(/[А-Яа-я]/)
  })

  it('names the governing law and does not set a minimum age', () => {
    expect(JSON.stringify(TERMS.en)).toContain('Republic of Kazakhstan')
    expect(JSON.stringify(TERMS.ru)).toContain('Республики Казахстан')
    expect(JSON.stringify(TERMS.en.sections.find((section) => section.id === 'children'))).toContain('no minimum age')
  })

  it('has a date as its version', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
