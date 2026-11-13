import { afterEach, describe, expect, it } from 'vitest'
import { appearance, DEFAULT_APPEARANCE, isDark, parseAppearance, parseSeed, schemeOptionsFor } from './appearance.ts'

afterEach(() => {
  appearance.reset()
  window.localStorage.clear()
})

describe('parseAppearance', () => {
  it('returns the defaults for missing, broken or foreign data', () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE)
    expect(parseAppearance('{broken')).toEqual(DEFAULT_APPEARANCE)
    expect(parseAppearance('"text"')).toEqual(DEFAULT_APPEARANCE)
    expect(parseAppearance(JSON.stringify({ mode: 'blue', seed: 'red', variant: 'x', contrast: 7 }))).toEqual(DEFAULT_APPEARANCE)
  })

  it('keeps valid values and normalizes the seed', () => {
    expect(parseAppearance(JSON.stringify({ mode: 'dark', seed: '#aabbcc', variant: 'expressive', contrast: 0.5 }))).toEqual({
      mode: 'dark',
      seed: '#AABBCC',
      variant: 'expressive',
      contrast: 0.5,
    })
  })
})

describe('helpers', () => {
  it('accepts only six digit hex seeds', () => {
    expect(parseSeed('#12ab34')).toBe('#12AB34')
    expect(parseSeed('#12ab3')).toBeNull()
    expect(parseSeed('12ab34')).toBeNull()
    expect(parseSeed(5)).toBeNull()
  })

  it('resolves dark mode from the choice and the system', () => {
    expect(isDark('dark', false)).toBe(true)
    expect(isDark('light', true)).toBe(false)
    expect(isDark('system', true)).toBe(true)
    expect(isDark('system', false)).toBe(false)
  })

  it('uses the brand accent only for the default color', () => {
    expect(schemeOptionsFor(DEFAULT_APPEARANCE, false).brandAccent).toBe(true)
    expect(schemeOptionsFor({ ...DEFAULT_APPEARANCE, seed: '#388E3C' }, false)).toMatchObject({ seed: '#388E3C', brandAccent: false })
  })
})

describe('appearance store', () => {
  it('persists changes and removes the entry when reset to the defaults', () => {
    appearance.update({ mode: 'dark', seed: '#D81B60' })
    expect(JSON.parse(window.localStorage.getItem('folio.appearance') ?? '{}')).toMatchObject({ mode: 'dark', seed: '#D81B60' })
    expect(appearance.dark()).toBe(true)
    appearance.reset()
    expect(window.localStorage.getItem('folio.appearance')).toBeNull()
    expect(appearance.value()).toEqual(DEFAULT_APPEARANCE)
  })
})
