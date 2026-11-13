import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

type Manifest = {
  name: string
  version: string
  license?: string | { type?: string }
  licenses?: { type?: string }[]
  author?: string | { name?: string }
  repository?: string | { url?: string }
  homepage?: string
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export type Component = {
  name: string
  version: string
  license: string
  author: string
  url: string
  group: 'runtime' | 'tooling'
  textId: string | null
}

export type Notices = { components: Component[]; texts: Record<string, string> }

const ROOT = resolve(import.meta.dirname, '..')
const BUNDLED_ASSETS = ['material-symbols', 'tailwindcss']

const FONT = {
  name: 'Roboto Flex',
  version: 'variable',
  license: 'OFL-1.1',
  author: 'The Roboto Flex Project Authors',
  url: 'https://github.com/TypeNetwork/Roboto-Flex',
  file: 'web/src/assets/fonts/OFL.txt',
}

const PLATFORMS = [
  { name: 'Node.js', version: 'runtime', license: 'MIT', author: 'OpenJS Foundation and Node.js contributors', url: 'https://github.com/nodejs/node' },
  { name: 'SQLite', version: 'runtime', license: 'Public domain', author: 'D. Richard Hipp and contributors', url: 'https://sqlite.org/copyright.html' },
]

export function spdxLinks(license: string): string[] {
  return license
    .split(/\s+(?:AND|OR)\s+/)
    .map((id) => id.replace(/[()]/g, '').trim())
    .filter((id) => /^[A-Za-z0-9.+-]+$/.test(id) && id !== 'UNKNOWN')
    .map((id) => `https://spdx.org/licenses/${id}.html`)
}

function readManifest(dir: string): Manifest {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest
}

function locate(name: string, from: string): string | null {
  let dir = from
  for (;;) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate
    }
    const parent = dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}

function licenseOf(manifest: Manifest): string {
  if (typeof manifest.license === 'string') {
    return manifest.license
  }
  if (manifest.license?.type) {
    return manifest.license.type
  }
  const list = manifest.licenses?.map((entry) => entry.type).filter(Boolean)
  return list && list.length > 0 ? list.join(' OR ') : 'UNKNOWN'
}

function authorOf(manifest: Manifest): string {
  if (typeof manifest.author === 'string') {
    return manifest.author.replace(/\s*[<(].*$/, '').trim()
  }
  return manifest.author?.name ?? ''
}

function urlOf(manifest: Manifest): string {
  const repository = typeof manifest.repository === 'string' ? manifest.repository : (manifest.repository?.url ?? '')
  const cleaned = repository.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/\.git$/, '').replace(/^github:/, 'https://github.com/')
  if (/^https?:\/\//.test(cleaned)) {
    return cleaned
  }
  return manifest.homepage && /^https?:\/\//.test(manifest.homepage) ? manifest.homepage : ''
}

function readLicenseText(dir: string): string | null {
  const files = readdirSync(dir).filter((file) => /^(licen[sc]e|copying|unlicense)(\.(md|txt))?$/i.test(file))
  const preferred = files.sort((a, b) => a.length - b.length)[0]
  return preferred ? readFileSync(join(dir, preferred), 'utf8').replace(/\r\n/g, '\n').trim() : null
}

export function collect(): Notices {
  const roots: { name: string; from: string }[] = []
  for (const project of [ROOT, join(ROOT, 'web')]) {
    const manifest = readManifest(project)
    for (const name of Object.keys(manifest.dependencies ?? {})) {
      roots.push({ name, from: project })
    }
  }
  for (const name of BUNDLED_ASSETS) {
    roots.push({ name, from: join(ROOT, 'web') })
  }

  const seen = new Map<string, Component>()
  const texts = new Map<string, string>()

  const add = (dir: string, group: Component['group']): Manifest => {
    const manifest = readManifest(dir)
    const key = `${manifest.name}@${manifest.version}`
    if (!seen.has(key)) {
      const text = readLicenseText(dir)
      let textId: string | null = null
      if (text) {
        textId = createHash('sha1').update(text).digest('hex').slice(0, 10)
        texts.set(textId, text)
      }
      seen.set(key, { name: manifest.name, version: manifest.version, license: licenseOf(manifest), author: authorOf(manifest), url: urlOf(manifest), group, textId })
    }
    return manifest
  }

  const visit = (name: string, from: string): void => {
    const dir = locate(name, from)
    if (!dir) {
      return
    }
    const key = `${name}@${readManifest(dir).version}`
    if (seen.has(key)) {
      return
    }
    const manifest = add(dir, 'runtime')
    for (const dependency of Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies })) {
      visit(dependency, dir)
    }
  }

  for (const root of roots) {
    visit(root.name, root.from)
  }

  for (const project of [ROOT, join(ROOT, 'web')]) {
    for (const name of Object.keys(readManifest(project).devDependencies ?? {})) {
      const dir = locate(name, project)
      if (dir && !seen.has(`${name}@${readManifest(dir).version}`)) {
        add(dir, 'tooling')
      }
    }
  }

  const fontText = readFileSync(join(ROOT, FONT.file), 'utf8').replace(/\r\n/g, '\n').trim()
  const fontId = createHash('sha1').update(fontText).digest('hex').slice(0, 10)
  texts.set(fontId, fontText)
  seen.set(`${FONT.name}@${FONT.version}`, { name: FONT.name, version: FONT.version, license: FONT.license, author: FONT.author, url: FONT.url, group: 'runtime', textId: fontId })

  for (const platform of PLATFORMS) {
    seen.set(`${platform.name}@${platform.version}`, { ...platform, group: 'runtime', textId: null })
  }

  const components = [...seen.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
  return { components, texts: Object.fromEntries([...texts.entries()].sort(([a], [b]) => a.localeCompare(b))) }
}

export function renderMarkdown(notices: Notices): string {
  const lines: string[] = [
    '# Third-party notices',
    '',
    'Folio includes or uses the components below. Each keeps its own license. The Folio code is under GNU AGPL 3.0 and the bundled catalog is under CC BY-SA 4.0, see LICENSE and catalog/LICENSE. This file is generated by `node scripts/generate-notices.ts`.',
    '',
  ]
  for (const group of ['runtime', 'tooling'] as const) {
    lines.push(group === 'runtime' ? '## Components shipped with or required by the application' : '## Build, test and development tools (not shipped)', '')
    for (const component of notices.components.filter((item) => item.group === group)) {
      const owner = component.author ? ` by ${component.author}` : ''
      const link = component.url ? ` (${component.url})` : ''
      lines.push(`- ${component.name} ${component.version}${owner}: ${component.license}${link}`)
    }
    lines.push('')
  }
  lines.push('## License texts', '')
  const used = new Map<string, string[]>()
  for (const component of notices.components) {
    if (component.textId) {
      used.set(component.textId, [...(used.get(component.textId) ?? []), component.name])
    }
  }
  for (const [id, names] of used) {
    lines.push(`### Used by ${names.join(', ')}`, '', '```text', notices.texts[id] ?? '', '```', '')
  }
  const missing = notices.components.filter((component) => !component.textId)
  if (missing.length > 0) {
    lines.push('## Components without a license file in their package', '')
    for (const component of missing) {
      const links = spdxLinks(component.license)
      lines.push(`- ${component.name} ${component.version}: ${component.license}${links.length > 0 ? ` (${links.join(', ')})` : component.url ? ` (${component.url})` : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

if (import.meta.main) {
  const notices = collect()
  writeFileSync(join(ROOT, 'THIRD_PARTY_NOTICES.md'), renderMarkdown(notices))
  mkdirSync(join(ROOT, 'web/src/generated'), { recursive: true })
  writeFileSync(join(ROOT, 'web/src/generated/notices.json'), `${JSON.stringify(notices)}\n`)
  console.error(`Components: ${notices.components.length}, license texts: ${Object.keys(notices.texts).length}`)
}
