import { mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import type { Db } from './database.ts'

const BACKUP_PATTERN = /^folio-\d{8}-\d{6}\.db$/

export function backupName(now: Date): string {
  const iso = now.toISOString()
  return `folio-${iso.slice(0, 10).replaceAll('-', '')}-${iso.slice(11, 19).replaceAll(':', '')}.db`
}

export async function backupDatabase(db: Db, directory: string, now: Date, keep: number): Promise<{ path: string; removed: string[] }> {
  mkdirSync(directory, { recursive: true })
  const path = join(directory, backupName(now))
  await db.run('vacuum into ?', path)
  const files = readdirSync(directory)
    .filter((file) => BACKUP_PATTERN.test(file))
    .sort()
  const removed = files.slice(0, Math.max(files.length - Math.max(keep, 1), 0))
  for (const file of removed) {
    unlinkSync(join(directory, file))
  }
  return { path, removed }
}
