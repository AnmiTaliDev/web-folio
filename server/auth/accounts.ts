import type { Db } from '../db/database.ts'
import { ApiError } from '../shared/errors.ts'
import {
  createUserWithCredentials,
  findCredentials,
  findCredentialsById,
  setRecoveryHash,
  updatePassword,
  updateUsername,
} from '../shared/credentials-store.ts'
import { generateRecoveryCode, hashPassword, hashRecoveryCode, recoveryCodeMatches, verifyPassword } from './password.ts'
import type { Throttle } from './throttle.ts'

let dummyHash: Promise<string> | null = null

function invalidCredentials(): ApiError {
  return new ApiError(401, 'invalid_credentials', 'Invalid username or password')
}

function assertNotThrottled(throttle: Throttle, key: string): void {
  if (throttle.isBlocked(key)) {
    throw new ApiError(429, 'throttled', 'Too many failed attempts, try again later')
  }
}

export async function registerAccount(
  db: Db,
  username: string,
  password: string,
  now: Date,
  termsVersion: string | null = null,
): Promise<{ userId: string; recoveryCode: string }> {
  if (findCredentials(db, username)) {
    throw new ApiError(409, 'username_taken', 'Username is already taken')
  }
  const recoveryCode = generateRecoveryCode()
  const userId = createUserWithCredentials(db, username, await hashPassword(password), hashRecoveryCode(recoveryCode), now, termsVersion)
  return { userId, recoveryCode }
}

export async function checkLogin(db: Db, throttle: Throttle, username: string, password: string): Promise<string> {
  const key = `login:${username}`
  assertNotThrottled(throttle, key)
  const credentials = findCredentials(db, username)
  dummyHash ??= hashPassword('folio-dummy-password')
  const matches = await verifyPassword(password, credentials?.passwordHash ?? (await dummyHash))
  if (!credentials || !matches) {
    throttle.recordFailure(key)
    throw invalidCredentials()
  }
  throttle.reset(key)
  return credentials.userId
}

export async function changePassword(db: Db, throttle: Throttle, userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const key = `password:${userId}`
  assertNotThrottled(throttle, key)
  const credentials = findCredentialsById(db, userId)
  if (!credentials) {
    throw new ApiError(409, 'not_registered', 'Create an account first')
  }
  if (!(await verifyPassword(currentPassword, credentials.passwordHash))) {
    throttle.recordFailure(key)
    throw invalidCredentials()
  }
  throttle.reset(key)
  updatePassword(db, userId, await hashPassword(newPassword), null)
}

export async function recoverAccount(
  db: Db,
  throttle: Throttle,
  username: string,
  recoveryCode: string,
  newPassword: string,
): Promise<{ userId: string; recoveryCode: string }> {
  const key = `recover:${username}`
  assertNotThrottled(throttle, key)
  const credentials = findCredentials(db, username)
  if (!credentials || !recoveryCodeMatches(recoveryCode, credentials.recoveryHash)) {
    throttle.recordFailure(key)
    throw new ApiError(401, 'invalid_recovery', 'Invalid username or recovery code')
  }
  throttle.reset(key)
  const nextCode = generateRecoveryCode()
  updatePassword(db, credentials.userId, await hashPassword(newPassword), hashRecoveryCode(nextCode))
  return { userId: credentials.userId, recoveryCode: nextCode }
}

export async function confirmPassword(db: Db, throttle: Throttle, userId: string, password: string): Promise<void> {
  const key = `confirm:${userId}`
  assertNotThrottled(throttle, key)
  const credentials = findCredentialsById(db, userId)
  if (!credentials || !(await verifyPassword(password, credentials.passwordHash))) {
    throttle.recordFailure(key)
    throw invalidCredentials()
  }
  throttle.reset(key)
}

export async function issueRecoveryCode(db: Db, throttle: Throttle, userId: string, password: string): Promise<string> {
  await confirmPassword(db, throttle, userId, password)
  const code = generateRecoveryCode()
  setRecoveryHash(db, userId, hashRecoveryCode(code))
  return code
}

export async function changeUsername(db: Db, throttle: Throttle, userId: string, password: string, username: string): Promise<void> {
  await confirmPassword(db, throttle, userId, password)
  const taken = findCredentials(db, username)
  if (taken && taken.userId !== userId) {
    throw new ApiError(409, 'username_taken', 'Username is already taken')
  }
  updateUsername(db, userId, username)
}
