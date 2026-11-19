import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { embeddingText, type CatalogBook } from '../server/catalog/build-book.ts'
import { selectCatalog } from '../server/catalog/select-catalog.ts'
import { openDatabase, type Db } from '../server/db/database.ts'
import { readEmbeddingsConfig } from '../server/shared/config.ts'
import { encodeEmbedding } from '../server/shared/embedding-codec.ts'
import { createBatchEmbedder } from '../server/shared/llm.ts'
import { numberValue, parseArgs, requireValue } from './lib/args.ts'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readProgress(path: string): Set<string> {
  if (!existsSync(path)) {
    return new Set()
  }
  return new Set(readFileSync(path, 'utf8').split('\n').filter(Boolean))
}

async function storeBooks(db: Db, books: CatalogBook[], vectors: (number[] | null)[]): Promise<void> {
  const upsert = `insert into books (id, isbn_13, source_key, title, authors, description, genres, language, first_publish_year, popularity, embedding)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict (source_key) do update set
       isbn_13 = excluded.isbn_13, title = excluded.title, authors = excluded.authors, description = excluded.description,
       genres = excluded.genres, language = excluded.language, first_publish_year = excluded.first_publish_year,
       popularity = excluded.popularity, embedding = coalesce(excluded.embedding, books.embedding)`
  await db.transaction(async (tx) => {
    for (const [index, book] of books.entries()) {
      const vector = vectors[index]
      await tx.run(
        upsert,
        randomUUID(),
        book.isbn_13,
        book.source_key,
        book.title,
        JSON.stringify(book.authors),
        book.description,
        JSON.stringify(book.genres),
        book.language,
        book.first_publish_year,
        book.popularity,
        vector ? encodeEmbedding(vector) : null,
      )
    }
  })
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const files = {
    ratings: requireValue(args, 'ratings'),
    editions: requireValue(args, 'editions'),
    works: requireValue(args, 'works'),
    authors: requireValue(args, 'authors'),
  }
  const limit = numberValue(args, 'limit', 25000)
  const candidates = numberValue(args, 'candidates', 80000)

  const books = await selectCatalog(files, { limit, candidates })
  console.error(`Selected ${books.length} books`)

  if (args.flags.has('dry-run')) {
    for (const book of books) {
      console.log(JSON.stringify(book))
    }
    return
  }

  const embeddings = args.flags.has('no-embeddings') ? null : readEmbeddingsConfig(process.env)
  if (!args.flags.has('no-embeddings') && !embeddings) {
    throw new Error('Embeddings are not configured. Set EMBEDDINGS_* variables or pass --no-embeddings')
  }
  const embed = embeddings ? createBatchEmbedder(embeddings) : null

  const batchSize = numberValue(args, 'batch-size', 10)
  const delayMs = numberValue(args, 'delay-ms', 300)
  const progressPath = args.values.get('progress') ?? join(homedir(), '.folio', 'ingest-progress.txt')
  mkdirSync(dirname(progressPath), { recursive: true })
  const done = readProgress(progressPath)
  const pending = embed ? books.filter((book) => !done.has(book.source_key)) : books
  console.error(`Pending: ${pending.length}`)

  const db = await openDatabase(process.env.DATABASE_PATH ?? 'data/folio.db')
  const size = embed ? batchSize : 500
  for (let start = 0; start < pending.length; start += size) {
    const batch = pending.slice(start, start + size)
    const vectors = embed ? await embed(batch.map(embeddingText)) : batch.map(() => null)
    await storeBooks(db, batch, vectors)
    if (embed) {
      appendFileSync(progressPath, `${batch.map((book) => book.source_key).join('\n')}\n`)
      await sleep(delayMs)
    }
    console.error(`Stored ${Math.min(start + size, pending.length)} of ${pending.length}`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
