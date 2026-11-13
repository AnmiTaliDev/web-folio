import { expect, type Page } from '@playwright/test'

let counter = 0

export function uniqueName(prefix = 'reader'): string {
  counter++
  return `${prefix}${Date.now().toString(36)}${counter}`
}

export async function registerByApi(page: Page, username = uniqueName(), options: { profile?: boolean } = {}): Promise<string> {
  const response = await page.request.post('/api/auth/register', { data: { username, password: 'secret password', acceptTerms: true } })
  expect(response.status()).toBe(200)
  if (options.profile !== false) {
    const saved = await page.request.put('/api/profile', { data: { interests: ['classics'], consent: true } })
    expect(saved.status()).toBe(204)
  }
  return username
}

export async function firstBookId(page: Page, query: string): Promise<string> {
  const found = (await (await page.request.get(`/api/books/search?q=${encodeURIComponent(query)}`)).json()) as { bookId: string }[]
  expect(found.length).toBeGreaterThan(0)
  return found[0]?.bookId ?? ''
}

export function chip(page: Page, label: string) {
  return page.locator('md-filter-chip').filter({ hasText: new RegExp(`^\\s*${label.replace(/[+]/g, '\\+')}\\s*$`) })
}

export function field(page: Page, label: string) {
  return page.locator('md-filled-text-field, md-outlined-text-field').filter({ hasText: label }).locator('input')
}

export function dialog(page: Page) {
  return page.locator('md-dialog[open]')
}
