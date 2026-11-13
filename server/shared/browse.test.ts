import { describe, expect, it } from 'vitest'
import { loadBundledCatalog } from '../catalog/bundled.ts'
import { openDatabase } from '../db/database.ts'
import { browseBooks } from './books-store.ts'

function seeded() {
  const db = openDatabase(':memory:')
  const loaded = loadBundledCatalog(db)
  return { db, loaded }
}

describe('browseBooks', () => {
  it('pages through all books in popularity order', async () => {
    const { db, loaded } = seeded()
    const first = await browseBooks(db, null, 0, 10)
    const second = await browseBooks(db, null, 10, 10)
    expect(first.total).toBe(loaded)
    expect(first.books).toHaveLength(10)
    expect(second.books.map((book) => book.id)).not.toEqual(expect.arrayContaining(first.books.map((book) => book.id)))
    expect(first.books[0]?.popularity).toBeGreaterThanOrEqual(second.books[0]?.popularity ?? 0)
  })

  it('filters by genre and reports the filtered total', async () => {
    const { db, loaded } = seeded()
    const result = await browseBooks(db, 'dystopia', 0, 200)
    expect(result.total).toBeGreaterThan(0)
    expect(result.total).toBeLessThan(loaded)
    expect(result.books).toHaveLength(result.total)
    expect(result.books.every((book) => book.genres.includes('dystopia'))).toBe(true)
  })

  it('returns an empty page past the end', async () => {
    const { db } = seeded()
    expect((await browseBooks(db, null, 100000, 10)).books).toEqual([])
  })
})
