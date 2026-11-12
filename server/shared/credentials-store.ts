import type { Db } from '../db/database.ts'

export type Credentials = { userId: string; username: string; passwordHash: string; recoveryHash: string }

export function findCredentials(db: Db, username: string): Credentials | null {
  const row = db.prepare('select id, username, password_hash, recovery_hash from users where username = ?').get(username) as
    | { id: string; username: string; password_hash: string; recovery_hash: string }
    | undefined
  return row ? { userId: row.id, username: row.username, passwordHash: row.password_hash, recoveryHash: row.recovery_hash } : null
}

export function findCredentialsById(db: Db, userId: string): Credentials | null {
  const row = db.prepare('select id, username, password_hash, recovery_hash from users where id = ? and username is not null').get(userId) as
    | { id: string; username: string; password_hash: string; recovery_hash: string }
    | undefined
  return row ? { userId: row.id, username: row.username, passwordHash: row.password_hash, recoveryHash: row.recovery_hash } : null
}

export function setCredentials(db: Db, userId: string, username: string, passwordHash: string, recoveryHash: string): void {
  db.prepare('update users set username = ?, password_hash = ?, recovery_hash = ? where id = ?').run(username, passwordHash, recoveryHash, userId)
}

export function updatePassword(db: Db, userId: string, passwordHash: string, recoveryHash: string | null): void {
  db.prepare('update users set password_hash = ?, recovery_hash = coalesce(?, recovery_hash) where id = ?').run(passwordHash, recoveryHash, userId)
}
