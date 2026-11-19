import { randomUUID } from 'node:crypto'
import type { Db } from '../db/database.ts'

export type Credentials = { userId: string; username: string; passwordHash: string; recoveryHash: string }

export async function findCredentials(db: Db, username: string): Promise<Credentials | null> {
  const row = await db.get<{ id: string; username: string; password_hash: string; recovery_hash: string }>(
    'select id, username, password_hash, recovery_hash from users where username = ?',
    username,
  )
  return row ? { userId: row.id, username: row.username, passwordHash: row.password_hash, recoveryHash: row.recovery_hash } : null
}

export async function findCredentialsById(db: Db, userId: string): Promise<Credentials | null> {
  const row = await db.get<{ id: string; username: string; password_hash: string; recovery_hash: string }>(
    'select id, username, password_hash, recovery_hash from users where id = ? and username is not null',
    userId,
  )
  return row ? { userId: row.id, username: row.username, passwordHash: row.password_hash, recoveryHash: row.recovery_hash } : null
}

export async function setCredentials(db: Db, userId: string, username: string, passwordHash: string, recoveryHash: string): Promise<void> {
  await db.run('update users set username = ?, password_hash = ?, recovery_hash = ? where id = ?', username, passwordHash, recoveryHash, userId)
}

export async function updatePassword(db: Db, userId: string, passwordHash: string, recoveryHash: string | null): Promise<void> {
  await db.run('update users set password_hash = ?, recovery_hash = coalesce(cast(? as text), recovery_hash) where id = ?', passwordHash, recoveryHash, userId)
}

export async function createUserWithCredentials(
  db: Db,
  username: string,
  passwordHash: string,
  recoveryHash: string,
  now: Date,
  termsVersion: string | null = null,
): Promise<string> {
  const userId = randomUUID()
  await db.run(
    'insert into users (id, username, password_hash, recovery_hash, created_at, terms_version, terms_accepted_at) values (?, ?, ?, ?, ?, ?, ?)',
    userId,
    username,
    passwordHash,
    recoveryHash,
    now.toISOString(),
    termsVersion,
    termsVersion ? now.toISOString() : null,
  )
  return userId
}

export type AccountInfo = { username: string; createdAt: string; termsVersion: string | null; termsAcceptedAt: string | null }

export async function findAccountInfo(db: Db, userId: string): Promise<AccountInfo | null> {
  const row = await db.get<{ username: string; created_at: string; terms_version: string | null; terms_accepted_at: string | null }>(
    'select username, created_at, terms_version, terms_accepted_at from users where id = ? and username is not null',
    userId,
  )
  return row ? { username: row.username, createdAt: row.created_at, termsVersion: row.terms_version, termsAcceptedAt: row.terms_accepted_at } : null
}

export async function acceptTerms(db: Db, userId: string, version: string, now: Date): Promise<void> {
  await db.run('update users set terms_version = ?, terms_accepted_at = ? where id = ?', version, now.toISOString(), userId)
}

export async function updateUsername(db: Db, userId: string, username: string): Promise<void> {
  await db.run('update users set username = ? where id = ?', username, userId)
}

export async function setRecoveryHash(db: Db, userId: string, recoveryHash: string): Promise<void> {
  await db.run('update users set recovery_hash = ? where id = ?', recoveryHash, userId)
}
