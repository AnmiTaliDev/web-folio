import { expect, test } from '@playwright/test'
import { chip, dialog, registerByApi } from './helpers.ts'

test('switching the language changes the interface and the book titles', async ({ page }) => {
  await page.goto('/settings/general')
  await chip(page, 'English').click()
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  await page.goto('/catalog')
  await expect(page.getByRole('heading', { name: 'All books' })).toBeVisible()
  await page.locator('md-filled-text-field[type="search"] input').fill('master and margarita')
  await expect(page.getByText('The Master and Margarita').first()).toBeVisible()
  await page.goto('/settings/general')
  await chip(page, 'Русский').click()
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible()
})

test('Kazakh shows the interface, the book titles and the terms in Kazakh', async ({ page }) => {
  await page.goto('/settings/general')
  await chip(page, 'Қазақша').click()
  await expect(page.getByRole('heading', { name: 'Параметрлер', level: 1 })).toBeVisible()
  await page.goto('/catalog')
  await page.locator('md-filled-text-field[type="search"] input').fill('Мастер мен Маргарита')
  await expect(page.getByText('Мастер мен Маргарита').first()).toBeVisible()
  await page.goto('/terms')
  await expect(page.getByRole('heading', { name: 'Пайдалану шарттары', level: 1 })).toBeVisible()
})

test('the age filter hides books above the level for a visitor and for an account', async ({ page }) => {
  await page.goto('/catalog')
  await expect(page.getByText('Книг: 467')).toBeVisible()
  await page.goto('/settings/general')
  await chip(page, '12+').click()
  await page.goto('/catalog')
  await expect(page.getByText('Книг: 334')).toBeVisible()
  await page.goto('/settings/general')
  await chip(page, 'Выключен').click()
  await page.goto('/catalog')
  await expect(page.getByText('Книг: 467')).toBeVisible()

  await registerByApi(page)
  await page.goto('/settings/general')
  await chip(page, '6+').click()
  await expect.poll(async () => ((await (await page.request.get('/api/profile')).json()) as { profile: { maxAge: number } }).profile.maxAge).toBe(6)
  await page.goto('/catalog')
  await expect(page.getByText('Книг: 67')).toBeVisible()
})

test('the legal section shows the licenses and opens the full texts', async ({ page }) => {
  await page.goto('/settings/legal')
  await expect(page.getByText('GNU Affero General Public License v3.0')).toBeVisible()
  await page.getByRole('button', { name: 'Полный текст' }).first().click()
  await expect(dialog(page).getByText('GNU AFFERO GENERAL PUBLIC LICENSE')).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Закрыть' }).click()
  await page.getByRole('button', { name: 'Показать список' }).click()
  await expect(dialog(page).getByText('Компонентов:')).toBeVisible()
})
