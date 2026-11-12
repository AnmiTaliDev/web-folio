import { z } from 'zod'
import { languageFromHeader } from '../book-of-day/day.ts'
import { explainBook } from '../explain/explain-book.ts'
import { loadBooks, popularBooks, searchBooks } from '../shared/books-store.ts'
import { ApiError } from '../shared/errors.ts'
import { requireUser, type RouteContext } from './context.ts'
import { toSummary } from './serialize.ts'

const idSchema = z.uuid()
const SEARCH_LIMIT = 20
const MAX_POPULAR = 20

function parseId(value: string | undefined): string {
  const parsed = idSchema.safeParse(value)
  if (!parsed.success) {
    throw new ApiError(400, 'invalid_id', 'Book id must be a UUID')
  }
  return parsed.data
}

export async function getSearch(ctx: RouteContext): Promise<Response> {
  const books = await searchBooks(ctx.deps.db, ctx.url.searchParams.get('q') ?? '', SEARCH_LIMIT)
  return Response.json(books.map(toSummary))
}

export async function getPopular(ctx: RouteContext): Promise<Response> {
  const interests = (ctx.url.searchParams.get('interests') ?? '').split(',').filter(Boolean)
  const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? 8) || 8, MAX_POPULAR)
  const books = await popularBooks(ctx.deps.db, interests, limit, [])
  return Response.json(books.map(toSummary))
}

export async function getBook(ctx: RouteContext): Promise<Response> {
  const [book] = await loadBooks(ctx.deps.db, [parseId(ctx.params[0])])
  if (!book) {
    throw new ApiError(404, 'not_found', 'Book not found')
  }
  return Response.json({ ...toSummary(book), description: book.description })
}

export async function getExplanation(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const explanation = await explainBook(
    ctx.deps.db,
    ctx.deps.llm,
    userId,
    parseId(ctx.params[0]),
    languageFromHeader(ctx.request.headers.get('accept-language')),
  )
  return Response.json({
    score: Number(explanation.score.toFixed(4)),
    mode: explanation.mode,
    reasons: explanation.reasons,
    description: { text: explanation.description.text, aiGenerated: explanation.description.aiGenerated },
  })
}
