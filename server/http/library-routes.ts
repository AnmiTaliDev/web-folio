import { z } from 'zod'
import { GENRE_KEYS } from '../catalog/genre-map.ts'
import { ApiError } from '../shared/errors.ts'
import {
  addToWishlist,
  bookExists,
  ratingMap,
  removeFromWishlist,
  removeRating,
  saveProfile,
  setRating,
  tasteStats,
  updateProfileFlags,
  wishlistBooks,
  ratedItems,
  shelfItems,
  setShelfStatus,
  clearShelfStatus,
  SHELF_STATUSES,
} from '../shared/library-store.ts'
import { findProfile } from '../shared/user-store.ts'
import { localizeBooks } from '../shared/books-store.ts'
import { readJson, requestLanguage, requireUser, type RouteContext } from './context.ts'
import { toSummary } from './serialize.ts'

const ratingBody = z.object({ value: z.union([z.literal(1), z.literal(-1)]), isRead: z.boolean().default(false) })
const profileBody = z.object({ interests: z.array(z.enum(GENRE_KEYS)).max(GENRE_KEYS.length), consent: z.boolean() })
const shelfBody = z.object({ status: z.enum(SHELF_STATUSES) })
const ageSchema = z.union([z.literal(6), z.literal(12), z.literal(16), z.literal(18), z.null()])
const flagsBody = z.object({ personalizationEnabled: z.boolean().optional(), aiDescriptionsEnabled: z.boolean().optional(), maxAge: ageSchema.optional() })

function requireBook(ctx: RouteContext): string {
  const bookId = ctx.params[0] ?? ''
  if (!bookExists(ctx.deps.db, bookId)) {
    throw new ApiError(404, 'not_found', 'Book not found')
  }
  return bookId
}

export async function getRatings(ctx: RouteContext): Promise<Response> {
  return Response.json({ ratings: ratingMap(ctx.deps.db, requireUser(ctx)) })
}

export async function putRating(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, ratingBody)
  const bookId = requireBook(ctx)
  setRating(ctx.deps.db, userId, bookId, body.value, body.isRead, ctx.deps.now())
  return new Response(null, { status: 204 })
}

export async function deleteRating(ctx: RouteContext): Promise<Response> {
  removeRating(ctx.deps.db, requireUser(ctx), ctx.params[0] ?? '')
  return new Response(null, { status: 204 })
}

export async function getWishlist(ctx: RouteContext): Promise<Response> {
  const books = wishlistBooks(ctx.deps.db, requireUser(ctx))
  const localized = localizeBooks(ctx.deps.db, books, requestLanguage(ctx))
  return Response.json({ bookIds: books.map((book) => book.id), books: localized.map(toSummary) })
}

export async function putWishlist(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const bookId = requireBook(ctx)
  addToWishlist(ctx.deps.db, userId, bookId, ctx.deps.now())
  return new Response(null, { status: 204 })
}

export async function deleteWishlist(ctx: RouteContext): Promise<Response> {
  removeFromWishlist(ctx.deps.db, requireUser(ctx), ctx.params[0] ?? '')
  return new Response(null, { status: 204 })
}

export async function getProfile(ctx: RouteContext): Promise<Response> {
  return Response.json({ profile: findProfile(ctx.deps.db, requireUser(ctx)) })
}

export async function putProfile(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, profileBody)
  saveProfile(ctx.deps.db, userId, body.interests, body.consent, ctx.deps.now())
  return new Response(null, { status: 204 })
}

export async function patchProfile(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, flagsBody)
  if (!(updateProfileFlags(ctx.deps.db, userId, body))) {
    throw new ApiError(404, 'not_found', 'Profile not found')
  }
  return new Response(null, { status: 204 })
}

export async function getTaste(ctx: RouteContext): Promise<Response> {
  return Response.json(tasteStats(ctx.deps.db, requireUser(ctx)))
}

export async function getShelf(ctx: RouteContext): Promise<Response> {
  const items = shelfItems(ctx.deps.db, requireUser(ctx))
  const localized = localizeBooks(
    ctx.deps.db,
    items.map((item) => item.book),
    requestLanguage(ctx),
  )
  return Response.json({
    items: items.map((item, index) => ({ book: toSummary(localized[index] ?? item.book), status: item.status, updatedAt: item.updatedAt })),
  })
}

export async function putShelf(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const bookId = requireBook(ctx)
  const body = await readJson(ctx, shelfBody)
  setShelfStatus(ctx.deps.db, userId, bookId, body.status, ctx.deps.now())
  return new Response(null, { status: 204 })
}

export async function deleteShelf(ctx: RouteContext): Promise<Response> {
  clearShelfStatus(ctx.deps.db, requireUser(ctx), ctx.params[0] ?? '')
  return new Response(null, { status: 204 })
}

export async function getRatedBooks(ctx: RouteContext): Promise<Response> {
  const items = ratedItems(ctx.deps.db, requireUser(ctx))
  const localized = localizeBooks(
    ctx.deps.db,
    items.map((item) => item.book),
    requestLanguage(ctx),
  )
  return Response.json({
    items: items.map((item, index) => ({ book: toSummary(localized[index] ?? item.book), value: item.value, isRead: item.isRead, createdAt: item.createdAt })),
  })
}
