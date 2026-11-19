import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync, type StatementSync } from 'node:sqlite'
import pg from 'pg'
import { migrate } from './migrations.ts'
import { schemaFor, USERNAME_INDEX } from './schema.ts'

export type Dialect = 'sqlite' | 'postgres'
export type Row = Record<string, unknown>

export type Db = {
  readonly dialect: Dialect
  all<T = Row>(sql: string, ...params: unknown[]): Promise<T[]>
  get<T = Row>(sql: string, ...params: unknown[]): Promise<T | undefined>
  run(sql: string, ...params: unknown[]): Promise<{ changes: number }>
  exec(sql: string): Promise<void>
  transaction<T>(work: (tx: Db) => Promise<T>): Promise<T>
  close(): Promise<void>
}

type Param = string | number | bigint | null | Uint8Array

class SqliteDb implements Db {
  readonly dialect = 'sqlite' as const
  readonly #raw: DatabaseSync
  readonly #statements = new Map<string, StatementSync>()
  #chain: Promise<unknown> = Promise.resolve()

  constructor(raw: DatabaseSync) {
    this.#raw = raw
  }

  #statement(sql: string): StatementSync {
    let statement = this.#statements.get(sql)
    if (!statement) {
      statement = this.#raw.prepare(sql)
      this.#statements.set(sql, statement)
    }
    return statement
  }

  async all<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.#statement(sql).all(...(params as Param[])) as T[]
  }

  async get<T = Row>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    return this.#statement(sql).get(...(params as Param[])) as T | undefined
  }

  async run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
    const result = this.#statement(sql).run(...(params as Param[]))
    return { changes: Number(result.changes) }
  }

  async exec(sql: string): Promise<void> {
    this.#raw.exec(sql)
  }

  transaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    const next = this.#chain.then(async () => {
      this.#raw.exec('begin')
      try {
        const result = await work(this)
        this.#raw.exec('commit')
        return result
      } catch (error) {
        this.#raw.exec('rollback')
        throw error
      }
    })
    this.#chain = next.catch(() => undefined)
    return next
  }

  async close(): Promise<void> {
    this.#statements.clear()
    this.#raw.close()
  }
}

type Executor = { query(text: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }> }

export function toPostgres(sql: string): string {
  let index = 0
  let quote = false
  let out = ''
  for (const character of sql) {
    if (character === "'") {
      quote = !quote
    }
    out += character === '?' && !quote ? `$${++index}` : character
  }
  return out
}

class PostgresDb implements Db {
  readonly dialect = 'postgres' as const
  readonly #executor: Executor
  readonly #pool: pg.Pool | null

  constructor(executor: Executor, pool: pg.Pool | null) {
    this.#executor = executor
    this.#pool = pool
  }

  async all<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
    return (await this.#executor.query(toPostgres(sql), params)).rows as T[]
  }

  async get<T = Row>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    return (await this.#executor.query(toPostgres(sql), params)).rows[0] as T | undefined
  }

  async run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
    const result = await this.#executor.query(toPostgres(sql), params)
    return { changes: result.rowCount ?? 0 }
  }

  async exec(sql: string): Promise<void> {
    await this.#executor.query(sql)
  }

  async transaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    if (!this.#pool) {
      return await work(this)
    }
    const client = await this.#pool.connect()
    try {
      await client.query('begin')
      const result = await work(new PostgresDb(client, null))
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    await this.#pool?.end()
  }
}

export function isPostgresUrl(target: string): boolean {
  return /^postgres(ql)?:\/\//.test(target)
}

export async function openDatabase(target: string): Promise<Db> {
  let db: Db
  if (isPostgresUrl(target)) {
    pg.types.setTypeParser(20, (value) => Number(value))
    pg.types.setTypeParser(1700, (value) => Number(value))
    const pool = new pg.Pool({ connectionString: target, max: 5 })
    pool.on('error', () => undefined)
    db = new PostgresDb(pool, pool)
  } else {
    if (target !== ':memory:') {
      mkdirSync(dirname(target), { recursive: true })
    }
    const raw = new DatabaseSync(target)
    raw.function('ulower', { deterministic: true }, (value) => (typeof value === 'string' ? value.toLowerCase() : value))
    raw.exec('pragma journal_mode = wal')
    raw.exec('pragma foreign_keys = off')
    db = new SqliteDb(raw)
  }
  await db.exec(schemaFor(db.dialect))
  await migrate(db)
  await db.exec(USERNAME_INDEX)
  if (db.dialect === 'sqlite') {
    await db.exec('pragma foreign_keys = on')
  }
  await db.run('delete from users where username is null')
  return db
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}

export const sql = {
  lower: (db: Db, expression: string): string => (db.dialect === 'sqlite' ? `ulower(${expression})` : `lower(${expression})`),
  firstOfList: (db: Db, column: string): string =>
    db.dialect === 'sqlite' ? `json_extract(${column}, '$[0]')` : `((${column})::jsonb ->> 0)`,
  listHas: (column: string): string => `${column} like ?`,
  listPattern: (value: string): string => `%"${value}"%`,
}
