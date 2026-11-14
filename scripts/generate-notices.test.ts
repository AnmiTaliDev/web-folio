import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { collect, renderMarkdown, spdxLinks } from './generate-notices.ts'

const root = new URL('../', import.meta.url)

describe('third-party notices', () => {
  const notices = collect()
  const names = new Set(notices.components.map((component) => component.name))

  it('cover every direct runtime dependency of the server and the web app', () => {
    for (const manifest of ['package.json', 'web/package.json']) {
      const dependencies = (JSON.parse(readFileSync(new URL(manifest, root), 'utf8')) as { dependencies: Record<string, string> }).dependencies
      for (const name of Object.keys(dependencies)) {
        expect(names.has(name), name).toBe(true)
      }
    }
  })

  it('include the bundled font and assets and have a license for every component', () => {
    for (const name of ['Roboto Flex', 'Roboto', 'Google Sans', 'Google Sans Flex', 'material-symbols', 'tailwindcss', '@material/web', 'solid-js', '@tensorflow/tfjs', 'zod', 'openai']) {
      expect(names.has(name), name).toBe(true)
    }
    for (const component of notices.components) {
      expect(component.license, component.name).not.toBe('UNKNOWN')
    }
  })

  it('are up to date in the committed files', () => {
    expect(readFileSync(new URL('THIRD_PARTY_NOTICES.md', root), 'utf8')).toBe(renderMarkdown(notices))
    expect(JSON.parse(readFileSync(new URL('web/src/generated/notices.json', root), 'utf8'))).toEqual(notices)
  })
})

describe('spdxLinks', () => {
  it('links every id of a license expression', () => {
    expect(spdxLinks('Apache-2.0 AND MIT')).toEqual(['https://spdx.org/licenses/Apache-2.0.html', 'https://spdx.org/licenses/MIT.html'])
    expect(spdxLinks('UNKNOWN')).toEqual([])
  })
})
