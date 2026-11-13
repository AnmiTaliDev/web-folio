import { placeholders, type Db } from '../db/database.ts'
import { decodeEmbedding } from './embedding-codec.ts'
import type { Book } from './types.ts'
import { nearestIds } from './vector-index.ts'

const BOOK_COLUMNS = 'id, isbn_13, title, authors, description, genres, language, first_publish_year, popularity, min_age'
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
  min_age: number
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
    minAge: row.min_age,
    embedding: decodeEmbedding(row.embedding),
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export const CATALOG_LANGUAGES = ['ru', 'en'] as const
export type CatalogLanguage = (typeof CATALOG_LANGUAGES)[number]

export function catalogLanguage(language: string): CatalogLanguage {
  return language === 'ru' ? 'ru' : 'en'
}

type TranslationRow = { book_id: string; title: string; authors: string; description: string | null }

export async function localizeBooks(db: Db, books: Book[], language: string): Promise<Book[]> {
  if (books.length === 0) {
    return books
  }
  const ids = books.map((book) => book.id)
  const rows = db
    .prepare(`select book_id, title, authors, description from book_translations where language = ? and book_id in (${placeholders(ids.length)})`)
    .all(catalogLanguage(language), ...ids) as TranslationRow[]
  const byId = new Map(rows.map((row) => [row.book_id, row]))
  return books.map((book) => {
    const row = byId.get(book.id)
    return row
      ? { ...book, title: row.title, authors: JSON.parse(row.authors) as string[], description: row.description ?? book.description }
      : book
  })
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

export function blockedBookIds(db: Db, maxAge: number | null): string[] {
  if (maxAge === null) {
    return []
  }
  return (db.prepare('select id from books where min_age > ?').all(maxAge) as { id: string }[]).map((row) => row.id)
}

export async function popularBooks(db: Db, interests: string[], count: number, excludeIds: string[], maxAge: number | null = null): Promise<Book[]> {
  const conditions: string[] = []
  const parameters: (string | number)[] = []
  if (interests.length > 0) {
    conditions.push('exists (select 1 from json_each(books.genres) where value in (select value from json_each(?)))')
    parameters.push(JSON.stringify(interests))
  }
  if (maxAge !== null) {
    conditions.push('min_age <= ?')
    parameters.push(maxAge)
  }
  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''
  const rows = db
    .prepare(`select ${BOOK_COLUMNS} from books ${where} order by popularity desc limit ?`)
    .all(...parameters, count + excludeIds.length) as BookRow[]
  const excluded = new Set(excludeIds)
  return rows
    .map(rowToBook)
    .filter((book) => !excluded.has(book.id))
    .slice(0, count)
}

export const BROWSE_SORTS = ['popularity', 'title', 'author', 'year_desc', 'year_asc'] as const
export type BrowseSort = (typeof BROWSE_SORTS)[number]

const LOCAL_TITLE = 'ulower(coalesce(tr.title, books.title))'
const LOCAL_AUTHOR = "ulower(coalesce(json_extract(tr.authors, '$[0]'), json_extract(books.authors, '$[0]')))"

const SORT_SQL: Record<BrowseSort, string> = {
  popularity: `books.popularity desc, ${LOCAL_TITLE} asc`,
  title: `${LOCAL_TITLE} asc`,
  author: `${LOCAL_AUTHOR} asc, ${LOCAL_TITLE} asc`,
  year_desc: `books.first_publish_year is null, books.first_publish_year desc, ${LOCAL_TITLE} asc`,
  year_asc: `books.first_publish_year is null, books.first_publish_year asc, ${LOCAL_TITLE} asc`,
}

const QUALIFIED_COLUMNS = BOOK_COLUMNS.split(', ')
  .map((column) => `books.${column}`)
  .join(', ')

export async function browseBooks(
  db: Db,
  options: { genre: string | null; query: string; sort: BrowseSort; offset: number; limit: number; language: string; maxAge?: number | null },
): Promise<{ books: Book[]; total: number }> {
  const conditions: string[] = []
  const parameters: (string | number)[] = []
  if (options.maxAge !== undefined && options.maxAge !== null) {
    conditions.push('books.min_age <= ?')
    parameters.push(options.maxAge)
  }
  if (options.genre) {
    conditions.push('exists (select 1 from json_each(books.genres) where value = ?)')
    parameters.push(options.genre)
  }
  const text = options.query.trim().toLowerCase()
  if (text !== '') {
    const pattern = `%${escapeLike(text)}%`
    conditions.push(
      `(ulower(books.title) like ? escape '\\' or ulower(books.authors) like ? escape '\\'
        or exists (select 1 from book_translations t where t.book_id = books.id and (ulower(t.title) like ? escape '\\' or ulower(t.authors) like ? escape '\\')))`,
    )
    parameters.push(pattern, pattern, pattern, pattern)
  }
  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''
  const total = (db.prepare(`select count(*) as c from books ${where}`).get(...parameters) as { c: number }).c
  const rows = db
    .prepare(
      `select ${QUALIFIED_COLUMNS} from books
       left join book_translations tr on tr.book_id = books.id and tr.language = ?
       ${where} order by ${SORT_SQL[options.sort]} limit ? offset ?`,
    )
    .all(catalogLanguage(options.language), ...parameters, options.limit, options.offset) as BookRow[]
  return { books: await localizeBooks(db, rows.map(rowToBook), options.language), total }
}

export async function searchBooks(db: Db, query: string, limit: number, maxAge: number | null = null): Promise<Book[]> {
  const text = query.trim().toLowerCase()
  if (text === '') {
    return []
  }
  const isbn = text.replace(/[^0-9]/g, '')
  const pattern = `%${escapeLike(text)}%`
  const rows = db
    .prepare(
      `select ${BOOK_COLUMNS} from books
       where ((? != '' and isbn_13 = ?)
          or ulower(title) like ? escape '\\'
          or ulower(authors) like ? escape '\\'
          or exists (select 1 from book_translations t where t.book_id = books.id and (ulower(t.title) like ? escape '\\' or ulower(t.authors) like ? escape '\\')))
          and (? is null or min_age <= ?)
       order by (isbn_13 = ?) desc, popularity desc
       limit ?`,
    )
    .all(isbn, isbn, pattern, pattern, pattern, pattern, maxAge, maxAge, isbn, limit) as BookRow[]
  return rows.map(rowToBook)
}
