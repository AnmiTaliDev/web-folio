import { readFileSync } from 'node:fs'
import { EVAL_KS, evaluateUsers, parseRatingsCsv, type EvalUser } from '../server/recommend/evaluate.ts'
import { openDatabase } from '../server/db/database.ts'
import { rowToBook, type BookRow } from '../server/shared/books-store.ts'
import type { Book } from '../server/shared/types.ts'
import { numberValue, parseArgs, requireValue } from './lib/args.ts'

type BookFileRow = {
  isbn: string
  title?: string
  authors?: string[]
  genres?: string[]
  popularity?: number
  embedding: number[]
}

function loadBooksFromFile(path: string): Book[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const row = JSON.parse(line) as BookFileRow
      return {
        id: row.isbn,
        isbn13: row.isbn,
        title: row.title ?? row.isbn,
        authors: row.authors ?? [],
        description: null,
        genres: row.genres ?? [],
        language: 'eng',
        firstPublishYear: null,
        popularity: row.popularity ?? 0,
        minAge: 0,
        themes: [],
        difficulty: null,
        length: null,
        overview: null,
        embedding: row.embedding,
      }
    })
}

function loadBooksFromDatabase(isbns: string[]): Book[] {
  const db = openDatabase(process.env.DATABASE_PATH ?? 'data/folio.db')
  const select = db.prepare(
    'select id, isbn_13, title, authors, description, genres, language, first_publish_year, popularity, embedding from books where isbn_13 = ?',
  )
  return isbns.flatMap((isbn) => {
    const row = select.get(isbn) as BookRow | undefined
    return row ? [rowToBook(row)] : []
  })
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const ratings = parseRatingsCsv(readFileSync(requireValue(args, 'ratings'), 'utf8'))
  const seed = numberValue(args, 'seed', 42)
  const isbns = [...new Set(ratings.map((rating) => rating.isbn))]
  const booksPath = args.values.get('books')
  const books = booksPath ? loadBooksFromFile(booksPath) : loadBooksFromDatabase(isbns)

  const idByIsbn = new Map(books.map((book) => [book.isbn13 ?? '', book.id]))
  const usersById = new Map<string, EvalUser>()
  for (const rating of ratings) {
    const bookId = idByIsbn.get(rating.isbn)
    if (!bookId) {
      continue
    }
    const user = usersById.get(rating.userId) ?? { userId: rating.userId, ratings: [] }
    user.ratings.push({ bookId, value: rating.value })
    usersById.set(rating.userId, user)
  }

  const result = await evaluateUsers([...usersById.values()], books, seed)
  console.log(`Books in pool: ${books.length}`)
  console.log(`Users evaluated: ${result.users}`)
  for (const [method, metrics] of Object.entries(result.methods)) {
    for (const k of EVAL_KS) {
      console.log(`${method} K=${k} precision=${(metrics.precision[k] ?? 0).toFixed(4)} ndcg=${(metrics.ndcg[k] ?? 0).toFixed(4)}`)
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
