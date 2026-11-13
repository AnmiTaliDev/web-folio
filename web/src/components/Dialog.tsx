import { createEffect, type JSX } from 'solid-js'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: JSX.Element
  actions?: JSX.Element
}

export function Dialog(props: Props): JSX.Element {
  let element: (HTMLElement & { open: boolean }) | undefined
  createEffect(() => {
    if (element) {
      element.open = props.open
    }
  })
  return (
    <md-dialog ref={element} on:closed={() => props.onClose()}>
      <div slot="headline">{props.title}</div>
      <div slot="content" class="text-on-surface-variant">
        {props.children}
      </div>
      <div slot="actions">{props.actions}</div>
    </md-dialog>
  )
}
