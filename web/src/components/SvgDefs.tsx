import type { JSX } from 'solid-js'
import { SHAPE_NAMES, shapePath } from '../theme/shapes.ts'

export function SvgDefs(): JSX.Element {
  return (
    <svg width="0" height="0" class="absolute" aria-hidden="true">
      <defs>
        {SHAPE_NAMES.map((name) => (
          <clipPath id={`clip-${name}`} clipPathUnits="objectBoundingBox">
            <path d={shapePath(name)} />
          </clipPath>
        ))}
      </defs>
    </svg>
  )
}
