import { describe, expect, it } from 'vitest'
import { readView, writeView } from './catalogView.ts'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('catalog view preference', () => {
  it('defaults to the list and round-trips a stored view', () => {
    const storage = memory()
    expect(readView(storage)).toBe('list')
    writeView('tiles', storage)
    expect(readView(storage)).toBe('tiles')
  })

  it('ignores unknown stored values', () => {
    const storage = memory()
    storage.setItem('folio.catalogView', 'grid3d')
    expect(readView(storage)).toBe('list')
  })

  it('survives unavailable or throwing storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readView(broken)).toBe('list')
    expect(() => writeView('compact', broken)).not.toThrow()
    expect(readView(null)).toBe('list')
  })
})
