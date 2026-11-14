import { z } from 'zod'
import type { Db } from '../db/database.ts'
import { ApiError } from '../shared/errors.ts'
import type { Embedder, Llm } from '../shared/llm.ts'
import type { Throttle } from '../auth/throttle.ts'
import type { RateLimits } from './security.ts'
import { findUserBySession } from '../shared/session-store.ts'
import { languageFromHeader } from '../book-of-day/day.ts'
import { loadProfile, parseAgeLimit } from '../shared/user-store.ts'
import type { AgeLimit } from '../shared/types.ts'
import { readSessionToken } from './cookies.ts'

export type AppDeps = {
  db: Db
  llm: Llm | null
  embed: Embedder | null
  now: () => Date
  throttle: Throttle
  limits?: RateLimits
}

export type RouteContext = {
  request: Request
  url: URL
  params: string[]
  deps: AppDeps
}

export function optionalUser(ctx: RouteContext): string | null {
  const token = readSessionToken(ctx.request)
  return token ? findUserBySession(ctx.deps.db, token, ctx.deps.now()) : null
}

export function requireUser(ctx: RouteContext): string {
  const userId = optionalUser(ctx)
  if (!userId) {
    throw new ApiError(401, 'unauthorized', 'Missing or invalid session')
  }
  return userId
}

export async function readJson<T>(ctx: RouteContext, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await ctx.request.json().catch(() => null))
  if (!parsed.success) {
    throw new ApiError(400, 'invalid_body', 'Request body is invalid')
  }
  return parsed.data
}

export function ageLimitFor(ctx: RouteContext): AgeLimit {
  const userId = optionalUser(ctx)
  if (userId) {
    return loadProfile(ctx.deps.db, userId).maxAge
  }
  return parseAgeLimit(ctx.request.headers.get('x-max-age'))
}

export function requestLanguage(ctx: RouteContext): string {
  return languageFromHeader(ctx.request.headers.get('accept-language'))
}
