import { createServer } from 'node:http'
import { openDatabase } from './db/database.ts'
import { createApp } from './http/app.ts'
import { sendResponse, toRequest } from './http/node-adapter.ts'
import { readConfig } from './shared/config.ts'
import { createEmbedder, createLlm } from './shared/llm.ts'

const config = readConfig(process.env)
const app = createApp(
  {
    db: openDatabase(config.databasePath),
    llm: config.llm ? createLlm(config.llm) : null,
    embed: config.embeddings ? createEmbedder(config.embeddings) : null,
    now: () => new Date(),
  },
  config.webRoot,
)

createServer(async (req, res) => {
  await sendResponse(await app(await toRequest(req, config.port)), res)
}).listen(config.port, () => {
  console.error(`Folio listening on http://localhost:${config.port}`)
  console.error(`AI features: ${config.llm && config.embeddings ? 'enabled' : 'disabled'}`)
})
