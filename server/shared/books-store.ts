import { placeholders, type Db } from '../db/database.ts'
import { decodeEmbedding } from './embedding-codec.ts'
import type { Book } from './types.ts'
import { nearestIds } from './vector-index.ts'

const BOOK_COLUMNS = 'id, isbn_13, title, authors, description, genres, language, first_publish_year, popularity'
const BOOK_COLUMNS_WITH_EMBEDDING = `${BOOK_COLUMNS}, embedding`

export type BookRow = {
  id: string
  isbn_13: string | null
  title: string
  authors: string
  description: string | null
  genres: string
  language: string
  first_publish_year: number | null
  popularity: number
  embedding?: Uint8Array | null
}

export function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    isbn13: row.isbn_13,
    title: row.title,
    authors: JSON.parse(row.authors) as string[],
    description: row.description,
    genres: JSON.parse(row.genres) as string[],
    language: row.language,
    firstPublishYear: row.first_publish_year,
    popularity: row.popularity,
    embedding: decodeEmbedding(row.embedding),
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export async function loadBooks(db: Db, ids: string[]): Promise<Book[]> {
  if (ids.length === 0) {
    return []
  }
  const rows = db.prepare(`select ${BOOK_COLUMNS_WITH_EMBEDDING} from books where id in (${placeholders(ids.length)})`).all(...ids) as BookRow[]
  const byId = new Map(rows.map((row) => [row.id, rowToBook(row)]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

export async function matchBooks(
  db: Db,
  embedding: number[],
  count: number,
  excludeIds: string[],
  genreFilter: string[] | null,
): Promise<Book[]> {
  return loadBooks(db, nearestIds(db, embedding, count, new Set(excludeIds), genreFilter))
}

export async function popularBooks(db: Db, interests: string[], count: number, excludeIds: string[]): Promise<Book[]> {
  const genreClause =
    interests.length > 0
      ? `where exists (select 1 from json_each(books.genres) where value in (select value from json_each(?)))`
      : ''
  const parameters = interests.length > 0 ? [JSON.stringify(interests)] : []
  const rows = db
    .prepare(`select ${BOOK_COLUMNS} from books ${genreClause} order by popularity desc limit ?`)
    .all(...parameters, count + excludeIds.length) as BookRow[]
  const excluded = new Set(excludeIds)
  return rows
    .map(rowToBook)
    .filter((book) => !excluded.has(book.id))
    .slice(0, count)
}

export async function searchBooks(db: Db, query: string, limit: number): Promise<Book[]> {
  const text = query.trim().toLowerCase()
  if (text === '') {
    return []
  }
  const isbn = text.replace(/[^0-9]/g, '')
  const pattern = `%${escapeLike(text)}%`
  const rows = db
    .prepare(
      `select ${BOOK_COLUMNS} from books
       where (? != '' and isbn_13 = ?)
          or ulower(title) like ? escape '\\'
          or ulower(authors) like ? escape '\\'
       order by (isbn_13 = ?) desc, popularity desc
       limit ?`,
    )
    .all(isbn, isbn, pattern, pattern, isbn, limit) as BookRow[]
  return rows.map(rowToBook)
}
