import { createEffect, createRoot, createSignal } from 'solid-js'
import { DEFAULT_AXES, FONT_PARTS, parseAxes, stackVariable, TYPEFACES, variationFor, weightShiftFor, type FontAxes, type FontPart, type Typeface } from '../theme/fonts.ts'
import { cssFor, kebab, SEED, type StyleVariant } from '../theme/scheme.ts'

export type Mode = 'system' | 'light' | 'dark'
export type Contrast = 0 | 0.5 | 1

export type Scale = 0.9 | 1 | 1.15 | 1.3
export type Density = 'compact' | 'comfortable' | 'spacious'
export type Shape = 'sharp' | 'medium' | 'soft'
export type Motion = 'system' | 'reduced' | 'full'
export type FontParts = Record<FontPart, Typeface | null>

export type Appearance = {
  mode: Mode
  seed: string | null
  variant: StyleVariant
  contrast: Contrast
  scale: Scale
  density: Density
  shape: Shape
  amoled: boolean
  motion: Motion
  typeface: Typeface
  parts: FontParts
  axes: FontAxes
}

export const DEFAULT_APPEARANCE: Appearance = {
  mode: 'system',
  seed: null,
  variant: 'vibrant',
  contrast: 0,
  scale: 1,
  density: 'comfortable',
  shape: 'soft',
  amoled: false,
  motion: 'system',
  typeface: 'roboto-flex',
  parts: { headings: null, text: null, ui: null, covers: null },
  axes: DEFAULT_AXES,
}

export const MODES: readonly Mode[] = ['system', 'light', 'dark']
export const VARIANTS: readonly StyleVariant[] = ['vibrant', 'tonal', 'neutral', 'expressive', 'content']
export const CONTRASTS: readonly Contrast[] = [0, 0.5, 1]
export const SCALES: readonly Scale[] = [0.9, 1, 1.15, 1.3]
export const DENSITIES: readonly Density[] = ['compact', 'comfortable', 'spacious']
export const SHAPES: readonly Shape[] = ['sharp', 'medium', 'soft']
export const MOTIONS: readonly Motion[] = ['system', 'reduced', 'full']

export const PRESET_SEEDS: readonly { id: string; hex: string }[] = [
  { id: 'blue', hex: '#1A73E8' },
  { id: 'teal', hex: '#00897B' },
  { id: 'green', hex: '#388E3C' },
  { id: 'olive', hex: '#7C8B00' },
  { id: 'orange', hex: '#E65100' },
  { id: 'red', hex: '#C62828' },
  { id: 'pink', hex: '#D81B60' },
  { id: 'purple', hex: '#7B1FA2' },
  { id: 'indigo', hex: '#3949AB' },
  { id: 'brown', hex: '#6D4C41' },
  { id: 'slate', hex: '#546E7A' },
]

const KEY = 'folio.appearance'

export function parseSeed(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : null
}

function parseParts(raw: unknown): FontParts {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const parts = { ...DEFAULT_APPEARANCE.parts }
  for (const part of FONT_PARTS) {
    parts[part] = TYPEFACES.find((value) => value === source[part]) ?? null
  }
  return parts
}

export function effectiveTypeface(current: Appearance, part: FontPart): Typeface {
  return current.parts[part] ?? current.typeface
}

export function parseAppearance(raw: string | null): Appearance {
  if (!raw) {
    return DEFAULT_APPEARANCE
  }
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>
    const mode = MODES.find((value) => value === data.mode) ?? DEFAULT_APPEARANCE.mode
    const variant = VARIANTS.find((value) => value === data.variant) ?? DEFAULT_APPEARANCE.variant
    const contrast = CONTRASTS.find((value) => value === data.contrast) ?? DEFAULT_APPEARANCE.contrast
    return {
      mode,
      seed: parseSeed(data.seed),
      variant,
      contrast,
      scale: SCALES.find((value) => value === data.scale) ?? DEFAULT_APPEARANCE.scale,
      density: DENSITIES.find((value) => value === data.density) ?? DEFAULT_APPEARANCE.density,
      shape: SHAPES.find((value) => value === data.shape) ?? DEFAULT_APPEARANCE.shape,
      amoled: data.amoled === true,
      motion: MOTIONS.find((value) => value === data.motion) ?? DEFAULT_APPEARANCE.motion,
      typeface: TYPEFACES.find((value) => value === data.typeface) ?? DEFAULT_APPEARANCE.typeface,
      parts: parseParts(data.parts),
      axes: parseAxes(data.axes),
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function isDark(mode: Mode, systemDark: boolean): boolean {
  return mode === 'dark' || (mode === 'system' && systemDark)
}

export function schemeOptionsFor(appearance: Appearance, dark: boolean) {
  return {
    seed: appearance.seed ?? SEED,
    dark,
    variant: appearance.variant,
    contrast: appearance.contrast,
    brandAccent: appearance.seed === null,
    amoled: appearance.amoled,
  }
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function writeStored(value: Appearance): void {
  try {
    if (JSON.stringify(value) === JSON.stringify(DEFAULT_APPEARANCE)) {
      window.localStorage.removeItem(KEY)
    } else {
      window.localStorage.setItem(KEY, JSON.stringify(value))
    }
  } catch {
    return
  }
}

const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export const appearance = createRoot(() => {
  const [value, setValue] = createSignal<Appearance>(parseAppearance(readStored()))
  const [systemDark, setSystemDark] = createSignal(query?.matches ?? false)
  query?.addEventListener('change', () => setSystemDark(query.matches))

  function update(patch: Partial<Appearance>): void {
    const next = { ...value(), ...patch }
    setValue(next)
    writeStored(next)
  }

  function reset(): void {
    setValue(DEFAULT_APPEARANCE)
    writeStored(DEFAULT_APPEARANCE)
  }

  return { value, systemDark, update, reset, dark: () => isDark(value().mode, systemDark()) }
})

export function applyAppearance(target: HTMLElement): void {
  createRoot(() => {
    createEffect(() => {
      const dark = appearance.dark()
      const css = cssFor(schemeOptionsFor(appearance.value(), dark))
      for (const line of css.split('\n')) {
        const [name, color] = line.split(': ')
        if (name && color) {
          target.style.setProperty(name, color.replace(';', ''))
        }
      }
      const current = appearance.value()
      target.style.setProperty('--ui-scale', String(current.scale))
      target.dataset.density = current.density
      target.dataset.shape = current.shape
      target.dataset.motion = current.motion
      for (const part of FONT_PARTS) {
        const face = effectiveTypeface(current, part)
        target.style.setProperty(`--font-${part}`, `var(${stackVariable(face)})`)
        target.style.setProperty(`--fv-${part}`, variationFor(face, current.axes))
        target.style.setProperty(`--ws-${part}`, String(weightShiftFor(face, current.axes)))
      }
      target.dataset.theme = dark ? 'dark' : 'light'
      target.style.colorScheme = dark ? 'dark' : 'light'
      const surface = target.style.getPropertyValue(`--md-sys-color-${kebab('surface')}`)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surface)
    })
  })
}
