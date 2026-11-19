import { placeholders, sql, type Db } from '../db/database.ts'
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

export async function localizeBooks(db: Db, books: Book[], language: string): Promise<Book[]> {
  if (books.length === 0) {
    return books
  }
  const ids = books.map((book) => book.id)
  const wanted = catalogLanguage(language)
  const rows = await db.all<TranslationRow>(
    `select book_id, language, title, authors, description, overview from book_translations where language in (?, 'ru') and book_id in (${placeholders(ids.length)})`,
    wanted,
    ...ids,
  )
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

export async function loadBooks(db: Db, ids: string[]): Promise<Book[]> {
  if (ids.length === 0) {
    return []
  }
  const rows = await db.all<BookRow>(`select ${BOOK_COLUMNS_WITH_EMBEDDING} from books where id in (${placeholders(ids.length)})`, ...ids)
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
  return await loadBooks(db, await nearestIds(db, embedding, count, new Set(excludeIds), genreFilter))
}

export async function blockedBookIds(db: Db, maxAge: number | null): Promise<string[]> {
  if (maxAge === null) {
    return []
  }
  return (await db.all<{ id: string }>('select id from books where min_age > ?', maxAge)).map((row) => row.id)
}

export async function popularBooks(db: Db, interests: string[], count: number, excludeIds: string[], maxAge: number | null = null): Promise<Book[]> {
  const conditions: string[] = []
  const parameters: (string | number)[] = []
  if (interests.length > 0) {
    conditions.push(`(${interests.map(() => sql.listHas('books.genres')).join(' or ')})`)
    parameters.push(...interests.map(sql.listPattern))
  }
  if (maxAge !== null) {
    conditions.push('min_age <= ?')
    parameters.push(maxAge)
  }
  if (excludeIds.length > 0) {
    conditions.push(`books.id not in (${placeholders(excludeIds.length)})`)
    parameters.push(...excludeIds)
  }
  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''
  const rows = await db.all<BookRow>(`select ${BOOK_COLUMNS} from books ${where} order by popularity desc, books.id limit ?`, ...parameters, count)
  return rows.map(rowToBook)
}

export const BROWSE_SORTS = ['popularity', 'title', 'author', 'year_desc', 'year_asc'] as const
export type BrowseSort = (typeof BROWSE_SORTS)[number]

function sortSql(db: Db, sort: BrowseSort): string {
  const title = sql.lower(db, 'coalesce(tr.title, books.title)')
  const author = sql.lower(db, `coalesce(${sql.firstOfList(db, 'tr.authors')}, ${sql.firstOfList(db, 'books.authors')})`)
  const order: Record<BrowseSort, string> = {
    popularity: `books.popularity desc, ${title} asc`,
    title: `${title} asc`,
    author: `${author} asc, ${title} asc`,
    year_desc: `books.first_publish_year is null, books.first_publish_year desc, ${title} asc`,
    year_asc: `books.first_publish_year is null, books.first_publish_year asc, ${title} asc`,
  }
  return order[sort]
}

const QUALIFIED_COLUMNS = BOOK_COLUMNS.split(', ')
  .map((column) => `books.${column}`)
  .join(', ')

export async function browseBooks(
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
): Promise<{ books: Book[]; total: number }> {
  const conditions: string[] = []
  const parameters: (string | number)[] = []
  if (options.maxAge !== undefined && options.maxAge !== null) {
    conditions.push('books.min_age <= ?')
    parameters.push(options.maxAge)
  }
  if (options.genre) {
    conditions.push(sql.listHas('books.genres'))
    parameters.push(sql.listPattern(options.genre))
  }
  if (options.theme) {
    conditions.push(sql.listHas('books.themes'))
    parameters.push(sql.listPattern(options.theme))
  }
  const text = options.query.trim().toLowerCase()
  if (text !== '') {
    const pattern = `%${escapeLike(text)}%`
    const lower = (expression: string) => sql.lower(db, expression)
    conditions.push(
      `(${lower('books.title')} like ? escape '\\' or ${lower('books.authors')} like ? escape '\\'
        or exists (select 1 from book_translations t where t.book_id = books.id and (${lower('t.title')} like ? escape '\\' or ${lower('t.authors')} like ? escape '\\')))`,
    )
    parameters.push(pattern, pattern, pattern, pattern)
  }
  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''
  const total = ((await db.get<{ c: number }>(`select count(*) as c from books ${where}`, ...parameters)) as { c: number }).c
  const rows = await db.all<BookRow>(
      `select ${QUALIFIED_COLUMNS} from books
       left join book_translations tr on tr.book_id = books.id and tr.language = case
         when ? = 'kk' and not exists (select 1 from book_translations k where k.book_id = books.id and k.language = 'kk') then 'ru'
         else ? end
       ${where} order by ${sortSql(db, options.sort)} limit ? offset ?`,
      catalogLanguage(options.language),
      catalogLanguage(options.language),
      ...parameters,
      options.limit,
      options.offset,
    )
  return { books: await localizeBooks(db, rows.map(rowToBook), options.language), total }
}

export async function searchBooks(db: Db, query: string, limit: number, maxAge: number | null = null): Promise<Book[]> {
  const text = query.trim().toLowerCase()
  if (text === '') {
    return []
  }
  const isbn = text.replace(/[^0-9]/g, '')
  const pattern = `%${escapeLike(text)}%`
  const lower = (expression: string) => sql.lower(db, expression)
  const rows = await db.all<BookRow>(
    `select ${BOOK_COLUMNS} from books
       where ((cast(? as text) != '' and isbn_13 = ?)
          or ${lower('title')} like ? escape '\\'
          or ${lower('authors')} like ? escape '\\'
          or exists (select 1 from book_translations t where t.book_id = books.id and (${lower('t.title')} like ? escape '\\' or ${lower('t.authors')} like ? escape '\\')))
          and (cast(? as integer) is null or min_age <= cast(? as integer))
       order by (isbn_13 = ?) desc, popularity desc
       limit ?`,
    isbn,
    isbn,
    pattern,
    pattern,
    pattern,
    pattern,
    maxAge,
    maxAge,
    isbn,
    limit,
  )
  return rows.map(rowToBook)
}

export function similarScore(
  base: { genres: string[]; themes: string[]; author: string },
  other: { genres: string[]; themes: string[]; author: string },
): number {
  const shared = (left: string[], right: string[]) => left.filter((value) => right.includes(value)).length
  return shared(base.themes, other.themes) * 2 + shared(base.genres, other.genres) + (base.author !== '' && base.author === other.author ? 3 : 0)
}

export async function similarBooks(db: Db, bookId: string, limit: number, maxAge: number | null): Promise<Book[]> {
  const rows = await db.all<BookRow>(`select ${BOOK_COLUMNS} from books where (cast(? as integer) is null or min_age <= cast(? as integer)) or id = ?`, maxAge, maxAge, bookId)
  const books = rows.map(rowToBook)
  const target = books.find((book) => book.id === bookId) ?? (await loadBooks(db, [bookId]))[0]
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
