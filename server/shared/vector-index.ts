import type { Db } from '../db/database.ts'
import { decodeEmbedding } from './embedding-codec.ts'

type Entry = { id: string; genres: string[]; vector: Float32Array; norm: number }

type Index = { signature: string; entries: Entry[] }

const indexes = new WeakMap<Db, Index>()

function signatureOf(db: Db): string {
  const row = db.prepare('select count(*) as c, coalesce(max(rowid), 0) as m from books where embedding is not null').get() as {
    c: number
    m: number
  }
  return `${row.c}:${row.m}`
}

function loadEntries(db: Db): Entry[] {
  const rows = db.prepare('select id, genres, embedding from books where embedding is not null').all() as {
    id: string
    genres: string
    embedding: Uint8Array
  }[]
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
    return [{ id: row.id, genres: JSON.parse(row.genres) as string[], vector, norm: Math.sqrt(sum) }]
  })
}

function indexFor(db: Db): Entry[] {
  const signature = signatureOf(db)
  const cached = indexes.get(db)
  if (cached && cached.signature === signature) {
    return cached.entries
  }
  const entries = loadEntries(db)
  indexes.set(db, { signature, entries })
  return entries
}

export function nearestIds(
  db: Db,
  query: number[],
  count: number,
  excludeIds: Set<string>,
  genreFilter: string[] | null,
): string[] {
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
  for (const entry of indexFor(db)) {
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
