import { describe, expect, it } from 'vitest'
import { coverSpec, hashOf, MOTIFS, PALETTES, wrapTitle } from './coverArt.ts'

describe('coverSpec', () => {
  it('is deterministic for an id and always inside the known ranges', () => {
    expect(coverSpec('book-1')).toEqual(coverSpec('book-1'))
    for (let index = 0; index < 200; index++) {
      const spec = coverSpec(`id-${index}`)
      expect(MOTIFS).toContain(spec.motif)
      expect(PALETTES).toContain(spec.palette)
      for (const value of [spec.a, spec.b, spec.c]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    }
  })

  it('spreads books across all motifs and palettes', () => {
    const specs = Array.from({ length: 300 }, (_, index) => coverSpec(`book-${index}`))
    expect(new Set(specs.map((spec) => spec.motif)).size).toBe(MOTIFS.length)
    expect(new Set(specs.map((spec) => spec.palette)).size).toBe(PALETTES.length)
  })

  it('hashes different texts differently', () => {
    expect(hashOf('a')).not.toBe(hashOf('b'))
  })
})

describe('wrapTitle', () => {
  it('wraps words into short lines without breaking a word', () => {
    expect(wrapTitle('The Lord of the Rings', 11)).toEqual(['The Lord of', 'the Rings'])
    expect(wrapTitle('Dune')).toEqual(['Dune'])
  })

  it('limits the number of lines and marks the cut', () => {
    const lines = wrapTitle('one two three four five six seven eight nine ten eleven twelve', 8, 3)
    expect(lines).toHaveLength(3)
    expect(lines[2]?.endsWith('…')).toBe(true)
  })

  it('shortens a single very long word', () => {
    const [line] = wrapTitle('Pneumonoultramicroscopic', 11)
    expect(line?.length).toBeLessThanOrEqual(14)
    expect(line?.endsWith('…')).toBe(true)
  })

  it('returns nothing for an empty title', () => {
    expect(wrapTitle('   ')).toEqual([])
  })
})
