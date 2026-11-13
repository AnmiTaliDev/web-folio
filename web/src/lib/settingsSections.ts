export const SETTINGS_SECTIONS = ['account', 'general', 'personalization', 'data', 'about', 'legal'] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

const GUEST_SECTIONS: readonly SettingsSection[] = ['account', 'general', 'about', 'legal']

export function sectionsFor(registered: boolean): readonly SettingsSection[] {
  return registered ? SETTINGS_SECTIONS : GUEST_SECTIONS
}

export function resolveSection(param: string | undefined, registered: boolean, wide: boolean): SettingsSection | null {
  const available = sectionsFor(registered)
  const requested = available.find((section) => section === param)
  if (requested) {
    return requested
  }
  return wide ? (available[0] ?? null) : null
}
