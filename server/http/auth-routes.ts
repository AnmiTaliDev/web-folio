import { z } from 'zod'
import { changePassword, changeUsername, checkLogin, issueRecoveryCode, recoverAccount, registerAccount } from '../auth/accounts.ts'
import { passwordSchema, usernameSchema } from '../auth/password.ts'
import { ApiError } from '../shared/errors.ts'
import { TERMS_VERSION } from '../shared/terms.ts'
import { acceptTerms, findAccountInfo, findCredentialsById } from '../shared/credentials-store.ts'
import { createSessionForUser, deleteAllSessions, deleteOtherSessions, deleteSession, deleteSessionById, listSessions } from '../shared/session-store.ts'
import { clearedSessionCookie, readSessionToken, sessionCookie } from './cookies.ts'
import { clientKey } from './security.ts'
import { optionalUser, readJson, requireUser, type RouteContext } from './context.ts'

const credentialsBody = z.object({ username: usernameSchema, password: passwordSchema, acceptTerms: z.literal(true) })
const loginBody = z.object({ username: usernameSchema, password: z.string().min(1).max(128) })
const passwordBody = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema })
const recoverBody = z.object({ username: usernameSchema, recoveryCode: z.string().min(1).max(64), newPassword: passwordSchema })
const usernameBody = z.object({ username: usernameSchema, password: z.string().min(1).max(128) })
const confirmBody = z.object({ password: z.string().min(1).max(128) })

function dropCurrentSession(ctx: RouteContext): void {
  const token = readSessionToken(ctx.request)
  if (token) {
    deleteSession(ctx.deps.db, token)
  }
}

function startSession(ctx: RouteContext, userId: string, body: unknown): Response {
  dropCurrentSession(ctx)
  const token = createSessionForUser(ctx.deps.db, userId, ctx.deps.now(), ctx.request.headers.get('user-agent'))
  return Response.json(body, { headers: { 'Set-Cookie': sessionCookie(ctx.request, token) } })
}

export async function getMe(ctx: RouteContext): Promise<Response> {
  const userId = optionalUser(ctx)
  const credentials = userId ? findCredentialsById(ctx.deps.db, userId) : null
  return Response.json({ registered: credentials !== null, username: credentials?.username ?? null })
}

export async function postRegister(ctx: RouteContext): Promise<Response> {
  ctx.deps.limits?.check('register', clientKey(ctx.request))
  const body = await readJson(ctx, credentialsBody)
  const { userId, recoveryCode } = await registerAccount(ctx.deps.db, body.username, body.password, ctx.deps.now(), TERMS_VERSION)
  return startSession(ctx, userId, { username: body.username, recoveryCode })
}

export async function postLogin(ctx: RouteContext): Promise<Response> {
  ctx.deps.limits?.check('login', clientKey(ctx.request))
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
  ctx.deps.limits?.check('recover', clientKey(ctx.request))
  const body = await readJson(ctx, recoverBody)
  const result = await recoverAccount(ctx.deps.db, ctx.deps.throttle, body.username, body.recoveryCode, body.newPassword)
  deleteAllSessions(ctx.deps.db, result.userId)
  return startSession(ctx, result.userId, { username: body.username, recoveryCode: result.recoveryCode })
}

export async function getAccount(ctx: RouteContext): Promise<Response> {
  const account = findAccountInfo(ctx.deps.db, requireUser(ctx))
  if (!account) {
    throw new ApiError(409, 'not_registered', 'Create an account first')
  }
  return Response.json({ ...account, currentTermsVersion: TERMS_VERSION })
}

export async function postTerms(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  await readJson(ctx, z.object({ acceptTerms: z.literal(true) }))
  acceptTerms(ctx.deps.db, userId, TERMS_VERSION, ctx.deps.now())
  return Response.json({ termsVersion: TERMS_VERSION })
}

export async function postUsername(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const body = await readJson(ctx, usernameBody)
  await changeUsername(ctx.deps.db, ctx.deps.throttle, userId, body.password, body.username)
  return Response.json({ username: body.username })
}

export async function getSessions(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  return Response.json({ sessions: listSessions(ctx.deps.db, userId, readSessionToken(ctx.request), ctx.deps.now()) })
}

export async function deleteSessionRoute(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const outcome = deleteSessionById(ctx.deps.db, userId, ctx.params[0] ?? '', readSessionToken(ctx.request))
  if (outcome === 'current') {
    throw new ApiError(400, 'current_session', 'Use sign out for the current session')
  }
  if (outcome === 'missing') {
    throw new ApiError(404, 'not_found', 'Session not found')
  }
  return new Response(null, { status: 204 })
}
