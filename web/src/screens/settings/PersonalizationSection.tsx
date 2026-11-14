import type { JSX } from 'solid-js'
import { api } from '../../api/client.ts'
import { t } from '../../i18n/index.ts'
import { session } from '../../state/session.ts'
import { Group, Toggle } from './parts.tsx'

type Flag = 'personalizationEnabled' | 'aiDescriptionsEnabled'

async function setFlag(flag: Flag, value: boolean): Promise<void> {
  const existing = session.profile()
  if (!existing) {
    return
  }
  session.setProfile({ ...existing, [flag]: value })
  try {
    await api.updateProfile({ [flag]: value })
  } catch {
    session.setProfile(existing)
  }
}

export function PersonalizationSection(): JSX.Element {
  const profile = () => session.profile()
  return (
    <Group>
      <Toggle
        label={t('useLikes')}
        hint={t('personalizationHint')}
        checked={profile()?.personalizationEnabled ?? true}
        disabled={!profile()}
        onChange={(value) => void setFlag('personalizationEnabled', value)}
      />
      <Toggle
        label={t('aiDescriptions')}
        hint={session.aiEnabled() ? t('aiDescriptionsHint') : t('aiOffNote')}
        checked={session.aiEnabled() && (profile()?.aiDescriptionsEnabled ?? true)}
        disabled={!profile() || !session.aiEnabled()}
        onChange={(value) => void setFlag('aiDescriptionsEnabled', value)}
      />
    </Group>
  )
}
