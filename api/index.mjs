import process from 'node:process'
import { openDatabase } from '../server/db/database.ts'
import { createThrottle } from '../server/auth/throttle.ts'
import { createRateLimits } from '../server/http/security.ts'
import { createApp } from '../server/http/app.ts'
import { readConfig } from '../server/shared/config.ts'
import { createEmbedder, createLlm } from '../server/shared/llm.ts'

const config = readConfig(process.env)
const now = () => new Date()
const db = await openDatabase(config.databasePath)
const app = createApp(
  {
    db,
    llm: config.llm ? createLlm(config.llm) : null,
    embed: config.embeddings ? createEmbedder(config.embeddings) : null,
    now,
    throttle: createThrottle(now),
    limits: config.rateLimits ? createRateLimits(now) : undefined,
  },
  config.webRoot,
)

export default { fetch: (request) => app(request) }
