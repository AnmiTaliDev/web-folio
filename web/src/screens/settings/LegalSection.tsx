import { A } from '@solidjs/router'
import { createResource, createSignal, Show, type JSX } from 'solid-js'
import { Dialog as TextDialog } from '../../components/Dialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { NoticesDialog } from '../../components/NoticesDialog.tsx'
import { Panel } from '../../components/Panel.tsx'
import { t, type Key } from '../../i18n/index.ts'
import { CREDITS } from '../../lib/credits.ts'
import { LICENSE_LOADERS, OFFICIAL_URLS, sourceUrl, type LicenseId } from '../../lib/legal.ts'

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

export function LegalSection(): JSX.Element {
  const [license, setLicense] = createSignal<LicenseId | null>(null)
  const [notices, setNotices] = createSignal(false)

  return (
    <>
      <div class="flex flex-col gap-4">
        <Panel tone="primary" class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <h3 class="headline text-2xl">{t('legalTerms')}</h3>
            <p>{t('legalTermsNote')}</p>
          </div>
          <div>
            <A href="/terms" class="contents">
              <md-filled-button>{t('legalTermsRead')}</md-filled-button>
            </A>
          </div>
        </Panel>
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
      <LicenseDialog id={license()} onClose={() => setLicense(null)} />
      <NoticesDialog open={notices()} onClose={() => setNotices(false)} />
    </>
  )
}
