import { z } from 'zod'
import { explainBook } from '../explain/explain-book.ts'
import { GENRE_KEYS, type GenreKey } from '../catalog/genre-map.ts'
import { THEMES } from '../catalog/themes.ts'
import { BROWSE_SORTS, browseBooks, loadBooks, localizeBooks, similarBooks, popularBooks, searchBooks, type BrowseSort } from '../shared/books-store.ts'
import { ApiError } from '../shared/errors.ts'
import { ageLimitFor, requestLanguage, requireUser, type RouteContext } from './context.ts'
import { toSummary } from './serialize.ts'

const idSchema = z.uuid()
const SEARCH_LIMIT = 20
const MAX_POPULAR = 20
const MAX_PAGE = 40

function parseId(value: string | undefined): string {
  const parsed = idSchema.safeParse(value)
  if (!parsed.success) {
    throw new ApiError(400, 'invalid_id', 'Book id must be a UUID')
  }
  return parsed.data
}

export async function getSearch(ctx: RouteContext): Promise<Response> {
  const books = searchBooks(ctx.deps.db, ctx.url.searchParams.get('q') ?? '', SEARCH_LIMIT, ageLimitFor(ctx))
  return Response.json(localizeBooks(ctx.deps.db, books, requestLanguage(ctx)).map(toSummary))
}

export async function getPopular(ctx: RouteContext): Promise<Response> {
  const interests = (ctx.url.searchParams.get('interests') ?? '').split(',').filter(Boolean)
  const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? 8) || 8, MAX_POPULAR)
  const books = popularBooks(ctx.deps.db, interests, limit, [], ageLimitFor(ctx))
  return Response.json(localizeBooks(ctx.deps.db, books, requestLanguage(ctx)).map(toSummary))
}

export async function getBrowse(ctx: RouteContext): Promise<Response> {
  const params = ctx.url.searchParams
  const genre = params.get('genre') ?? ''
  if (genre !== '' && !GENRE_KEYS.includes(genre as GenreKey)) {
    throw new ApiError(400, 'invalid_genre', 'Unknown genre')
  }
  const limit = Math.min(Math.max(Number(params.get('limit') ?? 20) || 20, 1), MAX_PAGE)
  const offset = Math.max(Number(params.get('offset') ?? 0) || 0, 0)
  const theme = params.get('theme') ?? ''
  if (theme !== '' && !(THEMES as readonly string[]).includes(theme)) {
    throw new ApiError(400, 'invalid_theme', 'Unknown theme')
  }
  const sort = params.get('sort') ?? 'popularity'
  if (!BROWSE_SORTS.includes(sort as BrowseSort)) {
    throw new ApiError(400, 'invalid_sort', 'Unknown sort')
  }
  const { books, total } = browseBooks(ctx.deps.db, {
    genre: genre === '' ? null : genre,
    query: (params.get('q') ?? '').slice(0, 100),
    sort: sort as BrowseSort,
    offset,
    limit,
    language: requestLanguage(ctx),
    maxAge: ageLimitFor(ctx),
    theme: theme === '' ? null : theme,
  })
  return Response.json({ books: books.map(toSummary), total })
}

export async function getBook(ctx: RouteContext): Promise<Response> {
  const [loaded] = loadBooks(ctx.deps.db, [parseId(ctx.params[0])])
  if (!loaded) {
    throw new ApiError(404, 'not_found', 'Book not found')
  }
  const [book] = localizeBooks(ctx.deps.db, [loaded], requestLanguage(ctx))
  const detail = book ?? loaded
  return Response.json({
    ...toSummary(detail),
    description: detail.description,
    overview: detail.overview,
    year: detail.firstPublishYear,
    originalLanguage: loaded.language === 'rus' ? 'ru' : 'en',
    themes: detail.themes,
    difficulty: detail.difficulty,
    length: detail.length,
  })
}

export async function getExplanation(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const explanation = await explainBook(
    ctx.deps.db,
    ctx.deps.llm,
    userId,
    parseId(ctx.params[0]),
    requestLanguage(ctx),
  )
  const [original] = loadBooks(ctx.deps.db, [parseId(ctx.params[0])])
  const [localized] = original ? localizeBooks(ctx.deps.db, [original], requestLanguage(ctx)) : []
  const text = explanation.description.aiGenerated ? explanation.description.text : (localized?.description ?? explanation.description.text)
  return Response.json({
    score: Number(explanation.score.toFixed(4)),
    mode: explanation.mode,
    reasons: explanation.reasons,
    description: { text, aiGenerated: explanation.description.aiGenerated },
  })
}

const SIMILAR_LIMIT = 6

export async function getSimilar(ctx: RouteContext): Promise<Response> {
  const id = parseId(ctx.params[0])
  const books = similarBooks(ctx.deps.db, id, SIMILAR_LIMIT, ageLimitFor(ctx))
  return Response.json(localizeBooks(ctx.deps.db, books, requestLanguage(ctx)).map(toSummary))
}
