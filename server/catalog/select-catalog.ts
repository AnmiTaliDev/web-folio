import { buildBook, type CatalogBook } from './build-book.ts'
import { descriptionText, keysOf, parseDumpLine, parseRatingLine, readLines, stringsOf } from './dump-parse.ts'

export type CatalogFiles = { ratings: string; editions: string; works: string; authors: string }

export type CatalogOptions = { limit: number; candidates: number }

const LANGUAGES = new Map([
  ['/languages/eng', 'eng'],
  ['/languages/rus', 'rus'],
])

type EditionInfo = { editionCount: number; isbn13: string | null; language: string | null }

async function countRatings(path: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for await (const line of readLines(path)) {
    const parsed = parseRatingLine(line)
    if (parsed) {
      counts.set(parsed.workKey, (counts.get(parsed.workKey) ?? 0) + 1)
    }
  }
  return counts
}

function topKeys(counts: Map<string, number>, count: number): Set<string> {
  return new Set(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([key]) => key),
  )
}

async function collectEditions(path: string, wanted: Set<string>): Promise<Map<string, EditionInfo>> {
  const info = new Map<string, EditionInfo>()
  for await (const line of readLines(path)) {
    const record = parseDumpLine(line)
    if (!record) {
      continue
    }
    for (const workKey of keysOf(record.data.works)) {
      if (!wanted.has(workKey)) {
        continue
      }
      const entry = info.get(workKey) ?? { editionCount: 0, isbn13: null, language: null }
      entry.editionCount++
      const isbn = stringsOf(record.data.isbn_13).find((value) => /^\d{13}$/.test(value))
      const language = keysOf(record.data.languages)
        .map((key) => LANGUAGES.get(key))
        .find((value) => value !== undefined)
      if (isbn && language && !entry.isbn13) {
        entry.isbn13 = isbn
        entry.language = language
      }
      info.set(workKey, entry)
    }
  }
  return info
}

type WorkInfo = {
  title: string | null
  description: string | null
  subjects: string[]
  authorKeys: string[]
  firstPublishYear: number | null
}

async function collectWorks(path: string, wanted: Set<string>): Promise<Map<string, WorkInfo>> {
  const works = new Map<string, WorkInfo>()
  for await (const line of readLines(path)) {
    const record = parseDumpLine(line)
    if (!record || !wanted.has(record.key)) {
      continue
    }
    const yearMatch = /\d{4}/.exec(String(record.data.first_publish_date ?? ''))
    works.set(record.key, {
      title: typeof record.data.title === 'string' ? record.data.title : null,
      description: descriptionText(record.data.description),
      subjects: stringsOf(record.data.subjects),
      authorKeys: keysOf(record.data.authors, 'author'),
      firstPublishYear: yearMatch ? Number(yearMatch[0]) : null,
    })
  }
  return works
}

async function collectAuthorNames(path: string, wanted: Set<string>): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  for await (const line of readLines(path)) {
    const record = parseDumpLine(line)
    if (record && wanted.has(record.key) && typeof record.data.name === 'string') {
      names.set(record.key, record.data.name)
    }
  }
  return names
}

export async function selectCatalog(files: CatalogFiles, options: CatalogOptions): Promise<CatalogBook[]> {
  const ratingCounts = await countRatings(files.ratings)
  const candidates = topKeys(ratingCounts, options.candidates)
  const editions = await collectEditions(files.editions, candidates)

  const withIsbn = new Set([...editions.entries()].filter(([, entry]) => entry.isbn13 !== null).map(([key]) => key))
  const works = await collectWorks(files.works, withIsbn)

  const authorKeys = new Set([...works.values()].flatMap((work) => work.authorKeys))
  const authorNames = await collectAuthorNames(files.authors, authorKeys)

  const books: CatalogBook[] = []
  for (const [workKey, work] of works) {
    const edition = editions.get(workKey)
    if (!edition?.isbn13 || !edition.language) {
      continue
    }
    const book = buildBook({
      workKey,
      title: work.title,
      authors: work.authorKeys.flatMap((key) => authorNames.get(key) ?? []),
      description: work.description,
      subjects: work.subjects,
      isbn13: edition.isbn13,
      language: edition.language,
      firstPublishYear: work.firstPublishYear,
      popularity: (ratingCounts.get(workKey) ?? 0) + edition.editionCount,
    })
    if (book) {
      books.push(book)
    }
  }

  const seenIsbn = new Set<string>()
  return books
    .sort((a, b) => b.popularity - a.popularity)
    .filter((book) => {
      if (seenIsbn.has(book.isbn_13)) {
        return false
      }
      seenIsbn.add(book.isbn_13)
      return true
    })
    .slice(0, options.limit)
}
