import { randomUUID } from 'node:crypto'
import { encodeEmbedding } from '../shared/embedding-codec.ts'
import type { Db } from './database.ts'

export type SeedBook = {
  id?: string
  isbn?: string | null
  title: string
  authors?: string[]
  genres?: string[]
  popularity?: number
  embedding?: number[] | null
  description?: string | null
}

export function insertBook(db: Db, book: SeedBook): string {
  const id = book.id ?? randomUUID()
  db.prepare(
    `insert into books (id, isbn_13, source_key, title, authors, description, genres, language, popularity, embedding)
     values (?, ?, ?, ?, ?, ?, ?, 'eng', ?, ?)`,
  ).run(
    id,
    book.isbn ?? null,
    `/works/${id}`,
    book.title,
    JSON.stringify(book.authors ?? ['Author']),
    book.description ?? null,
    JSON.stringify(book.genres ?? ['fantasy']),
    book.popularity ?? 0,
    book.embedding ? encodeEmbedding(book.embedding) : null,
  )
  return id
}

export function insertUser(db: Db, id: string): void {
  db.prepare('insert into users (id, token_hash, created_at) values (?, ?, ?)').run(id, `hash-${id}`, new Date().toISOString())
}
