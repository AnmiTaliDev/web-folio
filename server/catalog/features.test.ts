import { describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database.ts'
import { loadBooks, popularBooks } from '../shared/books-store.ts'
import { encodeEmbedding } from '../shared/embedding-codec.ts'
import { cosine } from '../recommend/math.ts'
import { bookIdOf, loadBundledCatalog } from './bundled.ts'
import { FEATURE_DIM, featureEmbedding } from './features.ts'

const base = { genres: ['dystopia'], themes: ['power', 'freedom'], difficulty: 'medium', length: 'medium', year: 1949, original: 'en' }

describe('feature embeddings', () => {
  it('have a fixed dimension and unit length', async () => {
    const vector = featureEmbedding(base)
    expect(vector).toHaveLength(FEATURE_DIM)
    expect(Math.hypot(...vector)).toBeCloseTo(1, 6)
  })

  it('rank a book with shared genres and themes above an unrelated one', async () => {
    const similar = featureEmbedding({ ...base, themes: ['power', 'society'], year: 1932 })
    const unrelated = featureEmbedding({ genres: ['popular_science'], themes: ['science', 'nature'], difficulty: 'easy', length: 'short', year: 2015, original: 'ru' })
    expect(cosine(featureEmbedding(base), similar)).toBeGreaterThan(cosine(featureEmbedding(base), unrelated))
  })

  it('are stored for every bundled book and never replace embeddings of another size', async () => {
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db)
    const withoutVector = await db.get('select count(*) as c from books where embedding is null') as { c: number }
    expect(withoutVector.c).toBe(0)
    const id = bookIdOf('1984')
    expect((await loadBooks(db, [id]))[0]?.embedding).toHaveLength(FEATURE_DIM)
    await db.run('update books set embedding = ? where id = ?', encodeEmbedding([1, 2, 3]), id)
    await loadBundledCatalog(db)
    expect((await loadBooks(db, [id]))[0]?.embedding).toEqual([1, 2, 3])
  })
})

describe('popular books with a long exclusion list', () => {
  it('still returns the requested number of books and none of the excluded ones', async () => {
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db)
    const top = await popularBooks(db, [], 40, [])
    const excluded = top.slice(0, 30).map((book) => book.id)
    const result = await popularBooks(db, [], 5, excluded)
    expect(result).toHaveLength(5)
    expect(result.some((book) => excluded.includes(book.id))).toBe(false)
    expect(result[0]?.id).toBe(top[30]?.id)
  })
})
