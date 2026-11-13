import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database.ts'
import { loadBooks, localizeBooks, searchBooks } from '../shared/books-store.ts'
import { BUNDLED_CATALOG_PATH, bookCount, bookIdOf, loadBundledCatalog, parseBundledCatalog, sourceKeyOf } from './bundled.ts'
import { GENRE_KEYS } from './genre-map.ts'

const text = readFileSync(BUNDLED_CATALOG_PATH, 'utf8')

describe('bundled catalog file', () => {
  const books = parseBundledCatalog(text)

  it('holds a few hundred valid books', () => {
    expect(books.length).toBeGreaterThanOrEqual(400)
    expect(books.length).toBeLessThanOrEqual(700)
  })

  it('has unique ids and unique deterministic uuids', () => {
    expect(new Set(books.map(sourceKeyOf)).size).toBe(books.length)
    expect(new Set(books.map((book) => bookIdOf(book.id))).size).toBe(books.length)
  })

  it('covers every interest genre with enough books', () => {
    for (const genre of GENRE_KEYS) {
      expect(books.filter((book) => book.genres.includes(genre)).length).toBeGreaterThanOrEqual(20)
    }
  })

  it('has a Russian and an English variant for every book, with Cyrillic and Latin text respectively', () => {
    for (const book of books) {
      expect(book.ru.description, book.id).toMatch(/[А-Яа-яЁё]/)
      expect(book.ru.authors.join(''), book.id).toMatch(/[А-Яа-яЁё]/)
      expect(book.en.title + book.en.authors.join('') + book.en.description, book.id).not.toMatch(/[А-Яа-яЁё]/)
    }
  })

  it('keeps descriptions short and without placeholder text', () => {
    for (const book of books) {
      for (const variant of [book.ru, book.en]) {
        expect(variant.description.length, book.id).toBeLessThanOrEqual(400)
        expect(variant.description, book.id).not.toMatch(/lorem|todo|placeholder/i)
      }
    }
  })

  it('contains no em dashes', () => {
    expect(text).not.toContain('—')
  })
})

describe('bookIdOf', () => {
  it('is a stable UUID derived from the slug', () => {
    expect(bookIdOf('1984')).toBe(bookIdOf('1984'))
    expect(bookIdOf('1984')).not.toBe(bookIdOf('dune'))
    expect(bookIdOf('1984')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('loadBundledCatalog', () => {
  it('rejects malformed lines with the line number', () => {
    expect(() => parseBundledCatalog('{"id":"x"}')).toThrow('Invalid catalog line 1')
  })

  it('loads into an empty database with two translations per book and is idempotent', () => {
    const db = openDatabase(':memory:')
    const loaded = loadBundledCatalog(db)
    expect(bookCount(db)).toBe(loaded)
    expect(db.prepare('select count(*) as c from book_translations').get()).toEqual({ c: loaded * 2 })
    expect(loadBundledCatalog(db)).toBe(loaded)
    expect(bookCount(db)).toBe(loaded)
    expect(db.prepare('select count(*) as c from book_translations').get()).toEqual({ c: loaded * 2 })
  })

  it('keeps the same book id across databases', () => {
    const first = openDatabase(':memory:')
    const second = openDatabase(':memory:')
    loadBundledCatalog(first)
    loadBundledCatalog(second)
    const idOf = (db: typeof first) => (db.prepare("select id from books where source_key = '/bundled/1984'").get() as { id: string }).id
    expect(idOf(first)).toBe(idOf(second))
    expect(idOf(first)).toBe(bookIdOf('1984'))
  })

  it('serves titles, authors and descriptions in the requested language', async () => {
    const db = openDatabase(':memory:')
    loadBundledCatalog(db)
    const [book] = await loadBooks(db, [bookIdOf('the-master-and-margarita')])
    const ru = (await localizeBooks(db, [book!], 'ru'))[0]
    const en = (await localizeBooks(db, [book!], 'en'))[0]
    expect(ru?.title).toBe('Мастер и Маргарита')
    expect(ru?.authors).toEqual(['Михаил Булгаков'])
    expect(en?.title).toBe('The Master and Margarita')
    expect(en?.authors).toEqual(['Mikhail Bulgakov'])
    expect(en?.description).not.toMatch(/[А-Яа-яЁё]/)
    expect((await localizeBooks(db, [book!], 'de'))[0]?.title).toBe('The Master and Margarita')
  })

  it('finds a book by its title in either language', async () => {
    const db = openDatabase(':memory:')
    loadBundledCatalog(db)
    expect((await searchBooks(db, 'мастер и маргарита', 5)).map((book) => book.id)).toContain(bookIdOf('the-master-and-margarita'))
    expect((await searchBooks(db, 'master and margarita', 5)).map((book) => book.id)).toContain(bookIdOf('the-master-and-margarita'))
    expect((await searchBooks(db, 'оруэлл', 5)).length).toBeGreaterThan(0)
    expect((await searchBooks(db, 'orwell', 5)).length).toBeGreaterThan(0)
  })

  it('removes bundled rows from the old key format', () => {
    const db = openDatabase(':memory:')
    db.prepare("insert into books (id, source_key, title, language) values ('old', '/bundled/dune|frank herbert', 'Dune', 'eng')").run()
    loadBundledCatalog(db)
    expect(db.prepare("select count(*) as c from books where id = 'old'").get()).toEqual({ c: 0 })
  })
})
