import { describe, expect, it } from 'vitest'
import { en, enGenres } from './en.ts'
import { detectLang, genreLabelIn, interestGenres, translate, type Key } from './index.ts'
import { kk, kkGenres } from './kk.ts'
import { ru, ruGenres } from './ru.ts'

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort()

describe('translations', () => {
  it('have the same keys in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
    expect(Object.keys(kk).sort()).toEqual(Object.keys(ru).sort())
  })

  it('keep the same placeholders in both languages', () => {
    for (const key of Object.keys(ru) as Key[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(ru[key]))
      expect(placeholders(kk[key]), key).toEqual(placeholders(ru[key]))
    }
  })

  it('have no empty strings and no em dashes', () => {
    for (const key of Object.keys(ru) as Key[]) {
      expect(en[key].trim(), key).not.toBe('')
      expect(ru[key].trim(), key).not.toBe('')
      expect(kk[key].trim(), key).not.toBe('')
      expect(en[key] + ru[key] + kk[key], key).not.toContain('—')
    }
  })

  it('substitutes placeholders per language', () => {
    expect(translate('ru', 'ratedProgress', { count: 3, total: 8 })).toBe('Оценено книг: 3 из 8')
    expect(translate('en', 'ratedProgress', { count: 3, total: 8 })).toBe('Books rated: 3 of 8')
  })

  it('label every interest genre in both languages and pass unknown keys through', () => {
    for (const key of interestGenres) {
      expect(ruGenres[key]).toBeDefined()
      expect(enGenres[key]).toBeDefined()
      expect(kkGenres[key]).toBeDefined()
      expect(genreLabelIn('en', key)).toBe(enGenres[key])
    }
    expect(genreLabelIn('ru', 'unknown_genre')).toBe('unknown_genre')
  })
})

describe('detectLang', () => {
  it('prefers a stored valid language', () => {
    expect(detectLang('en', 'ru-RU')).toBe('en')
    expect(detectLang('ru', 'en-US')).toBe('ru')
  })

  it('falls back to the browser language and then to English', () => {
    expect(detectLang(null, 'ru-RU')).toBe('ru')
    expect(detectLang(null, 'kk-KZ')).toBe('kk')
    expect(detectLang('kk', 'en-US')).toBe('kk')
    expect(detectLang('de', 'en-US')).toBe('en')
    expect(detectLang(null, undefined)).toBe('en')
  })
})
