import { describe, expect, it } from 'vitest'
import { EVAL_KS, evaluateUsers, parseRatingsCsv, splitLikes, type EvalUser } from './evaluate.ts'
import { makeBook } from './fixtures.ts'
import { ndcgAtK, precisionAtK } from './metrics.ts'

describe('metrics', () => {
  it('computes precision at K', () => {
    expect(precisionAtK(['a', 'b', 'c', 'd', 'e'], new Set(['a', 'c', 'z']), 5)).toBeCloseTo(0.4)
    expect(precisionAtK(['a', 'b'], new Set(['a']), 5)).toBeCloseTo(0.2)
  })

  it('computes NDCG at K for binary relevance', () => {
    expect(ndcgAtK(['a', 'b', 'c'], new Set(['a']), 3)).toBeCloseTo(1)
    expect(ndcgAtK(['x', 'a', 'c'], new Set(['a']), 3)).toBeCloseTo(1 / Math.log2(3))
    expect(ndcgAtK(['x', 'y', 'z'], new Set(['a']), 3)).toBe(0)
  })

  it('caps the ideal DCG by K', () => {
    expect(ndcgAtK(['a', 'b'], new Set(['a', 'b', 'c', 'd']), 2)).toBeCloseTo(1)
  })

  it('is 0 when nothing is relevant', () => {
    expect(ndcgAtK(['a'], new Set(), 5)).toBe(0)
  })
})

describe('parseRatingsCsv', () => {
  it('reads rows by header name and skips invalid rows', () => {
    const rows = parseRatingsCsv('user_id,isbn,value\nu1,978-0-00-000001-1,1\nu1,9780000000028,-1\nu2,9780000000035,5\n,9780000000042,1\n')
    expect(rows).toEqual([
      { userId: 'u1', isbn: '9780000000011', value: 1 },
      { userId: 'u1', isbn: '9780000000028', value: -1 },
    ])
  })

  it('rejects a CSV without the required header', () => {
    expect(() => parseRatingsCsv('user,book,rating\nu1,x,1')).toThrow()
  })
})

describe('splitLikes', () => {
  const likes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

  it('is deterministic for a seed and partitions the likes', () => {
    const first = splitLikes(likes, 1)
    expect(splitLikes(likes, 1)).toEqual(first)
    expect([...first.visible, ...first.hidden].sort()).toEqual(likes)
    expect(first.hidden).toHaveLength(3)
  })

  it('hides at least one like', () => {
    expect(splitLikes(['a', 'b'], 1).hidden).toHaveLength(1)
  })
})

describe('evaluateUsers', () => {
  const clusterA = Array.from({ length: 12 }, (_, i) => makeBook(`a${i}`, { embedding: [1, 0.1 * (i % 3), 0, 0], popularity: 1 }))
  const clusterB = Array.from({ length: 12 }, (_, i) => makeBook(`b${i}`, { embedding: [0, 1, 0.1 * (i % 3), 0], popularity: 1000 }))
  const books = [...clusterA, ...clusterB]
  const users: EvalUser[] = [0, 1, 2].map((u) => ({
    userId: `u${u}`,
    ratings: [
      ...clusterA.slice(u, u + 6).map((book) => ({ bookId: book.id, value: 1 as const })),
      ...clusterB.slice(u, u + 3).map((book) => ({ bookId: book.id, value: -1 as const })),
    ],
  }))

  it('skips users without enough likes or dislikes', async () => {
    const result = await evaluateUsers([{ userId: 'x', ratings: [{ bookId: 'a0', value: 1 }] }], books, 1)
    expect(result.users).toBe(0)
    expect(result.methods.cosine.precision[5]).toBe(0)
  })

  it('reports metrics for K 5 and 15 for all three methods', async () => {
    const result = await evaluateUsers(users, books, 1)
    expect(result.users).toBe(3)
    for (const method of Object.values(result.methods)) {
      for (const k of EVAL_KS) {
        expect(method.precision[k]).toBeGreaterThanOrEqual(0)
        expect(method.precision[k]).toBeLessThanOrEqual(1)
        expect(method.ndcg[k]).toBeGreaterThanOrEqual(0)
        expect(method.ndcg[k]).toBeLessThanOrEqual(1)
      }
    }
  })

  it('ranks the embedding based methods above popularity on clustered data', async () => {
    const result = await evaluateUsers(users, books, 1)
    expect(result.methods.cosine.precision[5] ?? 0).toBeGreaterThan(result.methods.popularity.precision[5] ?? 1)
    expect(result.methods.mlp.precision[5] ?? 0).toBeGreaterThan(result.methods.popularity.precision[5] ?? 1)
  })
})
