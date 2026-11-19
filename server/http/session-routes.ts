import { z } from 'zod'
import { createAccountStore } from '../account/account-store.ts'
import { deleteUserData } from '../account/delete-account.ts'
import { confirmPassword } from '../auth/accounts.ts'
import { clearedSessionCookie } from './cookies.ts'
import { readJson, requireUser, type RouteContext } from './context.ts'

const deleteBody = z.object({ password: z.string().min(1).max(128) })

export async function deleteMe(ctx: RouteContext): Promise<Response> {
  const userId = await requireUser(ctx)
  const body = await readJson(ctx, deleteBody)
  await confirmPassword(ctx.deps.db, ctx.deps.throttle, userId, body.password)
  await deleteUserData(createAccountStore(ctx.deps.db), userId)
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedSessionCookie(ctx.request) } })
}
