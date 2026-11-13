export type Motif = 'arcs' | 'stripes' | 'dots' | 'waves' | 'skyline' | 'sun'

export const MOTIFS: readonly Motif[] = ['arcs', 'stripes', 'dots', 'waves', 'skyline', 'sun']

export type Palette = { background: string; foreground: string; accent: string }

export const PALETTES: readonly Palette[] = [
  { background: 'var(--md-sys-color-primary-container)', foreground: 'var(--md-sys-color-on-primary-container)', accent: 'var(--md-sys-color-primary)' },
  { background: 'var(--md-sys-color-tertiary-container)', foreground: 'var(--md-sys-color-on-tertiary-container)', accent: 'var(--md-sys-color-tertiary)' },
  { background: 'var(--md-sys-color-secondary-container)', foreground: 'var(--md-sys-color-on-secondary-container)', accent: 'var(--md-sys-color-secondary)' },
  { background: 'var(--md-sys-color-primary)', foreground: 'var(--md-sys-color-on-primary)', accent: 'var(--md-sys-color-primary-container)' },
  { background: 'var(--md-sys-color-tertiary)', foreground: 'var(--md-sys-color-on-tertiary)', accent: 'var(--md-sys-color-tertiary-container)' },
]

export function hashOf(text: string): number {
  let value = 2166136261
  for (const character of text) {
    value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0
  }
  return value
}

export type CoverSpec = { motif: Motif; palette: Palette; a: number; b: number; c: number }

export function coverSpec(id: string): CoverSpec {
  const hash = hashOf(id)
  const second = hashOf(`${id}:2`)
  return {
    motif: MOTIFS[hash % MOTIFS.length] ?? 'arcs',
    palette: PALETTES[(hash >>> 8) % PALETTES.length] ?? PALETTES[0]!,
    a: (second % 100) / 100,
    b: ((second >>> 8) % 100) / 100,
    c: ((second >>> 16) % 100) / 100,
  }
}

export function wrapTitle(title: string, limit = 11, maxLines = 5): string[] {
  const words = title.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line === '') {
      line = word
    } else if (`${line} ${word}`.length <= limit) {
      line = `${line} ${word}`
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line !== '') {
    lines.push(line)
  }
  const cut = lines.slice(0, maxLines)
  if (lines.length > maxLines) {
    cut[maxLines - 1] = `${(cut[maxLines - 1] ?? '').slice(0, Math.max(limit - 1, 1))}…`
  }
  return cut.map((value) => (value.length > limit + 3 ? `${value.slice(0, limit + 2)}…` : value))
}
