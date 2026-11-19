import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hasBannedTopic } from './banned-topics.ts'
import { buildBook, embeddingText } from './build-book.ts'
import { descriptionText, parseDumpLine, parseRatingLine } from './dump-parse.ts'
import { subjectsToGenres } from './genre-map.ts'
import { selectCatalog, type CatalogFiles } from './select-catalog.ts'

function dumpLine(type: string, key: string, data: object): string {
  return [type, key, '1', '2024-01-01T00:00:00', JSON.stringify(data)].join('\t')
}

function ratingLines(workKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => [workKey, '', '5', `2024-01-0${(i % 9) + 1}`].join('\t'))
}

function edition(workKey: string, isbn: string | null, language: string): string {
  return dumpLine('/type/edition', `/books/${workKey.slice(7)}M`, {
    works: [{ key: workKey }],
    isbn_13: isbn ? [isbn] : [],
    languages: [{ key: `/languages/${language}` }],
  })
}

function work(key: string, title: string, subjects: string[], authorKey: string, extra: object = {}): string {
  return dumpLine('/type/work', key, { title, subjects, authors: [{ author: { key: authorKey }, type: { key: '/type/author_role' } }], ...extra })
}

let directory = ''
let files: CatalogFiles

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'folio-catalog-'))
  const ratings = [
    ...ratingLines('/works/OL1W', 5),
    ...ratingLines('/works/OL2W', 4),
    ...ratingLines('/works/OL3W', 4),
    ...ratingLines('/works/OL4W', 3),
    ...ratingLines('/works/OL5W', 3),
    ...ratingLines('/works/OL6W', 2),
    ...ratingLines('/works/OL7W', 2),
    ...ratingLines('/works/OL8W', 2),
  ]
  const editions = [
    edition('/works/OL1W', '9780000000011', 'eng'),
    edition('/works/OL1W', '9780000000028', 'eng'),
    edition('/works/OL2W', '9780000000035', 'rus'),
    edition('/works/OL3W', '9780000000042', 'eng'),
    edition('/works/OL4W', '9780000000059', 'eng'),
    edition('/works/OL5W', '9780000000066', 'fre'),
    edition('/works/OL6W', null, 'eng'),
    edition('/works/OL7W', '9780000000073', 'eng'),
    edition('/works/OL8W', '9780000000080', 'eng'),
  ]
  const works = [
    work('/works/OL1W', 'Dystopia Book', ['Dystopias', 'Fiction'], '/authors/OL1A', { first_publish_date: '1949' }),
    work('/works/OL2W', 'Russian Classic', ['Russian literature', 'Classic'], '/authors/OL2A', { description: { type: '/type/text', value: 'A satire.' } }),
    work('/works/OL3W', 'Banned Book', ['Erotica', 'Fantasy'], '/authors/OL1A'),
    work('/works/OL4W', 'Cookbook', ['Cooking'], '/authors/OL1A'),
    work('/works/OL5W', 'French Book', ['Fantasy'], '/authors/OL1A'),
    work('/works/OL6W', 'No Isbn', ['Fantasy'], '/authors/OL1A'),
    work('/works/OL7W', 'Unknown Author', ['Fantasy'], '/authors/OL9A'),
    work('/works/OL8W', 'Science Book', ['Cosmology'], '/authors/OL3A', { description: 'About the universe.' }),
  ]
  const authors = [
    dumpLine('/type/author', '/authors/OL1A', { name: 'First Author' }),
    dumpLine('/type/author', '/authors/OL2A', { name: 'Second Author' }),
    dumpLine('/type/author', '/authors/OL3A', { name: 'Third Author' }),
  ]
  files = {
    ratings: join(directory, 'ratings.txt'),
    editions: join(directory, 'editions.txt'),
    works: join(directory, 'works.txt.gz'),
    authors: join(directory, 'authors.txt'),
  }
  writeFileSync(files.ratings, ratings.join('\n'))
  writeFileSync(files.editions, editions.join('\n'))
  writeFileSync(files.works, gzipSync(works.join('\n')))
  writeFileSync(files.authors, authors.join('\n'))
})

afterAll(async () => {
  rmSync(directory, { recursive: true, force: true })
})

describe('selectCatalog', () => {
  it('keeps only eligible books ordered by popularity', async () => {
    const books = await selectCatalog(files, { limit: 100, candidates: 100 })
    expect(books.map((book) => book.source_key)).toEqual(['/works/OL1W', '/works/OL2W', '/works/OL8W'])
  })

  it('fills fields from the dumps', async () => {
    const [first, second, third] = await selectCatalog(files, { limit: 100, candidates: 100 })
    expect(first).toMatchObject({
      isbn_13: '9780000000011',
      title: 'Dystopia Book',
      authors: ['First Author'],
      genres: ['dystopia'],
      language: 'eng',
      first_publish_year: 1949,
      popularity: 7,
    })
    expect(second).toMatchObject({ language: 'rus', description: 'A satire.', genres: ['classics'] })
    expect(third).toMatchObject({ genres: ['popular_science'], description: 'About the universe.' })
  })

  it('excludes books with banned topics, no genre, no isbn, other languages or unknown authors', async () => {
    const keys = (await selectCatalog(files, { limit: 100, candidates: 100 })).map((book) => book.source_key)
    for (const excluded of ['/works/OL3W', '/works/OL4W', '/works/OL5W', '/works/OL6W', '/works/OL7W']) {
      expect(keys).not.toContain(excluded)
    }
  })

  it('applies the limit', async () => {
    expect(await selectCatalog(files, { limit: 2, candidates: 100 })).toHaveLength(2)
  })

  it('applies the candidate cut by rating count', async () => {
    const books = await selectCatalog(files, { limit: 100, candidates: 1 })
    expect(books.map((book) => book.source_key)).toEqual(['/works/OL1W'])
  })
})

describe('subjectsToGenres', () => {
  it('maps subjects to the fixed genre keys', async () => {
    expect(subjectsToGenres(['Dystopias', 'Fantasy fiction'])).toEqual(['dystopia', 'fantasy'])
  })

  it('does not treat science fiction as popular science', async () => {
    expect(subjectsToGenres(['Science fiction'])).toEqual(['science_fiction'])
  })

  it('returns nothing for unrelated subjects', async () => {
    expect(subjectsToGenres(['Cooking', 'Gardening'])).toEqual([])
  })
})

describe('hasBannedTopic', () => {
  it('matches whole words case-insensitively', async () => {
    expect(hasBannedTopic(['Erotica'])).toBe(true)
    expect(hasBannedTopic(['Sexual behavior'])).toBe(true)
  })

  it('does not match inside other words', async () => {
    expect(hasBannedTopic(['Essex', 'Sussex history'])).toBe(false)
  })
})

describe('buildBook', () => {
  const base = {
    workKey: '/works/X',
    title: 'T',
    authors: ['A'],
    description: null,
    subjects: ['Fantasy'],
    isbn13: '9780000000000',
    language: 'eng',
    firstPublishYear: null,
    popularity: 1,
  }

  it('returns null without a title or authors', async () => {
    expect(buildBook({ ...base, title: ' ' })).toBeNull()
    expect(buildBook({ ...base, authors: [] })).toBeNull()
  })

  it('limits the description in the embedding text to 500 characters', async () => {
    const book = buildBook({ ...base, description: 'x'.repeat(900) })
    expect(book && embeddingText(book)).toBe(`T. A. fantasy. ${'x'.repeat(500)}`)
  })
})

describe('dump parsing', () => {
  it('parses a dump line and ignores malformed ones', async () => {
    expect(parseDumpLine(dumpLine('/type/work', '/works/OL1W', { title: 'x' }))).toEqual({ key: '/works/OL1W', data: { title: 'x' } })
    expect(parseDumpLine('broken')).toBeNull()
    expect(parseDumpLine('a\tb\tc\td\tnot json')).toBeNull()
  })

  it('parses rating lines', async () => {
    expect(parseRatingLine('/works/OL1W\t\t4\t2024-01-01')).toEqual({ workKey: '/works/OL1W', rating: 4 })
    expect(parseRatingLine('')).toBeNull()
  })

  it('reads description as a string or a typed object', async () => {
    expect(descriptionText('text')).toBe('text')
    expect(descriptionText({ type: '/type/text', value: 'typed' })).toBe('typed')
    expect(descriptionText(undefined)).toBeNull()
  })
})
