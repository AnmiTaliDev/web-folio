import { describe, expect, it } from 'vitest'
import { makeBook } from '../recommend/fixtures.ts'
import { resolveDescription, type DescriptionDeps } from './explain-book.ts'

function makeDeps(overrides: Partial<DescriptionDeps> = {}): { deps: DescriptionDeps; calls: { complete: number } } {
  const calls = { complete: 0 }
  const deps: DescriptionDeps = {
    aiDescriptionsEnabled: true,
    storedAiDescription: () => null,
    complete: async () => {
      calls.complete++
      return 'Generated'
    },
    ...overrides,
  }
  return { deps, calls }
}

const book = makeBook('x', { description: 'Catalog text' })

describe('resolveDescription', () => {
  it('does not call the model when AI descriptions are disabled', async () => {
    const { deps, calls } = makeDeps({ aiDescriptionsEnabled: false })
    expect(await resolveDescription(deps, book, 'ru')).toEqual({ text: 'Catalog text', aiGenerated: false })
    expect(calls.complete).toBe(0)
  })

  it('reuses a stored AI description without calling the model', async () => {
    const { deps, calls } = makeDeps({ storedAiDescription: () => 'Stored' })
    expect(await resolveDescription(deps, book, 'ru')).toEqual({ text: 'Stored', aiGenerated: true })
    expect(calls.complete).toBe(0)
  })

  it('generates a description marked as AI generated', async () => {
    const { deps } = makeDeps()
    expect(await resolveDescription(deps, book, 'ru')).toEqual({ text: 'Generated', aiGenerated: true })
  })

  it('falls back to the catalog text when the model fails', async () => {
    const { deps } = makeDeps({
      complete: async () => {
        throw new Error('down')
      },
    })
    expect(await resolveDescription(deps, book, 'ru')).toEqual({ text: 'Catalog text', aiGenerated: false })
  })
})
