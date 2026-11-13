import type { JSX } from 'solid-js'

type Props = { title: string; subtitle?: string; trailing?: JSX.Element; children: JSX.Element; back?: JSX.Element }

export function Page(props: Props): JSX.Element {
  return (
    <main class="flex flex-col gap-6">
      <header class="flex items-end justify-between gap-4 pt-4">
        <div class="flex min-w-0 flex-col gap-2">
          {props.back}
          <h1 class="display text-[clamp(2.25rem,8vw,3.75rem)] text-balance">{props.title}</h1>
          {props.subtitle ? <p class="text-on-surface-variant">{props.subtitle}</p> : null}
        </div>
        {props.trailing}
      </header>
      {props.children}
    </main>
  )
}
