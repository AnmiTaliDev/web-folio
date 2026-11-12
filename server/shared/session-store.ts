import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { Db } from '../db/database.ts'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(db: Db, now: Date): { userId: string; token: string } {
  const userId = randomUUID()
  const token = randomBytes(32).toString('hex')
  db.prepare('insert into users (id, token_hash, created_at) values (?, ?, ?)').run(userId, hashToken(token), now.toISOString())
  return { userId, token }
}

export function findUserByToken(db: Db, token: string): string | null {
  const row = db.prepare('select id from users where token_hash = ?').get(hashToken(token)) as { id: string } | undefined
  return row?.id ?? null
}
