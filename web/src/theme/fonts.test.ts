import { describe, expect, it } from 'vitest'
import { AXES, DEFAULT_AXES, isAxesFamily, parseAxes, stackVariable, TYPEFACES, variationFor, weightShiftFor } from './fonts.ts'

describe('fonts', () => {
  it('know which faces have adjustable axes', () => {
    expect(TYPEFACES.filter(isAxesFamily)).toEqual(['roboto-flex-axes', 'google-sans-flex-axes'])
  })

  it('map every face to the stack of its family', () => {
    expect(stackVariable('roboto-flex')).toBe('--stack-roboto-flex')
    expect(stackVariable('roboto-flex-axes')).toBe('--stack-roboto-flex')
    expect(stackVariable('google-sans-flex-axes')).toBe('--stack-google-sans-flex')
    expect(stackVariable('system')).toBe('--stack-system')
  })

  it('parse axis values with clamping and defaults', () => {
    expect(parseAxes(undefined)).toEqual(DEFAULT_AXES)
    expect(parseAxes('x')).toEqual(DEFAULT_AXES)
    const parsed = parseAxes({ 'roboto-flex-axes': { wght: 5000, wdth: 'wide', GRAD: -999, slnt: -3 }, 'google-sans-flex-axes': { ROND: 55 } })
    expect(parsed['roboto-flex-axes']).toMatchObject({ wght: 1000, wdth: 100, GRAD: -200, slnt: -3 })
    expect(parsed['google-sans-flex-axes']).toMatchObject({ ROND: 55, wght: 400, wdth: 100 })
  })

  it('build the variation settings without the weight axis', () => {
    const axes = parseAxes({ 'google-sans-flex-axes': { wdth: 80, ROND: 40, slnt: -5, wght: 600 } })
    expect(variationFor('google-sans-flex-axes', axes)).toBe("'wdth' 80, 'ROND' 40, 'slnt' -5")
    expect(variationFor('roboto-flex-axes', DEFAULT_AXES)).toBe("'wdth' 100, 'GRAD' 0, 'slnt' 0")
    expect(variationFor('roboto', DEFAULT_AXES)).toBe("'GRAD' 0")
  })

  it('turn the weight slider into a shift from the regular weight', () => {
    expect(weightShiftFor('google-sans-flex-axes', parseAxes({ 'google-sans-flex-axes': { wght: 650 } }))).toBe(250)
    expect(weightShiftFor('roboto-flex', DEFAULT_AXES)).toBe(0)
  })

  it('keep every default inside its range', () => {
    for (const specs of Object.values(AXES)) {
      for (const spec of specs) {
        expect(spec.default).toBeGreaterThanOrEqual(spec.min)
        expect(spec.default).toBeLessThanOrEqual(spec.max)
      }
    }
  })
})
