import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database.ts'
import { searchBooks } from '../shared/books-store.ts'
import { BUNDLED_CATALOG_PATH, bookCount, loadBundledCatalog, parseBundledCatalog, sourceKeyOf } from './bundled.ts'
import { GENRE_KEYS } from './genre-map.ts'

const text = readFileSync(BUNDLED_CATALOG_PATH, 'utf8')

describe('bundled catalog file', () => {
  const books = parseBundledCatalog(text)

  it('holds a few hundred valid books', () => {
    expect(books.length).toBeGreaterThanOrEqual(400)
    expect(books.length).toBeLessThanOrEqual(700)
  })

  it('has no duplicate source keys', () => {
    const keys = books.map(sourceKeyOf)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('covers every interest genre with enough books', () => {
    for (const genre of GENRE_KEYS) {
      expect(books.filter((book) => book.genres.includes(genre)).length).toBeGreaterThanOrEqual(20)
    }
  })

  it('keeps descriptions short and without placeholder text', () => {
    for (const book of books) {
      expect(book.description.length).toBeLessThanOrEqual(400)
      expect(book.description).not.toMatch(/anonymous|lorem|todo/i)
    }
  })

  it('contains no em dashes', () => {
    expect(text).not.toContain('—')
  })
})

describe('loadBundledCatalog', () => {
  it('rejects malformed lines with the line number', () => {
    expect(() => parseBundledCatalog('{"title":"x"}')).toThrow('Invalid catalog line 1')
  })

  it('loads into an empty database and is idempotent', () => {
    const db = openDatabase(':memory:')
    const loaded = loadBundledCatalog(db)
    expect(bookCount(db)).toBe(loaded)
    expect(loadBundledCatalog(db)).toBe(loaded)
    expect(bookCount(db)).toBe(loaded)
    const row = db.prepare("select title, description, first_publish_year as year from books where title = '1984'").get() as {
      title: string
      description: string
      year: number
    }
    expect(row.year).toBe(1949)
    expect(row.description.length).toBeGreaterThan(20)
  })

  it('finds Cyrillic titles and authors regardless of case', async () => {
    const db = openDatabase(':memory:')
    loadBundledCatalog(db)
    expect((await searchBooks(db, 'мастер и маргарита', 5)).map((book) => book.title)).toContain('Мастер и Маргарита')
    expect((await searchBooks(db, 'БУЛГАКОВ', 5)).length).toBeGreaterThan(0)
  })
})
