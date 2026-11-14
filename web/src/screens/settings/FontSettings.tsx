import { For, Show, type JSX } from 'solid-js'
import { t, type Key } from '../../i18n/index.ts'
import { appearance, effectiveTypeface } from '../../state/appearance.ts'
import { AXES, AXES_FAMILIES, DEFAULT_AXES, FONT_PARTS, TYPEFACES, type AxesFamily, type AxisKey, type FontPart, type Typeface } from '../../theme/fonts.ts'
import { Choices } from './parts.tsx'

const typefaceLabels: Record<Typeface, Key> = {
  'roboto-flex': 'fontRobotoFlex',
  'roboto-flex-axes': 'fontRobotoFlexAxes',
  roboto: 'fontRoboto',
  'google-sans': 'fontGoogleSans',
  'google-sans-flex': 'fontGoogleSansFlex',
  'google-sans-flex-axes': 'fontGoogleSansFlexAxes',
  system: 'fontSystem',
  serif: 'fontSerif',
}

const partLabels: Record<FontPart, Key> = { headings: 'partHeadings', text: 'partText', ui: 'partUi', covers: 'partCovers' }
const axisLabels: Record<AxisKey, Key> = { wght: 'axisWght', wdth: 'axisWdth', GRAD: 'axisGrad', ROND: 'axisRond', slnt: 'axisSlnt' }
const SAME = 'same'
const PART_OPTIONS: readonly (Typeface | typeof SAME)[] = [SAME, ...TYPEFACES]

function AxisSliders(props: { family: AxesFamily }): JSX.Element {
  const values = () => appearance.value().axes[props.family]
  function setAxis(key: AxisKey, value: number): void {
    const current = appearance.value().axes
    appearance.update({ axes: { ...current, [props.family]: { ...current[props.family], [key]: value } } })
  }
  return (
    <div class="flex flex-col gap-3 rounded-2xl bg-surface-container p-4">
      <h4 class="title">{t(typefaceLabels[props.family])}</h4>
      <For each={AXES[props.family]}>
        {(spec) => (
          <label class="flex items-center gap-3">
            <span class="label w-40 shrink-0 text-on-surface-variant">{t(axisLabels[spec.key])}</span>
            <md-slider
              class="min-w-0 flex-1"
              prop:min={spec.min}
              prop:max={spec.max}
              prop:step={spec.step}
              prop:value={values()[spec.key]}
              prop:labeled={true}
              prop:ariaLabel={t(axisLabels[spec.key])}
              on:input={(event: Event) => setAxis(spec.key, (event.target as HTMLInputElement).valueAsNumber)}
            />
            <span class="label w-12 text-right tabular-nums">{values()[spec.key]}</span>
          </label>
        )}
      </For>
    </div>
  )
}

export function FontSettings(): JSX.Element {
  const current = () => appearance.value()
  const usedFamilies = () => AXES_FAMILIES.filter((family) => FONT_PARTS.some((part) => effectiveTypeface(current(), part) === family))
  const usesGoogleSansFlex = () => FONT_PARTS.some((part) => effectiveTypeface(current(), part).startsWith('google-sans-flex'))
  return (
    <>
      <Choices title="appearanceTypeface" options={TYPEFACES} label={(option) => typefaceLabels[option]} selected={current().typeface} onSelect={(typeface) => appearance.update({ typeface })} />
      <details class="rounded-2xl bg-surface-container px-4 py-3">
        <summary class="title cursor-pointer">{t('fontPartsTitle')}</summary>
        <div class="mt-4 flex flex-col gap-5">
          <For each={FONT_PARTS}>
            {(part) => (
              <Choices
                title={partLabels[part]}
                options={PART_OPTIONS}
                label={(option) => (option === SAME ? 'fontSameAsGeneral' : typefaceLabels[option])}
                selected={current().parts[part] ?? SAME}
                onSelect={(option) => appearance.update({ parts: { ...current().parts, [part]: option === SAME ? null : option } })}
              />
            )}
          </For>
        </div>
      </details>
      <For each={usedFamilies()}>{(family) => <AxisSliders family={family} />}</For>
      <Show when={usedFamilies().length > 0}>
        <div>
          <md-text-button on:click={() => appearance.update({ axes: DEFAULT_AXES })}>{t('axesReset')}</md-text-button>
        </div>
      </Show>
      <Show when={usesGoogleSansFlex()}>
        <p class="text-sm text-on-surface-variant">{t('fontFlexCyrillicNote')}</p>
      </Show>
      <p class="-mt-3 text-sm text-on-surface-variant">{t('appearanceFontNote')}</p>
    </>
  )
}
