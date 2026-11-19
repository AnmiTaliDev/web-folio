import { describe, expect, it } from 'vitest'
import { ApiError } from '../shared/errors.ts'
import { makeBook } from '../recommend/fixtures.ts'
import type { ScoredBook } from '../recommend/pipeline.ts'
import { getBookOfDay, type BookOfDayDeps, type BookOfDayRow } from './book-of-day.ts'
import { assertValidDay, daysBefore, languageFromHeader } from './day.ts'
import { pickBookOfDay } from './pick.ts'

function scored(id: string, score: number): ScoredBook {
  return {
    book: makeBook(id, { description: `Catalog ${id}` }),
    score,
    mode: 'popular',
    interests: [],
    active: { signal: true, genre: false, readers: false },
    components: { signal: score, genre: 0, readers: 0 },
    contributions: { signal: score, genre: 0, readers: 0 },
    likedMatch: null,
  }
}

type Calls = { complete: number; recommend: number }

function makeDeps(options: { aiEnabled?: boolean; previous?: string[]; completeImpl?: () => Promise<string>; rated?: Set<string> } = {}) {
  const rows = new Map<string, BookOfDayRow>()
  const calls: Calls = { complete: 0, recommend: 0 }
  const books = new Map([['a', scored('a', 0.9).book], ['b', scored('b', 0.8).book]])
  const deps: BookOfDayDeps = {
    findRow: async (day) => rows.get(day) ?? null,
    previousBookIds: async () => options.previous ?? [],
    recommend: async () => {
      calls.recommend++
      return [scored('a', 0.9), scored('b', 0.8)].filter((item) => !options.rated?.has(item.book.id))
    },
    aiDescriptionsEnabled: options.aiEnabled ?? true,
    complete: async () => {
      calls.complete++
      return options.completeImpl ? options.completeImpl() : 'Generated text'
    },
    model: 'test-model',
    insertRow: async (day, row) => {
      if (!rows.has(day)) {
        rows.set(day, row)
      }
    },
    deleteRow: async (day) => {
      rows.delete(day)
    },
    isRated: async (id) => options.rated?.has(id) ?? false,
    loadBook: async (id) => books.get(id) ?? makeBook(id),
  }
  return { deps, calls, rows }
}

describe('getBookOfDay', () => {
  it('replaces a stored book of the day that the user has rated since', async () => {
    const rated = new Set<string>()
    const { deps } = makeDeps({ rated })
    const first = await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')
    const firstId = first?.book.id ?? ''
    rated.add(firstId)
    const second = await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')
    expect(second?.book.id).not.toBe(firstId)
    expect((await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1'))?.book.id).toBe(second?.book.id)
  })

  it('creates the book once and does not call the model again for the same day', async () => {
    const { deps, calls } = makeDeps()
    const first = await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')
    const second = await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')
    expect(first?.book.id).toBeDefined()
    expect(first?.description).toBe('Generated text')
    expect(first?.aiGenerated).toBe(true)
    expect(second).toEqual(first)
    expect(calls.complete).toBe(1)
    expect(calls.recommend).toBe(1)
  })

  it('returns the same row for two concurrent requests', async () => {
    const { deps, rows } = makeDeps()
    const [first, second] = await Promise.all([await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1'), await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')])
    expect(rows.size).toBe(1)
    expect(first?.book.id).toBe(second?.book.id)
    expect(first?.description).toBe(second?.description)
  })

  it('does not call the model when AI descriptions are disabled and uses the catalog text', async () => {
    const { deps, calls } = makeDeps({ aiEnabled: false })
    const result = await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')
    expect(calls.complete).toBe(0)
    expect(result?.description).toBe(`Catalog ${result?.book.id}`)
    expect(result?.aiGenerated).toBe(false)
  })

  it('falls back to the catalog text when the model fails', async () => {
    const { deps } = makeDeps({
      completeImpl: async () => {
        throw new Error('provider down')
      },
    })
    const result = await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')
    expect(result?.description).toBe(`Catalog ${result?.book.id}`)
    expect(result?.aiGenerated).toBe(false)
  })

  it('skips books used on earlier days', async () => {
    const { deps } = makeDeps({ previous: ['a'] })
    const result = await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')
    expect(result?.book.id).toBe('b')
  })

  it('returns null when there is nothing to recommend', async () => {
    const { deps } = makeDeps()
    deps.recommend = async () => []
    expect(await getBookOfDay(deps, '2026-11-12', 'ru', 'user-1')).toBeNull()
  })
})

describe('pickBookOfDay', () => {
  const ranked = [scored('a', 0.9), scored('b', 0.8), scored('c', 0.7)]

  it('never picks a book that was the book of the day before', async () => {
    for (const seed of ['x', 'y', 'z', 'w']) {
      expect(pickBookOfDay(ranked, new Set(['a', 'b']), seed)?.book.id).toBe('c')
    }
  })

  it('repeats only when every candidate was used before', async () => {
    expect(pickBookOfDay(ranked, new Set(['a', 'b', 'c']), 'x')?.book.id).toBe('a')
  })

  it('gives different users different books from the same candidates', async () => {
    const many = Array.from({ length: 20 }, (_, index) => scored(`b${index}`, 0.9 - index * 0.01))
    const picks = new Set(Array.from({ length: 30 }, (_, index) => pickBookOfDay(many, new Set(), `user-${index}:2026-11-13`)?.book.id))
    expect(picks.size).toBeGreaterThan(3)
  })

  it('is stable for the same user and day', async () => {
    const many = Array.from({ length: 20 }, (_, index) => scored(`b${index}`, 0.9 - index * 0.01))
    expect(pickBookOfDay(many, new Set(), 'u:2026-11-13')?.book.id).toBe(pickBookOfDay(many, new Set(), 'u:2026-11-13')?.book.id)
  })

  it('picks only from the best candidates', async () => {
    const many = Array.from({ length: 20 }, (_, index) => scored(`b${index}`, 0.9 - index * 0.01))
    const ids = new Set(Array.from({ length: 50 }, (_, index) => pickBookOfDay(many, new Set(), `s${index}`)?.book.id))
    for (const id of ids) {
      expect(Number((id ?? '').slice(1))).toBeLessThan(8)
    }
  })
})

describe('assertValidDay', () => {
  const now = new Date('2026-11-12T10:00:00Z')

  it('accepts the server date and one day either side', async () => {
    for (const day of ['2026-11-11', '2026-11-12', '2026-11-13']) {
      expect(() => assertValidDay(day, now)).not.toThrow()
    }
  })

  it('rejects dates two days away', async () => {
    expect(() => assertValidDay('2026-11-14', now)).toThrow(ApiError)
    expect(() => assertValidDay('2026-11-10', now)).toThrow(ApiError)
  })

  it('rejects malformed and impossible dates', async () => {
    for (const day of ['today', '2026-13-01', '2026-02-30', '12.11.2026']) {
      expect(() => assertValidDay(day, now)).toThrow(ApiError)
    }
  })
})

describe('daysBefore', () => {
  it('subtracts whole days across a month boundary', async () => {
    expect(daysBefore('2026-11-12', 30)).toBe('2026-10-13')
  })
})

describe('languageFromHeader', () => {
  it('uses the first language tag', async () => {
    expect(languageFromHeader('en-US,en;q=0.9')).toBe('en')
  })

  it('defaults to en', async () => {
    expect(languageFromHeader(null)).toBe('en')
    expect(languageFromHeader('*')).toBe('en')
  })
})
