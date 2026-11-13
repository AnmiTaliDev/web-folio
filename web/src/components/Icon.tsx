import type { JSX } from 'solid-js'
import { icons, type IconName } from './icons.ts'

type Props = { name: IconName; filled?: boolean; size?: number; class?: string; slot?: string }

export function Icon(props: Props): JSX.Element {
  const markup = () => {
    const fill = props.filled ? (`${props.name}-fill` as IconName) : props.name
    return icons[fill] ?? icons[props.name]
  }
  const size = () => `${props.size ?? 24}px`
  return (
    <span
      slot={props.slot}
      aria-hidden="true"
      class={`inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:fill-current ${props.class ?? ''}`}
      style={{ width: size(), height: size() }}
      innerHTML={markup()}
    />
  )
}
