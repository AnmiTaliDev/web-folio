import { describe, expect, it } from 'vitest'
import { genreLabel, interestGenres, t } from './ru.ts'

describe('i18n', () => {
  it('substitutes placeholders', () => {
    expect(t('ratedProgress', { count: 3, total: 8 })).toBe('Оценено книг: 3 из 8')
    expect(t('matchPercent', { percent: 92 })).toBe('92% совпадение')
  })

  it('labels every interest genre and passes unknown keys through', () => {
    for (const key of interestGenres) {
      expect(genreLabel(key)).not.toBe(key)
    }
    expect(genreLabel('unknown_genre')).toBe('unknown_genre')
  })
})
