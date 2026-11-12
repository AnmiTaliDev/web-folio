import { z } from 'zod'
import { createAccountStore } from '../account/account-store.ts'
import { deleteUserData } from '../account/delete-account.ts'
import { changePassword, checkLogin, recoverAccount, registerAccount } from '../auth/accounts.ts'
import { passwordSchema, usernameSchema } from '../auth/password.ts'
import { findCredentialsById } from '../shared/credentials-store.ts'
import { createSessionForUser, deleteOtherSessions, deleteSession } from '../shared/session-store.ts'
import { clearedSessionCookie, readSessionToken, sessionCookie } from './cookies.ts'
import { optionalUser, readJson, requireUser, type RouteContext } from './context.ts'

const credentialsBody = z.object({ username: usernameSchema, password: passwordSchema })
const loginBody = z.object({ username: usernameSchema, password: z.string().min(1).max(128) })
const passwordBody = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema })
const recoverBody = z.object({ username: usernameSchema, recoveryCode: z.string().min(1).max(64), newPassword: passwordSchema })

async function discardGuest(ctx: RouteContext, userId: string | null, keepUserId: string): Promise<void> {
  if (userId && userId !== keepUserId && !findCredentialsById(ctx.deps.db, userId)) {
    await deleteUserData(createAccountStore(ctx.deps.db), userId)
  }
}

function startSession(ctx: RouteContext, userId: string, body: unknown): Response {
  const token = createSessionForUser(ctx.deps.db, userId, ctx.deps.now())
  return Response.json(body, { headers: { 'Set-Cookie': sessionCookie(ctx.request, token) } })
}

export async function getMe(ctx: RouteContext): Promise<Response> {
  const credentials = findCredentialsById(ctx.deps.db, requireUser(ctx))
  return Response.json({ registered: credentials !== null, username: credentials?.username ?? null })
}

export async function postRegister(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, credentialsBody)
  const { recoveryCode } = await registerAccount(ctx.deps.db, userId, body.username, body.password)
  return Response.json({ username: body.username, recoveryCode })
}

export async function postLogin(ctx: RouteContext): Promise<Response> {
  const body = await readJson(ctx, loginBody)
  const previous = optionalUser(ctx)
  const userId = await checkLogin(ctx.deps.db, ctx.deps.throttle, body.username, body.password)
  const oldToken = readSessionToken(ctx.request)
  if (oldToken) {
    deleteSession(ctx.deps.db, oldToken)
  }
  await discardGuest(ctx, previous, userId)
  return startSession(ctx, userId, { username: body.username })
}

export async function postLogout(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const token = readSessionToken(ctx.request)
  if (token) {
    deleteSession(ctx.deps.db, token)
  }
  await discardGuest(ctx, userId, '')
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedSessionCookie(ctx.request) } })
}

export async function postPassword(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, passwordBody)
  await changePassword(ctx.deps.db, ctx.deps.throttle, userId, body.currentPassword, body.newPassword)
  deleteOtherSessions(ctx.deps.db, userId, readSessionToken(ctx.request))
  return new Response(null, { status: 204 })
}

export async function postRecover(ctx: RouteContext): Promise<Response> {
  const body = await readJson(ctx, recoverBody)
  const previous = optionalUser(ctx)
  const result = await recoverAccount(ctx.deps.db, ctx.deps.throttle, body.username, body.recoveryCode, body.newPassword)
  deleteOtherSessions(ctx.deps.db, result.userId, null)
  const oldToken = readSessionToken(ctx.request)
  if (oldToken) {
    deleteSession(ctx.deps.db, oldToken)
  }
  await discardGuest(ctx, previous, result.userId)
  return startSession(ctx, result.userId, { username: body.username, recoveryCode: result.recoveryCode })
}
