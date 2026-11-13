export type GateState = { registered: boolean; hasProfile: boolean | undefined }

export function safeFrom(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null
  }
  return value
}

export function redirectFor(path: string, state: GateState, from?: string | null): string | null {
  if (path === '/auth') {
    return null
  }
  if (!state.registered) {
    return path === '/onboarding' ? '/' : null
  }
  if (state.hasProfile === undefined) {
    return null
  }
  if (!state.hasProfile) {
    return path === '/onboarding' ? null : '/onboarding'
  }
  if (path === '/onboarding') {
    return safeFrom(from) ?? '/'
  }
  return null
}

export function today(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
