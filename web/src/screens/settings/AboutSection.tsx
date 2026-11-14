import type { JSX } from 'solid-js'
import { Panel } from '../../components/Panel.tsx'
import { t } from '../../i18n/index.ts'

export function AboutSection(): JSX.Element {
  return (
    <Panel tone="container" class="flex flex-col gap-4">
      <h3 class="title text-lg">{t('howRatings')}</h3>
      <p class="-mt-3 text-on-surface-variant">{t('howRatingsBody')}</p>
      <h3 class="title text-lg">{t('howNeural')}</h3>
      <p class="-mt-3 text-on-surface-variant">{t('howNeuralBody')}</p>
      <h3 class="title text-lg">{t('howLibrarian')}</h3>
      <p class="-mt-3 text-on-surface-variant">{t('howLibrarianBody')}</p>
      <h3 class="title text-lg">{t('privacy')}</h3>
      <p class="-mt-3 text-on-surface-variant">{t('consentNote')}</p>
    </Panel>
  )
}
