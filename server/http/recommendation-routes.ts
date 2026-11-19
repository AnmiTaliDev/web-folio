import { getBookOfDay } from '../book-of-day/book-of-day.ts'
import { deleteRow, findRow, insertRow, isRated, previousBookIds } from '../book-of-day/book-of-day-store.ts'
import { assertValidDay } from '../book-of-day/day.ts'
import { rankedForUser, recommendForUser } from '../recommend/recommend.ts'
import { loadBooks, localizeBooks } from '../shared/books-store.ts'
import { ApiError } from '../shared/errors.ts'
import { loadProfile } from '../shared/user-store.ts'
import { requestLanguage, requireUser, type RouteContext } from './context.ts'

export async function getRecommendations(ctx: RouteContext): Promise<Response> {
  const top = await recommendForUser(ctx.deps.db, await requireUser(ctx))
  const localized = await localizeBooks(
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
  const userId = await requireUser(ctx)
  const day = ctx.url.searchParams.get('day') ?? ''
  assertValidDay(day, ctx.deps.now())
  const { db, llm } = ctx.deps
  const profile = await loadProfile(db, userId)

  const result = await getBookOfDay(
    {
      findRow: async (forDay) => await findRow(db, userId, forDay),
      previousBookIds: async () => await previousBookIds(db, userId, day),
      recommend: () => rankedForUser(db, userId),
      aiDescriptionsEnabled: profile.aiDescriptionsEnabled && llm !== null,
      complete: llm ? llm.complete : async () => '',
      model: llm?.model ?? '',
      insertRow: async (forDay, row) => await insertRow(db, userId, forDay, row, ctx.deps.now()),
      deleteRow: async (forDay) => await deleteRow(db, userId, forDay),
      isRated: async (bookId) => await isRated(db, userId, bookId),
      loadBook: async (id) => {
        const [book] = await loadBooks(db, [id])
        if (!book) {
          throw new ApiError(404, 'not_found', 'Book not found')
        }
        return (await localizeBooks(db, [book], requestLanguage(ctx)))[0] ?? book
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
