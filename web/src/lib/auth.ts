import { ApiError } from '../api/client.ts'
import { t } from '../i18n/index.ts'

const usernamePattern = /^[a-z0-9_.-]{3,32}$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidUsername(value: string): boolean {
  return usernamePattern.test(normalizeUsername(value))
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 128
}

export function authErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return t('authErrorGeneric')
  }
  switch (error.code) {
    case 'invalid_credentials':
      return t('authErrorInvalid')
    case 'username_taken':
      return t('authErrorTaken')
    case 'throttled':
      return t('authErrorThrottled')
    case 'invalid_recovery':
      return t('authErrorInvalidRecovery')
    default:
      return t('authErrorGeneric')
  }
}

export type Mode = 'register' | 'login' | 'recover'

export function validateAuth(
  mode: Mode,
  form: { username: string; password: string; code: string },
): { username?: string; password?: string; code?: string } {
  const errors: { username?: string; password?: string; code?: string } = {}
  if (form.username.trim() === '') {
    errors.username = t('authErrorEmptyField')
  } else if (mode === 'register' && !isValidUsername(form.username)) {
    errors.username = t('authErrorBadUsername')
  }
  if (mode === 'recover' && form.code.trim() === '') {
    errors.code = t('authErrorEmptyField')
  }
  if (form.password === '') {
    errors.password = t('authErrorEmptyField')
  } else if (mode !== 'login' && !isValidPassword(form.password)) {
    errors.password = t('authErrorShortPassword')
  }
  return errors
}
