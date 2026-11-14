import { ApiError } from '../shared/errors.ts'
import { MAX_DAY_OFFSET_DAYS } from './constants.ts'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function assertValidDay(day: string, now: Date): void {
  const parsed = DAY_PATTERN.test(day) ? new Date(`${day}T00:00:00Z`) : null
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
    throw new ApiError(400, 'invalid_day', 'Parameter day must be a valid date in YYYY-MM-DD format')
  }
  const todayUtc = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`)
  const offset = Math.abs(parsed.getTime() - todayUtc.getTime()) / MS_PER_DAY
  if (offset > MAX_DAY_OFFSET_DAYS) {
    throw new ApiError(400, 'invalid_day', 'Parameter day differs from the server date by more than one day')
  }
}

export function daysBefore(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  return new Date(date.getTime() - count * MS_PER_DAY).toISOString().slice(0, 10)
}

export function languageFromHeader(header: string | null): string {
  const first = (header ?? '').split(',')[0]?.split(';')[0]?.trim().split('-')[0]?.toLowerCase() ?? ''
  return /^[a-z]{2,3}$/.test(first) ? first : 'en'
}
