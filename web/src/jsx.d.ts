import 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      [tag: `md-${string}`]: HTMLAttributes<HTMLElement> & Record<string, unknown>
    }
  }
}
