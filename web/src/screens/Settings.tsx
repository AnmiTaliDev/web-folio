import { useNavigate } from '@solidjs/router'
import { createSignal, Show, type JSX } from 'solid-js'
import { api } from '../api/client.ts'
import { AccountCard, signOut } from '../components/AccountCard.tsx'
import { ExportDialog, FormDialog, RecoveryCodeDialog } from '../components/Dialogs.tsx'
import { Icon } from '../components/Icon.tsx'
import type { IconName } from '../components/icons.ts'
import { PrivateCard } from '../components/Notices.tsx'
import { Page } from '../components/Page.tsx'
import { Panel } from '../components/Panel.tsx'
import { LANG_NAMES, LANGS, lang, setLang, t } from '../i18n/index.ts'
import { isValidPassword } from '../lib/auth.ts'
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

function Section(props: { title: string; children: JSX.Element }): JSX.Element {
  return (
    <section class="flex flex-col gap-2">
      <h2 class="headline px-2 text-2xl">{props.title}</h2>
      <ul class="flex flex-col rounded-panel bg-surface-low p-2">{props.children}</ul>
    </section>
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

export function Settings(): JSX.Element {
  const navigate = useNavigate()
  const [dialog, setDialog] = createSignal<Dialog>(null)
  const [newCode, setNewCode] = createSignal<string | null>(null)
  const [exported, setExported] = createSignal('')

  const profile = () => session.profile()

  async function setFlag(flag: 'personalizationEnabled' | 'aiDescriptionsEnabled', value: boolean): Promise<void> {
    const current = profile()
    if (!current) {
      return
    }
    session.setProfile({ ...current, [flag]: value })
    try {
      await api.updateProfile({ [flag]: value })
    } catch {
      session.setProfile(current)
    }
  }

  async function showData(): Promise<void> {
    try {
      setExported(JSON.stringify(await api.exportData(), null, 2))
      setDialog('export')
    } catch {
      setExported(t('loadError'))
      setDialog('export')
    }
  }

  async function logoutEverywhere(): Promise<void> {
    try {
      await api.logoutAll()
    } finally {
      signedOut()
      library.reset()
      chat.reset()
      navigate('/')
    }
  }

  const close = () => setDialog(null)

  return (
    <Page title={t('settingsTitle')}>
      <AccountCard />
      <section class="flex flex-col gap-2">
        <h2 class="headline px-2 text-2xl">{t('language')}</h2>
        <div class="flex flex-col gap-3 rounded-panel bg-surface-low p-5">
          <p class="text-sm text-on-surface-variant">{t('languageHint')}</p>
          <ul class="flex gap-2" role="radiogroup" aria-label={t('language')}>
            {LANGS.map((code) => (
              <li>
                <md-filter-chip label={LANG_NAMES[code]} prop:selected={lang() === code} on:click={() => setLang(code)} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Show when={session.registered()} fallback={<PrivateCard />}>
        <Section title={t('settingsAccount')}>
          <Row icon="key" label={t('changePassword')} onClick={() => setDialog('password')} />
          <Row icon="shield" label={t('newRecoveryCode')} onClick={() => setDialog('recovery')} />
          <Row icon="logout" label={t('signOutEverywhere')} onClick={() => void logoutEverywhere()} />
          <Row icon="logout" label={t('signOut')} onClick={() => void signOut(navigate)} />
        </Section>
        <Section title={t('settingsPersonalization')}>
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
        </Section>
        <Section title={t('settingsData')}>
          <Row icon="download" label={t('showMyData')} onClick={() => void showData()} />
          <Row icon="delete" label={t('deleteAccount')} danger onClick={() => setDialog('delete')} />
        </Section>
      </Show>
      <Panel tone="container" class="flex flex-col gap-4">
        <h2 class="headline text-2xl">{t('settingsAbout')}</h2>
        <h3 class="title text-lg">{t('howRatings')}</h3>
        <p class="-mt-3 text-on-surface-variant">{t('howRatingsBody')}</p>
        <h3 class="title text-lg">{t('howNeural')}</h3>
        <p class="-mt-3 text-on-surface-variant">{t('howNeuralBody')}</p>
        <h3 class="title text-lg">{t('howLibrarian')}</h3>
        <p class="-mt-3 text-on-surface-variant">{t('howLibrarianBody')}</p>
        <h3 class="title text-lg">{t('privacy')}</h3>
        <p class="-mt-3 text-on-surface-variant">{t('consentNote')}</p>
      </Panel>

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
          signedOut()
          library.reset()
          chat.reset()
          navigate('/')
        }}
        onClose={close}
      />
      <ExportDialog open={dialog() === 'export'} text={exported()} onClose={close} />
      <RecoveryCodeDialog code={newCode()} onDone={() => setNewCode(null)} />
    </Page>
  )
}
