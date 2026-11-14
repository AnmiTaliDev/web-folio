import { A } from '@solidjs/router'
import { createResource, Show, type JSX } from 'solid-js'
import { api } from '../../api/client.ts'
import { Icon } from '../../components/Icon.tsx'
import { Panel } from '../../components/Panel.tsx'
import { LANGS, t } from '../../i18n/index.ts'
import { sourceUrl } from '../../lib/legal.ts'

export function ProjectCard(): JSX.Element {
  const [catalog] = createResource(async () => {
    try {
      return (await api.browse({ genre: '', query: '', sort: 'popularity', offset: 0, limit: 1 })).total
    } catch {
      return null
    }
  })
  return (
    <div class="flex flex-col gap-4">
      <Panel tone="primary" class="flex flex-col gap-3 rounded-[2.5rem]! md:p-8">
        <h3 class="display text-4xl">Folio</h3>
        <p class="title text-xl">{t('projectTagline')}</p>
        <p class="max-w-prose opacity-90">{t('projectIntro')}</p>
      </Panel>
      <Panel tone="low" class="flex flex-col gap-4">
        <h3 class="title text-lg">{t('projectFacts')}</h3>
        <ul class="grid grid-cols-3 gap-4">
          <li class="flex flex-col">
            <span class="headline text-4xl">{catalog() ?? '...'}</span>
            <span class="label text-on-surface-variant">{t('projectBooks')}</span>
          </li>
          <li class="flex flex-col">
            <span class="headline text-4xl">{LANGS.length}</span>
            <span class="label text-on-surface-variant">{t('projectLanguages')}</span>
          </li>
          <li class="flex flex-col">
            <span class="headline text-4xl">{__APP_VERSION__}</span>
            <span class="label text-on-surface-variant">{t('projectVersion')}</span>
          </li>
        </ul>
      </Panel>
      <Panel tone="container" class="flex flex-col gap-3">
        <h3 class="title text-lg">{t('projectBuilt')}</h3>
        <ul class="flex max-w-prose list-disc flex-col gap-2 pl-5 text-on-surface-variant">
          <li>{t('projectStack1')}</li>
          <li>{t('projectStack2')}</li>
          <li>{t('projectStack3')}</li>
        </ul>
      </Panel>
      <Panel tone="low" class="flex flex-col gap-3">
        <h3 class="title text-lg">{t('projectTeam')}</h3>
        <p class="max-w-prose text-on-surface-variant">{t('projectTeamBody')}</p>
        <h3 class="title mt-2 text-lg">{t('projectOpen')}</h3>
        <p class="max-w-prose text-on-surface-variant">{t('projectOpenBody')}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <A href="/terms" class="contents">
            <md-filled-tonal-button>{t('legalTerms')}</md-filled-tonal-button>
          </A>
          <A href="/settings/legal" class="contents">
            <md-text-button>{t('settingsLegal')}</md-text-button>
          </A>
          <Show when={sourceUrl()}>
            {(url) => (
              <a href={url()} target="_blank" rel="noopener noreferrer" class="contents">
                <md-text-button>
                  {t('projectSource')}
                  <Icon slot="icon" name="open_in_new" size={18} />
                </md-text-button>
              </a>
            )}
          </Show>
        </div>
      </Panel>
    </div>
  )
}
