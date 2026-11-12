import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const COST = 16384
const BLOCK_SIZE = 8
const PARALLELISM = 1
const KEY_LENGTH = 32

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.-]{3,32}$/, 'Username must be 3 to 32 characters: letters, digits, dot, dash, underscore')

export const passwordSchema = z.string().min(8).max(128)

function derive(password: string, salt: Buffer, cost: number, blockSize: number, parallelism: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, { N: cost, r: blockSize, p: parallelism }, (error, key) => {
      if (error) {
        reject(error)
      } else {
        resolve(key)
      }
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM)
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELISM}$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, blockSize, parallelism, saltHex, keyHex] = stored.split('$')
  if (scheme !== 'scrypt' || !cost || !blockSize || !parallelism || !saltHex || !keyHex) {
    return false
  }
  const expected = Buffer.from(keyHex, 'hex')
  const actual = await derive(password, Buffer.from(saltHex, 'hex'), Number(cost), Number(blockSize), Number(parallelism))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function generateRecoveryCode(): string {
  const hex = randomBytes(10).toString('hex').toUpperCase()
  return hex.match(/.{4}/g)?.join('-') ?? hex
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.replace(/[^0-9a-f]/gi, '').toUpperCase()).digest('hex')
}

export function recoveryCodeMatches(code: string, storedHash: string): boolean {
  const actual = Buffer.from(hashRecoveryCode(code), 'hex')
  const expected = Buffer.from(storedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
