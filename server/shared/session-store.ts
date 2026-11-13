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

export function createSessionForUser(db: Db, userId: string, now: Date, userAgent: string | null = null): string {
  const token = randomBytes(32).toString('hex')
  db.prepare('insert into sessions (token_hash, user_id, created_at, expires_at, last_seen_at, user_agent) values (?, ?, ?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    now.toISOString(),
    new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString(),
    now.toISOString(),
    (userAgent ?? '').slice(0, USER_AGENT_LIMIT),
  )
  return token
}

export function findUserBySession(db: Db, token: string, now: Date): string | null {
  const tokenHash = hashToken(token)
  const row = db.prepare('select user_id, last_seen_at from sessions where token_hash = ? and expires_at > ?').get(tokenHash, now.toISOString()) as
    | { user_id: string; last_seen_at: string | null }
    | undefined
  if (!row) {
    return null
  }
  const lastSeen = row.last_seen_at ? Date.parse(row.last_seen_at) : 0
  if (now.getTime() - lastSeen > TOUCH_INTERVAL_MS) {
    db.prepare('update sessions set last_seen_at = ? where token_hash = ?').run(now.toISOString(), tokenHash)
  }
  return row.user_id
}

export function listSessions(db: Db, userId: string, currentToken: string | null, now: Date): SessionInfo[] {
  const rows = db
    .prepare('select token_hash, created_at, last_seen_at, user_agent from sessions where user_id = ? and expires_at > ? order by coalesce(last_seen_at, created_at) desc')
    .all(userId, now.toISOString()) as { token_hash: string; created_at: string; last_seen_at: string | null; user_agent: string | null }[]
  const currentHash = currentToken ? hashToken(currentToken) : ''
  return rows.map((row) => ({
    id: row.token_hash.slice(0, SESSION_ID_LENGTH),
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at ?? row.created_at,
    userAgent: row.user_agent ?? '',
    current: row.token_hash === currentHash,
  }))
}

export function deleteSessionById(db: Db, userId: string, id: string, currentToken: string | null): 'deleted' | 'current' | 'missing' {
  if (!/^[0-9a-f]{16}$/.test(id)) {
    return 'missing'
  }
  if (currentToken && sessionIdOf(currentToken) === id) {
    return 'current'
  }
  const result = db.prepare('delete from sessions where user_id = ? and substr(token_hash, 1, ?) = ?').run(userId, SESSION_ID_LENGTH, id)
  return Number(result.changes) > 0 ? 'deleted' : 'missing'
}

export function deleteSession(db: Db, token: string): void {
  db.prepare('delete from sessions where token_hash = ?').run(hashToken(token))
}

export function deleteOtherSessions(db: Db, userId: string, keepToken: string | null): void {
  db.prepare('delete from sessions where user_id = ? and token_hash != ?').run(userId, keepToken ? hashToken(keepToken) : '')
}

export function deleteAllSessions(db: Db, userId: string): void {
  db.prepare('delete from sessions where user_id = ?').run(userId)
}
