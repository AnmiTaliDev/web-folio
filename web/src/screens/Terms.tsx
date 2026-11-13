import { A } from '@solidjs/router'
import { For, Show, type JSX } from 'solid-js'
import { BackButton } from '../components/BackButton.tsx'
import { Icon } from '../components/Icon.tsx'
import { lang, t } from '../i18n/index.ts'
import { TERMS, TERMS_VERSION } from '../i18n/terms.ts'
import { formatDate } from '../lib/device.ts'
import { sourceUrl } from '../lib/legal.ts'

export function Terms(): JSX.Element {
  const text = () => TERMS[lang()]
  return (
    <main class="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      <header class="flex flex-col gap-3 pt-4">
        <BackButton />
        <h1 class="display text-[clamp(2.25rem,8vw,3.75rem)] text-balance">{text().title}</h1>
        <p class="label text-on-surface-variant">{t('termsVersion', { date: formatDate(TERMS_VERSION, lang()) })}</p>
        <p class="max-w-prose text-lg leading-relaxed">{text().intro}</p>
      </header>

      <nav aria-label={t('termsContents')} class="rounded-panel bg-surface-low p-5">
        <h2 class="title mb-2 text-lg">{t('termsContents')}</h2>
        <ol class="grid list-decimal gap-x-8 gap-y-1 pl-5 sm:grid-cols-2">
          <For each={text().sections}>
            {(section) => (
              <li>
                <a href={`#${section.id}`} class="text-primary underline-offset-4 hover:underline">
                  {section.title}
                </a>
              </li>
            )}
          </For>
        </ol>
      </nav>

      <For each={text().sections}>
        {(section) => (
          <section id={section.id} class="flex scroll-mt-6 flex-col gap-3">
            <h2 class="headline text-2xl">{section.title}</h2>
            <For each={section.paragraphs ?? []}>{(paragraph) => <p class="max-w-prose leading-relaxed">{paragraph}</p>}</For>
            <Show when={section.items}>
              {(items) => (
                <ul class="flex max-w-prose list-disc flex-col gap-2 pl-6 leading-relaxed">
                  <For each={items()}>{(item) => <li>{item}</li>}</For>
                </ul>
              )}
            </Show>
            <For each={section.closing ?? []}>{(paragraph) => <p class="max-w-prose leading-relaxed">{paragraph}</p>}</For>
            <Show when={section.id === 'contact' && sourceUrl()}>
              {(url) => (
                <a href={url()} target="_blank" rel="noopener noreferrer" class="label inline-flex w-fit items-center gap-1.5 text-primary underline underline-offset-4">
                  {t('termsContactLink')}
                  <Icon name="open_in_new" size={16} />
                </a>
              )}
            </Show>
          </section>
        )}
      </For>

      <A href="/settings/legal" class="contents">
        <md-text-button class="self-start">{t('termsBack')}</md-text-button>
      </A>
    </main>
  )
}
