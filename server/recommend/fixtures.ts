import type { Book } from '../shared/types.ts'

export function makeBook(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id,
    isbn13: null,
    title: `Title ${id}`,
    authors: [`Author ${id}`],
    description: null,
    genres: [],
    language: 'eng',
    firstPublishYear: null,
    popularity: 0,
    minAge: 0,
    themes: [],
    difficulty: null,
    length: null,
    overview: null,
    embedding: null,
    ...overrides,
  }
}
