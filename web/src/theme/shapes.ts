export type ShapeName = 'cookie9' | 'cookie12' | 'cookie6' | 'flower' | 'clover' | 'burst' | 'puffy' | 'sun'

type ShapeSpec = { lobes: number; depth: number; round: number }

const SPECS: Record<ShapeName, ShapeSpec> = {
  cookie9: { lobes: 9, depth: 0.07, round: 0 },
  cookie12: { lobes: 12, depth: 0.05, round: 0 },
  cookie6: { lobes: 6, depth: 0.1, round: 0 },
  flower: { lobes: 8, depth: 0.16, round: 0 },
  clover: { lobes: 4, depth: 0.2, round: 0 },
  burst: { lobes: 12, depth: 0.1, round: 0.4 },
  puffy: { lobes: 5, depth: 0.12, round: 0 },
  sun: { lobes: 16, depth: 0.06, round: 0 },
}

export const SHAPE_NAMES = Object.keys(SPECS) as ShapeName[]

export function shapePath(name: ShapeName, steps = 120): string {
  const { lobes, depth, round } = SPECS[name]
  const base = 0.5 - depth * 0.5
  const points: string[] = []
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2
    const wave = Math.cos(lobes * theta)
    const shaped = round > 0 ? Math.sign(wave) * Math.abs(wave) ** (1 - round) : wave
    const radius = base + depth * 0.5 * shaped
    const x = 0.5 + radius * Math.cos(theta)
    const y = 0.5 + radius * Math.sin(theta)
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(4)} ${y.toFixed(4)}`)
  }
  return `${points.join(' ')} Z`
}

export function shapeFor(id: string): ShapeName {
  let hash = 0
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return SHAPE_NAMES[hash % SHAPE_NAMES.length] ?? 'cookie9'
}

export function toneFor(id: string): 0 | 1 | 2 {
  let hash = 7
  for (const character of id) {
    hash = (hash * 17 + character.charCodeAt(0)) >>> 0
  }
  return (hash % 3) as 0 | 1 | 2
}

export function initialsOf(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (word[0] ?? '').toUpperCase())
    .join('')
}
