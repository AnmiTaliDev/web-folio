import type { JSX } from 'solid-js'
import { t } from '../i18n/index.ts'
import { Icon } from './Icon.tsx'

type Props = { value: number | undefined; onRate: (value: 1 | -1) => void; disabled?: boolean }

export function Reactions(props: Props): JSX.Element {
  const tint = (active: boolean) => (active ? { '--md-icon-button-icon-color': 'var(--color-primary)' } : {})
  return (
    <div class="flex items-center">
      <md-icon-button
        aria-label={t('like')}
        aria-pressed={props.value === 1}
        prop:disabled={props.disabled === true}
        style={tint(props.value === 1)}
        on:click={() => props.onRate(1)}
      >
        <Icon name="thumb_up" filled={props.value === 1} />
      </md-icon-button>
      <md-icon-button
        aria-label={t('dislike')}
        aria-pressed={props.value === -1}
        prop:disabled={props.disabled === true}
        style={tint(props.value === -1)}
        on:click={() => props.onRate(-1)}
      >
        <Icon name="thumb_down" filled={props.value === -1} />
      </md-icon-button>
    </div>
  )
}
