export const TYPEFACES = ['roboto-flex', 'roboto-flex-axes', 'roboto', 'google-sans', 'google-sans-flex', 'google-sans-flex-axes', 'system', 'serif'] as const
export type Typeface = (typeof TYPEFACES)[number]

export const FONT_PARTS = ['headings', 'text', 'ui', 'covers'] as const
export type FontPart = (typeof FONT_PARTS)[number]

export const AXES_FAMILIES = ['roboto-flex-axes', 'google-sans-flex-axes'] as const
export type AxesFamily = (typeof AXES_FAMILIES)[number]

export type AxisKey = 'wght' | 'wdth' | 'GRAD' | 'ROND' | 'slnt'
export type AxisSpec = { key: AxisKey; min: number; max: number; step: number; default: number }
export type AxisValues = Record<AxisKey, number>

export const BASE_WEIGHT = 400

export const AXES: Record<AxesFamily, readonly AxisSpec[]> = {
  'roboto-flex-axes': [
    { key: 'wght', min: 100, max: 1000, step: 10, default: 400 },
    { key: 'wdth', min: 25, max: 151, step: 1, default: 100 },
    { key: 'GRAD', min: -200, max: 150, step: 5, default: 0 },
    { key: 'slnt', min: -10, max: 0, step: 1, default: 0 },
  ],
  'google-sans-flex-axes': [
    { key: 'wght', min: 1, max: 1000, step: 10, default: 400 },
    { key: 'wdth', min: 25, max: 151, step: 1, default: 100 },
    { key: 'ROND', min: 0, max: 100, step: 1, default: 0 },
    { key: 'slnt', min: -10, max: 0, step: 1, default: 0 },
  ],
}

export type FontAxes = Record<AxesFamily, AxisValues>

export function isAxesFamily(face: Typeface): face is AxesFamily {
  return face === 'roboto-flex-axes' || face === 'google-sans-flex-axes'
}

export function stackVariable(face: Typeface): string {
  return `--stack-${face.replace('-axes', '')}`
}

function defaultValues(family: AxesFamily): AxisValues {
  const values = { wght: BASE_WEIGHT, wdth: 100, GRAD: 0, ROND: 0, slnt: 0 }
  for (const spec of AXES[family]) {
    values[spec.key] = spec.default
  }
  return values
}

export const DEFAULT_AXES: FontAxes = {
  'roboto-flex-axes': defaultValues('roboto-flex-axes'),
  'google-sans-flex-axes': defaultValues('google-sans-flex-axes'),
}

export function clampAxis(spec: AxisSpec, value: unknown): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : spec.default
  return Math.min(spec.max, Math.max(spec.min, number))
}

export function parseAxes(raw: unknown): FontAxes {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const result = { ...DEFAULT_AXES }
  for (const family of AXES_FAMILIES) {
    const stored = typeof source[family] === 'object' && source[family] !== null ? (source[family] as Record<string, unknown>) : {}
    const values = { ...DEFAULT_AXES[family] }
    for (const spec of AXES[family]) {
      values[spec.key] = clampAxis(spec, stored[spec.key])
    }
    result[family] = values
  }
  return result
}

export function variationFor(face: Typeface, axes: FontAxes): string {
  if (!isAxesFamily(face)) {
    return "'GRAD' 0"
  }
  return AXES[face]
    .filter((spec) => spec.key !== 'wght')
    .map((spec) => `'${spec.key}' ${axes[face][spec.key]}`)
    .join(', ')
}

export function weightShiftFor(face: Typeface, axes: FontAxes): number {
  return isAxesFamily(face) ? axes[face].wght - BASE_WEIGHT : 0
}
