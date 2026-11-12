import { describe, expect, it } from 'vitest'
import { makeBook } from './fixtures.ts'
import { selectTop } from './rank.ts'

describe('selectTop', () => {
  it('keeps at most three books of one author', () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      book: makeBook(`s${i}`, { authors: ['Same Author'] }),
      score: 1 - i * 0.01,
    }))
    const other = { book: makeBook('o', { authors: ['Other'] }), score: 0.1 }
    const top = selectTop([...items, other], 15, 3)
    expect(top.filter((item) => item.book.authors[0] === 'Same Author')).toHaveLength(3)
    expect(top.map((item) => item.book.id)).toContain('o')
  })

  it('sorts by score and breaks ties by popularity', () => {
    const top = selectTop(
      [
        { book: makeBook('low', { popularity: 1 }), score: 0.5 },
        { book: makeBook('high', { popularity: 99 }), score: 0.5 },
        { book: makeBook('best'), score: 0.9 },
      ],
      15,
      3,
    )
    expect(top.map((item) => item.book.id)).toEqual(['best', 'high', 'low'])
  })

  it('limits the result length', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ book: makeBook(`b${i}`), score: i }))
    expect(selectTop(items, 15, 3)).toHaveLength(15)
  })
})
