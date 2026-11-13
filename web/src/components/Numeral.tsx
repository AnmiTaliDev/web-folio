import type { JSX } from 'solid-js'

type Props = { value: string | number; unit?: string; caption?: string; class?: string }

export function Numeral(props: Props): JSX.Element {
  return (
    <div class={`flex flex-col ${props.class ?? ''}`}>
      <div class="hero flex items-baseline text-[clamp(4.5rem,18vw,8rem)]">
        <span>{props.value}</span>
        {props.unit ? <span class="ml-1 text-[0.42em]">{props.unit}</span> : null}
      </div>
      {props.caption ? <div class="label mt-2 opacity-80">{props.caption}</div> : null}
    </div>
  )
}
