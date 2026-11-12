import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { Db } from '../db/database.ts'

const SESSION_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSessionForUser(db: Db, userId: string, now: Date): string {
  const token = randomBytes(32).toString('hex')
  db.prepare('insert into sessions (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    now.toISOString(),
    new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString(),
  )
  return token
}

export function createGuest(db: Db, now: Date): { userId: string; token: string } {
  const userId = randomUUID()
  db.prepare('insert into users (id, created_at) values (?, ?)').run(userId, now.toISOString())
  return { userId, token: createSessionForUser(db, userId, now) }
}

export function findUserBySession(db: Db, token: string, now: Date): string | null {
  const row = db.prepare('select user_id from sessions where token_hash = ? and expires_at > ?').get(hashToken(token), now.toISOString()) as
    | { user_id: string }
    | undefined
  return row?.user_id ?? null
}

export function deleteSession(db: Db, token: string): void {
  db.prepare('delete from sessions where token_hash = ?').run(hashToken(token))
}

export function deleteOtherSessions(db: Db, userId: string, keepToken: string | null): void {
  db.prepare('delete from sessions where user_id = ? and token_hash != ?').run(userId, keepToken ? hashToken(keepToken) : '')
}
