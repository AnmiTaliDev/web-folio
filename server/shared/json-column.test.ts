import { describe, expect, it } from 'vitest'
import { parseStringList } from './json-column.ts'

describe('parseStringList', () => {
  it('reads a JSON array of strings', () => {
    expect(parseStringList('["a","b"]')).toEqual(['a', 'b'])
    expect(parseStringList('[]')).toEqual([])
  })

  it('rejects anything else', () => {
    expect(() => parseStringList('{"a":1}')).toThrow()
    expect(() => parseStringList('[1,2]')).toThrow()
    expect(() => parseStringList('not json')).toThrow()
  })
})
