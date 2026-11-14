import { A, useParams } from '@solidjs/router'
import { createSignal, onCleanup, Show, type JSX } from 'solid-js'
import { Icon } from '../components/Icon.tsx'
import type { IconName } from '../components/icons.ts'
import { t, type Key } from '../i18n/index.ts'
import { resolveSection, sectionsFor, type SettingsSection } from '../lib/settingsSections.ts'
import { session } from '../state/session.ts'
import { AboutSection } from './settings/AboutSection.tsx'
import { AccountSection } from './settings/AccountSection.tsx'
import { AppearanceCard } from './settings/AppearanceCard.tsx'
import { DataSection } from './settings/DataSection.tsx'
import { GeneralSection } from './settings/GeneralSection.tsx'
import { LegalSection } from './settings/LegalSection.tsx'
import { PersonalizationSection } from './settings/PersonalizationSection.tsx'
import { ProjectCard } from './settings/ProjectCard.tsx'

const meta: Record<SettingsSection, { icon: IconName; title: Key; hint: Key }> = {
  account: { icon: 'person', title: 'settingsAccount', hint: 'settingsAccountHint' },
  appearance: { icon: 'palette', title: 'settingsAppearance', hint: 'settingsAppearanceHint' },
  general: { icon: 'language', title: 'settingsGeneral', hint: 'settingsGeneralHint' },
  personalization: { icon: 'tune', title: 'settingsPersonalization', hint: 'settingsPersonalizationHint' },
  data: { icon: 'database', title: 'settingsData', hint: 'settingsDataHint' },
  about: { icon: 'info', title: 'settingsAbout', hint: 'settingsAboutHint' },
  project: { icon: 'info', title: 'settingsProject', hint: 'settingsProjectHint' },
  legal: { icon: 'gavel', title: 'settingsLegal', hint: 'settingsLegalHint' },
}

function useWide(): () => boolean {
  const query = window.matchMedia('(min-width: 768px)')
  const [wide, setWide] = createSignal(query.matches)
  const update = () => setWide(query.matches)
  query.addEventListener('change', update)
  onCleanup(() => query.removeEventListener('change', update))
  return wide
}

function SectionList(props: { current: SettingsSection | null; sections: readonly SettingsSection[]; wide: boolean }): JSX.Element {
  return (
    <nav aria-label={t('settingsSections')}>
      <ul class="flex flex-col gap-1.5">
        {props.sections.map((key) => {
          const item = meta[key]
          const active = () => props.wide && props.current === key
          return (
            <li>
              <A
                href={`/settings/${key}`}
                aria-current={active() ? 'page' : undefined}
                class={`press relative flex items-center gap-4 overflow-hidden rounded-3xl px-4 py-3.5 transition-colors ${
                  active() ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-low hover:bg-surface-container md:bg-transparent'
                }`}
              >
                <md-ripple />
                <Icon name={item.icon} filled={active()} />
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="title">{t(item.title)}</span>
                  <span class={`line-clamp-1 text-sm ${active() ? 'opacity-80' : 'text-on-surface-variant'}`}>{t(item.hint)}</span>
                </span>
                <Icon name="chevron_right" class="text-on-surface-variant md:hidden" />
              </A>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function content(section: SettingsSection): JSX.Element {
  switch (section) {
    case 'account':
      return <AccountSection />
    case 'appearance':
      return <AppearanceCard />
    case 'general':
      return <GeneralSection />
    case 'personalization':
      return <PersonalizationSection />
    case 'data':
      return <DataSection />
    case 'project':
      return <ProjectCard />
    case 'legal':
      return <LegalSection />
    case 'about':
      return <AboutSection />
  }
}

export function Settings(): JSX.Element {
  const params = useParams()
  const wide = useWide()
  const sections = () => sectionsFor(session.registered())
  const current = () => resolveSection(params.section, session.registered(), wide())

  return (
    <main class="flex flex-col gap-6">
      <header class="flex flex-col gap-2 pt-4">
        <Show when={current() !== null && !wide()}>
          <A href="/settings" class="contents">
            <md-icon-button class="-ml-3 self-start" aria-label={t('back')}>
              <Icon name="arrow_back" />
            </md-icon-button>
          </A>
        </Show>
        <h1 class="display text-[clamp(2.25rem,8vw,3.75rem)] text-balance">
          {current() !== null && !wide() ? t(meta[current() as SettingsSection].title) : t('settingsTitle')}
        </h1>
      </header>

      <div class="md:grid md:grid-cols-[17rem_minmax(0,1fr)] md:items-start md:gap-10">
        <Show when={wide() || current() === null}>
          <div class="md:sticky md:top-8">
            <SectionList current={current()} sections={sections()} wide={wide()} />
          </div>
        </Show>
        <Show when={current()} keyed>
          {(section) => (
            <section class="flex flex-col gap-4" aria-labelledby="settings-section-title">
              <Show when={wide()}>
                <h2 id="settings-section-title" class="headline text-3xl">
                  {t(meta[section].title)}
                </h2>
              </Show>
              {content(section)}
            </section>
          )}
        </Show>
      </div>
    </main>
  )
}
