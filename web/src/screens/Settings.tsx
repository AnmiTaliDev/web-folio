import { A, useNavigate, useParams } from '@solidjs/router'
import { createResource, createSignal, For, onCleanup, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import { AccountCard, signOut } from '../components/AccountCard.tsx'
import { Dialog as TextDialog } from '../components/Dialog.tsx'
import { NoticesDialog } from '../components/NoticesDialog.tsx'
import { ExportDialog, FormDialog, RecoveryCodeDialog } from '../components/Dialogs.tsx'
import { Icon } from '../components/Icon.tsx'
import type { IconName } from '../components/icons.ts'
import { PrivateCard } from '../components/Notices.tsx'
import { Panel } from '../components/Panel.tsx'
import { LANG_NAMES, LANGS, lang, setLang, t, type Key } from '../i18n/index.ts'
import { isValidPassword, isValidUsername, normalizeUsername } from '../lib/auth.ts'
import { describeDevice, deviceLabel, formatDate, formatDateTime } from '../lib/device.ts'
import { CREDITS } from '../lib/credits.ts'
import { LICENSE_LOADERS, OFFICIAL_URLS, sourceUrl, type LicenseId } from '../lib/legal.ts'
import { resolveSection, sectionsFor, type SettingsSection } from '../lib/settingsSections.ts'
import { chat } from '../state/chat.ts'
import { library } from '../state/library.ts'
import { session, signedOut } from '../state/session.ts'

type Dialog = 'password' | 'recovery' | 'delete' | 'export' | 'username' | null

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
  sessions: { icon: 'devices', title: 'settingsSessions', hint: 'settingsSessionsHint' },
  general: { icon: 'language', title: 'settingsGeneral', hint: 'settingsGeneralHint' },
  personalization: { icon: 'tune', title: 'settingsPersonalization', hint: 'settingsPersonalizationHint' },
  data: { icon: 'database', title: 'settingsData', hint: 'settingsDataHint' },
  about: { icon: 'info', title: 'settingsAbout', hint: 'settingsAboutHint' },
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

function LicenseCard(props: { title: Key; license: string; note: Key; id: LicenseId; extra?: JSX.Element; onOpen: (id: LicenseId) => void }): JSX.Element {
  return (
    <Panel tone="low" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h3 class="title text-lg">{t(props.title)}</h3>
        <p class="headline text-xl">{props.license}</p>
      </div>
      <p class="text-on-surface-variant">{t(props.note)}</p>
      {props.extra}
      <div class="flex flex-wrap gap-2">
        <md-filled-tonal-button on:click={() => props.onOpen(props.id)}>{t('legalFullText')}</md-filled-tonal-button>
        <a href={OFFICIAL_URLS[props.id]} target="_blank" rel="noopener noreferrer" class="contents">
          <md-text-button>
            {t('legalOfficial')}
            <Icon slot="icon" name="open_in_new" size={18} />
          </md-text-button>
        </a>
      </div>
    </Panel>
  )
}

function LicenseDialog(props: { id: LicenseId | null; onClose: () => void }): JSX.Element {
  const [text] = createResource(
    () => props.id,
    (id) => LICENSE_LOADERS[id](),
  )
  return (
    <TextDialog
      open={props.id !== null}
      title={props.id === 'agpl' ? 'GNU AGPL v3.0' : props.id === 'ccbysa' ? 'CC BY-SA 4.0' : 'SIL OFL 1.1'}
      onClose={props.onClose}
      actions={<md-filled-button on:click={() => props.onClose()}>{t('close')}</md-filled-button>}
    >
      <p class="mb-3 text-sm">{t('legalOriginalOnly')}</p>
      <pre class="rounded-2xl bg-surface-highest p-4 text-xs leading-relaxed whitespace-pre-wrap text-on-surface">
        {text.loading ? t('legalLoading') : (text() ?? t('loadError'))}
      </pre>
    </TextDialog>
  )
}

function AccountProfile(props: { onChangeUsername: () => void }): JSX.Element {
  const [account] = createResource(
    () => (session.registered() ? session.username() : null),
    () => api.account(),
  )
  return (
    <Panel tone="container" class="flex flex-col gap-4">
      <div class="flex items-center gap-4">
        <div class="grid size-16 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
          <Icon name="person" filled size={32} />
        </div>
        <div class="flex min-w-0 flex-col">
          <h3 class="headline text-2xl break-all">{session.username()}</h3>
          <Show when={account()}>
            {(info) => <p class="text-sm text-on-surface-variant">{t('accountCreated', { date: formatDate(info().createdAt, lang()) })}</p>}
          </Show>
        </div>
      </div>
      <div>
        <md-filled-tonal-button on:click={() => props.onChangeUsername()}>
          <Icon slot="icon" name="edit" size={18} />
          {t('changeUsername')}
        </md-filled-tonal-button>
      </div>
    </Panel>
  )
}

function deviceIcon(kind: ReturnType<typeof describeDevice>['kind']): IconName {
  return kind === 'phone' ? 'mobile' : kind === 'tablet' ? 'tablet' : 'computer'
}

function Sessions(props: { onSignOutEverywhere: () => void }): JSX.Element {
  const [list, { refetch }] = createResource(() => api.sessions())
  const [busyId, setBusyId] = createSignal<string | null>(null)

  async function end(id: string): Promise<void> {
    setBusyId(id)
    try {
      await api.revokeSession(id)
    } finally {
      setBusyId(null)
      void refetch()
    }
  }

  return (
    <div class="flex flex-col gap-4">
      <p class="px-2 text-on-surface-variant">{t('sessionsIntro')}</p>
      <Show when={!list.error} fallback={<p role="alert" class="text-error">{t('sessionsLoadError')}</p>}>
        <ul class="flex flex-col gap-2.5">
          <For each={list() ?? []}>
            {(item) => {
              const device = describeDevice(item.userAgent)
              return (
                <li class={`flex items-center gap-4 rounded-3xl p-4 ${item.current ? 'bg-primary-container text-on-primary-container' : 'bg-surface-low'}`}>
                  <Icon name={deviceIcon(device.kind)} size={28} />
                  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="title">{deviceLabel(device, t('sessionUnknown'))}</span>
                      <Show when={item.current}>
                        <span class="label rounded-full bg-primary px-2.5 py-0.5 text-on-primary">{t('sessionCurrent')}</span>
                      </Show>
                    </div>
                    <span class="text-sm opacity-80">{t('sessionLastActive', { date: formatDateTime(item.lastSeenAt, lang()) })}</span>
                    <span class="text-sm opacity-80">{t('sessionSignedIn', { date: formatDateTime(item.createdAt, lang()) })}</span>
                  </div>
                  <Show when={!item.current}>
                    <md-text-button prop:disabled={busyId() === item.id} on:click={() => void end(item.id)}>
                      {t('sessionEnd')}
                    </md-text-button>
                  </Show>
                </li>
              )
            }}
          </For>
        </ul>
      </Show>
      <Group>
        <Row icon="logout" label={t('signOutEverywhere')} onClick={() => props.onSignOutEverywhere()} />
      </Group>
    </div>
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
  const [license, setLicense] = createSignal<LicenseId | null>(null)
  const [notices, setNotices] = createSignal(false)

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
            <Show when={session.registered()} fallback={<><AccountCard /><PrivateCard /></>}>
              <AccountProfile onChangeUsername={() => setDialog('username')} />
              <Group>
                <Row icon="key" label={t('changePassword')} onClick={() => setDialog('password')} />
                <Row icon="shield" label={t('newRecoveryCode')} onClick={() => setDialog('recovery')} />
                <Row icon="logout" label={t('signOut')} onClick={() => void signOut(navigate)} />
              </Group>
            </Show>
          </div>
        )
      case 'sessions':
        return <Sessions onSignOutEverywhere={() => void logoutEverywhere()} />
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
      case 'legal':
        return (
          <div class="flex flex-col gap-4">
            <LicenseCard
              id="agpl"
              title="legalCode"
              license={t('legalCodeLicense')}
              note="legalCodeNote"
              onOpen={setLicense}
              extra={
                <Show when={sourceUrl()}>
                  {(url) => (
                    <a href={url()} target="_blank" rel="noopener noreferrer" class="label inline-flex items-center gap-1.5 text-primary underline underline-offset-4">
                      {t('legalSource')}
                      <Icon name="open_in_new" size={16} />
                    </a>
                  )}
                </Show>
              }
            />
            <LicenseCard
              id="ccbysa"
              title="legalData"
              license={t('legalDataLicense')}
              note="legalDataNote"
              onOpen={setLicense}
              extra={<p class="label rounded-2xl bg-surface-container px-4 py-3 text-on-surface-variant">{t('legalAttribution')}</p>}
            />
            <LicenseCard id="ofl" title="legalFont" license={t('legalFontLicense')} note="legalFontNote" onOpen={setLicense} />
            <Panel tone="container" class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <h3 class="title text-lg">{t('legalNotices')}</h3>
                <p class="text-on-surface-variant">{t('legalNoticesNote')}</p>
                <p class="text-sm text-on-surface-variant">{t('legalThirdPartyNote')}</p>
              </div>
              <div>
                <md-filled-tonal-button on:click={() => setNotices(true)}>{t('legalNoticesShow')}</md-filled-tonal-button>
              </div>
            </Panel>
            <Panel tone="low" class="flex flex-col gap-4">
              <h3 class="title text-lg">{t('legalCredits')}</h3>
              <p class="text-on-surface-variant">{t('legalCreditsIntro')}</p>
              <ul class="flex flex-col gap-3">
                {CREDITS.map((credit) => (
                  <li class="flex flex-col">
                    <a href={credit.url} target="_blank" rel="noopener noreferrer" class="title w-fit text-primary underline underline-offset-4">
                      {credit.name}
                    </a>
                    <span class="text-sm text-on-surface-variant">{t(credit.text)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
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
        open={dialog() === 'username'}
        title={t('changeUsername')}
        body={t('changeUsernameBody')}
        fields={[
          { key: 'username', label: t('newUsername'), autocomplete: 'username', type: 'text' },
          { key: 'password', label: t('authPassword'), autocomplete: 'current-password' },
        ]}
        submitLabel={t('confirm')}
        validate={(values) => (isValidUsername(values.username ?? '') ? null : t('authErrorBadUsername'))}
        onSubmit={async (values) => {
          const result = await api.changeUsername(normalizeUsername(values.username ?? ''), values.password ?? '')
          session.setStatus({ registered: true, username: result.username })
          close()
        }}
        onClose={close}
      />
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
      <LicenseDialog id={license()} onClose={() => setLicense(null)} />
      <NoticesDialog open={notices()} onClose={() => setNotices(false)} />
      <ExportDialog open={dialog() === 'export'} text={exported()} onClose={close} />
      <RecoveryCodeDialog code={newCode()} onDone={() => setNewCode(null)} />
    </main>
  )
}
