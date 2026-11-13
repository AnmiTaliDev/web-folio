import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import type { Db } from '../db/database.ts'
import { GENRE_KEYS } from './genre-map.ts'
import { DIFFICULTIES, LENGTHS, THEMES } from './themes.ts'

export const BUNDLED_CATALOG_PATH = new URL('../../catalog/books.jsonl', import.meta.url)

const variantSchema = z.object({
  title: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  description: z.string().min(20),
  overview: z.string().min(400).max(3000).optional(),
})

const bundledBookSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  genres: z.array(z.enum(GENRE_KEYS)).min(1),
  year: z.number().int().min(-1000).max(2100),
  original: z.enum(['ru', 'en']),
  popularity: z.number().int().min(1).max(100),
  minAge: z.union([z.literal(0), z.literal(6), z.literal(12), z.literal(16), z.literal(18)]),
  themes: z.array(z.enum(THEMES)).min(2).max(5),
  difficulty: z.enum(DIFFICULTIES),
  length: z.enum(LENGTHS),
  ru: variantSchema,
  en: variantSchema,
  kk: variantSchema.optional(),
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
    `insert into books (id, isbn_13, source_key, title, authors, description, genres, language, first_publish_year, popularity, min_age, themes, difficulty, length)
     values (?, null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict (source_key) do update set
       title = excluded.title,
       authors = excluded.authors,
       description = excluded.description,
       genres = excluded.genres,
       language = excluded.language,
       first_publish_year = excluded.first_publish_year,
       popularity = excluded.popularity,
       min_age = excluded.min_age,
       themes = excluded.themes,
       difficulty = excluded.difficulty,
       length = excluded.length`,
  )
  const upsertTranslation = db.prepare(
    `insert into book_translations (book_id, language, title, authors, description, overview) values (?, ?, ?, ?, ?, ?)
     on conflict (book_id, language) do update set title = excluded.title, authors = excluded.authors, description = excluded.description, overview = excluded.overview`,
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
        book.minAge,
        JSON.stringify(book.themes),
        book.difficulty,
        book.length,
      )
      for (const language of ['ru', 'en', 'kk'] as const) {
        const variant = book[language]
        if (!variant) {
          continue
        }
        upsertTranslation.run(id, language, variant.title, JSON.stringify(variant.authors), variant.description, variant.overview ?? null)
      }
    }
    db.prepare("insert into catalog_state (name, value) values ('bundled_digest', ?) on conflict (name) do update set value = excluded.value").run(digestOf(text))
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

export function digestOf(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function needsBundledCatalog(db: Db, text: string = readFileSync(BUNDLED_CATALOG_PATH, 'utf8')): boolean {
  const stored = db.prepare("select value from catalog_state where name = 'bundled_digest'").get() as { value: string } | undefined
  if (stored?.value !== digestOf(text)) {
    return true
  }
  const translations = (db.prepare('select count(*) as c from book_translations').get() as { c: number }).c
  return bookCount(db) === 0 || translations === 0
}
