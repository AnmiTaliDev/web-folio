import { createServer } from 'node:http'
import { loadBundledCatalog, needsBundledCatalog } from './catalog/bundled.ts'
import { openDatabase } from './db/database.ts'
import { createThrottle } from './auth/throttle.ts'
import { createApp } from './http/app.ts'
import { sendResponse, toRequest } from './http/node-adapter.ts'
import { readConfig } from './shared/config.ts'
import { createEmbedder, createLlm } from './shared/llm.ts'

const config = readConfig(process.env)
const now = (): Date => new Date()
const db = openDatabase(config.databasePath)
if (needsBundledCatalog(db)) {
  console.error(`Loaded ${loadBundledCatalog(db)} bundled books`)
}
const app = createApp(
  {
    db,
    llm: config.llm ? createLlm(config.llm) : null,
    embed: config.embeddings ? createEmbedder(config.embeddings) : null,
    now,
    throttle: createThrottle(now),
  },
  config.webRoot,
)

createServer(async (req, res) => {
  await sendResponse(await app(await toRequest(req, config.port)), res)
}).listen(config.port, () => {
  console.error(`Folio listening on http://localhost:${config.port}`)
  console.error(`AI features: ${config.llm && config.embeddings ? 'enabled' : 'disabled'}`)
})
