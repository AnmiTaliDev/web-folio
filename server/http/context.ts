import { z } from 'zod'
import type { Db } from '../db/database.ts'
import { ApiError } from '../shared/errors.ts'
import type { Embedder, Llm } from '../shared/llm.ts'
import { findUserByToken } from '../shared/session-store.ts'
import { readSessionToken } from './cookies.ts'

export type AppDeps = {
  db: Db
  llm: Llm | null
  embed: Embedder | null
  now: () => Date
}

export type RouteContext = {
  request: Request
  url: URL
  params: string[]
  deps: AppDeps
}

export function requireUser(ctx: RouteContext): string {
  const token = readSessionToken(ctx.request)
  const userId = token ? findUserByToken(ctx.deps.db, token) : null
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
