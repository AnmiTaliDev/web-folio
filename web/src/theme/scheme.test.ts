import { describe, expect, it } from 'vitest'
import { SEED, kebab, schemeColors, schemeCss } from './scheme.ts'

function channels(hex: string): [number, number, number] {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)]
}

describe('color scheme', () => {
  it('keeps the brand seed as the light primary color', () => {
    expect(schemeColors(SEED, false).primary.toLowerCase()).toBe(SEED.toLowerCase())
  })

  it('builds a different dark scheme with a dark surface and a light primary', () => {
    const light = schemeColors(SEED, false)
    const dark = schemeColors(SEED, true)
    expect(dark.surface).not.toBe(light.surface)
    expect(Math.max(...channels(dark.surface))).toBeLessThan(80)
    expect(Math.min(...channels(light.surface))).toBeGreaterThan(200)
    expect(Math.max(...channels(dark.primary))).toBeGreaterThan(150)
  })

  it('uses a warm coral accent for the tertiary family', () => {
    const { tertiaryContainer } = schemeColors(SEED, false)
    const [r, , b] = channels(tertiaryContainer)
    expect(r).toBeGreaterThan(b)
  })

  it('tints the surfaces instead of leaving them neutral gray', () => {
    const [r, g, b] = channels(schemeColors(SEED, false).surfaceContainer)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThanOrEqual(g)
  })

  it('exports css variables in the Material Web naming', () => {
    const css = schemeCss(SEED, false)
    expect(css).toContain('--md-sys-color-primary: #')
    expect(css).toContain('--md-sys-color-surface-container-high: #')
    expect(css.split('\n').length).toBeGreaterThan(30)
  })

  it('converts role names to kebab case', () => {
    expect(kebab('onSurfaceVariant')).toBe('on-surface-variant')
  })
})
