import type { JSX } from 'solid-js'
import { Panel } from '../../components/Panel.tsx'
import { LANG_NAMES, LANGS, lang, setLang, t } from '../../i18n/index.ts'
import { AgeFilterCard } from './AgeFilterCard.tsx'

export function GeneralSection(): JSX.Element {
  return (
    <div class="flex flex-col gap-4">
      <Panel tone="low" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h3 class="title text-lg">{t('language')}</h3>
          <p class="text-sm text-on-surface-variant">{t('languageHint')}</p>
        </div>
        <ul class="flex flex-wrap gap-2" role="radiogroup" aria-label={t('language')}>
          {LANGS.map((code) => (
            <li>
              <md-filter-chip label={LANG_NAMES[code]} prop:selected={lang() === code} on:click={() => setLang(code)} />
            </li>
          ))}
        </ul>
      </Panel>
      <AgeFilterCard />
    </div>
  )
}
