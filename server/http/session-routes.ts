import { createSession, findUserByToken } from '../shared/session-store.ts'
import { createAccountStore } from '../account/account-store.ts'
import { deleteUserData } from '../account/delete-account.ts'
import { clearedSessionCookie, readSessionToken, sessionCookie } from './cookies.ts'
import { requireUser, type RouteContext } from './context.ts'

export async function postSession(ctx: RouteContext): Promise<Response> {
  const token = readSessionToken(ctx.request)
  if (token && findUserByToken(ctx.deps.db, token)) {
    return new Response(null, { status: 204 })
  }
  const session = createSession(ctx.deps.db, ctx.deps.now())
  return new Response(null, { status: 204, headers: { 'Set-Cookie': sessionCookie(ctx.request, session.token) } })
}

export async function deleteMe(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  await deleteUserData(createAccountStore(ctx.deps.db), userId)
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedSessionCookie(ctx.request) } })
}
