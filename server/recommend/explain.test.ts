import { describe, expect, it } from 'vitest'
import { buildReasons, splitPercents } from './explain.ts'
import { makeBook } from './fixtures.ts'
import type { ScoredBook } from './pipeline.ts'

function scoredWith(contributions: ScoredBook['contributions'], mode: ScoredBook['mode'] = 'profile'): ScoredBook {
  return {
    book: makeBook('x', { genres: ['fantasy', 'classics'] }),
    score: 0.5,
    mode,
    interests: ['fantasy'],
    active: { signal: true, genre: true, readers: true },
    components: { signal: 0, genre: 0, readers: 0 },
    contributions,
    likedMatch: { bookId: 'l1', title: 'Dune' },
  }
}

describe('splitPercents', () => {
  it('sums to 100 for uneven shares', () => {
    const percents = splitPercents([0.1, 0.1, 0.1])
    expect(percents.reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('sums to 100 for many random shares', () => {
    for (let n = 1; n <= 20; n++) {
      const values = Array.from({ length: n }, (_, i) => ((i * 7919) % 13) + 1)
      expect(splitPercents(values).reduce((a, b) => a + b, 0)).toBe(100)
    }
  })

  it('returns zeros when the total is zero', () => {
    expect(splitPercents([0, 0])).toEqual([0, 0])
  })
})

describe('buildReasons', () => {
  it('sums to 100 and uses the real liked book title', () => {
    const reasons = buildReasons(scoredWith({ signal: 0.31, genre: 0.17, readers: 0.04 }))
    expect(reasons.reduce((sum, reason) => sum + reason.percent, 0)).toBe(100)
    const liked = reasons.find((reason) => reason.type === 'liked_book')
    expect(liked?.title).toBe('Dune')
    expect(liked?.bookId).toBe('l1')
    expect(liked?.label).toContain('Dune')
  })

  it('skips components with zero contribution and recomputes the shares', () => {
    const reasons = buildReasons(scoredWith({ signal: 0.3, genre: 0, readers: 0 }))
    expect(reasons).toHaveLength(1)
    expect(reasons[0]?.percent).toBe(100)
  })

  it('lists only genres shared with the interests', () => {
    const reasons = buildReasons(scoredWith({ signal: 0, genre: 0.2, readers: 0 }))
    expect(reasons[0]?.genres).toEqual(['fantasy'])
  })

  it('reports a popular reason in popular mode', () => {
    const reasons = buildReasons(scoredWith({ signal: 0.4, genre: 0, readers: 0 }, 'popular'))
    expect(reasons[0]?.type).toBe('popular')
  })
})
