import { describe, expect, it } from 'vitest'
import { TERMS_VERSION as WEB_VERSION } from '../../web/src/i18n/terms.ts'
import { TERMS_VERSION } from './terms.ts'

describe('terms version', () => {
  it('is the same on the server and in the text shown to users', () => {
    expect(TERMS_VERSION).toBe(WEB_VERSION)
  })
})
