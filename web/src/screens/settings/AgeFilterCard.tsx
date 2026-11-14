import { Show, type JSX } from 'solid-js'
import { Panel } from '../../components/Panel.tsx'
import { t } from '../../i18n/index.ts'
import { AGE_LEVELS, ageLimit, setAgeLimit } from '../../state/age.ts'

export function AgeFilterCard(): JSX.Element {
  return (
    <Panel tone="low" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h3 class="title text-lg">{t('ageFilter')}</h3>
        <p class="text-sm text-on-surface-variant">{t('ageFilterHint')}</p>
      </div>
      <ul class="flex flex-wrap gap-2" role="radiogroup" aria-label={t('ageFilter')}>
        <li>
          <md-filter-chip label={t('ageFilterOff')} prop:selected={ageLimit() === null} on:click={() => void setAgeLimit(null).catch(() => undefined)} />
        </li>
        {AGE_LEVELS.map((level) => (
          <li>
            <md-filter-chip label={t('ageMark', { age: level })} prop:selected={ageLimit() === level} on:click={() => void setAgeLimit(level).catch(() => undefined)} />
          </li>
        ))}
      </ul>
      <Show when={ageLimit() !== null}>
        <p class="label rounded-2xl bg-secondary-container px-4 py-3 text-on-secondary-container">{t('ageFilterOn', { age: ageLimit() ?? '' })}</p>
      </Show>
      <p class="text-sm text-on-surface-variant">{t('ageFilterNote')}</p>
    </Panel>
  )
}
