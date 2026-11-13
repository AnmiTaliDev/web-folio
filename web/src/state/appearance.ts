import { createEffect, createRoot, createSignal } from 'solid-js'
import { cssFor, kebab, SEED, type StyleVariant } from '../theme/scheme.ts'

export type Mode = 'system' | 'light' | 'dark'
export type Contrast = 0 | 0.5 | 1

export type Appearance = { mode: Mode; seed: string | null; variant: StyleVariant; contrast: Contrast }

export const DEFAULT_APPEARANCE: Appearance = { mode: 'system', seed: null, variant: 'vibrant', contrast: 0 }

export const MODES: readonly Mode[] = ['system', 'light', 'dark']
export const VARIANTS: readonly StyleVariant[] = ['vibrant', 'tonal', 'neutral', 'expressive', 'content']
export const CONTRASTS: readonly Contrast[] = [0, 0.5, 1]

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

export function parseAppearance(raw: string | null): Appearance {
  if (!raw) {
    return DEFAULT_APPEARANCE
  }
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>
    const mode = MODES.find((value) => value === data.mode) ?? DEFAULT_APPEARANCE.mode
    const variant = VARIANTS.find((value) => value === data.variant) ?? DEFAULT_APPEARANCE.variant
    const contrast = CONTRASTS.find((value) => value === data.contrast) ?? DEFAULT_APPEARANCE.contrast
    return { mode, seed: parseSeed(data.seed), variant, contrast }
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
      target.dataset.theme = dark ? 'dark' : 'light'
      target.style.colorScheme = dark ? 'dark' : 'light'
      const surface = target.style.getPropertyValue(`--md-sys-color-${kebab('surface')}`)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surface)
    })
  })
}
