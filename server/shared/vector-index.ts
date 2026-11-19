import type { Db } from '../db/database.ts'
import { decodeEmbedding } from './embedding-codec.ts'
import { parseStringList } from './json-column.ts'

type Entry = { id: string; genres: string[]; vector: Float32Array; norm: number }

type Index = { signature: string; entries: Entry[] }

const indexes = new WeakMap<Db, Index>()

async function signatureOf(db: Db): Promise<string> {
  const row = (await db.get<{ c: number; m: string }>("select count(*) as c, coalesce(max(id), '') as m from books where embedding is not null")) as {
    c: number
    m: string
  }
  return `${row.c}:${row.m}`
}

async function loadEntries(db: Db): Promise<Entry[]> {
  const rows = await db.all<{ id: string; genres: string; embedding: Uint8Array }>('select id, genres, embedding from books where embedding is not null')
  return rows.flatMap((row) => {
    const values = decodeEmbedding(row.embedding)
    if (!values) {
      return []
    }
    const vector = Float32Array.from(values)
    let sum = 0
    for (const value of vector) {
      sum += value * value
    }
    return [{ id: row.id, genres: parseStringList(row.genres), vector, norm: Math.sqrt(sum) }]
  })
}

async function indexFor(db: Db): Promise<Entry[]> {
  const signature = await signatureOf(db)
  const cached = indexes.get(db)
  if (cached && cached.signature === signature) {
    return cached.entries
  }
  const entries = await loadEntries(db)
  indexes.set(db, { signature, entries })
  return entries
}

export async function nearestIds(
  db: Db,
  query: number[],
  count: number,
  excludeIds: Set<string>,
  genreFilter: string[] | null,
): Promise<string[]> {
  const queryVector = Float32Array.from(query)
  let queryNorm = 0
  for (const value of queryVector) {
    queryNorm += value * value
  }
  queryNorm = Math.sqrt(queryNorm)
  if (queryNorm === 0) {
    return []
  }
  const scored: { id: string; similarity: number }[] = []
  for (const entry of await indexFor(db)) {
    if (excludeIds.has(entry.id) || entry.norm === 0 || entry.vector.length !== queryVector.length) {
      continue
    }
    if (genreFilter && !entry.genres.some((genre) => genreFilter.includes(genre))) {
      continue
    }
    let dot = 0
    for (let i = 0; i < queryVector.length; i++) {
      dot += (entry.vector[i] ?? 0) * (queryVector[i] ?? 0)
    }
    scored.push({ id: entry.id, similarity: dot / (entry.norm * queryNorm) })
  }
  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, count).map((item) => item.id)
}
