import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database.ts'
import { insertUser } from '../db/test-fixtures.ts'
import { findUserBySession } from '../shared/session-store.ts'
import { changePassword, checkLogin, recoverAccount, registerAccount } from './accounts.ts'
import { generateRecoveryCode, hashPassword, hashRecoveryCode, passwordSchema, recoveryCodeMatches, usernameSchema, verifyPassword } from './password.ts'
import { FAILURE_WINDOW_MS, MAX_FAILURES, createThrottle } from './throttle.ts'

describe('passwords', () => {
  it('verifies the right password and rejects others', async () => {
    const hash = await hashPassword('correct horse')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(await verifyPassword('wrong horse', hash)).toBe(false)
  })

  it('salts every hash', async () => {
    expect(await hashPassword('same password')).not.toBe(await hashPassword('same password'))
  })

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'plain')).toBe(false)
    expect(await verifyPassword('x', '')).toBe(false)
  })

  it('validates usernames and passwords', () => {
    expect(usernameSchema.parse('  Reader_01 ')).toBe('reader_01')
    expect(usernameSchema.safeParse('ab').success).toBe(false)
    expect(usernameSchema.safeParse('has space').success).toBe(false)
    expect(passwordSchema.safeParse('short').success).toBe(false)
    expect(passwordSchema.safeParse('long enough password').success).toBe(true)
  })
})

describe('recovery codes', () => {
  it('matches the generated code regardless of formatting and rejects others', () => {
    const code = generateRecoveryCode()
    expect(code).toMatch(/^([0-9A-F]{4}-){4}[0-9A-F]{4}$/)
    const stored = hashRecoveryCode(code)
    expect(recoveryCodeMatches(code.toLowerCase().replaceAll('-', ' '), stored)).toBe(true)
    expect(recoveryCodeMatches(generateRecoveryCode(), stored)).toBe(false)
  })
})

describe('throttle', () => {
  it('blocks after the allowed failures and releases after the window', () => {
    let time = 0
    const throttle = createThrottle(() => new Date(time))
    for (let i = 0; i < MAX_FAILURES; i++) {
      expect(throttle.isBlocked('k')).toBe(false)
      throttle.recordFailure('k')
    }
    expect(throttle.isBlocked('k')).toBe(true)
    expect(throttle.isBlocked('other')).toBe(false)
    time += FAILURE_WINDOW_MS + 1
    expect(throttle.isBlocked('k')).toBe(false)
  })

  it('resets on success', () => {
    const throttle = createThrottle(() => new Date(0))
    for (let i = 0; i < MAX_FAILURES; i++) {
      throttle.recordFailure('k')
    }
    throttle.reset('k')
    expect(throttle.isBlocked('k')).toBe(false)
  })
})

function setup() {
  const db = openDatabase(':memory:')
  insertUser(db, 'u1')
  insertUser(db, 'u2')
  const throttle = createThrottle(() => new Date('2026-11-12T10:00:00Z'))
  return { db, throttle }
}

describe('accounts', () => {
  it('registers a guest, stores only hashes and logs in with the password', async () => {
    const { db, throttle } = setup()
    const { recoveryCode } = await registerAccount(db, 'u1', 'reader', 'secret password')
    const row = db.prepare('select password_hash, recovery_hash from users where id = ?').get('u1') as { password_hash: string; recovery_hash: string }
    expect(row.password_hash).not.toContain('secret password')
    expect(row.recovery_hash).not.toContain(recoveryCode.replaceAll('-', ''))
    expect(await checkLogin(db, throttle, 'reader', 'secret password')).toBe('u1')
  })

  it('rejects a taken username and a second registration of the same user', async () => {
    const { db } = setup()
    await registerAccount(db, 'u1', 'reader', 'secret password')
    await expect(registerAccount(db, 'u2', 'reader', 'another password')).rejects.toMatchObject({ code: 'username_taken', status: 409 })
    await expect(registerAccount(db, 'u1', 'other', 'another password')).rejects.toMatchObject({ code: 'already_registered', status: 409 })
  })

  it('gives the same error for a wrong password and an unknown user, and throttles repeated failures', async () => {
    const { db, throttle } = setup()
    await registerAccount(db, 'u1', 'reader', 'secret password')
    await expect(checkLogin(db, throttle, 'reader', 'wrong password')).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
    await expect(checkLogin(db, throttle, 'nobody', 'whatever password')).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
    for (let i = 0; i < MAX_FAILURES; i++) {
      await checkLogin(db, throttle, 'reader', 'wrong password').catch(() => null)
    }
    await expect(checkLogin(db, throttle, 'reader', 'secret password')).rejects.toMatchObject({ code: 'throttled', status: 429 })
  })

  it('changes the password only with the current one', async () => {
    const { db, throttle } = setup()
    await registerAccount(db, 'u1', 'reader', 'secret password')
    await expect(changePassword(db, throttle, 'u1', 'wrong password', 'new password 1')).rejects.toMatchObject({ code: 'invalid_credentials' })
    await changePassword(db, throttle, 'u1', 'secret password', 'new password 1')
    expect(await checkLogin(db, throttle, 'reader', 'new password 1')).toBe('u1')
    await expect(checkLogin(db, throttle, 'reader', 'secret password')).rejects.toMatchObject({ code: 'invalid_credentials' })
    await expect(changePassword(db, throttle, 'u2', 'x', 'new password 2')).rejects.toMatchObject({ code: 'not_registered' })
  })

  it('recovers with the code once and rotates the code', async () => {
    const { db, throttle } = setup()
    const { recoveryCode } = await registerAccount(db, 'u1', 'reader', 'secret password')
    await expect(recoverAccount(db, throttle, 'reader', generateRecoveryCode(), 'fresh password 1')).rejects.toMatchObject({ code: 'invalid_recovery' })
    const result = await recoverAccount(db, throttle, 'reader', recoveryCode, 'fresh password 1')
    expect(result.userId).toBe('u1')
    expect(result.recoveryCode).not.toBe(recoveryCode)
    expect(await checkLogin(db, throttle, 'reader', 'fresh password 1')).toBe('u1')
    await expect(recoverAccount(db, throttle, 'reader', recoveryCode, 'fresh password 2')).rejects.toMatchObject({ code: 'invalid_recovery' })
    expect((await recoverAccount(db, throttle, 'reader', result.recoveryCode, 'fresh password 3')).userId).toBe('u1')
  })
})

describe('legacy database migration', () => {
  it('moves tokens to sessions, keeps users and their data', () => {
    const directory = mkdtempSync(join(tmpdir(), 'folio-migrate-'))
    try {
      const path = join(directory, 'legacy.db')
      const legacy = new DatabaseSync(path)
      legacy.exec(`
        create table users (id text primary key, token_hash text not null unique, created_at text not null);
        create table books (id text primary key, isbn_13 text unique, source_key text not null unique, title text not null, authors text not null default '[]', description text, genres text not null default '[]', language text not null, first_publish_year integer, popularity integer not null default 0, embedding blob);
        create table ratings (user_id text not null references users (id) on delete cascade, book_id text not null references books (id) on delete cascade, value integer not null, is_read integer not null default 0, created_at text not null, primary key (user_id, book_id));
        insert into users values ('old-user', 'old-hash', '2026-01-01T00:00:00.000Z');
        insert into books (id, source_key, title, language) values ('b1', '/w/1', 'Dune', 'eng');
        insert into ratings values ('old-user', 'b1', 1, 1, '2026-01-02T00:00:00.000Z');
      `)
      legacy.close()

      const db = openDatabase(path)
      const columns = (db.prepare('pragma table_info(users)').all() as { name: string }[]).map((column) => column.name)
      expect(columns).toEqual(['id', 'username', 'password_hash', 'recovery_hash', 'created_at'])
      expect(db.prepare('select user_id from sessions where token_hash = ?').get('old-hash')).toEqual({ user_id: 'old-user' })
      expect(db.prepare('select count(*) as c from ratings where user_id = ?').get('old-user')).toEqual({ c: 1 })
      expect(findUserBySession(db, 'unused', new Date())).toBeNull()
      db.close()

      const again = openDatabase(path)
      expect(again.prepare('select count(*) as c from users').get()).toEqual({ c: 1 })
      again.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
