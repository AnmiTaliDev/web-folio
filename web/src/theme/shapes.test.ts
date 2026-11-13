import { describe, expect, it } from 'vitest'
import { SHAPE_NAMES, initialsOf, shapeFor, shapePath, toneFor } from './shapes.ts'

describe('shapes', () => {
  it('builds closed paths inside the unit box for every shape', () => {
    for (const name of SHAPE_NAMES) {
      const path = shapePath(name)
      expect(path.startsWith('M')).toBe(true)
      expect(path.endsWith('Z')).toBe(true)
      for (const number of path.match(/-?\d+\.\d+/g) ?? []) {
        const value = Number(number)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('gives different shapes different outlines', () => {
    expect(shapePath('cookie9')).not.toBe(shapePath('flower'))
  })

  it('picks the same shape and tone for the same id', () => {
    expect(shapeFor('abc')).toBe(shapeFor('abc'))
    expect(toneFor('abc')).toBe(toneFor('abc'))
    expect([0, 1, 2]).toContain(toneFor('xyz'))
  })

  it('spreads ids over the available shapes', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => shapeFor(`book-${i}`)))
    expect(seen.size).toBeGreaterThan(4)
  })

  it('builds initials from the first two words', () => {
    expect(initialsOf('The Name of the Rose')).toBe('TN')
    expect(initialsOf('Dune')).toBe('D')
    expect(initialsOf('  ')).toBe('')
  })
})
