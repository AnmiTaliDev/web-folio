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

export const BROWSE_SORTS = ['popularity', 'title', 'author', 'year_desc', 'year_asc'] as const
export type BrowseSort = (typeof BROWSE_SORTS)[number]

const SORT_SQL: Record<BrowseSort, string> = {
  popularity: 'popularity desc, ulower(title) asc',
  title: 'ulower(title) asc',
  author: "ulower(json_extract(authors, '$[0]')) asc, ulower(title) asc",
  year_desc: 'first_publish_year is null, first_publish_year desc, ulower(title) asc',
  year_asc: 'first_publish_year is null, first_publish_year asc, ulower(title) asc',
}

export async function browseBooks(
  db: Db,
  options: { genre: string | null; query: string; sort: BrowseSort; offset: number; limit: number },
): Promise<{ books: Book[]; total: number }> {
  const conditions: string[] = []
  const parameters: string[] = []
  if (options.genre) {
    conditions.push('exists (select 1 from json_each(books.genres) where value = ?)')
    parameters.push(options.genre)
  }
  const text = options.query.trim().toLowerCase()
  if (text !== '') {
    const pattern = `%${escapeLike(text)}%`
    conditions.push("(ulower(title) like ? escape '\\' or ulower(authors) like ? escape '\\')")
    parameters.push(pattern, pattern)
  }
  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''
  const total = (db.prepare(`select count(*) as c from books ${where}`).get(...parameters) as { c: number }).c
  const rows = db
    .prepare(`select ${BOOK_COLUMNS} from books ${where} order by ${SORT_SQL[options.sort]} limit ? offset ?`)
    .all(...parameters, options.limit, options.offset) as BookRow[]
  return { books: rows.map(rowToBook), total }
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
