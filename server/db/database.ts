import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { SCHEMA, USERNAME_INDEX } from './schema.ts'

export type Db = DatabaseSync

const SESSION_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000

function migrateLegacyUsers(db: Db, now: Date): void {
  const columns = db.prepare('pragma table_info(users)').all() as { name: string }[]
  if (!columns.some((column) => column.name === 'token_hash')) {
    return
  }
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString()
  db.exec('begin')
  try {
    db.exec('create table users_next (id text primary key, username text, password_hash text, recovery_hash text, created_at text not null)')
    db.exec('insert into users_next (id, created_at) select id, created_at from users')
    db.prepare('insert into sessions (token_hash, user_id, created_at, expires_at) select token_hash, id, created_at, ? from users').run(expiresAt)
    db.exec('drop table users')
    db.exec('alter table users_next rename to users')
    db.exec('commit')
  } catch (error) {
    db.exec('rollback')
    throw error
  }
}

function addUserColumns(db: Db): void {
  const columns = (db.prepare('pragma table_info(users)').all() as { name: string }[]).map((column) => column.name)
  if (columns.length > 0 && !columns.includes('terms_version')) {
    db.exec('alter table users add column terms_version text')
  }
  if (columns.length > 0 && !columns.includes('terms_accepted_at')) {
    db.exec('alter table users add column terms_accepted_at text')
  }
}

function addSessionColumns(db: Db): void {
  const columns = (db.prepare('pragma table_info(sessions)').all() as { name: string }[]).map((column) => column.name)
  if (!columns.includes('last_seen_at')) {
    db.exec('alter table sessions add column last_seen_at text')
  }
  if (!columns.includes('user_agent')) {
    db.exec('alter table sessions add column user_agent text')
  }
}

export function openDatabase(path: string): Db {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  const db = new DatabaseSync(path)
  db.function('ulower', { deterministic: true }, (value) => (typeof value === 'string' ? value.toLowerCase() : value))
  db.exec('pragma journal_mode = wal')
  db.exec('pragma foreign_keys = off')
  db.exec(SCHEMA)
  addSessionColumns(db)
  addUserColumns(db)
  migrateLegacyUsers(db, new Date())
  db.exec(USERNAME_INDEX)
  db.exec('pragma foreign_keys = on')
  db.exec('delete from users where username is null')
  return db
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}
