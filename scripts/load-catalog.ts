import { bookCount, loadBundledCatalog } from '../server/catalog/bundled.ts'
import { openDatabase } from '../server/db/database.ts'

const db = openDatabase(process.env.DATABASE_PATH ?? 'data/folio.db')
const loaded = loadBundledCatalog(db)
console.error(`Bundled books loaded: ${loaded}. Books in database: ${bookCount(db)}`)
