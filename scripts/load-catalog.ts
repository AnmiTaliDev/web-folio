import { bookCount, loadBundledCatalog } from '../server/catalog/bundled.ts'
import { openDatabase } from '../server/db/database.ts'

const db = await openDatabase(process.env.DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.DATABASE_PATH ?? 'data/folio.db')
const loaded = await loadBundledCatalog(db)
console.error(`Bundled books loaded: ${loaded}. Books in database: ${await bookCount(db)}`)
