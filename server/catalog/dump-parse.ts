import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'

export type DumpRecord = { key: string; data: Record<string, unknown> }

export async function* readLines(path: string): AsyncGenerator<string> {
  const source = createReadStream(path)
  const input = path.endsWith('.gz') ? source.pipe(createGunzip()) : source
  const lines = createInterface({ input, crlfDelay: Infinity })
  for await (const line of lines) {
    yield line
  }
}

export function parseDumpLine(line: string): DumpRecord | null {
  const columns = line.split('\t')
  const key = columns[1]
  const json = columns[4]
  if (!key || !json) {
    return null
  }
  try {
    return { key, data: JSON.parse(json) as Record<string, unknown> }
  } catch {
    return null
  }
}

export function parseRatingLine(line: string): { workKey: string; rating: number } | null {
  const columns = line.split('\t')
  const workKey = columns[0]
  const rating = Number(columns[2])
  if (!workKey || !Number.isFinite(rating)) {
    return null
  }
  return { workKey, rating }
}

export function descriptionText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null
  }
  if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return value.value.trim() || null
  }
  return null
}

export function keysOf(value: unknown, nested?: string): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((item: unknown) => {
    const target = nested && item && typeof item === 'object' ? (item as Record<string, unknown>)[nested] : item
    if (target && typeof target === 'object' && 'key' in target && typeof target.key === 'string') {
      return [target.key]
    }
    return []
  })
}

export function stringsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
