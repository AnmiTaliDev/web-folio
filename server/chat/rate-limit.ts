import { ApiError } from '../shared/errors.ts'
import { MESSAGES_PER_HOUR } from './constants.ts'

export function assertWithinLimit(recentMessageCount: number): void {
  if (recentMessageCount >= MESSAGES_PER_HOUR) {
    throw new ApiError(429, 'rate_limited', `Limit of ${MESSAGES_PER_HOUR} messages per hour reached`)
  }
}
