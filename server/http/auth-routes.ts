import { z } from 'zod'
import { changePassword, checkLogin, issueRecoveryCode, recoverAccount, registerAccount } from '../auth/accounts.ts'
import { passwordSchema, usernameSchema } from '../auth/password.ts'
import { findCredentialsById } from '../shared/credentials-store.ts'
import { createSessionForUser, deleteAllSessions, deleteOtherSessions, deleteSession } from '../shared/session-store.ts'
import { clearedSessionCookie, readSessionToken, sessionCookie } from './cookies.ts'
import { optionalUser, readJson, requireUser, type RouteContext } from './context.ts'

const credentialsBody = z.object({ username: usernameSchema, password: passwordSchema })
const loginBody = z.object({ username: usernameSchema, password: z.string().min(1).max(128) })
const passwordBody = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema })
const recoverBody = z.object({ username: usernameSchema, recoveryCode: z.string().min(1).max(64), newPassword: passwordSchema })
const confirmBody = z.object({ password: z.string().min(1).max(128) })

function dropCurrentSession(ctx: RouteContext): void {
  const token = readSessionToken(ctx.request)
  if (token) {
    deleteSession(ctx.deps.db, token)
  }
}

function startSession(ctx: RouteContext, userId: string, body: unknown): Response {
  dropCurrentSession(ctx)
  const token = createSessionForUser(ctx.deps.db, userId, ctx.deps.now())
  return Response.json(body, { headers: { 'Set-Cookie': sessionCookie(ctx.request, token) } })
}

export async function getMe(ctx: RouteContext): Promise<Response> {
  const userId = optionalUser(ctx)
  const credentials = userId ? findCredentialsById(ctx.deps.db, userId) : null
  return Response.json({ registered: credentials !== null, username: credentials?.username ?? null })
}

export async function postRegister(ctx: RouteContext): Promise<Response> {
  const body = await readJson(ctx, credentialsBody)
  const { userId, recoveryCode } = await registerAccount(ctx.deps.db, body.username, body.password, ctx.deps.now())
  return startSession(ctx, userId, { username: body.username, recoveryCode })
}

export async function postLogin(ctx: RouteContext): Promise<Response> {
  const body = await readJson(ctx, loginBody)
  const userId = await checkLogin(ctx.deps.db, ctx.deps.throttle, body.username, body.password)
  return startSession(ctx, userId, { username: body.username })
}

export async function postLogout(ctx: RouteContext): Promise<Response> {
  dropCurrentSession(ctx)
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedSessionCookie(ctx.request) } })
}

export async function postLogoutAll(ctx: RouteContext): Promise<Response> {
  deleteAllSessions(ctx.deps.db, requireUser(ctx))
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedSessionCookie(ctx.request) } })
}

export async function postPassword(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, passwordBody)
  await changePassword(ctx.deps.db, ctx.deps.throttle, userId, body.currentPassword, body.newPassword)
  deleteOtherSessions(ctx.deps.db, userId, readSessionToken(ctx.request))
  return new Response(null, { status: 204 })
}

export async function postRecoveryCode(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, confirmBody)
  return Response.json({ recoveryCode: await issueRecoveryCode(ctx.deps.db, ctx.deps.throttle, userId, body.password) })
}

export async function postRecover(ctx: RouteContext): Promise<Response> {
  const body = await readJson(ctx, recoverBody)
  const result = await recoverAccount(ctx.deps.db, ctx.deps.throttle, body.username, body.recoveryCode, body.newPassword)
  deleteAllSessions(ctx.deps.db, result.userId)
  return startSession(ctx, result.userId, { username: body.username, recoveryCode: result.recoveryCode })
}
