import { describe, expect, it } from 'vitest'
import { cosine, profileVector } from './math.ts'

describe('profileVector', () => {
  it('subtracts half of the disliked sum from the liked sum and normalizes', () => {
    const vector = profileVector([[1, 0], [1, 0]], [[0, 2]], 2)
    const expected = [2, -1].map((value) => value / Math.sqrt(5))
    expect(vector[0]).toBeCloseTo(expected[0] ?? 0)
    expect(vector[1]).toBeCloseTo(expected[1] ?? 0)
  })

  it('returns a unit vector', () => {
    const vector = profileVector([[3, 4]], [], 2)
    expect(Math.hypot(...vector)).toBeCloseTo(1)
  })

  it('returns a zero vector when likes and dislikes cancel out', () => {
    expect(profileVector([[1, 1]], [[2, 2]], 2)).toEqual([0, 0])
  })
})

describe('cosine', () => {
  it('is 1 for parallel vectors and 0 for orthogonal ones', () => {
    expect(cosine([1, 2], [2, 4])).toBeCloseTo(1)
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('is 0 when a vector has zero length', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })
})
