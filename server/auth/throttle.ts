export type Throttle = {
  isBlocked: (key: string) => boolean
  recordFailure: (key: string) => void
  reset: (key: string) => void
}

export const MAX_FAILURES = 5
export const FAILURE_WINDOW_MS = 15 * 60 * 1000

export function createThrottle(now: () => Date): Throttle {
  const failures = new Map<string, number[]>()

  function recent(key: string): number[] {
    const since = now().getTime() - FAILURE_WINDOW_MS
    const list = (failures.get(key) ?? []).filter((time) => time > since)
    failures.set(key, list)
    return list
  }

  return {
    isBlocked: (key) => recent(key).length >= MAX_FAILURES,
    recordFailure: (key) => {
      failures.set(key, [...recent(key), now().getTime()])
    },
    reset: (key) => {
      failures.delete(key)
    },
  }
}
