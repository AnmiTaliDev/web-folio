import { expect, test } from '@playwright/test'
import { catalogCount } from './helpers.ts'

test('a visitor browses the catalog without an account and no cookie is set', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible()
  await expect(page.getByText('Приватный режим').first()).toBeVisible()
  await expect(page.getByText('Популярное').first()).toBeVisible()
  expect(await context.cookies()).toEqual([])
})

test('search finds a book by its title in either language', async ({ page }) => {
  await page.goto('/')
  const search = page.locator('md-filled-text-field[type="search"] input')
  await search.fill('мастер и маргарита')
  await expect(page.getByText('Мастер и Маргарита').first()).toBeVisible()
  await search.fill('orwell')
  await expect(page.getByText('1984').first()).toBeVisible()
})

test('category tiles open the catalog with paging, sorting and views', async ({ page }) => {
  await page.goto('/')
  await page.locator('a[href="/catalog/dystopia"]').click()
  await expect(page).toHaveURL(/\/catalog\/dystopia$/)
  await expect(page.getByText('Книг: ')).toBeVisible()
  await page.getByRole('button', { name: 'Плитки' }).click()
  await expect(page.locator('main ul.grid > li').first()).toBeVisible()
  expect(await page.evaluate("window.localStorage.getItem('folio.catalogView')")).toBe('tiles')
  await page.goto('/catalog')
  await expect(page.getByText(`Книг: ${catalogCount()}`)).toBeVisible()
})

test('the terms page is public and numbered', async ({ page }) => {
  await page.goto('/terms')
  await expect(page.getByRole('heading', { name: 'Условия использования', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^1\. Общие положения/ })).toBeVisible()
  await expect(page.getByText('нелицензионному распространению контента')).toBeVisible()
})

test('responses carry a strict content security policy and API responses are not cached', async ({ request }) => {
  const api = await request.get('/api/capabilities')
  expect(api.headers()['content-security-policy']).toContain("default-src 'self'")
  expect(api.headers()['cache-control']).toBe('no-store')
  const page = await request.get('/')
  expect(page.headers()['x-frame-options']).toBe('DENY')
})
