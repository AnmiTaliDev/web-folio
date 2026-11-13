import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import type { Db } from '../db/database.ts'
import { GENRE_KEYS } from './genre-map.ts'

export const BUNDLED_CATALOG_PATH = new URL('../../catalog/books.jsonl', import.meta.url)

const variantSchema = z.object({
  title: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  description: z.string().min(20),
})

const bundledBookSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  genres: z.array(z.enum(GENRE_KEYS)).min(1),
  year: z.number().int().min(-1000).max(2100),
  original: z.enum(['ru', 'en']),
  popularity: z.number().int().min(1).max(100),
  ru: variantSchema,
  en: variantSchema,
})

export type BundledBook = z.infer<typeof bundledBookSchema>

export function parseBundledCatalog(text: string): BundledBook[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      try {
        return bundledBookSchema.parse(JSON.parse(line))
      } catch (error) {
        throw new Error(`Invalid catalog line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
      }
    })
}

export function bookIdOf(slug: string): string {
  const bytes = createHash('sha1').update(`folio:${slug}`).digest().subarray(0, 16)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function sourceKeyOf(book: Pick<BundledBook, 'id'>): string {
  return `/bundled/${book.id}`
}

export function loadBundledCatalog(db: Db, text: string = readFileSync(BUNDLED_CATALOG_PATH, 'utf8')): number {
  const books = parseBundledCatalog(text)
  const upsertBook = db.prepare(
    `insert into books (id, isbn_13, source_key, title, authors, description, genres, language, first_publish_year, popularity)
     values (?, null, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict (source_key) do update set
       title = excluded.title,
       authors = excluded.authors,
       description = excluded.description,
       genres = excluded.genres,
       language = excluded.language,
       first_publish_year = excluded.first_publish_year,
       popularity = excluded.popularity`,
  )
  const upsertTranslation = db.prepare(
    `insert into book_translations (book_id, language, title, authors, description) values (?, ?, ?, ?, ?)
     on conflict (book_id, language) do update set title = excluded.title, authors = excluded.authors, description = excluded.description`,
  )
  db.exec('begin')
  try {
    db.exec("delete from books where source_key like '/bundled/%|%'")
    for (const book of books) {
      const id = bookIdOf(book.id)
      const base = book[book.original]
      upsertBook.run(
        id,
        sourceKeyOf(book),
        base.title,
        JSON.stringify(base.authors),
        base.description,
        JSON.stringify(book.genres),
        book.original === 'ru' ? 'rus' : 'eng',
        book.year,
        book.popularity,
      )
      for (const language of ['ru', 'en'] as const) {
        const variant = book[language]
        upsertTranslation.run(id, language, variant.title, JSON.stringify(variant.authors), variant.description)
      }
    }
    db.exec('commit')
  } catch (error) {
    db.exec('rollback')
    throw error
  }
  return books.length
}

export function bookCount(db: Db): number {
  return (db.prepare('select count(*) as c from books').get() as { c: number }).c
}

export function needsBundledCatalog(db: Db): boolean {
  const translations = (db.prepare('select count(*) as c from book_translations').get() as { c: number }).c
  return bookCount(db) === 0 || translations === 0
}
