import { describe, expect, it } from 'vitest'
import { similarReaderShares } from './readers.ts'

describe('similarReaderShares', () => {
  it('is empty when no other user shares a like', async () => {
    const shares = similarReaderShares(new Set(['a']), new Map([['u1', new Set(['b'])]]), ['c'])
    expect(shares.size).toBe(0)
  })

  it('is empty when there are no other users', async () => {
    expect(similarReaderShares(new Set(['a']), new Map(), ['c']).size).toBe(0)
  })

  it('counts the share among users who liked the same books', async () => {
    const others = new Map([
      ['u1', new Set(['a', 'c'])],
      ['u2', new Set(['a', 'd'])],
      ['u3', new Set(['x', 'c'])],
    ])
    const shares = similarReaderShares(new Set(['a']), others, ['c', 'd'])
    expect(shares.get('c')).toBeCloseTo(0.5)
    expect(shares.get('d')).toBeCloseTo(0.5)
  })
})
