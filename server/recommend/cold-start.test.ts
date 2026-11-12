import { describe, expect, it } from 'vitest'
import { makeBook } from './fixtures.ts'
import { scoreCandidates } from './pipeline.ts'

describe('cold start scoring', () => {
  const candidates = [
    makeBook('a', { genres: ['fantasy'], popularity: 1000 }),
    makeBook('b', { genres: ['fantasy'], popularity: 10 }),
    makeBook('c', { genres: ['history'], popularity: 5000 }),
  ]

  it('scores by popularity and genre match without embeddings', async () => {
    const scored = await scoreCandidates({
      mode: 'popular',
      profile: { interests: ['fantasy'], personalizationEnabled: true, aiDescriptionsEnabled: true },
      liked: [],
      disliked: [],
      candidates,
      readers: new Map(),
      dim: 0,
    })
    const byId = new Map(scored.map((item) => [item.book.id, item]))
    expect(byId.get('a')?.components.genre).toBe(1)
    expect(byId.get('c')?.components.genre).toBe(0)
    expect(byId.get('c')?.components.signal).toBeCloseTo(1)
    expect((byId.get('a')?.score ?? 0) > (byId.get('b')?.score ?? 0)).toBe(true)
    expect(byId.get('a')?.active.readers).toBe(false)
  })

  it('deactivates the genre component when no interests are selected', async () => {
    const scored = await scoreCandidates({
      mode: 'popular',
      profile: { interests: [], personalizationEnabled: true, aiDescriptionsEnabled: true },
      liked: [],
      disliked: [],
      candidates,
      readers: new Map(),
      dim: 0,
    })
    expect(scored.every((item) => !item.active.genre)).toBe(true)
    expect(scored.find((item) => item.book.id === 'c')?.score).toBeCloseTo(1)
  })
})

describe('profile mode scoring', () => {
  it('ranks the candidate closest to the liked book first and records the liked book match', async () => {
    const liked = makeBook('liked', { embedding: [1, 0] })
    const scored = await scoreCandidates({
      mode: 'profile',
      profile: { interests: [], personalizationEnabled: true, aiDescriptionsEnabled: true },
      liked: [liked],
      disliked: [],
      candidates: [makeBook('near', { embedding: [0.9, 0.1] }), makeBook('far', { embedding: [0, 1] })],
      readers: new Map(),
      dim: 2,
    })
    const near = scored.find((item) => item.book.id === 'near')
    const far = scored.find((item) => item.book.id === 'far')
    expect((near?.score ?? 0) > (far?.score ?? 0)).toBe(true)
    expect(near?.likedMatch).toEqual({ bookId: 'liked', title: 'Title liked' })
  })
})
