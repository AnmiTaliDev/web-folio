import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { migrate } from './migrations.ts'
import { SCHEMA, USERNAME_INDEX } from './schema.ts'

export type Db = DatabaseSync

export function openDatabase(path: string): Db {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  const db = new DatabaseSync(path)
  db.function('ulower', { deterministic: true }, (value) => (typeof value === 'string' ? value.toLowerCase() : value))
  db.exec('pragma journal_mode = wal')
  db.exec('pragma foreign_keys = off')
  db.exec(SCHEMA)
  migrate(db)
  db.exec(USERNAME_INDEX)
  db.exec('pragma foreign_keys = on')
  db.exec('delete from users where username is null')
  return db
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}
