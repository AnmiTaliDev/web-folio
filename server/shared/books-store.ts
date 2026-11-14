import { placeholders, type Db } from '../db/database.ts'
import { decodeEmbedding } from './embedding-codec.ts'
import type { Book } from './types.ts'
import { nearestIds } from './vector-index.ts'
import { parseStringList } from './json-column.ts'

const BOOK_COLUMNS = 'id, isbn_13, title, authors, description, genres, language, first_publish_year, popularity, min_age, themes, difficulty, length'
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
  themes: string
  difficulty: string | null
  length: string | null
  embedding?: Uint8Array | null
}

export function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    isbn13: row.isbn_13,
    title: row.title,
    authors: parseStringList(row.authors),
    description: row.description,
    genres: parseStringList(row.genres),
    language: row.language,
    firstPublishYear: row.first_publish_year,
    popularity: row.popularity,
    minAge: row.min_age,
    themes: parseStringList(row.themes),
    difficulty: row.difficulty,
    length: row.length,
    overview: null,
    embedding: decodeEmbedding(row.embedding),
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export const CATALOG_LANGUAGES = ['ru', 'en', 'kk'] as const
export type CatalogLanguage = (typeof CATALOG_LANGUAGES)[number]

export function catalogLanguage(language: string): CatalogLanguage {
  return language === 'ru' || language === 'kk' ? language : 'en'
}

type TranslationRow = { book_id: string; language: string; title: string; authors: string; description: string | null; overview: string | null }

export function localizeBooks(db: Db, books: Book[], language: string): Book[] {
  if (books.length === 0) {
    return books
  }
  const ids = books.map((book) => book.id)
  const wanted = catalogLanguage(language)
  const rows = db
    .prepare(`select book_id, language, title, authors, description, overview from book_translations where language in (?, 'ru') and book_id in (${placeholders(ids.length)})`)
    .all(wanted, ...ids) as TranslationRow[]
  const byId = new Map<string, TranslationRow>()
  for (const row of rows) {
    if (row.language === wanted || (wanted === 'kk' && !byId.has(row.book_id))) {
      byId.set(row.book_id, row)
    }
  }
  return books.map((book) => {
    const row = byId.get(book.id)
    if (!row) {
      return book
    }
    return { ...book, title: row.title, authors: parseStringList(row.authors), description: row.description ?? book.description, overview: row.overview }
  })
}

export function loadBooks(db: Db, ids: string[]): Book[] {
  if (ids.length === 0) {
    return []
  }
  const rows = db.prepare(`select ${BOOK_COLUMNS_WITH_EMBEDDING} from books where id in (${placeholders(ids.length)})`).all(...ids) as BookRow[]
  const byId = new Map(rows.map((row) => [row.id, rowToBook(row)]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

export function matchBooks(
  db: Db,
  embedding: number[],
  count: number,
  excludeIds: string[],
  genreFilter: string[] | null,
): Book[] {
  return loadBooks(db, nearestIds(db, embedding, count, new Set(excludeIds), genreFilter))
}

export function blockedBookIds(db: Db, maxAge: number | null): string[] {
  if (maxAge === null) {
    return []
  }
  return (db.prepare('select id from books where min_age > ?').all(maxAge) as { id: string }[]).map((row) => row.id)
}

export function popularBooks(db: Db, interests: string[], count: number, excludeIds: string[], maxAge: number | null = null): Book[] {
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
  if (excludeIds.length > 0) {
    conditions.push('books.id not in (select value from json_each(?))')
    parameters.push(JSON.stringify(excludeIds))
  }
  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''
  const rows = db.prepare(`select ${BOOK_COLUMNS} from books ${where} order by popularity desc, books.id limit ?`).all(...parameters, count) as BookRow[]
  return rows.map(rowToBook)
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

export function browseBooks(
  db: Db,
  options: {
    genre: string | null
    query: string
    sort: BrowseSort
    offset: number
    limit: number
    language: string
    maxAge?: number | null
    theme?: string | null
  },
): { books: Book[]; total: number } {
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
  if (options.theme) {
    conditions.push('exists (select 1 from json_each(books.themes) where value = ?)')
    parameters.push(options.theme)
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
       left join book_translations tr on tr.book_id = books.id and tr.language = case
         when ? = 'kk' and not exists (select 1 from book_translations k where k.book_id = books.id and k.language = 'kk') then 'ru'
         else ? end
       ${where} order by ${SORT_SQL[options.sort]} limit ? offset ?`,
    )
    .all(catalogLanguage(options.language), catalogLanguage(options.language), ...parameters, options.limit, options.offset) as BookRow[]
  return { books: localizeBooks(db, rows.map(rowToBook), options.language), total }
}

export function searchBooks(db: Db, query: string, limit: number, maxAge: number | null = null): Book[] {
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

export function similarScore(
  base: { genres: string[]; themes: string[]; author: string },
  other: { genres: string[]; themes: string[]; author: string },
): number {
  const shared = (left: string[], right: string[]) => left.filter((value) => right.includes(value)).length
  return shared(base.themes, other.themes) * 2 + shared(base.genres, other.genres) + (base.author !== '' && base.author === other.author ? 3 : 0)
}

export function similarBooks(db: Db, bookId: string, limit: number, maxAge: number | null): Book[] {
  const rows = db.prepare(`select ${BOOK_COLUMNS} from books where (? is null or min_age <= ?) or id = ?`).all(maxAge, maxAge, bookId) as BookRow[]
  const books = rows.map(rowToBook)
  const target = books.find((book) => book.id === bookId) ?? loadBooks(db, [bookId])[0]
  if (!target) {
    return []
  }
  const describe = (book: Book) => ({ genres: book.genres, themes: book.themes, author: (book.authors[0] ?? '').toLowerCase() })
  const base = describe(target)
  return books
    .filter((book) => book.id !== bookId)
    .map((book) => ({ book, score: similarScore(base, describe(book)) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.book.popularity - a.book.popularity || a.book.title.localeCompare(b.book.title))
    .slice(0, limit)
    .map((item) => item.book)
}
