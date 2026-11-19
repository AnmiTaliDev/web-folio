import { openDatabase } from '../server/db/database.ts'
import { backupDatabase } from '../server/db/backup.ts'
import { parseArgs } from './lib/args.ts'

const args = parseArgs(process.argv.slice(2))
const databasePath = process.env.DATABASE_PATH ?? 'data/folio.db'
const directory = args.values.get('out') ?? 'data/backups'
const keep = Number(args.values.get('keep') ?? 14)

const db = await openDatabase(databasePath)
const { path, removed } = await backupDatabase(db, directory, new Date(), Number.isInteger(keep) && keep > 0 ? keep : 14)
await db.close()
console.error(`Backup written to ${path}${removed.length > 0 ? `, removed ${removed.length} old backup(s)` : ''}`)
