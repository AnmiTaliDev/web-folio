import { describe, expect, it } from 'vitest'
import { loadBundledCatalog } from '../catalog/bundled.ts'
import { openDatabase } from '../db/database.ts'
import { browseBooks, type BrowseSort } from './books-store.ts'

type Options = { genre?: string | null; query?: string; sort?: BrowseSort; offset?: number; limit?: number }

function browse(db: ReturnType<typeof openDatabase>, options: Options) {
  return browseBooks(db, { genre: options.genre ?? null, query: options.query ?? '', sort: options.sort ?? 'popularity', offset: options.offset ?? 0, limit: options.limit ?? 20 })
}

function seeded() {
  const db = openDatabase(':memory:')
  const loaded = loadBundledCatalog(db)
  return { db, loaded }
}

describe('browseBooks', () => {
  it('pages through all books in popularity order', async () => {
    const { db, loaded } = seeded()
    const first = await browse(db, { limit: 10 })
    const second = await browse(db, { offset: 10, limit: 10 })
    expect(first.total).toBe(loaded)
    expect(first.books).toHaveLength(10)
    expect(second.books.map((book) => book.id)).not.toEqual(expect.arrayContaining(first.books.map((book) => book.id)))
    expect(first.books[0]?.popularity).toBeGreaterThanOrEqual(second.books[0]?.popularity ?? 0)
  })

  it('filters by genre and reports the filtered total', async () => {
    const { db, loaded } = seeded()
    const result = await browse(db, { genre: 'dystopia', limit: 200 })
    expect(result.total).toBeGreaterThan(0)
    expect(result.total).toBeLessThan(loaded)
    expect(result.books).toHaveLength(result.total)
    expect(result.books.every((book) => book.genres.includes('dystopia'))).toBe(true)
  })

  it('returns an empty page past the end', async () => {
    const { db } = seeded()
    expect((await browse(db, { offset: 100000, limit: 10 })).books).toEqual([])
  })

  it('sorts by title, author and year', async () => {
    const { db } = seeded()
    const titles = (await browse(db, { sort: 'title', limit: 300 })).books.map((book) => book.title.toLowerCase())
    expect(titles).toEqual([...titles].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
    const oldest = (await browse(db, { sort: 'year_asc', limit: 3 })).books
    expect(oldest[0]?.firstPublishYear ?? 0).toBeLessThan(0)
    const newest = (await browse(db, { sort: 'year_desc', limit: 1 })).books[0]
    expect(newest?.firstPublishYear).toBeGreaterThanOrEqual(2022)
    const authors = (await browse(db, { sort: 'author', limit: 300 })).books.map((book) => (book.authors[0] ?? '').toLowerCase())
    expect(authors).toEqual([...authors].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
  })

  it('searches inside a genre, case-insensitively and with Cyrillic', async () => {
    const { db } = seeded()
    const found = await browse(db, { genre: 'classics', query: 'ДОСТОЕВСКИЙ', limit: 50 })
    expect(found.total).toBeGreaterThan(3)
    expect(found.books.every((book) => book.authors.some((author) => author.includes('Достоевский')))).toBe(true)
    expect((await browse(db, { genre: 'dystopia', query: 'достоевский' })).total).toBe(0)
  })

  it('treats percent signs in the query literally', async () => {
    const { db } = seeded()
    expect((await browse(db, { query: '100%' })).total).toBe(0)
  })
})
