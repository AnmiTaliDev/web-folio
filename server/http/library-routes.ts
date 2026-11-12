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
  wishlistIds,
} from '../shared/library-store.ts'
import { findProfile } from '../shared/user-store.ts'
import { readJson, requireUser, type RouteContext } from './context.ts'

const ratingBody = z.object({ value: z.union([z.literal(1), z.literal(-1)]), isRead: z.boolean().default(false) })
const profileBody = z.object({ interests: z.array(z.enum(GENRE_KEYS)).max(GENRE_KEYS.length), consent: z.boolean() })
const flagsBody = z.object({ personalizationEnabled: z.boolean().optional(), aiDescriptionsEnabled: z.boolean().optional() })

async function requireBook(ctx: RouteContext): Promise<string> {
  const bookId = ctx.params[0] ?? ''
  if (!(await bookExists(ctx.deps.db, bookId))) {
    throw new ApiError(404, 'not_found', 'Book not found')
  }
  return bookId
}

export async function getRatings(ctx: RouteContext): Promise<Response> {
  return Response.json({ ratings: await ratingMap(ctx.deps.db, requireUser(ctx)) })
}

export async function putRating(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, ratingBody)
  const bookId = await requireBook(ctx)
  await setRating(ctx.deps.db, userId, bookId, body.value, body.isRead, ctx.deps.now())
  return new Response(null, { status: 204 })
}

export async function deleteRating(ctx: RouteContext): Promise<Response> {
  await removeRating(ctx.deps.db, requireUser(ctx), ctx.params[0] ?? '')
  return new Response(null, { status: 204 })
}

export async function getWishlist(ctx: RouteContext): Promise<Response> {
  return Response.json({ bookIds: await wishlistIds(ctx.deps.db, requireUser(ctx)) })
}

export async function putWishlist(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const bookId = await requireBook(ctx)
  await addToWishlist(ctx.deps.db, userId, bookId, ctx.deps.now())
  return new Response(null, { status: 204 })
}

export async function deleteWishlist(ctx: RouteContext): Promise<Response> {
  await removeFromWishlist(ctx.deps.db, requireUser(ctx), ctx.params[0] ?? '')
  return new Response(null, { status: 204 })
}

export async function getProfile(ctx: RouteContext): Promise<Response> {
  return Response.json({ profile: await findProfile(ctx.deps.db, requireUser(ctx)) })
}

export async function putProfile(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, profileBody)
  await saveProfile(ctx.deps.db, userId, body.interests, body.consent, ctx.deps.now())
  return new Response(null, { status: 204 })
}

export async function patchProfile(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, flagsBody)
  if (!(await updateProfileFlags(ctx.deps.db, userId, body))) {
    throw new ApiError(404, 'not_found', 'Profile not found')
  }
  return new Response(null, { status: 204 })
}

export async function getTaste(ctx: RouteContext): Promise<Response> {
  return Response.json(await tasteStats(ctx.deps.db, requireUser(ctx)))
}
