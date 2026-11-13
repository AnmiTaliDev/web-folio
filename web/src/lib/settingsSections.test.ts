import { describe, expect, it } from 'vitest'
import { resolveSection, sectionsFor } from './settingsSections.ts'

describe('settings sections', () => {
  it('hides account-only sections from guests', () => {
    expect(sectionsFor(false)).toEqual(['account', 'general', 'about', 'legal'])
    expect(sectionsFor(true)).toContain('personalization')
    expect(sectionsFor(true)).toContain('data')
    expect(sectionsFor(true)).toContain('sessions')
    expect(sectionsFor(false)).not.toContain('sessions')
  })

  it('shows the section list on narrow screens and the first section on wide ones', () => {
    expect(resolveSection(undefined, true, false)).toBeNull()
    expect(resolveSection(undefined, true, true)).toBe('account')
  })

  it('opens a requested section and falls back for unknown or unavailable ones', () => {
    expect(resolveSection('data', true, false)).toBe('data')
    expect(resolveSection('data', false, false)).toBeNull()
    expect(resolveSection('data', false, true)).toBe('account')
    expect(resolveSection('nope', true, true)).toBe('account')
  })
})
