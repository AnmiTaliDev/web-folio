import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../api/client.ts'
import { setLang } from '../i18n/index.ts'
import { authErrorText, isValidPassword, isValidUsername, normalizeUsername, validateAuth } from './auth.ts'

beforeEach(() => setLang('ru'))

describe('auth helpers', () => {
  it('normalizes and validates usernames', () => {
    expect(normalizeUsername('  Reader.One ')).toBe('reader.one')
    expect(isValidUsername('Reader.One')).toBe(true)
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('with space')).toBe(false)
    expect(isValidUsername('x'.repeat(33))).toBe(false)
  })

  it('validates password length', () => {
    expect(isValidPassword('1234567')).toBe(false)
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('x'.repeat(129))).toBe(false)
  })

  it('maps error codes to messages', () => {
    expect(authErrorText(new ApiError(401, 'invalid_credentials', ''))).toBe('Неверный логин или пароль.')
    expect(authErrorText(new ApiError(409, 'username_taken', ''))).toBe('Этот логин занят.')
    expect(authErrorText(new ApiError(429, 'throttled', ''))).toContain('15 минут')
    expect(authErrorText(new Error('x'))).toBe('Не удалось выполнить действие. Попробуйте ещё раз.')
  })

  it('follows the interface language', () => {
    setLang('en')
    expect(authErrorText(new ApiError(401, 'invalid_credentials', ''))).toBe('Wrong username or password.')
  })
})

describe('validateAuth', () => {
  const form = { username: 'reader', password: 'longenough', code: '' }

  it('accepts a valid login and registration', () => {
    expect(validateAuth('login', form)).toEqual({})
    expect(validateAuth('register', form)).toEqual({})
  })

  it('does not enforce password length on login but does on register and recover', () => {
    const short = { ...form, password: 'abc' }
    expect(validateAuth('login', short)).toEqual({})
    expect(validateAuth('register', short).password).toBeTruthy()
    expect(validateAuth('recover', { ...short, code: 'x' }).password).toBeTruthy()
  })

  it('requires a recovery code and rejects bad new usernames', () => {
    expect(validateAuth('recover', form).code).toBeTruthy()
    expect(validateAuth('register', { ...form, username: 'a b' }).username).toBeTruthy()
    expect(validateAuth('login', { ...form, username: '' }).username).toBeTruthy()
  })
})
