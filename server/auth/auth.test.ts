import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../db/database.ts'
import { findUserBySession } from '../shared/session-store.ts'
import { changePassword, checkLogin, confirmPassword, issueRecoveryCode, recoverAccount, registerAccount } from './accounts.ts'
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

  it('validates usernames and passwords', async () => {
    expect(usernameSchema.parse('  Reader_01 ')).toBe('reader_01')
    expect(usernameSchema.safeParse('ab').success).toBe(false)
    expect(usernameSchema.safeParse('has space').success).toBe(false)
    expect(passwordSchema.safeParse('short').success).toBe(false)
    expect(passwordSchema.safeParse('long enough password').success).toBe(true)
  })
})

describe('recovery codes', () => {
  it('matches the generated code regardless of formatting and rejects others', async () => {
    const code = generateRecoveryCode()
    expect(code).toMatch(/^([0-9A-F]{4}-){4}[0-9A-F]{4}$/)
    const stored = hashRecoveryCode(code)
    expect(recoveryCodeMatches(code.toLowerCase().replaceAll('-', ' '), stored)).toBe(true)
    expect(recoveryCodeMatches(generateRecoveryCode(), stored)).toBe(false)
  })
})

describe('throttle', () => {
  it('blocks after the allowed failures and releases after the window', async () => {
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

  it('resets on success', async () => {
    const throttle = createThrottle(() => new Date(0))
    for (let i = 0; i < MAX_FAILURES; i++) {
      throttle.recordFailure('k')
    }
    throttle.reset('k')
    expect(throttle.isBlocked('k')).toBe(false)
  })
})

const now = new Date('2026-11-12T10:00:00Z')

async function setup() {
  const db = await openDatabase(':memory:')
  const throttle = createThrottle(() => now)
  return { db, throttle }
}

describe('accounts', () => {
  it('registers an account, stores only hashes and logs in with the password', async () => {
    const { db, throttle } = await setup()
    const { userId, recoveryCode } = await registerAccount(db, 'reader', 'secret password', now)
    const row = await db.get('select password_hash, recovery_hash from users where id = ?', userId) as { password_hash: string; recovery_hash: string }
    expect(row.password_hash).not.toContain('secret password')
    expect(row.recovery_hash).not.toContain(recoveryCode.replaceAll('-', ''))
    expect(await checkLogin(db, throttle, 'reader', 'secret password')).toBe(userId)
  })

  it('rejects a taken username', async () => {
    const { db } = await setup()
    await registerAccount(db, 'reader', 'secret password', now)
    await expect(registerAccount(db, 'reader', 'another password', now)).rejects.toMatchObject({ code: 'username_taken', status: 409 })
  })

  it('gives the same error for a wrong password and an unknown user, and throttles repeated failures', async () => {
    const { db, throttle } = await setup()
    await registerAccount(db, 'reader', 'secret password', now)
    await expect(checkLogin(db, throttle, 'reader', 'wrong password')).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
    await expect(checkLogin(db, throttle, 'nobody', 'whatever password')).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
    for (let i = 0; i < MAX_FAILURES; i++) {
      await checkLogin(db, throttle, 'reader', 'wrong password').catch(() => null)
    }
    await expect(checkLogin(db, throttle, 'reader', 'secret password')).rejects.toMatchObject({ code: 'throttled', status: 429 })
  })

  it('changes the password only with the current one', async () => {
    const { db, throttle } = await setup()
    const { userId } = await registerAccount(db, 'reader', 'secret password', now)
    await expect(changePassword(db, throttle, userId, 'wrong password', 'new password 1')).rejects.toMatchObject({ code: 'invalid_credentials' })
    await changePassword(db, throttle, userId, 'secret password', 'new password 1')
    expect(await checkLogin(db, throttle, 'reader', 'new password 1')).toBe(userId)
    await expect(checkLogin(db, throttle, 'reader', 'secret password')).rejects.toMatchObject({ code: 'invalid_credentials' })
    await expect(changePassword(db, throttle, 'missing', 'x', 'new password 2')).rejects.toMatchObject({ code: 'not_registered' })
  })

  it('recovers with the code once and rotates the code', async () => {
    const { db, throttle } = await setup()
    const { userId, recoveryCode } = await registerAccount(db, 'reader', 'secret password', now)
    await expect(recoverAccount(db, throttle, 'reader', generateRecoveryCode(), 'fresh password 1')).rejects.toMatchObject({ code: 'invalid_recovery' })
    const result = await recoverAccount(db, throttle, 'reader', recoveryCode, 'fresh password 1')
    expect(result.userId).toBe(userId)
    expect(result.recoveryCode).not.toBe(recoveryCode)
    expect(await checkLogin(db, throttle, 'reader', 'fresh password 1')).toBe(userId)
    await expect(recoverAccount(db, throttle, 'reader', recoveryCode, 'fresh password 2')).rejects.toMatchObject({ code: 'invalid_recovery' })
    expect((await recoverAccount(db, throttle, 'reader', result.recoveryCode, 'fresh password 3')).userId).toBe(userId)
  })

  it('issues a new recovery code only after confirming the password and invalidates the old one', async () => {
    const { db, throttle } = await setup()
    const { recoveryCode, userId } = await registerAccount(db, 'reader', 'secret password', now)
    await expect(issueRecoveryCode(db, throttle, userId, 'wrong password')).rejects.toMatchObject({ code: 'invalid_credentials' })
    const next = await issueRecoveryCode(db, throttle, userId, 'secret password')
    expect(next).not.toBe(recoveryCode)
    await expect(recoverAccount(db, throttle, 'reader', recoveryCode, 'fresh password 1')).rejects.toMatchObject({ code: 'invalid_recovery' })
    expect((await recoverAccount(db, throttle, 'reader', next, 'fresh password 1')).userId).toBe(userId)
  })

  it('confirms the password with a throttle', async () => {
    const { db, throttle } = await setup()
    const { userId } = await registerAccount(db, 'reader', 'secret password', now)
    await expect(confirmPassword(db, throttle, userId, 'secret password')).resolves.toBeUndefined()
    for (let i = 0; i < MAX_FAILURES; i++) {
      await confirmPassword(db, throttle, userId, 'nope nope nope').catch(() => null)
    }
    await expect(confirmPassword(db, throttle, userId, 'secret password')).rejects.toMatchObject({ code: 'throttled' })
  })
})

describe('guest purge', () => {
  it('removes users without an account together with their data when the database opens', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'folio-purge-'))
    try {
      const path = join(directory, 'purge.db')
      const first = await openDatabase(path)
      first.exec("insert into users (id, created_at) values ('guest', '2026-01-01T00:00:00.000Z')")
      first.exec("insert into users (id, username, password_hash, recovery_hash, created_at) values ('owner', 'owner', 'h', 'r', '2026-01-01T00:00:00.000Z')")
      first.exec("insert into sessions (token_hash, user_id, created_at, expires_at) values ('t1', 'guest', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z')")
      first.exec("insert into profiles (user_id) values ('guest')")
      first.close()
      const second = await openDatabase(path)
      expect(await second.all('select id from users')).toEqual([{ id: 'owner' }])
      expect(await second.get('select count(*) as c from sessions')).toEqual({ c: 0 })
      expect(await second.get('select count(*) as c from profiles')).toEqual({ c: 0 })
      second.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

describe('legacy database migration', () => {
  it('rebuilds the users table and drops legacy guests with their data', async () => {
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

      const db = await openDatabase(path)
      const columns = (await db.all('pragma table_info(users)') as { name: string }[]).map((column) => column.name)
      expect(columns).toEqual(['id', 'username', 'password_hash', 'recovery_hash', 'created_at', 'terms_version', 'terms_accepted_at'])
      expect(await db.get('select count(*) as c from users')).toEqual({ c: 0 })
      expect(await db.get('select count(*) as c from sessions')).toEqual({ c: 0 })
      expect(await db.get('select count(*) as c from ratings')).toEqual({ c: 0 })
      expect(await findUserBySession(db, 'unused', new Date())).toBeNull()
      db.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
