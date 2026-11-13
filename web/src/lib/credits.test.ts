import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en.ts'
import { ru } from '../i18n/ru.ts'
import { CREDITS, spdxUrls } from './credits.ts'

describe('credits', () => {
  it('have a translation in both languages and an https link', () => {
    for (const credit of CREDITS) {
      expect(ru[credit.text], credit.name).toBeTruthy()
      expect(en[credit.text], credit.name).toBeTruthy()
      expect(credit.url.startsWith('https://'), credit.name).toBe(true)
    }
  })

  it('build SPDX links for license expressions and skip free-form names', () => {
    expect(spdxUrls('MIT')).toEqual(['https://spdx.org/licenses/MIT.html'])
    expect(spdxUrls('Apache-2.0 AND MIT')).toHaveLength(2)
    expect(spdxUrls('Public domain')).toEqual([])
  })
})
