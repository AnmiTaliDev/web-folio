import { createHash, randomBytes } from 'node:crypto'
import type { Db } from '../db/database.ts'

const SESSION_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000
const TOUCH_INTERVAL_MS = 10 * 60 * 1000
const USER_AGENT_LIMIT = 200
const SESSION_ID_LENGTH = 16

export type SessionInfo = { id: string; createdAt: string; lastSeenAt: string; userAgent: string; current: boolean }

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function sessionIdOf(token: string): string {
  return hashToken(token).slice(0, SESSION_ID_LENGTH)
}

export async function createSessionForUser(db: Db, userId: string, now: Date, userAgent: string | null = null): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await db.run(
    'insert into sessions (token_hash, user_id, created_at, expires_at, last_seen_at, user_agent) values (?, ?, ?, ?, ?, ?)',
    hashToken(token),
    userId,
    now.toISOString(),
    new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString(),
    now.toISOString(),
    (userAgent ?? '').slice(0, USER_AGENT_LIMIT),
  )
  return token
}

export async function findUserBySession(db: Db, token: string, now: Date): Promise<string | null> {
  const tokenHash = hashToken(token)
  const row = await db.get<{ user_id: string; last_seen_at: string | null }>(
    'select user_id, last_seen_at from sessions where token_hash = ? and expires_at > ?',
    tokenHash,
    now.toISOString(),
  )
  if (!row) {
    return null
  }
  const lastSeen = row.last_seen_at ? Date.parse(row.last_seen_at) : 0
  if (now.getTime() - lastSeen > TOUCH_INTERVAL_MS) {
    await db.run('update sessions set last_seen_at = ? where token_hash = ?', now.toISOString(), tokenHash)
  }
  return row.user_id
}

export async function listSessions(db: Db, userId: string, currentToken: string | null, now: Date): Promise<SessionInfo[]> {
  const rows = await db.all<{ token_hash: string; created_at: string; last_seen_at: string | null; user_agent: string | null }>(
    'select token_hash, created_at, last_seen_at, user_agent from sessions where user_id = ? and expires_at > ? order by coalesce(last_seen_at, created_at) desc',
    userId,
    now.toISOString(),
  )
  const currentHash = currentToken ? hashToken(currentToken) : ''
  return rows.map((row) => ({
    id: row.token_hash.slice(0, SESSION_ID_LENGTH),
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at ?? row.created_at,
    userAgent: row.user_agent ?? '',
    current: row.token_hash === currentHash,
  }))
}

export async function deleteSessionById(db: Db, userId: string, id: string, currentToken: string | null): Promise<'deleted' | 'current' | 'missing'> {
  if (!/^[0-9a-f]{16}$/.test(id)) {
    return 'missing'
  }
  if (currentToken && sessionIdOf(currentToken) === id) {
    return 'current'
  }
  const result = await db.run('delete from sessions where user_id = ? and substr(token_hash, 1, ?) = ?', userId, SESSION_ID_LENGTH, id)
  return Number(result.changes) > 0 ? 'deleted' : 'missing'
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.run('delete from sessions where token_hash = ?', hashToken(token))
}

export async function deleteOtherSessions(db: Db, userId: string, keepToken: string | null): Promise<void> {
  await db.run('delete from sessions where user_id = ? and token_hash != ?', userId, keepToken ? hashToken(keepToken) : '')
}

export async function deleteAllSessions(db: Db, userId: string): Promise<void> {
  await db.run('delete from sessions where user_id = ?', userId)
}
