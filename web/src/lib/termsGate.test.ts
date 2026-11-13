import { describe, expect, it } from 'vitest'
import { termsOutdated } from './termsGate.ts'

describe('termsOutdated', () => {
  it('is false while the account is unknown or has accepted the current version', () => {
    expect(termsOutdated(undefined)).toBe(false)
    expect(termsOutdated(null)).toBe(false)
    expect(termsOutdated({ termsVersion: '2026-11-13', currentTermsVersion: '2026-11-13' })).toBe(false)
  })

  it('is true for an older version and for an account that never accepted', () => {
    expect(termsOutdated({ termsVersion: '2026-01-01', currentTermsVersion: '2026-11-13' })).toBe(true)
    expect(termsOutdated({ termsVersion: null, currentTermsVersion: '2026-11-13' })).toBe(true)
  })
})
