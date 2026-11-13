import { A, useLocation, useNavigate, type RouteSectionProps } from '@solidjs/router'
import { createEffect, Show, type JSX } from 'solid-js'
import { t } from '../i18n/index.ts'
import { redirectFor } from '../lib/redirect.ts'
import { chat } from '../state/chat.ts'
import { library } from '../state/library.ts'
import { session } from '../state/session.ts'
import { Icon } from './Icon.tsx'
import type { IconName } from './icons.ts'
import { Loading } from './Loading.tsx'
import { SvgDefs } from './SvgDefs.tsx'

type Item = { href: string; label: () => string; icon: IconName; match: (path: string) => boolean }

const items: Item[] = [
  { href: '/', label: () => t('navPicks'), icon: 'home', match: (path) => path === '/' || path.startsWith('/book/') || path.startsWith('/catalog') },
  { href: '/chat', label: () => t('navChat'), icon: 'chat_bubble', match: (path) => path.startsWith('/chat') },
  { href: '/profile', label: () => t('navProfile'), icon: 'person', match: (path) => path.startsWith('/profile') },
  { href: '/settings', label: () => t('navSettings'), icon: 'settings', match: (path) => path.startsWith('/settings') },
]

function Logo(): JSX.Element {
  return <span class="headline text-2xl">Folio</span>
}

function BottomNav(props: { path: string }): JSX.Element {
  return (
    <nav
      aria-label={t('navLabel')}
      class="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit max-w-[calc(100vw-24px)] items-center gap-1 rounded-full bg-surface-high p-1.5 shadow-[0_8px_30px_-6px_rgb(0_0_0/0.28)] md:hidden"
    >
      {items.map((item) => {
        const active = () => item.match(props.path)
        return (
          <A
            href={item.href}
            aria-label={item.label()}
            aria-current={active() ? 'page' : undefined}
            class={`press relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full transition-[background-color,padding] duration-300 ${
              active() ? 'bg-secondary-container px-5 text-on-secondary-container' : 'w-12 text-on-surface-variant'
            }`}
          >
            <md-ripple />
            <Icon name={item.icon} filled={active()} />
            <Show when={active()}>
              <span class="label">{item.label()}</span>
            </Show>
          </A>
        )
      })}
    </nav>
  )
}

function Rail(props: { path: string }): JSX.Element {
  return (
    <aside class="sticky top-0 hidden h-dvh w-28 shrink-0 flex-col items-center gap-8 py-8 md:flex">
      <Logo />
      <nav aria-label={t('navLabel')} class="flex flex-col gap-3">
        {items.map((item) => {
          const active = () => item.match(props.path)
          return (
            <A href={item.href} aria-current={active() ? 'page' : undefined} class="group flex flex-col items-center gap-1">
              <span
                class={`press relative grid h-8 w-14 place-items-center overflow-hidden rounded-full transition-colors duration-300 ${
                  active() ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
                }`}
              >
                <md-ripple />
                <Icon name={item.icon} filled={active()} />
              </span>
              <span class={`label ${active() ? 'text-on-surface' : 'text-on-surface-variant'}`}>{item.label()}</span>
            </A>
          )
        })}
      </nav>
    </aside>
  )
}

export function Shell(props: RouteSectionProps): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()

  createEffect(() => {
    if (!session.loaded()) {
      return
    }
    const target = redirectFor(
      location.pathname,
      { registered: session.registered(), hasProfile: session.hasProfile() },
      new URLSearchParams(location.search).get('from'),
    )
    if (target && target !== location.pathname) {
      navigate(target, { replace: true })
    }
  })

  createEffect(() => {
    if (!session.loaded()) {
      return
    }
    if (session.registered()) {
      void library.loadAll()
    } else {
      library.reset()
      chat.reset()
    }
  })

  const bare = () => location.pathname.startsWith('/auth') || location.pathname.startsWith('/onboarding')
  return (
    <div class="flex min-h-dvh">
      <SvgDefs />
      <Show when={session.loaded()} fallback={<Loading class="min-h-dvh w-full" size={72} />}>
        <Show when={!bare()}>
          <Rail path={location.pathname} />
        </Show>
        <div class="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 pt-4 pb-32 md:px-8 md:pt-8 md:pb-16">
          <Show when={!bare()}>
            <div class="mb-2 md:hidden">
              <Logo />
            </div>
          </Show>
          {props.children}
        </div>
        <Show when={!bare()}>
          <BottomNav path={location.pathname} />
        </Show>
      </Show>
    </div>
  )
}
