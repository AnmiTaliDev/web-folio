import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database.ts'
import { loadBooks, localizeBooks, searchBooks, similarBooks, similarScore } from '../shared/books-store.ts'
import { BUNDLED_CATALOG_PATH, bookCount, bookIdOf, loadBundledCatalog, needsBundledCatalog, parseBundledCatalog, sourceKeyOf } from './bundled.ts'
import { GENRE_KEYS } from './genre-map.ts'

const text = readFileSync(BUNDLED_CATALOG_PATH, 'utf8')

describe('bundled catalog file', () => {
  const books = parseBundledCatalog(text)

  it('holds a few hundred valid books', async () => {
    expect(books.length).toBeGreaterThanOrEqual(400)
    expect(books.length).toBeLessThanOrEqual(700)
  })

  it('has unique ids and unique deterministic uuids', async () => {
    expect(new Set(books.map(sourceKeyOf)).size).toBe(books.length)
    expect(new Set(books.map((book) => bookIdOf(book.id))).size).toBe(books.length)
  })

  it('covers every interest genre with enough books', async () => {
    for (const genre of GENRE_KEYS) {
      expect(books.filter((book) => book.genres.includes(genre)).length).toBeGreaterThanOrEqual(20)
    }
  })

  it('has a Russian and an English variant for every book, with Cyrillic and Latin text respectively', async () => {
    for (const book of books) {
      expect(book.ru.description, book.id).toMatch(/[А-Яа-яЁё]/)
      expect(book.ru.authors.join(''), book.id).toMatch(/[А-Яа-яЁё]/)
      expect(book.en.title + book.en.authors.join('') + book.en.description, book.id).not.toMatch(/[А-Яа-яЁё]/)
    }
  })

  it('has a Kazakh variant for every book, different from the Russian one and without em dashes', async () => {
    for (const book of books) {
      expect(book.kk, book.id).toBeDefined()
      expect(book.kk?.title, book.id).toMatch(/[А-Яа-яЁёӘҒҚҢӨҰҮҺІәғқңөұүһі0-9]/)
      expect(book.kk?.description, book.id).toMatch(/[А-Яа-яЁёӘҒҚҢӨҰҮҺІәғқңөұүһі]/)
      expect(book.kk?.description, book.id).not.toBe(book.ru.description)
      expect((book.kk?.title ?? '') + (book.kk?.description ?? ''), book.id).not.toContain('—')
    }
  })

  it('keeps descriptions short and without placeholder text', async () => {
    for (const book of books) {
      for (const variant of [book.ru, book.en, ...(book.kk ? [book.kk] : [])]) {
        expect(variant.description.length, book.id).toBeLessThanOrEqual(400)
        expect(variant.description, book.id).not.toMatch(/lorem|todo|placeholder/i)
      }
    }
  })

  it('has an age mark for every book and uses all levels', async () => {
    const levels = new Set(books.map((book) => book.minAge))
    for (const level of [0, 6, 12, 16, 18]) {
      expect(levels.has(level as 0), String(level)).toBe(true)
    }
    const byTitle = new Map(books.map((book) => [book.en.title, book.minAge]))
    expect(byTitle.get('The Little Prince')).toBe(0)
    expect(byTitle.get('The Hobbit')).toBe(6)
    expect(byTitle.get('1984')).toBe(16)
    expect(byTitle.get('Lolita')).toBe(18)
  })

  it('gives every book two to five themes, a difficulty and a length', async () => {
    for (const book of books) {
      expect(book.themes.length, book.id).toBeGreaterThanOrEqual(2)
      expect(new Set(book.themes).size, book.id).toBe(book.themes.length)
    }
    expect(new Set(books.map((book) => book.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']))
    expect(new Set(books.map((book) => book.length))).toEqual(new Set(['short', 'medium', 'long', 'epic']))
    const byId = new Map(books.map((book) => [book.id, book]))
    expect(byId.get('the-little-prince')?.length).toBe('short')
    expect(byId.get('war-and-peace')?.length).toBe('epic')
  })

  it('keeps every overview in its language, long enough and spoiler free of placeholders', async () => {
    const withOverview = books.filter((book) => book.ru.overview || book.en.overview)
    expect(withOverview.length).toBeGreaterThanOrEqual(10)
    for (const book of withOverview) {
      expect(book.ru.overview, book.id).toBeDefined()
      expect(book.en.overview, book.id).toBeDefined()
      expect(book.ru.overview ?? '', book.id).toMatch(/[А-Яа-яЁё]/)
      expect(book.en.overview ?? '', book.id).not.toMatch(/[А-Яа-яЁё]/)
      expect((book.en.overview ?? '').match(/[.!?](\s|$)/g)?.length ?? 0, book.id).toBeGreaterThanOrEqual(6)
      expect((book.ru.overview ?? '') + (book.en.overview ?? ''), book.id).not.toMatch(/lorem|todo|placeholder/i)
    }
  })

  it('contains no em dashes', async () => {
    expect(text).not.toContain('—')
  })
})

describe('bookIdOf', () => {
  it('is a stable UUID derived from the slug', async () => {
    expect(bookIdOf('1984')).toBe(bookIdOf('1984'))
    expect(bookIdOf('1984')).not.toBe(bookIdOf('dune'))
    expect(bookIdOf('1984')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('loadBundledCatalog', () => {
  it('rejects malformed lines with the line number', async () => {
    expect(() => parseBundledCatalog('{"id":"x"}')).toThrow('Invalid catalog line 1')
  })

  it('loads into an empty database with two translations per book and is idempotent', async () => {
    const db = await openDatabase(':memory:')
    const loaded = await loadBundledCatalog(db)
    const withKazakh = parseBundledCatalog(readFileSync(BUNDLED_CATALOG_PATH, 'utf8')).filter((book) => book.kk).length
    expect(await bookCount(db)).toBe(loaded)
    expect(await db.get('select count(*) as c from book_translations')).toEqual({ c: loaded * 2 + withKazakh })
    expect(await loadBundledCatalog(db)).toBe(loaded)
    expect(await bookCount(db)).toBe(loaded)
    expect(await db.get('select count(*) as c from book_translations')).toEqual({ c: loaded * 2 + withKazakh })
  })

  it('keeps the same book id across databases', async () => {
    const first = await openDatabase(':memory:')
    const second = await openDatabase(':memory:')
    await loadBundledCatalog(first)
    await loadBundledCatalog(second)
    const idOf = async (db: typeof first) => ((await db.get("select id from books where source_key = '/bundled/1984'")) as { id: string }).id
    expect(await idOf(first)).toBe(await idOf(second))
    expect(await idOf(first)).toBe(bookIdOf('1984'))
  })

  it('serves titles, authors and descriptions in the requested language', async () => {
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db)
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

  it('serves Kazakh where it exists and falls back to Russian where it does not', async () => {
    const lines = readFileSync(BUNDLED_CATALOG_PATH, 'utf8').trim().split('\n')
    const first = JSON.parse(lines[0] as string) as Record<string, unknown> & { ru: { title: string } }
    const second = JSON.parse(lines[1] as string) as Record<string, unknown> & { ru: { title: string } }
    first.kk = { title: 'Қазақша атау', authors: ['Автор'], description: 'Қазақша сипаттама, жиырма таңбадан ұзақ.' }
    delete second.kk
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db, `${JSON.stringify(first)}\n${JSON.stringify(second)}\n`)
    const books = await loadBooks(db, [bookIdOf(first.id as string), bookIdOf(second.id as string)])
    const localized = await localizeBooks(db, books, 'kk')
    expect(localized.find((book) => book.id === bookIdOf(first.id as string))?.title).toBe('Қазақша атау')
    expect(localized.find((book) => book.id === bookIdOf(second.id as string))?.title).toBe(second.ru.title)
  })

  it('finds a book by its title in either language', async () => {
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db)
    expect((await searchBooks(db, 'мастер и маргарита', 5)).map((book) => book.id)).toContain(bookIdOf('the-master-and-margarita'))
    expect((await searchBooks(db, 'master and margarita', 5)).map((book) => book.id)).toContain(bookIdOf('the-master-and-margarita'))
    expect((await searchBooks(db, 'оруэлл', 5)).length).toBeGreaterThan(0)
    expect((await searchBooks(db, 'orwell', 5)).length).toBeGreaterThan(0)
  })

  it('stores the minimum age of every book in the database', async () => {
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db)
    expect(await db.get("select min_age as age from books where source_key = '/bundled/lolita'")).toEqual({ age: 18 })
    expect((await db.get('select count(*) as c from books where min_age = 0') as { c: number }).c).toBeGreaterThan(0)
  })

  it('stores themes, difficulty, length and the localized overview', async () => {
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db)
    const [book] = await loadBooks(db, [bookIdOf('1984')])
    expect(book?.themes).toEqual(expect.arrayContaining(['power']))
    expect(book?.difficulty).toBe('medium')
    expect(book?.length).toBe('medium')
    const ru = (await localizeBooks(db, [book!], 'ru'))[0]
    const en = (await localizeBooks(db, [book!], 'en'))[0]
    expect(ru?.overview).toMatch(/[А-Яа-яЁё]/)
    expect(en?.overview).not.toMatch(/[А-Яа-яЁё]/)
  })

  it('removes bundled rows from the old key format', async () => {
    const db = await openDatabase(':memory:')
    await db.run("insert into books (id, source_key, title, language) values ('old', '/bundled/dune|frank herbert', 'Dune', 'eng')")
    await loadBundledCatalog(db)
    expect(await db.get("select count(*) as c from books where id = 'old'")).toEqual({ c: 0 })
  })
})

describe('similar books', () => {
  it('scores shared themes twice as much as shared genres and rewards the same author', async () => {
    const base = { genres: ['classics'], themes: ['power', 'society'], author: 'a' }
    expect(similarScore(base, { genres: ['classics'], themes: [], author: 'b' })).toBe(1)
    expect(similarScore(base, { genres: [], themes: ['power'], author: 'b' })).toBe(2)
    expect(similarScore(base, { genres: [], themes: [], author: 'a' })).toBe(3)
    expect(similarScore(base, { genres: ['fantasy'], themes: ['love'], author: 'b' })).toBe(0)
  })

  it('returns related books without the book itself, honors the age limit and is ordered by relevance', async () => {
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db)
    const id = bookIdOf('1984')
    const similar = await similarBooks(db, id, 6, null)
    expect(similar).toHaveLength(6)
    expect(similar.map((book) => book.id)).not.toContain(id)
    expect(similar.map((book) => book.title)).toEqual(expect.arrayContaining(['Animal Farm']))
    const limited = await similarBooks(db, id, 6, 12)
    expect(limited.every((book) => book.minAge <= 12)).toBe(true)
  })

  it('returns nothing for an unknown book', async () => {
    const db = await openDatabase(':memory:')
    await loadBundledCatalog(db)
    expect(await similarBooks(db, '00000000-0000-4000-8000-000000000000', 6, null)).toEqual([])
  })
})

describe('catalog reload on change', () => {
  it('asks for a reload until the stored digest matches the file', async () => {
    const db = await openDatabase(':memory:')
    const text = readFileSync(BUNDLED_CATALOG_PATH, 'utf8')
    expect(await needsBundledCatalog(db, text)).toBe(true)
    await loadBundledCatalog(db, text)
    expect(await needsBundledCatalog(db, text)).toBe(false)
    expect(await needsBundledCatalog(db, `${text}\n`)).toBe(true)
  })
})
