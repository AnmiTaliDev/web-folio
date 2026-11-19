import type { Db } from './database.ts'

const SESSION_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000

async function columnsOf(db: Db, table: string): Promise<string[]> {
  return (await db.all<{ name: string }>(`pragma table_info(${table})`)).map((column) => column.name)
}

async function addColumnIfMissing(db: Db, table: string, column: string, definition: string): Promise<void> {
  const columns = await columnsOf(db, table)
  if (columns.length > 0 && !columns.includes(column)) {
    await db.exec(`alter table ${table} add column ${column} ${definition}`)
  }
}

async function migrateLegacyUsers(db: Db): Promise<void> {
  if (!(await columnsOf(db, 'users')).includes('token_hash')) {
    return
  }
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString()
  await db.transaction(async (tx) => {
    await tx.exec('create table users_next (id text primary key, username text, password_hash text, recovery_hash text, created_at text not null)')
    await tx.exec('insert into users_next (id, created_at) select id, created_at from users')
    await tx.run('insert into sessions (token_hash, user_id, created_at, expires_at) select token_hash, id, created_at, ? from users', expiresAt)
    await tx.exec('drop table users')
    await tx.exec('alter table users_next rename to users')
  })
}

export const MIGRATIONS: readonly ((db: Db) => Promise<void>)[] = [
  migrateLegacyUsers,
  async (db) => {
    await addColumnIfMissing(db, 'sessions', 'last_seen_at', 'text')
    await addColumnIfMissing(db, 'sessions', 'user_agent', 'text')
  },
  async (db) => {
    await addColumnIfMissing(db, 'users', 'terms_version', 'text')
    await addColumnIfMissing(db, 'users', 'terms_accepted_at', 'text')
  },
  async (db) => {
    await addColumnIfMissing(db, 'books', 'min_age', 'integer not null default 0')
    await addColumnIfMissing(db, 'profiles', 'max_age', 'integer')
  },
  async (db) => {
    await addColumnIfMissing(db, 'books', 'themes', "text not null default '[]'")
    await addColumnIfMissing(db, 'books', 'difficulty', 'text')
    await addColumnIfMissing(db, 'books', 'length', 'text')
    await addColumnIfMissing(db, 'book_translations', 'overview', 'text')
  },
]

export const SCHEMA_VERSION = MIGRATIONS.length

export async function currentVersion(db: Db): Promise<number> {
  return ((await db.get<{ user_version: number }>('pragma user_version')) as { user_version: number }).user_version
}

/** The Postgres schema is created at the latest version, so only SQLite files need migrating. */
export async function migrate(db: Db): Promise<void> {
  if (db.dialect !== 'sqlite') {
    return
  }
  const from = await currentVersion(db)
  for (let index = from; index < MIGRATIONS.length; index++) {
    await MIGRATIONS[index]?.(db)
  }
  await db.exec(`pragma user_version = ${SCHEMA_VERSION}`)
}
