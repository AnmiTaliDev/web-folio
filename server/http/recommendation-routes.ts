import { getBookOfDay } from '../book-of-day/book-of-day.ts'
import { findRow, insertRow, recentBookIds } from '../book-of-day/book-of-day-store.ts'
import { assertValidDay, languageFromHeader } from '../book-of-day/day.ts'
import { recommendForUser } from '../recommend/recommend.ts'
import { loadBooks } from '../shared/books-store.ts'
import { ApiError } from '../shared/errors.ts'
import { loadProfile } from '../shared/user-store.ts'
import { requireUser, type RouteContext } from './context.ts'

export async function getRecommendations(ctx: RouteContext): Promise<Response> {
  const top = await recommendForUser(ctx.deps.db, requireUser(ctx))
  return Response.json(
    top.map((item, index) => ({
      bookId: item.book.id,
      title: item.book.title,
      authors: item.book.authors,
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
  const profile = await loadProfile(db, userId)

  const result = await getBookOfDay(
    {
      findRow: (forDay) => findRow(db, userId, forDay),
      recentBookIds: (sinceDay) => recentBookIds(db, userId, sinceDay, day),
      recommend: () => recommendForUser(db, userId),
      aiDescriptionsEnabled: profile.aiDescriptionsEnabled && llm !== null,
      complete: llm ? llm.complete : async () => '',
      model: llm?.model ?? '',
      insertRow: (forDay, row) => insertRow(db, userId, forDay, row, ctx.deps.now()),
      loadBook: async (id) => {
        const [book] = await loadBooks(db, [id])
        if (!book) {
          throw new ApiError(404, 'not_found', 'Book not found')
        }
        return book
      },
    },
    day,
    languageFromHeader(ctx.request.headers.get('accept-language')),
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
