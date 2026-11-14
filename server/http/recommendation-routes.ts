import { getBookOfDay } from '../book-of-day/book-of-day.ts'
import { deleteRow, findRow, insertRow, isRated, previousBookIds } from '../book-of-day/book-of-day-store.ts'
import { assertValidDay } from '../book-of-day/day.ts'
import { rankedForUser, recommendForUser } from '../recommend/recommend.ts'
import { loadBooks, localizeBooks } from '../shared/books-store.ts'
import { ApiError } from '../shared/errors.ts'
import { loadProfile } from '../shared/user-store.ts'
import { requestLanguage, requireUser, type RouteContext } from './context.ts'

export async function getRecommendations(ctx: RouteContext): Promise<Response> {
  const top = await recommendForUser(ctx.deps.db, requireUser(ctx))
  const localized = localizeBooks(
    ctx.deps.db,
    top.map((item) => item.book),
    requestLanguage(ctx),
  )
  return Response.json(
    top.map((item, index) => ({
      bookId: item.book.id,
      title: localized[index]?.title ?? item.book.title,
      authors: localized[index]?.authors ?? item.book.authors,
      genres: item.book.genres,
      score: Number(item.score.toFixed(4)),
      rank: index + 1,
      mode: item.mode,
    })),
  )
}

export async function getDayBook(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const day = ctx.url.searchParams.get('day') ?? ''
  assertValidDay(day, ctx.deps.now())
  const { db, llm } = ctx.deps
  const profile = loadProfile(db, userId)

  const result = await getBookOfDay(
    {
      findRow: (forDay) => findRow(db, userId, forDay),
      previousBookIds: () => previousBookIds(db, userId, day),
      recommend: () => rankedForUser(db, userId),
      aiDescriptionsEnabled: profile.aiDescriptionsEnabled && llm !== null,
      complete: llm ? llm.complete : async () => '',
      model: llm?.model ?? '',
      insertRow: (forDay, row) => insertRow(db, userId, forDay, row, ctx.deps.now()),
      deleteRow: (forDay) => deleteRow(db, userId, forDay),
      isRated: (bookId) => isRated(db, userId, bookId),
      loadBook: (id) => {
        const [book] = loadBooks(db, [id])
        if (!book) {
          throw new ApiError(404, 'not_found', 'Book not found')
        }
        return localizeBooks(db, [book], requestLanguage(ctx))[0] ?? book
      },
    },
    day,
    requestLanguage(ctx),
    userId,
  )
  if (!result) {
    throw new ApiError(404, 'no_books', 'No books available')
  }
  return Response.json({
    book: { bookId: result.book.id, title: result.book.title, authors: result.book.authors, genres: result.book.genres },
    score: Number(result.score.toFixed(4)),
    description: result.description,
    aiGenerated: result.aiGenerated,
  })
}
