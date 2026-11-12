import { hasBannedTopic } from './banned-topics.ts'
import { subjectsToGenres, type GenreKey } from './genre-map.ts'

export type CatalogBook = {
  source_key: string
  isbn_13: string
  title: string
  authors: string[]
  description: string | null
  genres: GenreKey[]
  language: string
  first_publish_year: number | null
  popularity: number
}

export type BuildInput = {
  workKey: string
  title: string | null
  authors: string[]
  description: string | null
  subjects: string[]
  isbn13: string
  language: string
  firstPublishYear: number | null
  popularity: number
}

export function buildBook(input: BuildInput): CatalogBook | null {
  const title = input.title?.trim()
  if (!title || input.authors.length === 0) {
    return null
  }
  if (hasBannedTopic(input.subjects)) {
    return null
  }
  const genres = subjectsToGenres(input.subjects)
  if (genres.length === 0) {
    return null
  }
  return {
    source_key: input.workKey,
    isbn_13: input.isbn13,
    title,
    authors: input.authors,
    description: input.description,
    genres,
    language: input.language,
    first_publish_year: input.firstPublishYear,
    popularity: input.popularity,
  }
}

export function embeddingText(book: CatalogBook): string {
  const description = (book.description ?? '').slice(0, 500)
  return `${book.title}. ${book.authors.join(', ')}. ${book.genres.join(', ')}. ${description}`.trim()
}
