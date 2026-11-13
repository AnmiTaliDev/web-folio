import { createResource, createSignal, For, Show, type JSX } from 'solid-js'
import { spdxUrls } from '../lib/credits.ts'
import { t } from '../i18n/index.ts'
import { Dialog } from './Dialog.tsx'

type Component = { name: string; version: string; license: string; author: string; url: string; group: 'runtime' | 'tooling'; textId: string | null }
type Notices = { components: Component[]; texts: Record<string, string> }

async function loadNotices(): Promise<Notices> {
  return (await import('../generated/notices.json')).default as Notices
}

function Entry(props: { component: Component; texts: Record<string, string> }): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const text = () => (props.component.textId ? props.texts[props.component.textId] : undefined)
  return (
    <li class="border-b border-outline-variant/50 py-2 last:border-b-0">
      <details on:toggle={(event: Event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
        <summary class="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1">
          <span class="title">{props.component.name}</span>
          <span class="label text-on-surface-variant">{props.component.version}</span>
          <span class="label rounded-full bg-surface-highest px-2.5 py-0.5 text-on-surface-variant">{props.component.license}</span>
        </summary>
        <Show when={open()}>
          <div class="flex flex-col gap-2 pt-2 pb-3 text-sm">
            <Show when={props.component.author}>
              <p class="text-on-surface-variant">{props.component.author}</p>
            </Show>
            <Show when={props.component.url}>
              <a href={props.component.url} target="_blank" rel="noopener noreferrer" class="break-all text-primary underline underline-offset-4">
                {props.component.url}
              </a>
            </Show>
            <Show
              when={text()}
              fallback={
                <p class="text-on-surface-variant">
                  {t('legalNoLicenseFile')}:{' '}
                  <For each={spdxUrls(props.component.license)}>
                    {(url) => (
                      <a href={url} target="_blank" rel="noopener noreferrer" class="mr-2 break-all text-primary underline underline-offset-4">
                        {url}
                      </a>
                    )}
                  </For>
                </p>
              }
            >
              <pre class="rounded-2xl bg-surface-highest p-3 text-xs leading-relaxed whitespace-pre-wrap text-on-surface">{text()}</pre>
            </Show>
          </div>
        </Show>
      </details>
    </li>
  )
}

export function NoticesDialog(props: { open: boolean; onClose: () => void }): JSX.Element {
  const [notices] = createResource(() => props.open || undefined, loadNotices)
  const group = (name: Component['group']) => (notices()?.components ?? []).filter((component) => component.group === name)
  return (
    <Dialog
      open={props.open}
      title={t('legalNotices')}
      onClose={props.onClose}
      actions={<md-filled-button on:click={() => props.onClose()}>{t('close')}</md-filled-button>}
    >
      <Show when={notices()} fallback={<p>{t('legalLoading')}</p>}>
        {(data) => (
          <div class="flex flex-col gap-5">
            <p class="label">{t('legalNoticesCount', { count: data().components.length })}</p>
            <section class="flex flex-col gap-1">
              <h3 class="title text-lg text-on-surface">{t('legalNoticesRuntime')}</h3>
              <ul>
                <For each={group('runtime')}>{(component) => <Entry component={component} texts={data().texts} />}</For>
              </ul>
            </section>
            <section class="flex flex-col gap-1">
              <h3 class="title text-lg text-on-surface">{t('legalNoticesTooling')}</h3>
              <ul>
                <For each={group('tooling')}>{(component) => <Entry component={component} texts={data().texts} />}</For>
              </ul>
            </section>
          </div>
        )}
      </Show>
    </Dialog>
  )
}
