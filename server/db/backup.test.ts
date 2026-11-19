import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { backupDatabase, backupName } from './backup.ts'
import { openDatabase } from './database.ts'

describe('backup', () => {
  it('names files by UTC time', async () => {
    expect(backupName(new Date('2026-11-13T20:05:09Z'))).toBe('folio-20261113-200509.db')
  })

  it('writes a consistent copy that opens and holds the same rows', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'folio-backup-'))
    try {
      const db = await openDatabase(join(directory, 'live.db'))
      await db.run("insert into users (id, username, password_hash, recovery_hash, created_at) values ('u', 'alice', 'h', 'r', '2026-01-01T00:00:00.000Z')")
      const { path } = await backupDatabase(db, join(directory, 'backups'), new Date('2026-11-13T20:05:09Z'), 5)
      expect(existsSync(path)).toBe(true)
      const copy = new DatabaseSync(path)
      expect(copy.prepare('select username from users').get()).toEqual({ username: 'alice' })
      copy.close()
      await db.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('keeps only the newest backups and ignores other files', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'folio-backup-'))
    try {
      const db = await openDatabase(':memory:')
      const backups = join(directory, 'backups')
      for (const day of ['10', '11', '12', '13']) {
        await backupDatabase(db, backups, new Date(`2026-11-${day}T10:00:00Z`), 2)
      }
      writeFileSync(join(backups, 'notes.txt'), 'keep me')
      expect(readdirSync(backups).sort()).toEqual(['folio-20261112-100000.db', 'folio-20261113-100000.db', 'notes.txt'])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
