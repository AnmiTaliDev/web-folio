import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import type { Db } from '../db/database.ts'
import { GENRE_KEYS } from './genre-map.ts'

export const BUNDLED_CATALOG_PATH = new URL('../../catalog/books.jsonl', import.meta.url)

const bundledBookSchema = z.object({
  title: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  genres: z.array(z.enum(GENRE_KEYS)).min(1),
  year: z.number().int().min(-1000).max(2100),
  language: z.enum(['eng', 'rus']),
  popularity: z.number().int().min(1).max(100),
  description: z.string().min(20),
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

export function sourceKeyOf(book: Pick<BundledBook, 'title' | 'authors'>): string {
  return `/bundled/${book.title.trim().toLowerCase()}|${(book.authors[0] ?? '').trim().toLowerCase()}`
}

export function loadBundledCatalog(db: Db, text: string = readFileSync(BUNDLED_CATALOG_PATH, 'utf8')): number {
  const books = parseBundledCatalog(text)
  const upsert = db.prepare(
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
  db.exec('begin')
  try {
    for (const book of books) {
      upsert.run(
        randomUUID(),
        sourceKeyOf(book),
        book.title,
        JSON.stringify(book.authors),
        book.description,
        JSON.stringify(book.genres),
        book.language,
        book.year,
        book.popularity,
      )
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
