import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TERMS_VERSION } from './terms.ts'

describe('terms version', () => {
  it('is the same on the server and in the text files shown to users', () => {
    for (const language of ['ru', 'en', 'kk']) {
      const source = readFileSync(new URL(`../../legal/terms.${language}.md`, import.meta.url), 'utf8')
      expect(/^---\nversion: (\S+)\n---/.exec(source)?.[1]).toBe(TERMS_VERSION)
    }
  })
})
