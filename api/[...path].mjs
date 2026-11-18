// Vercel entry point. The SQLite database lives in /tmp of the function instance and is
// mirrored to a private Vercel Blob (see server/deploy/snapshot-store.ts), so accounts and
// ratings survive restarts. Without BLOB_READ_WRITE_TOKEN it runs in memory only.
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { BlobPreconditionFailedError, get, put } from '@vercel/blob'
import { waitUntil } from '@vercel/functions'
import { SnapshotStore } from '../server/deploy/snapshot-store.ts'
import { createThrottle } from '../server/auth/throttle.ts'
import { createRateLimits } from '../server/http/security.ts'
import { createApp } from '../server/http/app.ts'
import { readConfig } from '../server/shared/config.ts'
import { createEmbedder, createLlm } from '../server/shared/llm.ts'

const PATHNAME = 'folio/state.sqlite'
const config = readConfig(process.env)
const now = () => new Date()
const throttle = createThrottle(now)
const limits = config.rateLimits ? createRateLimits(now) : undefined
const llm = config.llm ? createLlm(config.llm) : null
const embed = config.embeddings ? createEmbedder(config.embeddings) : null

const blob = process.env.BLOB_READ_WRITE_TOKEN
  ? {
      async read(known) {
        const result = await get(PATHNAME, { access: 'private', useCache: false, headers: known ? { 'if-none-match': known } : undefined })
        if (!result) return null
        if (result.statusCode === 304 || result.blob.etag === known) return 'unchanged'
        return { etag: result.blob.etag, data: new Uint8Array(await new globalThis.Response(result.stream).arrayBuffer()) }
      },
      async write(data, ifMatch) {
        try {
          const saved = await put(PATHNAME, Buffer.from(data), {
            access: 'private',
            allowOverwrite: true,
            addRandomSuffix: false,
            contentType: 'application/octet-stream',
            ...(ifMatch ? { ifMatch } : {}),
          })
          return saved.etag
        } catch (error) {
          if (error instanceof BlobPreconditionFailedError) return 'conflict'
          throw error
        }
      },
    }
  : null

const build = (db) => createApp({ db, llm, embed, now, throttle, limits }, config.webRoot)

let app
const store = new SnapshotStore({ blob, dir: '/tmp', onSwap: (db) => { app = build(db) } })
app = build(await store.open())

export default {
  async fetch(request) {
    await store.refresh()
    const response = await app(request)
    waitUntil(store.flush())
    return response
  },
}
