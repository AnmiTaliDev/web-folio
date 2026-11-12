import { createGuest } from '../shared/session-store.ts'
import { createAccountStore } from '../account/account-store.ts'
import { deleteUserData } from '../account/delete-account.ts'
import { clearedSessionCookie, sessionCookie } from './cookies.ts'
import { optionalUser, requireUser, type RouteContext } from './context.ts'

export async function postSession(ctx: RouteContext): Promise<Response> {
  if (optionalUser(ctx)) {
    return new Response(null, { status: 204 })
  }
  const session = createGuest(ctx.deps.db, ctx.deps.now())
  return new Response(null, { status: 204, headers: { 'Set-Cookie': sessionCookie(ctx.request, session.token) } })
}

export async function deleteMe(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  await deleteUserData(createAccountStore(ctx.deps.db), userId)
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedSessionCookie(ctx.request) } })
}
