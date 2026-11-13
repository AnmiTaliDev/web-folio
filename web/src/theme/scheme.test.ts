import { describe, expect, it } from 'vitest'
import { SEED, colorsFor, kebab, schemeColors, schemeCss, type StyleVariant } from './scheme.ts'

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

describe('configurable scheme', () => {
  const base = { seed: '#388E3C', dark: false, variant: 'tonal' as StyleVariant, contrast: 0, brandAccent: false }

  it('follows the chosen seed color without the brand accent', () => {
    const green = colorsFor(base)
    const [r, g, b] = channels(green.primary)
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
    const [, , tertiaryBlue] = channels(green.tertiaryContainer)
    expect(tertiaryBlue).toBeDefined()
  })

  it('keeps the brand coral accent only when asked to', () => {
    const brand = colorsFor({ ...base, seed: SEED, brandAccent: true })
    const plain = colorsFor({ ...base, seed: SEED, brandAccent: false })
    expect(brand.tertiaryContainer).not.toBe(plain.tertiaryContainer)
  })

  it('produces different palettes for different styles', () => {
    const variants: StyleVariant[] = ['vibrant', 'tonal', 'neutral', 'expressive', 'content']
    const primaries = new Set(variants.map((variant) => colorsFor({ ...base, variant }).primary))
    expect(primaries.size).toBeGreaterThan(2)
    const neutral = channels(colorsFor({ ...base, variant: 'neutral' }).surfaceContainer)
    expect(Math.max(...neutral) - Math.min(...neutral)).toBeLessThan(12)
  })

  it('raises the contrast of text on surfaces for higher contrast levels', () => {
    const luminance = (hex: string) => channels(hex).reduce((total, value) => total + value, 0)
    const standard = colorsFor({ ...base, contrast: 0 })
    const high = colorsFor({ ...base, contrast: 1 })
    expect(Math.abs(luminance(high.onSurfaceVariant) - luminance(high.surface))).toBeGreaterThan(
      Math.abs(luminance(standard.onSurfaceVariant) - luminance(standard.surface)),
    )
  })

  it('builds a dark variant for every style', () => {
    for (const variant of ['vibrant', 'tonal', 'neutral', 'expressive', 'content'] as StyleVariant[]) {
      const dark = colorsFor({ ...base, variant, dark: true })
      expect(Math.max(...channels(dark.surface))).toBeLessThan(90)
    }
  })
})
