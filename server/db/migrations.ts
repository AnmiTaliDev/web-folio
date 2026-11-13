import type { Db } from './database.ts'

const SESSION_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000

function columnsOf(db: Db, table: string): string[] {
  return (db.prepare(`pragma table_info(${table})`).all() as { name: string }[]).map((column) => column.name)
}

function addColumnIfMissing(db: Db, table: string, column: string, definition: string): void {
  const columns = columnsOf(db, table)
  if (columns.length > 0 && !columns.includes(column)) {
    db.exec(`alter table ${table} add column ${column} ${definition}`)
  }
}

function migrateLegacyUsers(db: Db): void {
  if (!columnsOf(db, 'users').includes('token_hash')) {
    return
  }
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString()
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

export const MIGRATIONS: readonly ((db: Db) => void)[] = [
  migrateLegacyUsers,
  (db) => {
    addColumnIfMissing(db, 'sessions', 'last_seen_at', 'text')
    addColumnIfMissing(db, 'sessions', 'user_agent', 'text')
  },
  (db) => {
    addColumnIfMissing(db, 'users', 'terms_version', 'text')
    addColumnIfMissing(db, 'users', 'terms_accepted_at', 'text')
  },
  (db) => {
    addColumnIfMissing(db, 'books', 'min_age', 'integer not null default 0')
    addColumnIfMissing(db, 'profiles', 'max_age', 'integer')
  },
  (db) => {
    addColumnIfMissing(db, 'books', 'themes', "text not null default '[]'")
    addColumnIfMissing(db, 'books', 'difficulty', 'text')
    addColumnIfMissing(db, 'books', 'length', 'text')
    addColumnIfMissing(db, 'book_translations', 'overview', 'text')
  },
]

export const SCHEMA_VERSION = MIGRATIONS.length

export function currentVersion(db: Db): number {
  return (db.prepare('pragma user_version').get() as { user_version: number }).user_version
}

export function migrate(db: Db): void {
  const from = currentVersion(db)
  for (let index = from; index < MIGRATIONS.length; index++) {
    MIGRATIONS[index]?.(db)
  }
  db.exec(`pragma user_version = ${SCHEMA_VERSION}`)
}
