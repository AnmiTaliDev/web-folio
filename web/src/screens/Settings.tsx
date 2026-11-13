import { A, useNavigate, useParams } from '@solidjs/router'
import { createSignal, onCleanup, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import { AccountCard, signOut } from '../components/AccountCard.tsx'
import { ExportDialog, FormDialog, RecoveryCodeDialog } from '../components/Dialogs.tsx'
import { Icon } from '../components/Icon.tsx'
import type { IconName } from '../components/icons.ts'
import { PrivateCard } from '../components/Notices.tsx'
import { Panel } from '../components/Panel.tsx'
import { LANG_NAMES, LANGS, lang, setLang, t, type Key } from '../i18n/index.ts'
import { isValidPassword } from '../lib/auth.ts'
import { resolveSection, sectionsFor, type SettingsSection } from '../lib/settingsSections.ts'
import { chat } from '../state/chat.ts'
import { library } from '../state/library.ts'
import { session, signedOut } from '../state/session.ts'

type Dialog = 'password' | 'recovery' | 'delete' | 'export' | null

function Row(props: { icon: IconName; label: string; hint?: string; danger?: boolean; onClick: () => void }): JSX.Element {
  return (
    <li>
      <button
        type="button"
        class={`press relative flex w-full items-center gap-4 rounded-3xl px-4 py-3.5 text-left ${props.danger ? 'text-error' : 'text-on-surface'} hover:bg-surface-high`}
        onClick={() => props.onClick()}
      >
        <md-ripple />
        <Icon name={props.icon} />
        <span class="flex flex-col">
          <span class="title">{props.label}</span>
          <Show when={props.hint}>
            <span class="text-sm text-on-surface-variant">{props.hint}</span>
          </Show>
        </span>
      </button>
    </li>
  )
}

function Toggle(props: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }): JSX.Element {
  return (
    <li class="flex items-center justify-between gap-4 rounded-3xl px-4 py-3.5">
      <span class="flex flex-col">
        <span class="title">{props.label}</span>
        <span class="text-sm text-on-surface-variant">{props.hint}</span>
      </span>
      <md-switch
        aria-label={props.label}
        prop:selected={props.checked}
        prop:disabled={props.disabled === true}
        on:change={(event: Event) => props.onChange((event.target as HTMLInputElement & { selected: boolean }).selected)}
      />
    </li>
  )
}

const meta: Record<SettingsSection, { icon: IconName; title: Key; hint: Key }> = {
  account: { icon: 'person', title: 'settingsAccount', hint: 'settingsAccountHint' },
  general: { icon: 'language', title: 'settingsGeneral', hint: 'settingsGeneralHint' },
  personalization: { icon: 'tune', title: 'settingsPersonalization', hint: 'settingsPersonalizationHint' },
  data: { icon: 'database', title: 'settingsData', hint: 'settingsDataHint' },
  about: { icon: 'info', title: 'settingsAbout', hint: 'settingsAboutHint' },
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

function Group(props: { children: JSX.Element }): JSX.Element {
  return <ul class="flex flex-col rounded-panel bg-surface-low p-2">{props.children}</ul>
}

export function Settings(): JSX.Element {
  const navigate = useNavigate()
  const params = useParams()
  const wide = useWide()
  const [dialog, setDialog] = createSignal<Dialog>(null)
  const [newCode, setNewCode] = createSignal<string | null>(null)
  const [exported, setExported] = createSignal('')

  const sections = () => sectionsFor(session.registered())
  const current = () => resolveSection(params.section, session.registered(), wide())
  const profile = () => session.profile()

  async function setFlag(flag: 'personalizationEnabled' | 'aiDescriptionsEnabled', value: boolean): Promise<void> {
    const existing = profile()
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

  async function showData(): Promise<void> {
    try {
      setExported(JSON.stringify(await api.exportData(), null, 2))
    } catch {
      setExported(t('loadError'))
    }
    setDialog('export')
  }

  function leave(): void {
    signedOut()
    library.reset()
    chat.reset()
    navigate('/')
  }

  async function logoutEverywhere(): Promise<void> {
    try {
      await api.logoutAll()
    } finally {
      leave()
    }
  }

  const close = () => setDialog(null)

  const content = (section: SettingsSection): JSX.Element => {
    switch (section) {
      case 'account':
        return (
          <div class="flex flex-col gap-4">
            <AccountCard />
            <Show when={session.registered()} fallback={<PrivateCard />}>
              <Group>
                <Row icon="key" label={t('changePassword')} onClick={() => setDialog('password')} />
                <Row icon="shield" label={t('newRecoveryCode')} onClick={() => setDialog('recovery')} />
                <Row icon="logout" label={t('signOutEverywhere')} onClick={() => void logoutEverywhere()} />
                <Row icon="logout" label={t('signOut')} onClick={() => void signOut(navigate)} />
              </Group>
            </Show>
          </div>
        )
      case 'general':
        return (
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
        )
      case 'personalization':
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
      case 'data':
        return (
          <div class="flex flex-col gap-4">
            <p class="px-2 text-sm text-on-surface-variant">{t('consentNote')}</p>
            <Group>
              <Row icon="download" label={t('showMyData')} onClick={() => void showData()} />
              <Row icon="delete" label={t('deleteAccount')} danger onClick={() => setDialog('delete')} />
            </Group>
          </div>
        )
      case 'about':
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
  }

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

      <FormDialog
        open={dialog() === 'password'}
        title={t('changePassword')}
        fields={[
          { key: 'current', label: t('authCurrentPassword'), autocomplete: 'current-password' },
          { key: 'next', label: t('authNewPassword'), autocomplete: 'new-password' },
        ]}
        submitLabel={t('confirm')}
        validate={(values) => (isValidPassword(values.next ?? '') ? null : t('authErrorShortPassword'))}
        onSubmit={async (values) => {
          await api.changePassword(values.current ?? '', values.next ?? '')
          close()
        }}
        onClose={close}
      />
      <FormDialog
        open={dialog() === 'recovery'}
        title={t('newRecoveryCode')}
        body={t('newRecoveryCodeBody')}
        fields={[{ key: 'password', label: t('authPassword'), autocomplete: 'current-password' }]}
        submitLabel={t('confirm')}
        onSubmit={async (values) => {
          const result = await api.recoveryCode(values.password ?? '')
          close()
          setNewCode(result.recoveryCode)
        }}
        onClose={close}
      />
      <FormDialog
        open={dialog() === 'delete'}
        title={t('deleteAccountTitle')}
        body={t('deleteAccountBody')}
        fields={[{ key: 'password', label: t('authPassword'), autocomplete: 'current-password' }]}
        submitLabel={t('delete')}
        danger
        onSubmit={async (values) => {
          await api.deleteAccount(values.password ?? '')
          close()
          leave()
        }}
        onClose={close}
      />
      <ExportDialog open={dialog() === 'export'} text={exported()} onClose={close} />
      <RecoveryCodeDialog code={newCode()} onDone={() => setNewCode(null)} />
    </main>
  )
}
