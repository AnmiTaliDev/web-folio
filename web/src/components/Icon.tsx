import type { JSX } from 'solid-js'
import { icons, type IconName } from './icons.ts'

type Props = { name: IconName; filled?: boolean; size?: number; class?: string; slot?: string }

export function Icon(props: Props): JSX.Element {
  const size = () => props.size ?? 24
  return (
    <span
      slot={props.slot}
      aria-hidden="true"
      class={`symbol shrink-0 ${props.class ?? ''}`}
      style={{
        'font-size': `${size()}px`,
        width: `${size()}px`,
        height: `${size()}px`,
        'font-variation-settings': `'FILL' ${props.filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${Math.min(Math.max(size(), 20), 48)}`,
      }}
    >
      {icons[props.name]}
    </span>
  )
}
