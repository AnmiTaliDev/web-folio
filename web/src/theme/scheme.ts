import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
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

export function buildScheme(seedHex: string, dark: boolean): DynamicScheme {
  const source = Hct.fromInt(argbFromHex(seedHex))
  const base = new SchemeVibrant(source, dark, 0)
  return new DynamicScheme({
    sourceColorHct: source,
    variant: Variant.VIBRANT,
    contrastLevel: 0,
    isDark: dark,
    primaryPalette: base.primaryPalette,
    secondaryPalette: base.secondaryPalette,
    tertiaryPalette: TonalPalette.fromHueAndChroma(ACCENT_HUE, ACCENT_CHROMA),
    neutralPalette: base.neutralPalette,
    neutralVariantPalette: base.neutralVariantPalette,
  })
}

export function schemeColors(seedHex: string, dark: boolean): Record<Role, string> {
  const scheme = buildScheme(seedHex, dark)
  const roles = new MaterialDynamicColors() as unknown as Record<Role, () => { getArgb(scheme: DynamicScheme): number }>
  const colors = {} as Record<Role, string>
  for (const role of ROLES) {
    colors[role] = hexFromArgb(roles[role]().getArgb(scheme))
  }
  return colors
}

export function schemeCss(seedHex: string, dark: boolean): string {
  const colors = schemeColors(seedHex, dark)
  return ROLES.map((role) => `--md-sys-color-${kebab(role)}: ${colors[role]};`).join('\n')
}

export function installScheme(target: HTMLElement, query: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')): () => void {
  const apply = () => {
    const css = schemeCss(SEED, query.matches)
    for (const line of css.split('\n')) {
      const [name, value] = line.split(': ')
      if (name && value) {
        target.style.setProperty(name, value.replace(';', ''))
      }
    }
    target.dataset.theme = query.matches ? 'dark' : 'light'
  }
  apply()
  query.addEventListener('change', apply)
  return () => query.removeEventListener('change', apply)
}
