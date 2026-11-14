import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeNeutral,
  SchemeTonalSpot,
  SchemeVibrant,
  TonalPalette,
  Variant,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities'

export const SEED = '#0061A4'
const ACCENT_HUE = 12
const ACCENT_CHROMA = 62

const ROLES = [
  'background',
  'onBackground',
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'outline',
  'outlineVariant',
  'inverseSurface',
  'inverseOnSurface',
  'shadow',
  'scrim',
  'surfaceTint',
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
] as const

export type Role = (typeof ROLES)[number]

export function kebab(role: string): string {
  return role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

export type StyleVariant = 'vibrant' | 'tonal' | 'neutral' | 'expressive' | 'content'

export type SchemeOptions = { seed: string; dark: boolean; variant: StyleVariant; contrast: number; brandAccent: boolean }

export const DEFAULT_OPTIONS = { variant: 'vibrant', contrast: 0, brandAccent: true } as const

function baseScheme(source: Hct, dark: boolean, contrast: number, variant: StyleVariant): DynamicScheme {
  switch (variant) {
    case 'tonal':
      return new SchemeTonalSpot(source, dark, contrast)
    case 'neutral':
      return new SchemeNeutral(source, dark, contrast)
    case 'expressive':
      return new SchemeExpressive(source, dark, contrast)
    case 'content':
      return new SchemeContent(source, dark, contrast)
    default:
      return new SchemeVibrant(source, dark, contrast)
  }
}

export function buildSchemeWith(options: SchemeOptions): DynamicScheme {
  const source = Hct.fromInt(argbFromHex(options.seed))
  const base = baseScheme(source, options.dark, options.contrast, options.variant)
  if (!options.brandAccent) {
    return base
  }
  return new DynamicScheme({
    sourceColorHct: source,
    variant: Variant.VIBRANT,
    contrastLevel: options.contrast,
    isDark: options.dark,
    primaryPalette: base.primaryPalette,
    secondaryPalette: base.secondaryPalette,
    tertiaryPalette: TonalPalette.fromHueAndChroma(ACCENT_HUE, ACCENT_CHROMA),
    neutralPalette: base.neutralPalette,
    neutralVariantPalette: base.neutralVariantPalette,
  })
}

export function buildScheme(seedHex: string, dark: boolean): DynamicScheme {
  return buildSchemeWith({ seed: seedHex, dark, ...DEFAULT_OPTIONS })
}

export function colorsFor(options: SchemeOptions): Record<Role, string> {
  const scheme = buildSchemeWith(options)
  const colors = {} as Record<Role, string>
  for (const role of ROLES) {
    colors[role] = hexFromArgb(MaterialDynamicColors[role].getArgb(scheme))
  }
  return colors
}

export function schemeColors(seedHex: string, dark: boolean): Record<Role, string> {
  return colorsFor({ seed: seedHex, dark, ...DEFAULT_OPTIONS })
}

export function cssFor(options: SchemeOptions): string {
  const colors = colorsFor(options)
  return ROLES.map((role) => `--md-sys-color-${kebab(role)}: ${colors[role]};`).join('\n')
}

export function schemeCss(seedHex: string, dark: boolean): string {
  return cssFor({ seed: seedHex, dark, ...DEFAULT_OPTIONS })
}
